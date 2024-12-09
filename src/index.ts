import { Hono } from 'hono'
import { CronJob } from 'cron';
import { PrismaClient } from '@prisma/client'
import { compareSync, hashSync } from 'bcrypt'
import jwt from 'jsonwebtoken'
import { loginSchema, swipeSchema, userSchema } from './schemas'
import { authentication } from './authentication'

type Variables = {
  user: {
    userId: string,
    email: string,
    iat: number
  }
}

const prisma = new PrismaClient()
const app = new Hono<{ Variables: Variables }>()

// Cron Job
const job = new CronJob('0 0 * * *', async () => {
  try {
    // Update all daily limit records to reset swipe_count to 0
    await prisma.dailyLimit.updateMany({
      data: {
        swipe_count: 0, // Reset daily swipe count
      },
    });
    console.log('Daily swipe limits have been reset.');
  } catch (error) {
    console.error('Error resetting daily limits:', error);
  }
}, null, true, "Asia/Jakarta");
// Start the cron job

app.get('/', (c) => {
  return c.text('Hello Dating App!')
})

// Sign Up User
app.post("/users", async (c) => {
  const data = await c.req.json();

  // Validate using Zod schema and safeParse
  const validatedData = userSchema.safeParse(data);

  if (!validatedData.success) {
    // Return validation errors if not successful
    return c.json({ error: validatedData.error.errors }, 400);
  }

  // Hashing Password and reformat date using ISO
  validatedData.data.password = hashSync(validatedData.data.password, 10)
  validatedData.data.date_of_birth = (new Date(Date.parse(validatedData.data.date_of_birth))).toISOString()
  try {
    // Create the user in the database if validation passes
    const newUser = await prisma.user.create({
      data: validatedData.data,
    });

    return c.json(newUser);
  } catch (e) {
    // Handle other errors (e.g., database errors)
    return c.json({ error: 'Internal server error' }, 500);
  }
})

// Login User
app.post("/login", async (c) => {
  const body = await c.req.json()

  const validatedData = loginSchema.safeParse(body)

  if (!validatedData.success) {
    return c.json({ error: validatedData.error.errors }, 400);
  }

  const { email, password } = validatedData.data

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const isPasswordValid = compareSync(password, user.password)
    if (!isPasswordValid) {
      return c.json({ error: 'Invalid email/password' }, 401);
    }

    const token = jwt.sign({
      userId: user.id,
      email: user.email
    }, process.env.JWT_SECRET as string)

    return c.json({ token }); // Send the token in response

  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
})

// Authentication
app.use("/auth/*", authentication)

// Swipes Feature
app.post("/auth/swipes", async (c) => {
  const user = c.get('user')

  const body = await c.req.json()

  // Validate using Zod schema and safeParse
  const validatedData = swipeSchema.safeParse(body);

  if (!validatedData.success) {
    return c.json({ error: validatedData.error.errors }, 400);
  }

  const { swiped_user_id, swipe_type } = validatedData.data;

  // Check if user swipe himself
  if (user.userId === swiped_user_id) {
    return c.json({ error: "You cannot swipe on your own profile" }, 400);
  }
  try {

    // Check if user meet the same other user twice
    const existingSwipe = await prisma.swipe.findFirst({
      where: {
        swiper_id: user.userId,
        swiped_user_id: swiped_user_id,
      },
    });
    if (existingSwipe) {
      return c.json({ error: "You have already swiped on this user" }, 400);
    }

    const today = new Date(new Date().toISOString().split('T')[0]);
    const dailyLimit = await prisma.dailyLimit.findUnique({
      where: {
        user_id: user.userId,
        date: {
          gte: today
        }
      },
    });

    // Check if user has reached swipe limit
    if (dailyLimit && dailyLimit.swipe_count >= 10) {
      return c.json({ error: "You have reached your daily swipe limit" }, 400);
    }
    await prisma.swipe.create({
      data: {
        swiper_id: user.userId,
        swiped_user_id,
        swipe_type
      },
    });

    if (dailyLimit) {
      await prisma.dailyLimit.update({
        where: {
          id: dailyLimit.id,
        },
        data: {
          swipe_count: dailyLimit.swipe_count + 1,
        },
      });
    } else {
      await prisma.dailyLimit.create({
        data: {
          user_id: user.userId,
          date: today,
          swipe_count: 1,
        },
      });
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
})


export default app

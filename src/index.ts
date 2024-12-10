import { Hono } from "hono";
import { CronJob } from "cron";
import { PrismaClient } from "@prisma/client";
import { compareSync, hashSync } from "bcrypt";
import jwt from "jsonwebtoken";
import {
  loginSchema,
  swipeSchema,
  userPremiumSubscriptionSchema,
  userSchema,
} from "./schemas";
import { authentication } from "./authentication";
import { addMonths, endOfDay, startOfDay } from "date-fns";

type Variables = {
  user: {
    userId: string;
    email: string;
    iat: number;
    is_premium: boolean;
  };
};

const prisma = new PrismaClient();
const app = new Hono<{ Variables: Variables }>();

// Cron Job
// Start the cron job
const job = new CronJob(
  "0 0 * * *",
  async () => {
    try {
      // Update all daily limit records to reset swipe_count to 0
      await prisma.dailyLimit.updateMany({
        data: {
          swipe_count: 0, // Reset daily swipe count
        },
      });
      console.log("Daily swipe limits have been reset.");
    } catch (error) {
      console.error("Error resetting daily limits:", error);
    }
  },
  null,
  true,
  "Asia/Jakarta"
);

app.get("/", (c) => {
  return c.text("Hello Dating App!");
});

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
  validatedData.data.password = hashSync(validatedData.data.password, 10);
  validatedData.data.date_of_birth = new Date(
    Date.parse(validatedData.data.date_of_birth)
  ).toISOString();
  try {
    // Create the user in the database if validation passes
    const newUser = await prisma.user.create({
      data: validatedData.data,
    });

    return c.json(newUser);
  } catch (e) {
    // Handle other errors (e.g., database errors)
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Login User
app.post("/login", async (c) => {
  const body = await c.req.json();

  const validatedData = loginSchema.safeParse(body);

  if (!validatedData.success) {
    return c.json({ error: validatedData.error.errors }, 400);
  }

  const { email, password } = validatedData.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const isPasswordValid = compareSync(password, user.password);
    if (!isPasswordValid) {
      return c.json({ error: "Invalid email/password" }, 401);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET as string
    );

    return c.json({ token }); // Send the token in response
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Authentication
app.use("/auth/*", authentication);

// Swipes Feature
app.post("/auth/swipes", async (c) => {
  const user = c.get("user");

  const body = await c.req.json();

  // Validate using Zod schema and safeParse
  const validatedData = swipeSchema.safeParse(body);

  if (!validatedData.success) {
    return c.json({ error: validatedData.error.errors }, 400);
  }

  const { swiped_user_id, swipe_type } = validatedData.data;

  // Check if user swipe himself
  if (user.userId === swiped_user_id) {
    return c.json(
      {
        error: "You cannot swipe on your own profile",
      },
      400
    );
  }
  try {
    const today = startOfDay(new Date());
    const endDay = endOfDay(new Date());

    // Check if user meet the same other user twice
    const existingSwipe = await prisma.swipe.findFirst({
      where: {
        swiper_id: user.userId,
        swiped_user_id: swiped_user_id,
        swiped_at: {
          gte: today,
          lte: endDay,
        },
      },
    });
    if (existingSwipe) {
      return c.json(
        {
          error: "You have already swiped on this user",
        },
        400
      );
    }

    const dailyLimit = await prisma.dailyLimit.findUnique({
      where: {
        user_id: user.userId,
        date: {
          gte: today,
          lte: endDay,
        },
      },
    });

    // Check if user has reached swipe limit
    if (dailyLimit && dailyLimit.swipe_count >= 10 && !user.is_premium) {
      return c.json(
        {
          error: "You have reached your daily swipe limit",
        },
        400
      );
    }
    await prisma.swipe.create({
      data: {
        swiper_id: user.userId,
        swiped_user_id,
        swipe_type,
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
    console.log(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Premium Subscriptions
app.post("/auth/subscriptions", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const validatedData = userPremiumSubscriptionSchema.safeParse(body);
  if (!validatedData.success) {
    return c.json({ error: validatedData.error.errors }, 400);
  }

  const { premium_package_id } = validatedData.data;

  try {
    const today = startOfDay(new Date());
    const nextMonth = addMonths(today, 1);

    const existingSubscription = await prisma.userPremiumSubscription.findFirst(
      {
        where: {
          user_id: user.userId,
          end_date: { gte: today },
        },
      }
    );

    if (existingSubscription) {
      return c.json({ error: "User already has an active subscription" }, 400);
    }

    // Create the subscription
    const newSubscription = await prisma.userPremiumSubscription.create({
      data: {
        user_id: user.userId,
        premium_package_id,
        start_date: today,
        end_date: nextMonth,
      },
    });

    // Update is_premium user status
    await prisma.user.update({
      where: {
        id: user.userId,
      },
      data: {
        is_premium: true,
      },
    });

    return c.json(newSubscription, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get Subscriptions
app.get("/auth/subscriptions", async (c) => {
  const user = c.get("user"); // Get user info from authentication middleware

  try {
    const today = startOfDay(new Date());

    // Fetch user's active subscription
    const subscription = await prisma.userPremiumSubscription.findFirst({
      where: {
        user_id: user.userId,
        end_date: { gte: today },
      },
      include: { premium_package: true },
    });

    if (!subscription) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    return c.json(subscription);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Matches
app.get("/auth/matches", async (c) => {
  const user = c.get('user')

  try {
    // Fetch mutual "LIKE" swipes
    const matches = await prisma.swipe.findMany({
      where: {
        swiper_id: user.userId,
        swipe_type: "LIKE",
        swiped_user: {
          swipes_given: {
            some: {
              swiped_user_id: user.userId,
              swipe_type: "LIKE"
            }
          }
        }
      }, 
      select: {
        swiped_user: {
          select: {
            id: true,
            name: true,
            gender: true,
            date_of_birth: true,
          }
        }
      }
    })
    // Format the response
    const formattedMatches = matches.map((match) => ({
      id: match.swiped_user.id,
      name: match.swiped_user.name,
      gender: match.swiped_user.gender,
      date_of_birth: match.swiped_user.date_of_birth,
      bio: '',
      photo_url: '',
    }));
    
    return c.json({ matches: formattedMatches });
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
})

export default app;

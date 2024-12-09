// import 'dotenv/config'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { loginSchema, userSchema } from './schemas'
import { compareSync, hashSync } from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
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



export default app

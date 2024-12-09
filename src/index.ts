import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { userSchema } from './schemas'
import { hashSync } from 'bcrypt'

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
    console.log(e)
    return c.json({ error: 'Internal server error' }, 500);
  }
})



export default app

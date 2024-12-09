import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: "testuser@example.com",
      password: hashSync("hashedpassword", 10),
      name: "Test User",
      gender: "male",
      date_of_birth: new Date("1998-01-01"),
    },
  });

  await prisma.premiumPackage.create({
    data: {
      name: "Gold",
      description: "Gold membership package",
      price: 100_000,
    },
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

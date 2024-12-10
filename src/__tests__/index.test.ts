import { test, describe, expect, beforeAll } from "@jest/globals";
import app from "..";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

beforeAll(() => {
  execSync("bunx prisma db push --force-reset && bunx prisma db seed");
});

let token: string;
let userId: string;

describe("Creating new user", () => {
  test("POST - Should've make a new user 201", async () => {
    const body = {
      email: "testing@mail.com",
      password: "87654321",
      name: "Test user",
      gender: "female",
      date_of_birth: "1999/01/01",
      is_premium: false,
      verified: false,
    };
    const response = await app.request("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const result = JSON.parse(await response.text());
    expect(response.status).toBe(201);
    userId = result.id;
  });

  test("POST - Wrong email format 400", async () => {
    const body = {
      email: "testingmailcom",
      password: "87654321",
      name: "Test user",
      gender: "female",
      date_of_birth: "1999/01/01",
      is_premium: false,
      verified: false,
    };
    const response = await app.request("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
  });

  test("POST - Password minimum 8 characters 400", async () => {
    const body = {
      email: "testing@mail.com",
      password: "8765",
      name: "Test user",
      gender: "female",
      date_of_birth: "1999/01/01",
      is_premium: false,
      verified: false,
    };
    const response = await app.request("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
  });
});

describe("Authentication", () => {
  test("POST - Login Successful 200", async () => {
    const body = {
      email: "testing@mail.com",
      password: "87654321",
    };
    const response = await app.request("/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    let result = JSON.parse(await response.text());
    expect(response.status).toBe(200);
    expect(result).toHaveProperty("token", expect.any(String));

    token = result.token;
  });

  test("POST - Invalid Email/Password 401", async () => {
    const body = {
      email: "testing@mail.com",
      password: "87654321101010",
    };
    const response = await app.request("/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(401);
  });
  test("POST - Invalid Email/Password (email not found) 401", async () => {
    const body = {
      email: "testiiiiiing@mail.com",
      password: "87654321101010",
    };
    const response = await app.request("/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(401);
  });
});

describe("Swipes feature", () => {
  test("POST - Should've LIKE/PASS the user", async () => {
    const users = await prisma.user.findMany();
    const selectedUser = users[0];

    const body = {
      swiped_user_id: selectedUser.id,
      swipe_type: "LIKE",
    };

    const response = await app.request("/auth/swipes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    expect(response.status).toBe(200);
  });

  test("POST - Can't meet the same user twice", async () => {
    const user = await prisma.user.findUnique({
        where: {
            email: "testuser@example.com"
        }
    });

    const body = {
      swiped_user_id: user!.id,
      swipe_type: "LIKE",
    };

    const response = await app.request("/auth/swipes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    const result = JSON.parse(await response.text());
    expect(response.status).toBe(400);
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("You have already swiped on this user")
    );
  });
});

describe("Premium Feature", () => {
  test("POST - User can buy premium subscription", async () => {
    const premiumPackage = await prisma.premiumPackage.findFirst({
      where: {
        name: "Gold",
      },
    });
    const body = {
      premium_package_id: premiumPackage!.id,
    };

    const response = await app.request("/auth/subscriptions", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    expect(response.status).toBe(201);
  });

  test("POST - User has unlimited swipe quota", async () => {
    await prisma.dailyLimit.update({
      data: {
        swipe_count: 10,
      },
      where: {
        user_id: userId,
      },
    });

    const dummy = {
        email: "anothertesting@mail.com",
        password: "12345678",
        name: "Test user",
        gender: "female",
        date_of_birth: "1999/01/01",
        is_premium: false,
        verified: false,
      };

      const dummyResponse = await app.request("/users", {
        method: "POST",
        body: JSON.stringify(dummy),
      });

      const body = {
        swiped_user_id: JSON.parse(await dummyResponse.text()).id,
        swipe_type: "LIKE",
      };

    const response = await app.request("/auth/swipes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    expect(response.status).toBe(200)
  });
});

import { test, describe, expect, beforeAll, afterAll } from "@jest/globals";
import app from "..";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

beforeAll(() => {
  execSync("bunx prisma db push --force-reset && bunx prisma db seed");
});

let token: string;
describe("Introduction", () => {
  test("Should've give response: Hello Dating App!", async () => {
    const response = await app.request("/");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello Dating App!");
  });
});

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
    expect(response.status).toBe(201);
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
    const result = JSON.parse(await response.text());
    expect(response.status).toBe(400);
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("You have already swiped on this user")
    );
  });
});

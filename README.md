# Dating App API

**_Please read this: After the link is clicked, please wait about 1 minute for the server to wake up_**

 _Deployment link: [https://dating-app-k3gc.onrender.com/](https://dating-app-k3gc.onrender.com/)_


This is the backend API for a dating app that mimics the core functionality of apps like Tinder and Bumble. It includes features for user sign-up, login, swiping, premium packages, daily swipe limits, and more.

## Features

- **User Authentication**: Users can sign up and log in to the app.
- **User Profile**: Users can manage their profile, including adding a bio and photo. (coming soon)
- **Swiping**: Users can swipe on other profiles (like or pass).
- **Daily Swipe Limits**: Users are limited to 10 swipes (likes or passes) per day, which resets every midnight.
- **Premium Packages**: Users can purchase premium packages to unlock additional features such as no swipe limit or verified profile status.

## Tech Stack

- **Backend Framework**: Hono (Fast and lightweight web framework for Deno or Bun)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod (for input validation)
- **Cron Jobs**: `cron` package for daily limit resets
- **Containerization**: Docker
- **Server Deployment**: [Render](https://render.com) (for simple serverless deployment)
- **Database Deployment**: [Neon](https://neon.tech)

## Entity Relation Diagram (ERD)

[Click here](https://dbdiagram.io/d/6717573b97a66db9a3d27a01)

## Setup and Installation

### Prerequisites

1. **Node.js** (or Bun, if preferred) installed on your machine.
2. **PostgreSQL** database set up.
3. **Prisma** ORM to manage the database schema.

### **Steps**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Radwisatso/Dating-app.git
   cd Dating-app
   ```
2. **Install dependencies**

   **If using Node.Js:**

   ```bash
   npm install
   ```

   **If using bun:**

   ```bash
   bun install
   ```

3. **Set up the database**

   - Create a `.env` file in the root directory and provide the required database credentials. Use `.env.example` as a template:

   ```env
   DATABASE_URL=<your_database_url>
   JWT_SECRET=<your_secret_jwt_key>
   ```

   - Run the following commands to create and migrate the database:

   **Node.Js**

   ```bash
   npx prisma migrate dev && npx prisma db seed
   ```

   **Bun**

   ```bash
   bunx prisma migrate dev && bunx prisma db seed
   ```

4. **Run the server**

   **Node.Js**

   ```bash
   npm run dev
   ```

   **Bun**

   ```bash
   bun dev
   ```

## Testing

#### For running tests:

**Node.Js**

```bash
npm run test
```

**Bun**

```bash
bun test
```

<br></br>

# API Documentation

This API provides endpoints for user registration, authentication, swiping functionality, subscription management, and match retrieval.

## Endpoints

### **1. POST /users**

**Description:** Register a new user.  
**Request Body:**

```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "gender": "string",
  "date_of_birth": "YYYY-MM-DD"
}
```

**Response**

- 201 created

```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "gender": "string",
  "date_of_birth": "YYYY-MM-DD",
  "created_at": "string",
  "updated_at": "string"
}
```

- 400 bad request

```json
{
  "error": "Validation errors"
}
```

### **2. POST /login**

**Description:** Authenticate a user and retrieve a JWT token.
**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response**

- 200 ok

```json
{
  "token": "string"
}
```

- 401 unauthorized

```json
{
  "error": "Invalid email/password"
}
```

### **3. POST /auth/swipes**

**Description:** Swipe on another user's profile.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Request Body:**

```json
{
  "swiped_user_id": "string",
  "swipe_type": "LIKE | PASS"
}
```

**Response**

- 200 ok

```json
{
  "success": true
}
```

- 400 bad request

```json
{
  "error": "You cannot swipe on your own profile"
}
```

### **4. POST /auth/subscriptions**

**Description:** Subscribe to a premium package.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Request Body:**

```json
{
  "premium_package_id": "string"
}
```

**Response**

- 201 created

```json
{
  "id": "string",
  "user_id": "string",
  "premium_package_id": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

- 400 bad request

```json
{
  "error": "User already has an active subscription"
}
```

### **5. GET /auth/subscriptions**

**Description:** Retrieve the logged-in user's active subscription.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

- 200 ok

```json
{
  "id": "string",
  "user_id": "string",
  "premium_package_id": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "premium_package": {
    "name": "string",
    "description": "string",
    "price": "number"
  }
}
```

### **6. GET /auth/matches**

**Description:** Retrieve mutual "LIKE" matches for the logged-in user.

**Headers:**

```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**

- 200 ok

```json
{
  "matches": [
    {
      "id": "string",
      "name": "string",
      "gender": "string",
      "date_of_birth": "YYYY-MM-DD",
      "bio": "string",
      "photo_url": "string"
    }
  ]
}
```

### Global Error

- 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

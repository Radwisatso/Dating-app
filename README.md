# Dating App API

This is the backend API for a dating app that mimics the core functionality of apps like Tinder and Bumble. It includes features for user sign-up, login, swiping, premium packages, daily swipe limits, and more.

## Features

- **User Authentication**: Users can sign up and log in to the app.
- **User Profile**: Users can manage their profile, including adding a bio and photo. (coming soon)
- **Swiping**: Users can swipe on other profiles (like or pass).
- **Daily Swipe Limits**: Users are limited to 10 swipes (likes or passes) per day, which resets every midnight.
- **Premium Packages**: Users can purchase premium packages to unlock additional features such as no swipe limit or verified profile status. (coming soon)

## Tech Stack

- **Backend Framework**: Hono (Fast and lightweight web framework for Deno or Bun)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod (for input validation)
- **Cron Jobs**: `cron` package for daily limit resets

## Entity Relation Diagram (ERD)
[Click here](https://dbdiagram.io/d/6717573b97a66db9a3d27a01)

## Setup and Installation

### Prerequisites

1. **Node.js** (or Bun, if preferred) installed on your machine.
2. **PostgreSQL** database set up.
3. **Prisma** ORM to manage the database schema.

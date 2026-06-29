# Authenticated Proxy API

A production-ready REST API built with **Express.js**, **Prisma ORM**, and **PostgreSQL**. It provides user authentication (register/login with JWT) and a fully protected task management system where every user only sees and manages their own tasks.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Running the Server](#running-the-server)

---

## Features

- **User Registration & Login** — secure signup and signin with bcrypt password hashing
- **JWT Authentication** — stateless, token-based auth with a 7-day expiry
- **Task CRUD** — Create, Read, Update, and Delete tasks
- **Per-User Isolation** — users can only access and modify their own tasks; ownership checks enforced on every protected request
- **Production Ready** — built with Express 5, Prisma 5, and battle-tested libraries

---

## Tech Stack

| Layer        | Technology                     |
|--------------|--------------------------------|
| Runtime      | Node.js (CommonJS)             |
| Framework    | Express.js 5                   |
| ORM          | Prisma 5 + PostgreSQL          |
| Auth         | bcryptjs + JWT (jsonwebtoken)  |
| Dev Tools    | Nodemon, dotenv                |

---

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** running locally or a hosted instance

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd Authenticated_Proxy_API
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

Then edit `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_server_db"
JWT_SECRET="change-me-to-a-random-secret"
```

> `JWT_SECRET` should be a long, random string in production (e.g. 64+ hex characters).

### 3. Create the database and sync the schema

Make sure the database specified in `DATABASE_URL` exists, then run:

```bash
npx prisma migrate dev
```

This applies both migrations (`init` and `add_users`) and generates the Prisma Client.

### 4. Start the server

```bash
npm start          # production mode
npm run dev        # development mode with auto-reload (nodemon)
```

The server will be available at:

```
http://localhost:3000
```

---

## Project Structure

```
Authenticated_Proxy_API/
├── index.js                # Application entry point — Express server + all routes
├── auth.js                 # JWT authentication middleware
├── .env                    # Environment variables (git-ignored — contains secrets)
├── .env.example            # Template for environment variables
├── package.json
├── prisma/
│   ├── schema.prisma       # Prisma data models (User, Task)
│   └── migrations/         # Database migration files
└── node_modules/
```

---

## Configuration

| Variable       | Description                                                  | Required |
|----------------|--------------------------------------------------------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (used by Prisma Client)         | Yes      |
| `JWT_SECRET`   | Secret key used to sign and verify JWT access tokens         | Yes      |

---

## Database Schema

The Prisma schema defines two models:

### `User`

| Field      | Type      | Notes                          |
|------------|-----------|--------------------------------|
| `id`       | Int       | Auto-increment primary key     |
| `email`    | String    | Unique                         |
| `password` | String    | Bcrypt-hashed                  |
| `createdAt`| DateTime  | Defaults to `now()`            |
| `tasks`    | Task[]    | One-to-many relation to Task   |

### `Task`

| Field      | Type      | Notes                          |
|------------|-----------|--------------------------------|
| `id`       | Int       | Auto-increment primary key     |
| `title`    | String    |                                |
| `status`   | String    | Defaults to `"pending"`        |
| `userId`   | Int       | Foreign key → User.id          |
| `user`     | User      | Relation back to User          |
| `createdAt`| DateTime  | Defaults to `now()`            |

---

## API Reference

All task routes are **protected** — include `Authorization: Bearer <token>` in the request header.

### Auth Routes (Public)

#### `POST /auth/register`

Register a new user and receive a JWT token.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "your-secure-password"
}
```

**Response — 201 Created:**
```json
{
  "token": "eyJhbGciOi...",
  "userId": 1
}
```

**Error Responses:**
| Status | Cause                              |
|--------|------------------------------------|
| 400    | Missing email or password          |
| 409    | Email already registered           |
| 500    | Server error                       |

---

#### `POST /auth/login`

Log in with existing credentials and receive a JWT token.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "your-secure-password"
}
```

**Response — 200 OK:**
```json
{
  "token": "eyJhbGciOi...",
  "userId": 1
}
```

**Error Responses:**
| Status | Cause                              |
|--------|------------------------------------|
| 401    | Invalid email or password          |
| 500    | Server error                       |

---

### Task Routes (Protected)

> All routes below require the header: `Authorization: Bearer <token>`

#### `GET /tasks`

Fetch all tasks belonging to the authenticated user, ordered by most recent first.

**Response — 200 OK:**
```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "status": "pending",
    "userId": 1,
    "createdAt": "2026-06-29T10:00:00.000Z"
  }
]
```

---

#### `POST /tasks`

Create a new task for the authenticated user.

**Request Body:**
```json
{
  "title": "Buy groceries"
}
```

**Response — 201 Created:**
```json
{
  "id": 1,
  "title": "Buy groceries",
  "status": "pending",
  "userId": 1,
  "createdAt": "2026-06-29T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Cause                              |
|--------|------------------------------------|
| 400    | Missing title                      |
| 401    | No token provided                  |
| 403    | Invalid or expired token           |
| 500    | Server error                       |

---

#### `PUT /tasks/:id`

Update a task's title and/or status. Only the task owner can update it.

**Request Body** (both fields optional):
```json
{
  "title": "Buy groceries and cook dinner",
  "status": "completed"
}
```

**Response — 200 OK:**
```json
{
  "id": 1,
  "title": "Buy groceries and cook dinner",
  "status": "completed",
  "userId": 1,
  "createdAt": "2026-06-29T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Cause                              |
|--------|------------------------------------|
| 401    | No token provided                  |
| 403    | Invalid/expired token OR not owner |
| 404    | Task not found                     |
| 500    | Server error                       |

---

#### `DELETE /tasks/:id`

Delete a task. Only the task owner can delete it.

**Response — 204 No Content** (empty body)

**Error Responses:**
| Status | Cause                              |
|--------|------------------------------------|
| 401    | No token provided                  |
| 403    | Invalid/expired token OR not owner |
| 404    | Task not found                     |
| 500    | Server error                       |

---

## Authentication Flow

```
Client                          Server
  │                               │
  │  POST /auth/register          │
  │  { email, password }          │
  │ ─────────────────────────────>│
  │                               │── Hash password (bcrypt, 10 rounds)
  │                               │── Create user in DB
  │                               │── Sign JWT (expires in 7 days)
  │  { token, userId }            │
  │ <─────────────────────────────│
  │                               │
  │  GET /tasks                   │
  │  Authorization: Bearer <jwt>  │
  │ ─────────────────────────────>│
  │                               │── Verify JWT signature
  │                               │── Attach decoded user to req.user
  │                               │── Return only this user's tasks
  │  [ { task1 }, { task2 } ]     │
  │ <─────────────────────────────│
```

The `authenticate` middleware in `auth.js` extracts the token from the `Authorization` header, verifies it with `JWT_SECRET`, and attaches the decoded payload (`{ userId, email }`) to `req.user`. Protected routes then use `req.user.userId` to scope all queries to the authenticated user.

---

## Running the Server

```bash
npm start          # production — runs node index.js
npm run dev        # development — runs nodemon with auto-reload
```

The server listens on **port 3000** by default.

# 🚀 Smart Complaint Management System (Backend)

This repository contains the backend implementation of the **Smart Complaint Management System**, a college-focused platform designed to manage, categorize, and prioritize student complaints efficiently using a structured database and secure authentication.

---

## 📌 Project Overview

In many colleges, complaints are handled manually, leading to delays and inefficiencies. This system aims to:

* Digitize complaint submission
* Enable structured complaint tracking
* Provide a scalable backend for future ML-based prioritization
* Ensure secure authentication using modern practices

---

## ✨ Features Implemented

### 🔐 Authentication System

* User Signup
* User Login
* Logout functionality
* Password hashing using **bcrypt**
* JWT-based authentication
* Secure **HTTP-only cookies**

---

### 🧱 Database (PostgreSQL - Neon)

* Fully structured relational database
* UUID-based primary keys
* Foreign key relationships
* Data validation using constraints

---

### ⚙️ Backend

* Built with **Node.js + Express**
* PostgreSQL integration using `pg`
* Environment-based configuration
* REST API structure

---

## 🧱 Database Schema

### 👤 Users Table

* `id` (UUID, Primary Key)
* `name`
* `email` *(restricted to @vit.edu.in)*
* `password_hash`
* `role` *(student / admin)*
* `created_at`

---

### 📢 Complaints Table

* `id` (UUID, Primary Key)
* `user_id` *(Foreign Key → Users.id)*
* `description`
* `department`
  *(mess_food, infrastructure, academics, cleanliness, ragging, technical_issues, other)*
* `urgency` *(low / medium / high)*
* `status` *(pending / in_progress / resolved)*
* `image_url`
* `created_at`
* `updated_at`

---

## 📁 Project Structure

```
smart-complaint-backend/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   └── complaintController.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── complaintRoutes.js
│   │
│   ├── middleware/
│   │
│   └── app.js
│
├── .env
├── .env.example
├── package.json
├── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```
git clone https://github.com/raj-patkar/smart-complaint-system.git
cd smart-complaint-backend
```

---

### 2️⃣ Install Dependencies

```
npm install
```

---

### 3️⃣ Setup Environment Variables

Create a `.env` file in the root directory:

```
touch .env
```

Copy values from `.env.example`:

```
PORT=5000
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_secret_key
```

---

### 4️⃣ Setup Database (Neon PostgreSQL)

1. Create a project on Neon
2. Copy your database connection string
3. Run the following SQL schema in Neon SQL Editor:

```
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@vit.edu.in'),
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    department VARCHAR(50) NOT NULL CHECK (department IN (
        'mess_food',
        'infrastructure',
        'academics',
        'cleanliness',
        'ragging',
        'technical_issues',
        'other'
    )),
    urgency VARCHAR(10) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'resolved')),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5️⃣ Start the Server

```
npm start
```

Server will run at:

```
http://localhost:5000
```

---

## 🌐 API Endpoints

### 🔐 Authentication Routes

| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/api/auth/signup` | Register a new user      |
| POST   | `/api/auth/login`  | Login and receive cookie |
| POST   | `/api/auth/logout` | Logout user              |

---

### 📢 Complaint Routes

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| POST   | `/api/complaints` | Create complaint     |
| GET    | `/api/complaints` | Fetch all complaints |

---

## 🧪 Testing

Use **Postman** for testing:

1. Signup → Create user
2. Login → Check cookie (token)
3. Create complaint
4. Fetch complaints

---

## 🔐 Security Notes

* `.env` file is **not committed** for security reasons
* Always use `.env.example` as reference
* Never expose database credentials publicly

---

## 🚀 Future Enhancements

* JWT Middleware (route protection)
* Role-based access (admin features)
* Complaint upvote system
* ML-based categorization
* Duplicate complaint detection
* Priority scoring system

---

## 👨‍💻 Tech Stack

* Node.js
* Express.js
* PostgreSQL (Neon)
* JWT Authentication
* bcrypt

---

## 🎯 Project Goal

To build an intelligent complaint management system that:

* Improves response time
* Prioritizes critical issues
* Enhances student experience

---

## 🙌 Contributors

* Raj Patkar

---

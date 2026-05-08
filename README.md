# 🍽️ HomeyChef

> **From home kitchens to happy customers.**
> A scalable Node.js platform connecting home chefs with food lovers.

---

## 🚀 Overview

**HomeyChef** is a modern full-stack platform built with **Node.js** that organizes and streamlines the homemade food ordering experience.
It replaces chaotic social media orders with a **structured, secure, and scalable system** designed for real-world production.

Built as a graduation project at **Syrian Private University (SPU)**, following an **Agile Scrum-Inspired** methodology across **6 sprints**.

---

## 🎯 Goals

- Centralize homemade food listings in one trusted platform
- Simplify ordering, tracking, and communication
- Empower home chefs with tools to manage menus, orders, and earnings
- Provide a smooth, secure customer experience
- Maintain clean, scalable, and maintainable architecture

---

## ✨ Features

### 👤 Users (Customers)

- Register / Login (Email + **Google OAuth2**)
- **OTP-based password reset** (via email, SHA-256 hashed, 15-min expiry)
- Browse chefs & dishes with search and filters
- Place, track, and **cancel** orders
- Rate & review chefs
- **Add/remove favorites**
- Profile management with image upload
- **Real-time notifications**

### 👨‍🍳 Chefs

- Chef onboarding & **profile management**
- Full menu & dish management (CRUD + image upload)
- Order lifecycle control (accept / reject / complete)
- **Earnings & statistics dashboard**
- Notification system for incoming orders

### 🛠️ Admin

- User & chef moderation (activate / deactivate / delete)
- **Platform-wide statistics & insights**
- System monitoring & management
- Content moderation

---

## 🏗️ Architecture

The system follows a **layered architecture** with clear separation of concerns:

```
Client (HTML / CSS / JS)
        ↓
  API Routes (Express)
        ↓
    Controllers
        ↓
  Services (Business Logic)
        ↓
  Models (Sequelize ORM)
        ↓
  Database (MySQL)
```

**Key architectural decisions:**

- `User` and `Chef` are **separate database tables** (no inheritance) — enabling independent scaling and clear role boundaries.
- RESTful API design with consistent response formatting.
- Centralized error handling middleware.

✔ Maintainable · ✔ Testable · ✔ Production-ready

---

## 🔐 Security

- **JWT Authentication** — Access & Refresh Tokens
- **Google OAuth2** integration for social login
- **OTP Password Reset** — Nodemailer + Gmail App Password, SHA-256 hashing, 15-minute expiry, dedicated `PasswordReset` table
- Role-based authorization (**User / Chef / Admin**)
- Password hashing with **bcrypt**
- Input validation & sanitization
- Secure API design with rate limiting considerations
- Tested with **OWASP ZAP** for vulnerability scanning

---

## 🧰 Tech Stack

| Layer        | Technology                                  |
|:-------------|:--------------------------------------------|
| **Runtime**  | Node.js                                     |
| **Framework**| Express.js                                  |
| **Database** | MySQL                                       |
| **ORM**      | Sequelize                                   |
| **Auth**     | JWT + bcrypt + Google OAuth2                 |
| **Email**    | Nodemailer (Gmail App Password)              |
| **Uploads**  | Multer (image handling)                      |
| **Frontend** | HTML5 / CSS3 / JavaScript                   |
| **Testing**  | JMeter (performance) · OWASP ZAP (security) |
| **Tooling**  | Git & GitHub · Postman · PlantUML            |

---

## 📊 Database Schema

The system uses **9 core models:**

| Model           | Description                              |
|:----------------|:-----------------------------------------|
| `User`          | Customer accounts & profiles             |
| `Chef`          | Chef accounts & profiles (separate table)|
| `Dish`          | Menu items with images & pricing         |
| `Order`         | Order records with status tracking       |
| `OrderItem`     | Individual items within an order         |
| `Review`        | Ratings & reviews for chefs              |
| `Favorite`      | User's favorite dishes/chefs             |
| `Notification`  | In-app notification system               |
| `PasswordReset` | OTP tokens for password recovery         |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Yasen-ab/HomeyChefPT

# Enter the project
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following:

```env
# Server
PORT=3001

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=homeychef

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (for OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 📂 Project Structure

```
HomeyChefPT/
├── backend/
│   ├── config/          # Database & app configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/       # Auth, upload, error handling
│   ├── models/          # Sequelize model definitions
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── uploads/         # Uploaded images storage
│   ├── utils/           # Helper functions
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point
├── frontend/
│   ├── css/
│   ├── js/
│   └── *.html
├── .env.example
├── package.json
└── README.md
```

---

## 📋 Use Cases

The system implements **29+ use cases** across two capstone phases:

### Capstone 1 (UC01 – UC14)

| ID   | Use Case                    |
|:-----|:----------------------------|
| UC01 | User Registration           |
| UC02 | User Login                  |
| UC03 | Browse Chefs                |
| UC04 | Browse Dishes               |
| UC05 | Place Order                 |
| UC06 | Track Order Status          |
| UC07 | Rate & Review Chef          |
| UC08 | Manage Profile              |
| UC09 | Chef: Manage Dishes         |
| UC10 | Chef: View Orders           |
| UC11 | Chef: Update Order Status   |
| UC12 | Admin: Manage Users         |
| UC13 | Admin: Manage Chefs         |
| UC14 | Admin: View Statistics      |

### Capstone 2 (UC15 – UC29+)

| ID   | Use Case                       |
|:-----|:-------------------------------|
| UC15 | Add to Favorites               |
| UC16 | Remove from Favorites          |
| UC17 | View Favorites List            |
| UC18 | Cancel Order                   |
| UC19 | OTP Password Reset (Request)   |
| UC20 | OTP Password Reset (Verify)    |
| UC21 | OTP Password Reset (Reset)     |
| UC22 | Google OAuth2 Login            |
| UC23 | Chef: Edit Profile             |
| UC24 | Chef: View Statistics          |
| UC25 | View Notifications             |
| UC26 | Mark Notification as Read      |
| UC27 | Admin: Deactivate Account      |
| UC28 | Admin: Platform Statistics     |
| UC29 | Admin: Content Moderation      |

---

## 🧪 Testing

### Performance Testing (JMeter)

- **Load Testing** — Simulated concurrent users on API endpoints
- **Stress Testing** — Pushed system beyond expected capacity
- **Target Endpoint:** `GET /api/chefs` on `localhost:3001`
- Measured response times, throughput, and error rates

### Security Testing (OWASP ZAP)

- Automated vulnerability scanning
- Identified and addressed common web vulnerabilities
- Generated formal security assessment reports

---

## 📈 Project Status

| Component             | Status         |
|:----------------------|:---------------|
| Architecture          | ✅ Complete    |
| Auth System (JWT)     | ✅ Complete    |
| Google OAuth2         | ✅ Complete    |
| OTP Password Reset    | ✅ Complete    |
| Database Schema       | ✅ Complete    |
| Order Management      | ✅ Complete    |
| Favorites System      | ✅ Complete    |
| Notifications         | ✅ Complete    |
| Chef Dashboard        | ✅ Complete    |
| Admin Panel           | ✅ Complete    |
| Performance Testing   | ✅ Complete    |
| Security Testing      | ✅ Complete    |
| Documentation (SRS)   | ✅ Complete    |

---



## 👨‍💻 Authors

Built with ☕ and clean architecture by:

- **Yasen** — Software Engineering Student @ Syrian Private University


**Supervisor:** ME. Maher Sarem
---

## 📄 License

This project is developed as a graduation project for the **Software Engineering and Intelligent Information Systems** program at **Syrian Private University (SPU)**.

---

> *Good food deserves good systems.* 🍳

# EcoShop

A modern full-stack e-commerce platform featuring secure authentication, seller and buyer workflows, product management, order processing, notifications, analytics, and a production-ready backend architecture.

---

# Features

## Database & Infrastructure

### Automatic Database Fallback

* Connects to a standalone MongoDB instance when available.
* Automatically falls back to an embedded MongoMemoryServer for local development and testing.
* Enables zero-configuration setup for new developers.

### Automated Index Management

Database indexes are initialized automatically during server startup for improved performance.

Configured indexes include:

* **Accounts**

  * Unique email index
* **Products**

  * Full-text search on title, description, and category
* **Invoices**

  * Buyer index
  * Seller index

### Database Seeding

A built-in seed utility populates the application with demo data, including:

* Buyer accounts
* Seller accounts
* Sample products
* Notifications

Run:

```bash
npm run seed
```

---

# Security

The backend is hardened using industry-standard middleware.

### Included Security Features

* Helmet security headers
* CORS protection
* Express Rate Limiting

  * **300 requests per 15 minutes** per IP
* Centralized error handling
* Graceful exception recovery

---

# Health Monitoring

A dedicated health endpoint provides runtime information.

### Endpoint

```http
GET /health
```

Response includes:

* Server status
* Uptime
* Current timestamp

---

# API Features

## Authentication

* User registration
* Secure login
* JWT authentication
* Role-based authorization

Supported roles:

* Buyer
* Seller

---

## Products

Complete CRUD functionality.

### Endpoints

| Method | Endpoint            | Description                  |
| ------ | ------------------- | ---------------------------- |
| GET    | `/api/products`     | List products                |
| GET    | `/api/products/:id` | Get product details          |
| POST   | `/api/products`     | Create product (Seller only) |
| PUT    | `/api/products/:id` | Update owned product         |
| DELETE | `/api/products/:id` | Delete owned product         |

Authorization ensures sellers may modify only their own listings.

---

## User Profiles

### Endpoints

| Method | Endpoint        |
| ------ | --------------- |
| GET    | `/api/me`       |
| PUT    | `/api/users/me` |

Users can:

* Update profile information
* Retrieve current profile

---

## Seller Analytics

Dedicated analytics endpoint:

```http
GET /api/seller/stats
```

Provides:

* Gross revenue
* Total orders
* Seller performance metrics

---

## Checkout & Orders

Checkout workflow includes:

* Seller mapping for purchased items
* Invoice generation
* Notification delivery
* Order tracking support

---

## Notifications

Notification system supports:

* Automatic delivery
* Read/unread status
* Notification history

---

## Messaging

Messaging functionality includes:

* Read status tracking
* Conversation updates
* Notification integration

---

# Frontend

The frontend has been redesigned with a modern enterprise-inspired design system.

### Highlights

* Glassmorphism interface
* Responsive layouts
* Google Fonts

  * Plus Jakarta Sans
  * Outfit
* Dark Slate theme
* Smooth hover animations
* Improved spacing and typography

---

# User Experience Improvements

### Modal Dialog System

Replaced browser `alert()` dialogs with responsive modal components.

Supported modals include:

* Product previews
* Invoice details
* Product editing
* Confirmation dialogs

### Shopping Cart

* Persistent cart using Local Storage
* Automatic cart restoration
* Smooth checkout flow

### Search & Filtering

* Live product search
* Category filtering
* Product sorting
* Improved browsing experience

### Seller Dashboard

Includes live analytics and revenue insights.

---

# Docker Support

Containerized deployment is fully supported.

### Improvements

* Updated Docker entrypoint

```text
node src/server.js
```

* Docker health checks
* Updated Docker Compose configuration

---

# Testing

The project includes a comprehensive automated integration test suite.

## Test Results

```text
PASS tests/api.test.js

EcoShop Production API Tests

✓ Health Check
✓ User Registration
✓ User Login
✓ Invalid Login Handling
✓ Product Listing
✓ Product Creation
✓ Role-Based Product Authorization
✓ Product Update
✓ Product Deletion
✓ Profile Retrieval
✓ Profile Update

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

---

# Getting Started

## Install Dependencies

```bash
npm install
```

---

## Start Development Server

```bash
npm start
```

---

## Seed Demo Data

```bash
npm run seed
```

---

## Run Tests

```bash
npm test
```

---

# Technology Stack

## Backend

* Node.js
* Express.js
* MongoDB
* MongoMemoryServer
* JWT Authentication

## Security

* Helmet
* CORS
* Express Rate Limit

## Frontend

* HTML5
* CSS3
* JavaScript

## Containerization

* Docker
* Docker Compose

---

# Project Highlights

* Production-ready REST API
* Role-based authentication & authorization
* Secure middleware configuration
* Automatic database fallback
* Full Product CRUD
* Seller analytics dashboard
* Modern responsive UI
* Persistent shopping cart
* Notification system
* Docker support
* Automated integration testing
* Zero-configuration local development

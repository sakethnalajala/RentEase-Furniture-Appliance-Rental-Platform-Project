# RentEase – Furniture & Appliance Rental Platform

RentEase is a full-stack, multi-vendor, multi-city furniture and appliance rental marketplace. It is built for people who move often — students and working professionals relocating between cities — who want to rent quality furniture and appliances by the month instead of buying or carrying them along.

Customers browse a city-scoped catalog, rent items on flexible monthly plans, and track every order from checkout through delivery and return. Independent vendors list and manage their own inventory. A dedicated delivery partner network handles pickup and drop-off. Admins oversee the entire platform — vendors, delivery partners, orders, payments, and analytics — from a single dashboard.

## Overview

- **Multi-city marketplace** — Hyderabad, Bengaluru, Chennai and Mumbai each run as an independently scoped dataset: catalog, orders, delivery partners, and analytics all change with the selected city.
- **Multi-vendor catalog** — any approved vendor can list furniture and appliances; RentEase itself also lists platform-owned inventory.
- **Full rental lifecycle** — cart → checkout → vendor confirmation → delivery partner pickup → OTP-verified drop-off → active rental → return/extension, all backed by real order-state transitions.
- **Four dedicated portals** — Customer, Vendor, Delivery Partner, and Admin each get a purpose-built dashboard with the data and actions relevant to that role.
- **Demo mode by design** — every third-party integration (payments, SMS, email, push notifications, file storage) degrades gracefully to a safe, console-logged simulation when no API keys are configured, so the entire application runs end-to-end without any paid service.

## Features

- **Authentication & security** — JWT access/refresh tokens with rotation, bcrypt password hashing, email verification, phone OTP login, Google OAuth, and mandatory TOTP-based two-factor authentication for admin accounts.
- **Catalog & search** — categories, subcategories, city-aware filtering, sorting, and curated collection rails (trending, best sellers, new arrivals, deals).
- **Rental plans & checkout** — configurable monthly rental durations with discount tiers, cart management, multi-vendor checkout, security deposits, and delivery charges.
- **Order lifecycle management** — real order/payment/inventory state machine covering pending, confirmed, preparing, out-for-delivery, active rental, extension requests, returns, and cancellations.
- **Delivery workflow** — city-scoped open delivery requests, partner accept/reject, OTP-verified pickup and drop-off, live assignment and history tracking.
- **Inventory tracking** — per-unit serial numbers with generated QR codes and barcodes.
- **Reviews & ratings** — product reviews and delivery partner ratings that feed into real performance analytics.
- **Maintenance & damage handling** — customers can raise maintenance requests and damage reports against active rentals.
- **Notifications** — an in-app notification center covering orders, deliveries, payments, and account activity.
- **Analytics dashboards** — revenue, orders, inventory utilization, customer growth, and performance metrics for vendors, delivery partners, and admins, each scoped to the selected city.
- **Admin controls** — vendor and delivery partner approval workflows, platform-wide order/payment oversight, commission and platform settings, and audit logging.
- **Responsive, theatrical UI** — glassmorphism design system with light, dark, and additional theme options, smooth animations, and full responsiveness across devices.

## User Roles

| Role | Capabilities |
|---|---|
| **Customer** | Browse the city-scoped catalog, manage cart & wishlist, check out and pay, track orders and rentals, request maintenance or report damage, review products and delivery partners. |
| **Vendor** | List and manage products & inventory, confirm or reject incoming orders, view delivery partner performance, and track revenue, orders, and rental analytics for their own catalog. |
| **Delivery Partner** | View and accept open delivery requests in their city, manage assigned deliveries, verify pickup/drop-off via OTP, track earnings, and monitor personal performance analytics. |
| **Admin** | Approve/manage vendors and delivery partners, oversee all orders, rentals, and payments platform-wide, configure rental plans and platform settings, and view enterprise-level analytics across every city. |

## Technology Stack

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router)
- React 18
- Redux Toolkit & RTK Query
- Tailwind CSS
- Framer Motion

**Backend**
- Node.js & Express
- MongoDB & Mongoose
- JWT authentication (access + refresh tokens) with bcrypt password hashing
- Passport.js (Google OAuth)
- Speakeasy + QRCode (TOTP two-factor authentication)
- Multer & Cloudinary (file uploads, with local-disk dev fallback)
- Nodemailer, Twilio, Razorpay, Firebase Admin (email, SMS/WhatsApp, payments, push — each with a safe console-logged dev-mode fallback)
- Zod (request validation)
- Jest & Supertest (testing)

**Tooling**
- ESLint
- Nodemon
- `mongodb-memory-server` (zero-install local MongoDB for development)

## Installation

### Prerequisites

- Node.js 18+
- npm

A local MongoDB installation is **not** required — the backend includes a self-contained in-memory MongoDB instance for development (see below).

### 1. Clone the repository

```bash
git clone https://github.com/sakethnalajala/RentEase-Furniture-Appliance-Rental-Platform-Project.git
cd RentEase-Furniture-Appliance-Rental-Platform-Project
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Start the local development database in its own terminal (leave it running):

```bash
npm run mongo
```

In another terminal, seed demo data and start the API:

```bash
npm run seed
npm run dev
```

The API runs at `http://localhost:5000`.

> To use a real MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas)) instead, set `MONGODB_URI` in `.env` accordingly and skip `npm run mongo`.

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The web app runs at `http://localhost:3000`.

### 4. Environment variables

Every third-party integration (SMTP, Twilio, Google OAuth, Cloudinary, Razorpay, Firebase) is **optional** for local development — each one falls back to a safe, console-logged simulation when its keys are left blank in `.env`. Only `MONGODB_URI` is required. See `backend/.env.example` and `frontend/.env.local.example` for the full list of configurable variables.

## Project Structure

```
RentEase/
├── backend/                 Express REST API
│   ├── src/
│   │   ├── config/          Environment & database configuration
│   │   ├── constants/       Enums, demo account definitions, static data
│   │   ├── controllers/     Route handlers / business logic
│   │   ├── data/            Demo/seed data generators
│   │   ├── middlewares/     Auth, RBAC, validation, uploads, error handling
│   │   ├── models/          Mongoose schemas
│   │   ├── routes/          API route definitions
│   │   ├── services/        Domain services (onboarding, demo orders, tokens)
│   │   ├── utils/           Shared helpers
│   │   ├── validators/      Zod request schemas
│   │   ├── app.js           Express app setup
│   │   ├── server.js        Entry point
│   │   └── seed.js          Database seed script
│   ├── scripts/             Developer utility scripts (local MongoDB, etc.)
│   └── uploads/             Local file storage (dev-mode fallback only)
│
├── frontend/                 Next.js application
│   ├── app/                  App Router pages, grouped by role
│   │   ├── (auth)/           Login & registration
│   │   ├── customer/         Customer portal
│   │   ├── vendor/           Vendor portal
│   │   ├── delivery/         Delivery Partner portal
│   │   └── admin/            Admin portal
│   ├── components/           Reusable UI & feature components
│   ├── store/                Redux Toolkit store & RTK Query API slices
│   ├── lib/                  Client-side helpers & constants
│   ├── hooks/                 Custom React hooks
│   └── public/                Static assets
│
└── README.md
```

## Future Enhancements

- Live order and delivery tracking with real-time updates (Socket.IO groundwork already in place).
- Native mobile applications for customers and delivery partners.
- In-app chat between customers, vendors, and delivery partners.
- Automated vendor payout and settlement reporting.
- Multi-language and multi-currency support for broader geographic expansion.
- Public REST API documentation (OpenAPI/Swagger).
- End-to-end and integration test coverage across all four portals.

## License

This project is licensed under the [MIT License](LICENSE).

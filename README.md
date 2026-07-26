# RentEase – Furniture & Appliance Rental Platform

A full-stack, multi-vendor, multi-city furniture and appliance rental marketplace built with Next.js and Express/MongoDB.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-18%2B-339933)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Setup Guide](#3-setup-guide)
4. [Usage Guide](#4-usage-guide)
5. [Configuration](#5-configuration)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)
8. [Contributing](#8-contributing)
9. [FAQ & Troubleshooting](#9-faq--troubleshooting)
10. [License & Credits](#10-license--credits)

---

## 1. Executive Summary

Students and working professionals who relocate frequently — for education or work — face a recurring problem: buying furniture and appliances is expensive, hard to transport, and wasteful when a lease ends in a year or less. **RentEase** solves this by letting people rent quality furniture and appliances on flexible monthly plans instead of owning them outright.

RentEase is a **multi-vendor, multi-city rental marketplace**. Customers browse a catalog scoped to their city, choose a rental tenure, and check out — RentEase and independent, platform-approved vendors fulfil the order through a dedicated **Delivery Partner** network that handles pickup, drop-off, and returns. Every stakeholder in that transaction — the customer, the vendor, the delivery partner, and the platform operator — gets a purpose-built dashboard:

| Portal | Who it's for | What it does |
|---|---|---|
| **Customer** | Renters | Browse, rent, track orders, manage rentals, request maintenance |
| **Vendor** | Furniture/appliance suppliers | List inventory, fulfil orders, track revenue & delivery performance |
| **Delivery Partner** | Logistics staff | Accept delivery jobs, verify pickup/drop-off, track earnings |
| **Admin** | Platform operators | Approve vendors/partners, oversee orders & payments, view analytics |

The platform is built to run **end-to-end with zero paid third-party accounts**: every external integration (payments, SMS, email, push notifications, cloud file storage) has a safe, console-logged simulation it falls back to when no API key is configured, so the full order lifecycle — checkout, delivery, OTP-verified handover, returns — can be demoed and evaluated without spending a rupee on infrastructure.

---

## 2. Architecture Overview

### 2.1 High-level system diagram

```
                              ┌─────────────────────────┐
                              │        Browser           │
                              │  (Customer / Vendor /     │
                              │  Delivery / Admin portal)│
                              └────────────┬─────────────┘
                                           │ HTTPS
                              ┌────────────▼─────────────┐
                              │   Next.js 14 (App Router) │
                              │  Frontend — Vercel-hosted │
                              │  Redux Toolkit + RTK Query│
                              └────────────┬─────────────┘
                                           │ REST (JSON) /api/v1/*
                              ┌────────────▼─────────────┐
                              │  Express.js REST API       │
                              │  Auth · RBAC · Validation  │
                              │  Controllers · Services    │
                              └──┬──────┬──────┬──────┬───┘
                                 │      │      │      │
                    ┌────────────┘  ┌───┘   ┌──┘   ┌──┘
                    ▼                ▼        ▼      ▼
              ┌──────────┐   ┌───────────┐ ┌──────┐ ┌───────────────┐
              │ MongoDB   │   │ Cloudinary│ │Razorpay│ │Twilio/SMTP/FCM│
              │ (Mongoose)│   │ (uploads) │ │(payments)│ │(SMS/Email/Push)│
              └──────────┘   └───────────┘ └──────┘ └───────────────┘
                                                       (all optional — dev-mode
                                                        fallback when unconfigured)
```

### 2.2 Monorepo layout

RentEase is a two-package monorepo — an independently deployable frontend and backend that share nothing but the REST contract between them:

```
RentEase/
├── backend/     Express REST API (deploys to any Node host)
└── frontend/    Next.js App Router client (deploys to Vercel)
```

### 2.3 Backend modules

| Module | Responsibility |
|---|---|
| `config/` | Environment loading, DB connection, and third-party SDK clients (Cloudinary, Firebase, Passport, Razorpay, Twilio, mailer) |
| `constants/` | Enums (roles, order/inventory status), demo account definitions, supported cities |
| `models/` | Mongoose schemas — 24 collections covering users, catalog, orders, payments, delivery, and platform admin data |
| `middlewares/` | JWT authentication, role-based access control (RBAC), Zod request validation, file uploads, rate limiting, centralized error handling |
| `controllers/` | Business logic per resource (auth, product, order, delivery, vendor, admin, …) |
| `routes/` | Express routers mapping URLs to controllers, mounted under `/api/v1` |
| `services/` | Cross-cutting domain logic — token issuance/rotation, OTP, 2FA, vendor onboarding, demo-order generation |
| `validators/` | Zod schemas used by the `validate` middleware |
| `data/` & `seed.js` | Deterministic demo data generation for a fully populated first-run experience |

### 2.4 Frontend modules

| Module | Responsibility |
|---|---|
| `app/` | Next.js App Router pages, grouped by role: `(auth)/`, `customer/`, `vendor/`, `delivery/`, `admin/` |
| `store/` | Redux Toolkit store; one RTK Query API slice per backend resource (`authApi`, `customerApi`, `vendorApi`, `deliveryApi`, `adminApi`, `orderApi`, …) |
| `components/` | Shared UI primitives (`ui/`) and feature components grouped by portal |
| `lib/` | Client-side helpers, constants, and demo-account metadata |
| `hooks/` | Reusable React hooks |
| `middleware.js` | Next.js edge middleware for route-level auth guarding |

### 2.5 Request flow (example: placing a rental order)

1. **Customer** adds a product to the cart (`POST /api/v1/cart`) and proceeds to checkout.
2. `POST /api/v1/orders/checkout` creates `Order` + `OrderItem` + `Payment` documents. Payment is simulated instantly unless Razorpay keys are configured, except Cash on Delivery, which stays `pending` until delivery.
3. The **Vendor** confirms the item (`PATCH /api/v1/orders/vendor/items/:itemId/status`), which flips it to an open, unassigned delivery request visible to partners in that city.
4. A **Delivery Partner** accepts it (`POST /api/v1/delivery/requests/:itemId/accept`), picks it up, and verifies drop-off with a 4-digit OTP (`PATCH /api/v1/delivery/assigned/:itemId/deliver`) — moving the item to `active_rental`.
5. **Notifications** fire at every step (order placed, confirmed, partner assigned, delivered) to the relevant users via the in-app notification center (and email/SMS in production, when configured).
6. The **Admin** can observe the entire pipeline — and every other city's pipeline — in real time from platform-wide analytics.

### 2.6 Authentication & authorization

- **JWT access tokens** (short-lived, kept client-side in memory) + **httpOnly refresh tokens** (rotated on every use) issue and renew sessions.
- **RBAC middleware** (`middlewares/rbac.js`) restricts each route to the roles allowed to call it (`customer`, `vendor`, `delivery_partner`, `admin`).
- **Mandatory TOTP-based 2FA** for Admin accounts (via `speakeasy` + `qrcode`).
- **Google OAuth** and **phone OTP** are supported as alternate login paths.

---

## 3. Setup Guide

### 3.1 Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | 18 or later | Required for both `frontend` and `backend` |
| npm | bundled with Node | Package manager used throughout |
| MongoDB | — | **Not required to install separately** — see below |

### 3.2 Clone the repository

```bash
git clone https://github.com/sakethnalajala/RentEase-Furniture-Appliance-Rental-Platform-Project.git
cd RentEase-Furniture-Appliance-Rental-Platform-Project
```

### 3.3 Install & configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set at least `MONGODB_URI` (see [Configuration](#5-configuration) for every variable). Everything else has a safe development fallback.

### 3.4 Start a local database

No local MongoDB install is required — the backend ships with a self-contained, in-memory MongoDB instance for development. In its own terminal (leave it running):

```bash
npm run mongo
```

> **Using a real database instead?** Point `MONGODB_URI` in `.env` at a local `mongod` instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, and skip this step.

### 3.5 Seed demo data & start the API

In a second terminal:

```bash
npm run seed   # populates cities, categories, demo accounts, catalog, orders
npm run dev    # starts the API with hot-reload (nodemon)
```

The API is now live at **`http://localhost:5000`** — confirm with:

```bash
curl http://localhost:5000/api/v1/health
```

### 3.6 Install & run the frontend

In a third terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The web app is now live at **`http://localhost:3000`**.

### 3.7 Run the test suite

```bash
cd backend
npm test
```

See [Testing](#6-testing) for details on the framework and how to extend coverage.

### 3.8 Quick verification checklist

- [ ] `GET http://localhost:5000/api/v1/health` returns `200 OK`
- [ ] `http://localhost:3000` loads the homepage
- [ ] Logging in with a demo account (see [Usage Guide](#4-usage-guide)) lands on the correct role's dashboard

---

## 4. Usage Guide

### 4.1 Demo accounts

RentEase seeds one-click demo accounts for every role so the whole platform can be evaluated without registering. All demo accounts share the password `Demo@1234` (Admin: `Admin@123`):

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@rentease.com` | `Demo@1234` |
| Vendor | `demo.vendor@rentease.com` | `Demo@1234` |
| Delivery Partner | `demo.delivery@rentease.com` | `Demo@1234` |
| Admin (2FA required on first login) | `admin@rentease.com` | `Admin@123` |

> Demo credentials are only meaningful when `DEMO_MODE=true` (the default). They are also displayed directly on the app's login/register pages.

### 4.2 Typical customer flow

1. Register or log in as a customer.
2. Select a city from the header city switcher.
3. Browse `Customer → Browse`, filter by category (furniture/appliances) and subcategory.
4. Open a product to see monthly rent, security deposit, and available tenure options.
5. Add to cart, choose a delivery address, and check out.
6. Track the order under `Customer → Rentals` through confirmation, delivery, and the active rental period.

### 4.3 API reference

All endpoints are prefixed with **`/api/v1`**. Authenticated routes expect a `Bearer` access token in the `Authorization` header (issued by `/auth/login`).

<details>
<summary><strong>Auth</strong> — <code>/auth</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new account (any role) |
| `POST` | `/auth/verify-email` | Verify email via token |
| `POST` | `/auth/login` | Email/password login (returns 2FA challenge if enabled) |
| `POST` | `/auth/login/2fa` | Complete login with a TOTP code |
| `POST` | `/auth/otp/request` / `/auth/otp/verify` | Phone OTP login |
| `POST` | `/auth/forgot-password` / `/auth/reset-password` | Password reset flow |
| `POST` | `/auth/refresh` | Rotate the access token using the refresh cookie |
| `POST` | `/auth/logout` | Invalidate the current session |
| `GET` | `/auth/google` | Google OAuth login |

</details>

<details>
<summary><strong>Catalog</strong> — <code>/products</code>, <code>/categories</code>, <code>/cities</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/products` | List products (filter by city, category, vendor, search, sort, pagination) |
| `GET` | `/products/:id` | Product detail |
| `GET` | `/products/subcategories` | List subcategories |
| `GET` | `/categories` | List categories |
| `GET` | `/cities` | List supported cities |

</details>

<details>
<summary><strong>Cart, Wishlist & Addresses</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/cart` | View / add to cart |
| `PATCH` / `DELETE` | `/cart/:itemId` | Update / remove a cart line |
| `GET` / `POST` / `DELETE` | `/wishlist` | Manage wishlist |
| `GET` / `POST` / `PATCH` / `DELETE` | `/addresses` | Manage saved delivery addresses |

</details>

<details>
<summary><strong>Orders</strong> — <code>/orders</code> (Customer & Vendor)</summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/orders/checkout` | Place an order (customer) |
| `GET` | `/orders/my` / `/orders/my/items` | List the current customer's orders/items |
| `POST` | `/orders/items/:itemId/cancel` | Cancel an order item |
| `GET` | `/orders/vendor/my` | List orders placed against a vendor's catalog |
| `PATCH` | `/orders/vendor/items/:itemId/status` | Vendor confirms/rejects an order item |

</details>

<details>
<summary><strong>Delivery Partner</strong> — <code>/delivery</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `PATCH` | `/delivery/me` | Delivery partner profile |
| `GET` | `/delivery/requests` | Open delivery requests in the partner's city |
| `POST` | `/delivery/requests/:itemId/accept` \| `/reject` | Accept/reject a request |
| `GET` | `/delivery/assigned` | Deliveries currently assigned to the partner |
| `PATCH` | `/delivery/assigned/:itemId/pickup` \| `/deliver` | Mark picked up / OTP-verified drop-off |
| `GET` | `/delivery/history` | Completed delivery history |
| `GET` | `/delivery/earnings` / `/delivery/stats` | Earnings and performance analytics |

</details>

<details>
<summary><strong>Vendor</strong> — <code>/vendors</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `PATCH` | `/vendors/me` | Vendor profile |
| `GET` | `/vendors/me/stats` | Revenue, orders & inventory KPIs |
| `GET` | `/vendors/me/delivery-partners` / `/delivery-analytics` | Delivery partner performance for this vendor's orders |

</details>

<details>
<summary><strong>Admin</strong> — <code>/admin</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/stats` / `/admin/analytics` | Platform-wide KPIs and enterprise analytics |
| `GET` / `PATCH` / `DELETE` | `/admin/vendors`, `/admin/delivery-partners` | Manage vendors & delivery partners |
| `POST` | `/admin/vendors/:id/approve` \| `/reject` \| `/suspend` \| `/reactivate` | Vendor lifecycle actions |
| `GET` / `POST` / `PATCH` / `DELETE` | `/admin/products`, `/admin/categories` | Platform catalog management |
| `GET` | `/admin/orders`, `/admin/rentals`, `/admin/payments` | Platform-wide order/rental/payment oversight |
| `GET` / `PATCH` | `/admin/settings` | Platform settings (commission %, GST, policies) |
| `GET` / `PUT` / `DELETE` | `/admin/rental-plans` | Rental tenure & discount configuration |
| `POST` | `/admin/notifications/broadcast` | Broadcast a notification to a user segment |

</details>

<details>
<summary><strong>Notifications</strong> — <code>/notifications</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | List the current user's notifications |
| `GET` | `/notifications/unread-count` | Unread badge count |
| `PATCH` | `/notifications/:id/read` \| `/read-all` | Mark as read |
| `DELETE` | `/notifications/:id` | Delete a notification |

</details>

### 4.4 Example request

```bash
# Log in as the demo customer
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.customer@rentease.com","password":"Demo@1234","role":"customer"}'

# Use the returned accessToken to fetch the catalog for a city
curl "http://localhost:5000/api/v1/products?city=<CITY_ID>&sort=newest&limit=12" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 5. Configuration

### 5.1 Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` \| `production` |
| `PORT` | No | API port (default `5000`) |
| `CLIENT_URL` | Yes | Frontend origin, used for CORS & redirect URLs |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `DEMO_MODE` | No | `true` (default) relaxes email/phone verification for demo/testing |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Yes | Secrets used to sign JWTs — **change in production** |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | No | Token lifetimes (defaults: `15m` / `30d`) |
| `EMAIL_TOKEN_SECRET` | Yes | Secret for email-verification / password-reset tokens |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | Outbound email — falls back to console-logged emails when blank |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` / `TWILIO_WHATSAPP_NUMBER` | No | SMS/WhatsApp — falls back to console-logged OTPs when blank |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | No | Google OAuth — the `/auth/google` route is disabled when blank |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | No | Image uploads — falls back to local disk storage (`backend/uploads/`) when blank |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Payments — falls back to a simulated instant-success gateway when blank |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | No | Push notifications — falls back to console logging when blank |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | No | API rate limiting window/threshold |

### 5.2 Frontend — `frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Base URL of the backend API, e.g. `http://localhost:5000/api/v1` |

### 5.3 Secrets handling

- **Never commit `.env` or `.env.local`** — both are excluded via `.gitignore`; only the `*.example` templates are tracked.
- Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `EMAIL_TOKEN_SECRET` to strong random values before any production deployment.
- In hosted environments, set environment variables through your platform's secret manager (Vercel Project Settings, Render/Railway Environment tab, etc.) rather than shipping a `.env` file.

---

## 6. Testing

### 6.1 Framework

The backend is configured for testing with **[Jest](https://jestjs.io/)** and **[Supertest](https://github.com/ladjs/supertest)** (`npm test` runs `jest --runInBand`). Tests run sequentially against an isolated in-memory MongoDB instance so they never touch development or production data.

### 6.2 Running tests

```bash
cd backend
npm test
```

### 6.3 Test strategy

| Layer | Approach |
|---|---|
| **Unit** | Pure functions in `utils/` and `services/` (token generation, fee calculation, etc.) |
| **Integration** | Supertest against the Express app for full request/response cycles, including auth, RBAC, and validation |
| **Seed/E2E smoke** | The `npm run seed` script itself acts as a repeatable smoke test — a clean run with no thrown errors confirms the full data model and demo-order lifecycle are consistent |

### 6.4 Writing a new test

Place test files alongside the module they cover, using the `*.test.js` suffix, for example:

```js
// backend/src/utils/__tests__/computeDeliveryFee.test.js
const { computeDeliveryFee } = require('../computeDeliveryFee');

describe('computeDeliveryFee', () => {
  it('returns a non-negative fee for a valid order item', () => {
    const fee = computeDeliveryFee({ deliveryCharge: 100 });
    expect(fee).toBeGreaterThanOrEqual(0);
  });
});
```

For controller-level integration tests, use Supertest against the exported Express `app`:

```js
const request = require('supertest');
const app = require('../app');

describe('GET /api/v1/health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});
```

> **Coverage status:** the testing framework and configuration are fully wired up; expanding automated test coverage across controllers and services is tracked under [Future Enhancements](#future-enhancements-recap). Contributions here are especially welcome — see [Contributing](#8-contributing).

---

## 7. Deployment

### 7.1 Recommended targets

| Component | Recommended platform | Why |
|---|---|---|
| **Frontend** (Next.js) | [Vercel](https://vercel.com) | First-class Next.js App Router support, zero-config deploys from GitHub |
| **Backend** (Express API) | Render, Railway, Fly.io, or any Node-compatible host | Long-running Express servers need a persistent Node process; Vercel's serverless model would require restructuring the API into individual functions |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier is sufficient to start) | Managed, production-grade MongoDB with automatic backups |
| **File storage** | [Cloudinary](https://cloudinary.com) | Already integrated; free tier covers demo/small-scale use |

### 7.2 Local

Covered fully in [Setup Guide](#3-setup-guide) — `npm run mongo` + `npm run dev` (backend) and `npm run dev` (frontend).

### 7.3 Staging / Production build

**Backend:**

```bash
cd backend
npm install --omit=dev
npm start
```

**Frontend:**

```bash
cd frontend
npm install
npm run build
npm start
```

### 7.4 Deploying the frontend to Vercel

1. Import the GitHub repository into Vercel and set the project's **Root Directory** to `frontend`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` pointing at your deployed backend's `/api/v1` URL.
3. Vercel auto-detects Next.js and runs `npm run build` on every push to `main`.

### 7.5 Deploying the backend

1. Create a new Web Service on your chosen Node host, with **Root Directory** set to `backend`.
2. Build command: `npm install`. Start command: `npm start`.
3. Set every variable listed in [Configuration §5.1](#5-configuration) as an environment variable on the host — at minimum `MONGODB_URI`, `CLIENT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `EMAIL_TOKEN_SECRET`.
4. Point `MONGODB_URI` at your MongoDB Atlas cluster.
5. After the first deploy, run `npm run seed` once (via the host's shell/console) to populate demo data, if desired.

### 7.6 CI/CD

A continuous-integration pipeline is not yet included in this repository. The recommended baseline for contributors is a GitHub Actions workflow that, on every pull request, installs dependencies and runs `npm test` (backend) and `npm run build` (frontend) — see [Contributing](#8-contributing) if you'd like to add one.

---

## 8. Contributing

### 8.1 Branching model

- `main` is always deployable.
- Create feature branches off `main` using the pattern `feature/<short-description>`, `fix/<short-description>`, or `chore/<short-description>`.

### 8.2 Workflow

1. Fork the repository (external contributors) or create a branch (team members).
2. Make your changes, keeping commits focused and descriptive.
3. Run linting and tests locally before opening a PR:
   ```bash
   cd frontend && npm run lint
   cd backend && npm test
   ```
4. Open a pull request against `main` with a clear description of **what** changed and **why**.
5. Address review feedback; squash-merge once approved.

### 8.3 Code style

- **Frontend:** ESLint (`next/core-web-vitals` config) — run `npm run lint` inside `frontend/`.
- **Backend:** plain CommonJS, validated with Zod schemas per route; keep controllers thin and push business logic into `services/`.
- Match existing naming and file-organization conventions within each directory before introducing new patterns.

### 8.4 Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) style where practical:

```
feat: add rental extension request flow
fix: correct delivery fee rounding on cancellation
docs: update API reference for admin endpoints
```

### 8.5 Pull request checklist

- [ ] Code builds locally (`npm run build` for frontend, app starts cleanly for backend)
- [ ] `npm test` passes (backend)
- [ ] `npm run lint` passes (frontend)
- [ ] No secrets or `.env` files included in the diff
- [ ] README/docs updated if behavior or setup steps changed

---

## 9. FAQ & Troubleshooting

**Q: `npm run dev` / `npm run build` fails with a "not recognized as an internal or external command" or `MODULE_NOT_FOUND` error on Windows.**
A: This happens when the project's local folder path contains an `&` character — npm's Windows shell-out splits the command on it. Rename the local folder to remove any `&`, or invoke the binary directly, e.g. `node ./node_modules/next/dist/bin/next build`.

**Q: The backend can't connect to MongoDB.**
A: Confirm `npm run mongo` is running in its own terminal (it must stay open) and that `MONGODB_URI` in `backend/.env` matches the port it printed (default `mongodb://127.0.0.1:27117/rentease`). If using Atlas, confirm your IP is allow-listed and the connection string includes valid credentials.

**Q: Login works but I immediately get logged out / refresh fails.**
A: Ensure `CLIENT_URL` in the backend `.env` exactly matches the URL the frontend is actually running on (including port), and that `NEXT_PUBLIC_API_URL` in the frontend `.env.local` points at the backend's `/api/v1` path. Cookie-based refresh requires the two origins to be correctly paired.

**Q: Image uploads aren't appearing.**
A: Without Cloudinary credentials, uploads are stored locally under `backend/uploads/` and served from the API origin — this is expected in dev mode. Add `CLOUDINARY_*` variables to enable cloud storage.

**Q: Payments, SMS, or emails aren't actually being sent.**
A: This is intentional in demo mode — every third-party integration without configured credentials logs a simulated action to the console instead of calling a real, paid API. Add the relevant provider's credentials to go live.

**Q: The Admin account asks for a 2FA code I don't have.**
A: In `DEMO_MODE=true`, any well-formed 6-digit code is accepted for Admin 2FA setup/verification — this is documented, demo-only behavior. Set `DEMO_MODE=false` for real 2FA enforcement in production.

**Q: `npm run seed` doesn't seem to reflect in the running app.**
A: The dev server (`nodemon`) does not automatically re-run the seed script on file changes — restart the API process after reseeding to guarantee it's reading fresh data from a clean connection.

---

## 10. License & Credits

### License

This project is licensed under the [MIT License](LICENSE).

### Credits

- **Author:** Nalajala Saketh
- **Internship Organisation:** Unified Mentor
- **Project Title:** RentEase – Furniture & Appliance Rental Platform

### Acknowledgements

Built with [Next.js](https://nextjs.org), [Express](https://expressjs.com), [MongoDB](https://www.mongodb.com), [Redux Toolkit](https://redux-toolkit.js.org), and [Tailwind CSS](https://tailwindcss.com), among other open-source packages listed in `backend/package.json` and `frontend/package.json`.

---

<a id="future-enhancements-recap"></a>
### Future Enhancements

- Native mobile applications for Customers and Delivery Partners
- Live, real-time order/delivery tracking (Socket.IO groundwork already present)
- Subscription bundles and auto-renewing rental plans
- Online payment auto-renewals and automated vendor payout/settlement reporting
- In-app chat between customers, vendors, and delivery partners
- Smart appliance usage tracking and furniture customization options
- Multi-language and multi-currency support for broader geographic expansion
- Public OpenAPI/Swagger documentation
- Expanded automated test coverage (unit + integration) across all four portals

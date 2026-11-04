# Nexus SaaS — Enterprise Management & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5.21-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-v4-purple?style=for-the-badge&logo=auth0&logoColor=white)](https://next-auth.js.org/)
[![Vitest](https://img.shields.io/badge/Vitest-89_Passed-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An enterprise-grade, full-stack SaaS administrative dashboard and business intelligence platform built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **NextAuth.js**.

Nexus is engineered as a fully functional, production-ready system rather than a static presentation mockup. Every metric, chart bucket, stock adjustment, and order transition is executed against an ACID-compliant relational database with atomic transactions, strict role-based access control (RBAC), and automated testing suites.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Screenshots & Visual Tour](#screenshots--visual-tour)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Security Features](#security-features)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Database Schema & ERD](#database-schema--erd)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Project Overview

Modern SaaS companies require reliable operational back-offices capable of unifying order fulfillment, inventory monitoring, user administration, and financial performance metrics into a single cohesive interface.

**Nexus** addresses this need by providing:
- **Synchronized Analytics:** Date-range-aware metrics (7 Days, 30 Days, 90 Days, 1 Year) with true period-over-period percentage comparisons and daily aggregated revenue buckets.
- **Transactional Consistency:** Database-level `$transaction` execution ensuring that order creation, cancellations, and inventory movements never cause race conditions or orphan records.
- **Granular Security:** Edge Middleware route guards combined with server-side session and API permission enforcement.
- **Enterprise UX:** Dark and light theme support with zero layout shift, responsive tables with slide-out drawers, accessible dialogs, and instant RFC-4180 CSV audit exports.

---

## Key Features

### 1. Real-Time Analytics & KPI Engine
- **Period-Over-Period Metrics:** Accurately computes Total Revenue, Active/New Users, Order Counts, and Average Order Value (AOV) compared against previous equal-length timeframes.
- **Interactive Visualizations:** Area and Bar charts powered by Recharts, rendering daily or monthly revenue and registration distributions dynamically based on the chosen filter.
- **Optimized Query Aggregation:** Avoids N+1 database queries through batch aggregation and Prisma grouping algorithms.

### 2. Product Catalog & Inventory Governance
- **Automated Stock Monitoring:** Real-time stock status badges (`In Stock`, `Low Stock`, `Out of Stock`).
- **Low-Stock Notification Pipeline:** Centralized notification triggers alerting administrative staff when inventory drops below defined safety thresholds (<= 5 units).
- **Relational Categorization:** Structured taxonomy with category-level product counts and cascade protections.
- **Strict SKU Uniqueness:** Zod and database constraint enforcement preventing duplicate stock identification codes.

### 3. Atomic Order Fulfillment & State Machine
- **ACID Transaction Rollbacks:** Guarantees atomic stock decrement upon order placement. If any item in a multi-line order lacks sufficient inventory, the entire transaction rolls back cleanly.
- **Order State Machine:** Enforces strict transition business logic across lifecycle states:
  $$\text{PENDING} \longrightarrow \text{PROCESSING} \longrightarrow \text{COMPLETED}$$
  $$\text{PENDING / PROCESSING} \longrightarrow \text{CANCELLED}$$
- **Automated Inventory Reversal:** Cancelling an order automatically restores product stock. Reactivating a cancelled order verifies current stock availability before re-allocating units.
- **Interactive Multi-Item Modal:** Allows administrators and users to assemble multi-product orders with live subtotal and total calculations.

### 4. Administrative User Directory
- **Lifecycle Management:** User directory with status toggles (`ACTIVE`, `INACTIVE`, `SUSPENDED`) and role assignment (`ADMIN`, `USER`).
- **Account Lockout Protections:** Prevents accidental self-deletion or deletion of the last remaining administrator account.
- **Dynamic Search & Filtering:** Server-side search by name or email with status filtering.

### 5. Business Intelligence & Financial Audit Export
- **Revenue Breakdown by Category & Top Products:** Identifies best-performing inventory by net volume and sales value.
- **RFC-4180 Compliant CSV Export:** Generates financial and operational audit spreadsheets with sanitized escaping and instant browser download.

### 6. Notifications & System Auditing
- **Targeted Dispatch:** Inventory alerts (`STOCK`) and high-value order alerts (`ORDER`) are routed strictly to users with the `ADMIN` role.
- **Actionable Notification Feed:** Unread counters, one-click mark-as-read, clear-all functionality, and visual alert types (`INFO`, `WARNING`, `SUCCESS`, `STOCK`, `ORDER`).
- **Activity Logs:** Audit trail recording administrative actions, profile updates, and authentication events with timestamps.

### 7. Modern UI / UX Architecture
- **Dual Theming:** Seamless Dark and Light theme integration powered by `next-themes` with WCAG-compliant contrast ratios across both modes.
- **Responsive Layout:** Desktop sidebar with collapsed states and mobile drawer navigation.
- **Defensive Form Handling:** HTML5 `noValidate` attributes pairing with custom Zod inline error indicators that dynamically clear as fields are edited.

---

## Screenshots & Visual Tour

> *Placeholder: High-resolution screenshots of the Nexus dashboard interface.*

| Dashboard Overview (Dark Mode) | Analytics & Reports (Light Mode) |
| :---: | :---: |
| ![Dashboard Overview](https://raw.githubusercontent.com/emiranskr/nexus-saas-dashboard/main/docs/screenshots/dashboard-dark.png) <br><sub>*Dynamic KPI metrics, revenue charts, and live order feed*</sub> | ![Financial Reports](https://raw.githubusercontent.com/emiranskr/nexus-saas-dashboard/main/docs/screenshots/reports-light.png) <br><sub>*Category sales distributions and RFC-4180 CSV export*</sub> |

| Order Management & State Machine | Product Catalog & Inventory |
| :---: | :---: |
| ![Orders Management](https://raw.githubusercontent.com/emiranskr/nexus-saas-dashboard/main/docs/screenshots/orders-dark.png) <br><sub>*Status workflows, transaction modals, and payment methods*</sub> | ![Products Catalog](https://raw.githubusercontent.com/emiranskr/nexus-saas-dashboard/main/docs/screenshots/products-light.png) <br><sub>*Stock thresholds, category filtering, and SKU controls*</sub> |

---

## Tech Stack

| Layer | Technology | Version | Purpose / Architectural Role |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `14.2.15` | Hybrid Server/Client Components, dynamic API routes, and Edge Middleware |
| **Frontend** | React | `18.3.1` | Declarative UI state, memoized callbacks, and concurrent rendering |
| **Language** | TypeScript | `5.6.3` | End-to-end type safety, strict compiler checks, and shared data contracts |
| **Styling** | Tailwind CSS | `3.4.14` | Utility-first responsive design tokens and dark/light mode class variants |
| **Primitives** | Radix UI | Latest | Accessible headless dialogs, dropdowns, tooltips, select menus, and avatars |
| **Charts** | Recharts | `2.13.0` | Declarative SVG charting for area charts, bar charts, and category graphs |
| **ORM** | Prisma ORM | `5.21.1` | Type-safe query building, relational schema modeling, and migrations |
| **Database** | SQLite / PostgreSQL | – | Zero-config SQLite for local dev & testing; seamlessly swappable with PostgreSQL |
| **Auth** | NextAuth.js | `4.24.8` | JWT session management, Credentials provider, and Edge Middleware guards |
| **Encryption** | bcryptjs | `2.4.3` | 10-round salted password hashing |
| **Validation** | Zod | `3.23.8` | Runtime schema validation for forms, URL parameters, and API route bodies |
| **Testing** | Vitest | `2.1.9` | High-speed unit, integration, and transactional database test runner |
| **E2E Testing** | Playwright / Chrome CDP | `1.64.1` | Headless browser test runner for authentication and end-to-end user flows |

---

## System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      Client Web Browser       │
                                  │   (React 18 / Tailwind CSS)   │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │     Next.js Edge Middleware   │
                                  │  (JWT Check & Route Guarding) │
                                  └───────────────┬───────────────┘
                                                  │
                        ┌─────────────────────────┴─────────────────────────┐
                        ▼                                                   ▼
         ┌──────────────────────────────┐                    ┌──────────────────────────────┐
         │     Server Components /      │                    │      API Route Handlers      │
         │       App Router Pages       │                    │    (Zod Schema Validation)   │
         └──────────────┬───────────────┘                    └──────────────┬───────────────┘
                        │                                                   │
                        └─────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      NextAuth.js Session      │
                                  │   & RBAC Permission Verifier  │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │       Prisma Client ORM       │
                                  │   (Parameterized SQL Queries  │
                                  │    & Atomic $transactions)    │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      Relational Database      │
                                  │  (SQLite Dev / PostgreSQL)   │
                                  └───────────────────────────────┘
```

---

## Security Features

1. **Cryptographic Password Storage:** Passwords are never stored in plaintext. All credentials undergo 10-round salted hashing using `bcryptjs`.
2. **Defensive Edge Middleware:** Unauthenticated requests attempting to access protected endpoints (`/dashboard/*`, `/api/users/*`, etc.) are intercepted at the Edge layer and redirected to the login flow.
3. **Session Token Hardening:** NextAuth session tokens are signed with cryptographic secrets via HTTP-only cookies, preventing XSS-based cookie exfiltration.
4. **Mandatory Production Secrets:** In production (`NODE_ENV=production`), the application validates that `NEXTAUTH_SECRET` is present, securely configured, and has a minimum length of 32 characters, preventing deployment with insecure default credentials.
5. **SQL Injection Immunity:** All database communication occurs through Prisma ORM using parameterized prepared statements. Raw unescaped SQL strings are not utilized.
6. **Input Sanitization with Zod:** Every incoming API payload is validated against strict Zod schemas before reaching the business logic layer, rejecting malformed types, invalid formats, or unexpected properties.
7. **Cross-Site Scripting (XSS) Prevention:** React's automated JSX escaping eliminates DOM-based code injection vulnerabilities.
8. **ACID Transaction Isolation:** High-risk operations (such as multi-line order placement and stock deduction) are wrapped in `prisma.$transaction()` blocks, ensuring that operations either complete entirely or roll back cleanly.

---

## Role-Based Access Control (RBAC)

Nexus enforces strict separation of privileges between administrators and standard users across both the UI and API layers:

| Resource / Endpoint | `ADMIN` Role | `USER` Role | Unauthenticated |
| :--- | :---: | :---: | :---: |
| **Login & Registration** (`/login`, `/register`) | Full Access | Full Access | Full Access |
| **Dashboard Overview** (`/dashboard`) | View All Metrics | View Own Metrics | Redirected to `/login` |
| **Users Directory** (`/dashboard/users`) | Read / Write / Delete | **Access Denied (403)** | Redirected to `/login` |
| **Product Catalog** (`/dashboard/products`) | Create / Edit / Delete | Read Only | Redirected to `/login` |
| **Orders View** (`/dashboard/orders`) | Manage All Orders | View / Create Own Orders | Redirected to `/login` |
| **Order Status Transitions** (`/api/orders/[id]`) | All Valid Statuses | Cancel Own Pending Order | Unauthorized (401) |
| **BI Reports & CSV Export** (`/dashboard/reports`) | View & Export CSV | **Access Denied (403)** | Redirected to `/login` |
| **Low-Stock Notifications** | Receive & Manage | Restricted (No alerts) | Unauthorized (401) |
| **User Settings & Profile** (`/dashboard/settings`) | Manage Own Profile | Manage Own Profile | Redirected to `/login` |

---

## Database Schema & ERD

The relational database structure is defined in [`prisma/schema.prisma`](prisma/schema.prisma):

```mermaid
erDiagram
    USER ||--o{ ORDER : "places"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ ACTIVITY_LOG : "triggers"
    CATEGORY ||--o{ PRODUCT : "classifies"
    PRODUCT ||--o{ ORDER_ITEM : "contains"
    ORDER ||--o{ ORDER_ITEM : "includes"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        string role "ADMIN | USER"
        string status "ACTIVE | INACTIVE | SUSPENDED"
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }

    CATEGORY {
        string id PK
        string name UK
        string slug UK
        string description
        datetime createdAt
    }

    PRODUCT {
        string id PK
        string name
        string sku UK
        string description
        float price
        int stock
        string categoryId FK
        string status "ACTIVE | DRAFT | ARCHIVED"
        datetime createdAt
        datetime updatedAt
    }

    ORDER {
        string id PK
        string orderNumber UK
        string userId FK
        float totalAmount
        string status "PENDING | PROCESSING | COMPLETED | CANCELLED"
        string paymentMethod "CREDIT_CARD | BANK_TRANSFER"
        datetime createdAt
        datetime updatedAt
    }

    ORDER_ITEM {
        string id PK
        string orderId FK
        string productId FK
        int quantity
        float unitPrice
        float subtotal
    }

    NOTIFICATION {
        string id PK
        string userId FK
        string title
        string message
        string type "INFO | WARNING | SUCCESS | ORDER | STOCK"
        boolean isRead
        datetime createdAt
    }

    ACTIVITY_LOG {
        string id PK
        string userId FK
        string action
        string details
        string ipAddress
        datetime createdAt
    }
```

---

## Installation & Setup

### Prerequisites
- **Node.js:** `v18.17.0` or higher (LTS recommended)
- **Package Manager:** `npm` (v9+), `pnpm`, or `yarn`
- **Operating System:** Windows (PowerShell / Command Prompt), macOS, or Linux

### 1. Clone the Repository
```bash
git clone https://github.com/emiranskr/nexus-saas-dashboard.git
cd nexus-saas-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

> **Note for Windows PowerShell Users:** If PowerShell script execution policies prevent running local `.ps1` files, invoke npm commands using `npm.cmd` (e.g., `npm.cmd install`, `npm.cmd test`).

### 3. Configure Environment Variables
Create your local environment file by copying the template:

**On Linux / macOS:**
```bash
cp .env.example .env
```

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

*(The default `.env` is pre-configured with a zero-setup local SQLite database `file:./dev.db`).*

### 4. Initialize Database & Seed Sample Data
Synchronize the Prisma schema and seed realistic SaaS records (users, categories, products with low-stock alerts, 90-day order histories, notifications, and activity logs):

```bash
npm run prisma:push
npm run prisma:seed
```

### 5. Launch the Development Server
```bash
npm run dev
```

The application will be accessible at: **[http://localhost:3000](http://localhost:3000)**.

### 6. Switching to PostgreSQL for Production (Optional)
The project is built to allow an instant transition from local SQLite to a production-grade PostgreSQL instance (e.g., Supabase, Neon, AWS RDS, Railway):

1. In `prisma/schema.prisma`, update the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. In your production `.env`, supply your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/nexus_db?schema=public"
   ```
3. Push the schema and seed the database:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

---

## Environment Variables

| Variable | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `file:./dev.db` | Relational database connection string (SQLite file path or PostgreSQL URL). |
| `NEXTAUTH_SECRET` | **Yes** | `your-32-character-secret-key-here` | Secret key used to sign NextAuth JWT session cookies. Minimum 32 chars in production. |
| `NEXTAUTH_URL` | **Yes** | `http://localhost:3000` | The canonical URL of your deployment (used for authentication callbacks). |

To generate a secure 32-character secret:
```bash
openssl rand -base64 32
```

---

## Demo Accounts

For demonstration, recruitment review, and portfolio evaluation, the database seed script provides three pre-configured accounts. Quick-fill buttons are also available directly on the `/login` screen:

| Account Type | Email | Password | Role | Description & Permissions |
| :--- | :--- | :--- | :---: | :--- |
| **Admin** | `admin@nexus.io` | `Admin123!` | `ADMIN` | Primary administrator with full access to user management, BI reports, orders, products, and inventory alerts. |
| **Staff** | `staff@nexus.io` | `Admin123!` | `ADMIN` | Operations manager account with administrative authority for inventory control, order updates, and customer management. |
| **User** | `user@nexus.io` | `User123!` | `USER` | Standard customer account with access to personal orders, checkout workflows, and profile settings. |

> **Security Notice:** The passwords listed above are strictly for local development and demonstration purposes. In production environments, credentials are securely hashed and managed through standard registration and administrative assignment.

---

## Running Tests

Nexus is equipped with a dual testing architecture consisting of **Vitest** for fast unit/integration testing and **Playwright / Chrome CDP** for end-to-end browser workflows.

### 1. Unit & Integration Tests (Vitest)
Executes **89 automated tests across 12 test suites** validating Zod schemas, middleware security, NextAuth production secrets, database models, transaction rollback mechanics, concurrent stock decrements, low-stock notifications, and N+1 query elimination:

```bash
npm test
```

*Example Vitest output:*
```text
✓ tests/unit/validations.test.ts (12 tests)
✓ tests/unit/middleware.test.ts (9 tests)
✓ tests/unit/auth_secret.test.ts (8 tests)
✓ tests/integration/auth_and_db.test.ts (6 tests)
✓ tests/unit/utils.test.ts (6 tests)
✓ tests/integration/order_user_rbac.test.ts (5 tests)
✓ tests/integration/api_error_handling.test.ts (10 tests)
✓ tests/integration/dashboard_stats_rbac.test.ts (3 tests)
✓ tests/integration/dashboard_stats_performance.test.ts (4 tests)
✓ tests/integration/low_stock_notification.test.ts (6 tests)
✓ tests/integration/admin_pages_rbac.test.ts (10 tests)
✓ tests/integration/order_stock_lifecycle.test.ts (10 tests)

Test Files  12 passed (12)
     Tests  89 passed (89)
```

To run tests in watch mode during development:
```bash
npm run test:watch
```

### 2. Standalone End-to-End Browser Tests (Edge / Chrome CDP)
Executes **10 end-to-end browser scenarios** against an isolated Next.js runtime port, verifying server health, authentication redirects, KPI rendering, user management tables, product creation, order transitions, and CSV downloads:

```bash
npm run test:e2e
```

### 3. Playwright E2E Suite
```bash
npm run test:playwright
```

### 4. Production Build Verification
To compile and test the optimized production distribution:
```bash
npm run build
npm run start
```

---

## Project Structure

```text
nexus-saas-dashboard/
├── .env.example                     # Template environment configuration
├── .gitignore                       # Git exclusions for dependencies and SQLite db
├── next.config.mjs                  # Next.js framework configuration
├── package.json                     # Project scripts and dependencies
├── playwright.config.ts             # Playwright E2E test configuration
├── postcss.config.mjs               # PostCSS configuration for Tailwind
├── tailwind.config.ts               # Custom design system tokens, fonts, and colors
├── tsconfig.json                    # TypeScript compiler options
├── vitest.config.ts                 # Vitest test runner configuration
│
├── prisma/
│   ├── schema.prisma                # Relational Prisma models, relations, and indexes
│   ├── dev.db                       # Local development SQLite database (after push)
│   └── seed.ts                      # Realistic seed script for users, products, and orders
│
├── src/
│   ├── middleware.ts                # Edge Middleware route protection and RBAC guards
│   │
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/               # Sign-in page with quick-fill demo buttons
│   │   │   └── register/            # Customer registration page
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth route handler (JWT & session callbacks)
│   │   │   ├── auth/register/       # User self-registration endpoint
│   │   │   ├── categories/          # Product categories list and indexing
│   │   │   ├── dashboard/stats/     # Optimized KPI metrics and chart aggregation
│   │   │   ├── notifications/       # User notification status and read mutations
│   │   │   ├── orders/              # Transactional order placement, status state machine
│   │   │   ├── products/            # Product catalog CRUD with stock alert triggers
│   │   │   ├── reports/             # Financial aggregation and RFC-4180 CSV streaming
│   │   │   ├── user/profile/        # Profile updates and password reset
│   │   │   └── users/               # Administrative user directory and role mutations
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Dashboard shell with responsive navigation
│   │   │   ├── page.tsx             # Main dashboard analytics and KPI cards
│   │   │   ├── notifications/       # In-app notification center
│   │   │   ├── orders/              # Order management table and creation modal
│   │   │   ├── products/            # Product catalog, stock filters, and CRUD modals
│   │   │   ├── reports/             # BI visualizations and CSV export button
│   │   │   ├── settings/            # User account settings and preferences
│   │   │   └── users/               # Administrative user management directory
│   │   │
│   │   ├── globals.css              # Global styles, Tailwind directives, and CSS variables
│   │   ├── layout.tsx               # Root layout with NextAuth and Next-Themes providers
│   │   └── page.tsx                 # Root landing page redirecting to dashboard or login
│   │
│   ├── components/
│   │   ├── layout/                  # Sidebar, Topbar, MobileNav, and ThemeToggle
│   │   ├── providers/               # NextAuth session and Next-Themes context providers
│   │   └── ui/                      # Reusable UI primitives (Button, Card, Badge, Modal, Input)
│   │
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth credentials provider and JWT callbacks
│   │   ├── prisma.ts                # PrismaClient singleton with global caching
│   │   ├── utils.ts                 # Formatting helpers for currency, dates, and classNames
│   │   └── validations.ts           # Strict Zod schemas for domain entities
│   │
│   └── types/
│       └── next-auth.d.ts           # TypeScript type augmentations for session and token
│
└── tests/
    ├── e2e/
    │   ├── e2e_runner.ts            # Headless Chrome/Edge CDP automated test suite
    │   └── nexus.spec.ts            # Playwright end-to-end browser test specifications
    ├── integration/
    │   ├── admin_pages_rbac.test.ts # RBAC boundary tests for admin pages
    │   ├── api_error_handling.test.ts # Centralized error handling and status codes
    │   ├── auth_and_db.test.ts      # Relational integrity and password hashing tests
    │   ├── dashboard_stats_performance.test.ts # Performance & N+1 query elimination
    │   ├── dashboard_stats_rbac.test.ts # Analytics RBAC security tests
    │   ├── low_stock_notification.test.ts # Stock threshold notification dispatch tests
    │   ├── order_stock_lifecycle.test.ts  # Transaction rollback and stock state machine
    │   └── order_user_rbac.test.ts  # Cross-tenant order isolation tests
    └── unit/
        ├── auth_secret.test.ts      # Production secret validation tests
        ├── middleware.test.ts       # Edge middleware routing and redirection tests
        ├── utils.test.ts            # Numeric, currency, and date formatting tests
        └── validations.test.ts      # Zod validation schema coverage tests
```

---

## Future Improvements

- [ ] **Webhook Infrastructure:** Dispatch real-time webhooks for key system events (`order.completed`, `stock.low`).
- [ ] **Multi-Currency Support:** Dynamic currency conversion for international SaaS deployments.
- [ ] **Two-Factor Authentication (2FA/TOTP):** Time-based one-time password verification for administrative accounts.
- [ ] **Distributed Cache Layer:** Redis / Upstash caching for high-frequency dashboard analytics under high concurrent loads.
- [ ] **Audit Trail Log Export:** Filterable and exportable administrative security logs.

---

## License

This project is licensed under the [MIT License](LICENSE).

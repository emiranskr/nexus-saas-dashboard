# 🚀 Nexus — Modern SaaS Management & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-5.21-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-v4-purple?style=for-the-badge&logo=auth0)](https://next-auth.js.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-FCC72B?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?style=for-the-badge&logo=playwright)](https://playwright.dev/)

> **Nexus** is an enterprise-grade, full-stack SaaS management and analytics platform engineered with Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM, NextAuth (JWT & RBAC), and automated testing suites.
>
> Designed from the ground up for real-world business operations, **Nexus is NOT a template or static mockup.** Every metric, graph, user action, and order is calculated in real-time from an ACID-compliant relational database with atomic transaction rollbacks, secure password hashing, and in-depth business intelligence reports with instant CSV exports.

---

## 🌟 Key Features

### 1. 📊 Real-Time Analytics Dashboard
- **Dynamic KPI Metrics:** Real-time revenue aggregation, total order counts, active customer counts, and average order value.
- **Period-Over-Period Comparison:** Dynamic percentage change calculation comparing the selected period with previous historical periods.
- **Interactive Revenue & Customer Growth Visualizations:** Responsive Area & Bar charts powered by Recharts with dynamic date filters (`7 Gün`, `30 Gün`, `90 Gün`, `1 Yıl`).
- **Live Activity Feed & Recent Orders:** Real-time logging of system transactions, registrations, and status mutations.

### 2. 🔐 Authentication & Role-Based Access Control (RBAC)
- **NextAuth.js Integration:** Session management utilizing hardened JWT tokens with server-side signature verification.
- **Secure Password Hashing:** 10-round salted bcrypt cryptography.
- **Fine-Grained Roles:** `ADMIN` (full system access, catalog & user CRUD, role escalation) and `USER` (customer portal, personal order tracking, profile settings).
- **Protected Routing:** Next.js Edge Middleware route guarding (`/dashboard/*`, `/api/*`) preventing unauthorized cross-tenant data access.
- **One-Click Demo Authentication:** Pre-configured fast-login buttons for recruiters and portfolio evaluators on `/login`.

### 3. 👥 Comprehensive User Management
- **Full CRUD Operations:** Add new users, update profile data, change status (`ACTIVE`, `INACTIVE`, `SUSPENDED`), and modify permission tiers.
- **Defensive Deletion:** Self-deletion and accidental administrator account lockout prevention.
- **Search, Filter & Pagination:** Instant keyword search and multi-attribute filtering over server-side datasets.

### 4. 📦 Product & Inventory Catalog
- **Stock Management:** Automatic stock level monitoring with configurable low-stock threshold triggers.
- **SKU Uniqueness Validation:** Strict backend schema validation preventing duplicate inventory codes.
- **Category Association:** Relational product categorization with aggregate count indexing.
- **Visual Stock Status:** Real-time badge indicators for In Stock, Low Stock (<10 units), and Out of Stock.

### 5. 🛒 Atomic Order Processing Engine
- **Prisma Database Transactions (`$transaction`):** Zero race conditions. Guarantees atomic stock decrementing upon order placement and automatic stock restoration upon order cancellation.
- **Order Tracking & Lifecycle:** State machine supporting four core order statuses: `PENDING` ➔ `PROCESSING` ➔ `COMPLETED`, plus `CANCELLED`. Enforces strict business transition rules (e.g., `COMPLETED` orders cannot revert to `PENDING` or `PROCESSING`; cancelling automatically restores inventory, and reactivating verifies stock availability and re-reserves units).
- **Dynamic Order Number Generation:** Timestamped collision-resistant unique identifiers.
- **Customer Order Creation:** Interactive modal supporting multi-item selection with real-time subtotal calculation.

### 6. 📈 Business Intelligence & CSV Export
- **Custom Date Range Analysis:** Period filtering across 7-day, 30-day, 90-day, and 1-year operational windows.
- **Category & Top-Selling Breakdown:** Visual ranking of best-selling products by quantity and net revenue.
- **Order Status Distribution:** Radial breakdown of order lifecycle states.
- **One-Click RFC-4180 CSV Export:** Direct file streaming generating spreadsheet-ready financial audit reports (`nexus-sales-report.csv`).

### 7. 🔔 In-App Notification Center
- **Automated Inventory Alerts:** Real-time alerts generated when product inventory reaches critical levels.
- **Order Placement Alerts:** Automatic alerts upon high-value or new order completions.
- **Interactive Notification Management:** Mark individual alerts as read or clear all with instant badge count updates.

### 8. 🎨 Premium UI / UX Design
- **Modern Minimalist Aesthetics:** Slate-zinc color palette inspired by Linear and Vercel.
- **True Dark / Light Mode Support:** Seamless system-aware theme switching via `next-themes` with zero layout shift.
- **Collapsible & Responsive Navigation:** Mobile slide-out drawer, persistent desktop sidebar, and breadcrumbs.
- **Accessible State Handling:** Tailored skeletons, empty states, error boundaries, and loading indicators.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Server-Side Rendering (SSR), Server Components, and Dynamic API Routes |
| **Frontend UI** | React 18, Tailwind CSS | Modular component architecture with utility-first responsive styling |
| **Component Kit** | Radix UI Primitives, Lucide Icons | Accessible headless UI controls with crisp vector iconography |
| **State & Theming** | Next-Themes, React Context | System-aware dark/light theme persistence and session context |
| **Visualizations** | Recharts | Composable and responsive SVG area, bar, and pie charts |
| **Backend & APIs** | Next.js API Routes (Node.js runtime) | RESTful API endpoints with error handling and status code compliance |
| **Validation** | Zod | Strictly typed runtime validation schemas for forms and API requests |
| **Database ORM** | Prisma ORM (v5) | Type-safe query building, relational schema modeling, and migrations |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Zero-setup local SQLite database; instantly swappable with PostgreSQL |
| **Authentication** | NextAuth.js v4 + BcryptJS | JWT credentials provider, password hashing, and edge middleware RBAC |
| **Unit & Integration** | Vitest | Fast test runner verifying validation schemas, math, and DB logic |
| **End-to-End Testing** | Playwright + Chrome/Edge CDP | Headless end-to-end browser tests verifying user and admin workflows |

---

## 🗄️ Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ ORDER : "places"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ ACTIVITY_LOG : "performs"
    CATEGORY ||--o{ PRODUCT : "categorizes"
    PRODUCT ||--o{ ORDER_ITEM : "included in"
    ORDER ||--o{ ORDER_ITEM : "contains"

    USER {
        string id PK
        string email UK
        string name
        string password
        string role "ADMIN | USER"
        string status "ACTIVE | INACTIVE | SUSPENDED"
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
        datetime createdAt
        datetime updatedAt
    }

    ORDER_ITEM {
        string id PK
        string orderId FK
        string productId FK
        int quantity
        float unitPrice
        float totalPrice
    }

    NOTIFICATION {
        string id PK
        string userId FK
        string title
        string message
        string type "INFO | SUCCESS | WARNING | ERROR"
        boolean isRead
        datetime createdAt
    }

    ACTIVITY_LOG {
        string id PK
        string userId FK
        string action
        string details
        datetime createdAt
    }
```

---

## 📁 Project Directory Structure

```text
nexus-saas/
├── .env.example                # Template for environment configuration
├── .gitignore                  # Git exclusions for node_modules, build & db
├── next.config.mjs             # Next.js configuration
├── package.json                # Project dependencies and operational scripts
├── playwright.config.ts        # Playwright E2E configuration
├── postcss.config.mjs          # PostCSS Tailwind plugins
├── tailwind.config.ts          # Custom design system tokens and colors
├── tsconfig.json               # TypeScript compiler rules
├── vitest.config.ts            # Vitest unit/integration test configuration
├── prisma/
│   ├── schema.prisma           # Prisma relational schema definitions
│   ├── dev.db                  # Local development SQLite database (seeded)
│   └── seed.ts                 # Database seeder with realistic SaaS datasets
├── src/
│   ├── middleware.ts           # Route guard and authentication redirection
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/          # Login page with demo fast-fill buttons
│   │   │   └── register/       # Self-service customer registration
│   │   ├── api/
│   │   │   ├── auth/           # NextAuth route handler & user registration
│   │   │   ├── categories/     # Category listing and indexing
│   │   │   ├── dashboard/stats/# Real-time calculated KPI and chart metrics
│   │   │   ├── notifications/  # Notification read/unread endpoints
│   │   │   ├── orders/         # Transactional order CRUD & status transitions
│   │   │   ├── products/       # Inventory and catalog management
│   │   │   ├── reports/        # Analytics calculations and RFC-4180 CSV export
│   │   │   ├── user/profile/   # Account settings and password changes
│   │   │   └── users/          # Administrative user management and RBAC
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Dashboard shell with responsive sidebar & topbar
│   │   │   ├── page.tsx        # Main analytics overview and KPI metrics
│   │   │   ├── notifications/  # In-app notifications feed
│   │   │   ├── orders/         # Order table, details modal, and order creation
│   │   │   ├── products/       # Product catalog, stock filters, and CRUD modals
│   │   │   ├── reports/        # Detailed BI charts and CSV download trigger
│   │   │   ├── settings/       # Profile management and theme customization
│   │   │   └── users/          # User directory with role/status controls
│   │   ├── globals.css         # Global CSS variables and utility classes
│   │   ├── layout.tsx          # Root HTML layout with auth & theme providers
│   │   └── page.tsx            # Landing page redirecting authenticated users
│   ├── components/
│   │   ├── layout/             # Sidebar, Topbar, and ThemeToggle components
│   │   ├── providers/          # NextAuth session and Next-Themes providers
│   │   └── ui/                 # Reusable UI primitives (Button, Card, Badge, Modal, Input)
│   ├── lib/
│   │   ├── auth.ts             # NextAuth credential options & JWT callbacks
│   │   ├── prisma.ts           # Global Prisma Client singleton
│   │   ├── utils.ts            # Formatting helpers (Currency, Date, Numbers, Tailwind)
│   │   └── validations.ts      # Zod validation schemas for all domain entities
│   └── types/
│       └── next-auth.d.ts      # Type augmentations for NextAuth session & JWT
└── tests/
    ├── e2e/
    │   ├── e2e_runner.ts       # Standalone Headless Chrome/Edge test suite
    │   └── nexus.spec.ts       # Official Playwright test suite
    ├── integration/
    │   └── auth_and_db.test.ts # Database models, relationships & bcrypt tests
    └── unit/
        ├── utils.test.ts       # Math, currency, and date formatting tests
        └── validations.test.ts # Zod schema validation coverage tests
```

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.17.0 or newer
- [npm](https://www.npmjs.com/) v9.0.0 or newer (or pnpm / yarn)

### 1. Installation
Clone or navigate to the project directory:
```bash
cd nexus-saas
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*(The default `.env` is already configured for out-of-the-box local operation with SQLite).*

> **Security Notice for Production (`NEXTAUTH_SECRET`):**
> In production environments (`NODE_ENV=production`), `NEXTAUTH_SECRET` is strictly enforced. The application will safely refuse to start if the secret is missing, under 32 characters, or set to an insecure default placeholder. Generate a cryptographically strong secret with:
> ```bash
> openssl rand -base64 32
> ```

### 3. Database Initialization & Seeding
Push the Prisma schema to create the database tables and run the seed script to populate realistic historical data:
```bash
npm run prisma:push
npm run prisma:seed
```
This generates:
- **11 Users:** Administrators, managers, and customers with pre-hashed bcrypt passwords.
- **4 Product Categories:** Cloud Infrastructure, SaaS Subscriptions, Security Tools, and Developer APIs.
- **8 Products:** With distinct SKUs, prices, stock levels, and descriptions.
- **35 Relational Orders:** Realistic historical revenue spread over the past 90 days.
- **System Activity Logs & Automated Notifications.**

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
To test the optimized production build:
```bash
npm run build
npm run start
```

---

## 🔑 Demo Credentials

For quick evaluation during interviews and demonstrations, use the one-click demo login buttons directly on the `/login` page or use the credentials below:

| Role | Email | Password | Access Tier |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nexus.io` | `Admin123!` | Full permissions: User management, product editing, order processing, BI reports |
| **Operations Manager** | `staff@nexus.io` | `Admin123!` | Management permissions: Inventory control, order updates, customer reviews |
| **Standard Customer** | `user@nexus.io` | `User123!` | Customer view: Profile settings, own order history |

*You can also self-register any new account at `/register`.*

---

## 🧪 Testing & Quality Assurance

Nexus includes automated test coverage spanning unit, integration, and end-to-end browser testing.

### Run Unit & Integration Tests (Vitest)
Executes 24 automated unit and database integration tests verifying Zod schemas, currency calculations, date ranges, Prisma relational queries, and bcrypt password hashing:
```bash
npm test
```

### Run End-to-End Browser Tests (Stand-Alone CDP Runner)
Executes 10 automated browser tests verifying server availability, login flows, dashboard KPI rendering, navigation, CRUD modals, and CSV downloads:
```bash
npm run test:e2e
```

### Run Playwright E2E Tests
```bash
npm run test:playwright
```

---

## 🌐 Production PostgreSQL Deployment (Supabase / Neon / Railway)

Nexus is designed to transition seamlessly from local SQLite development to production PostgreSQL in under 2 minutes:

1. In `prisma/schema.prisma`, update the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
3. Push the schema and seed the production database:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```
4. Deploy to **Vercel**, **Railway**, or **AWS Amplify** with zero additional configuration required.

---

## 🔒 Security Standards Implemented

- **Password Hashing:** Passwords are never stored in plaintext; hashed via 10-round salted bcrypt.
- **SQL Injection Prevention:** All database operations utilize Prisma's parameterized prepared statements.
- **Cross-Site Scripting (XSS):** React JSX automatic output encoding prevents script injection.
- **Cross-Site Request Forgery (CSRF):** NextAuth state validation and HTTP-only signed session cookies.
- **Strict Input Validation:** Every incoming API payload is validated against strict Zod schemas before hitting the business layer.
- **Edge Route Protection:** Unauthenticated requests to `/dashboard/*` are intercepted at the Edge and redirected to `/login`.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

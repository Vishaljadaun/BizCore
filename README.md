# BizCore — Business Management Platform

BizCore is a .NET and React portfolio project that connects people, project delivery, purchasing, stock, and basic finance in one company workspace. It implements core business workflows with persistent PostgreSQL storage, role boundaries, and transaction checks. It is a learning ERP, not a complete accounting or payroll system.

[![Build and test](https://github.com/Vishaljadaun/BizCore/actions/workflows/ci.yml/badge.svg)](https://github.com/Vishaljadaun/BizCore/actions/workflows/ci.yml)

## Live portfolio preview

Open **[BizCore](https://bizcore-web.onrender.com/#/login)** on your phone or computer. Choose **Register your company** to create your own administrator account, then follow [the employee testing guide](docs/TESTING.md). The frontend and API run on Render, with persistent PostgreSQL storage on Neon. The free API may take about a minute to wake after inactivity.

See [deployment configuration](docs/DEPLOYMENT.md). Follow the [operations demo](docs/OPERATIONS.md) to try the connected modules.

## Current scope

| Area | Status |
| --- | --- |
| Company registration and login | JWT access/rotating refresh tokens, company-code login, password change and administrator-assisted recovery. |
| Company and user administration | Company/user screens, current-account role checks, tenant-scoped mutations and protected administrator accounts. |
| Departments and employees | Creation/listing, department/manager editing, employee editing, detail viewing, deactivation/reactivation and account linking. |
| Employee self-service | Profile, leave balances, and daily clock-in/out. Employees can access only their own HR records; managers can manage active employees in their company. |
| Attendance management | Company-scoped list, employee/date filters, pagination, clock actions, and CSV export of all matching records for a selected day. |
| Leave workflow | Annual policies, employee application/history/cancellation, admin/manager reviews, reserved pending balances, and PostgreSQL transaction locks. |
| Dashboard | Company/personal metrics from the API, role-appropriate actions, loading and retry states. |
| Projects | Project lifecycle, assigned tasks, priorities, status updates, and personal time logs. |
| Inventory | Product catalog, stock adjustments/history, reorder alerts, and purchase orders. |
| Vendors | Supplier directory, contract lifecycle, and a linked vendor portal for order acknowledgment. |
| Finance | Draft/issued invoices, partial/full payment records, expenses, cash-flow totals, and CSV export in INR. |

See [the administration guide](docs/ADMINISTRATION.md) for permission rules and password recovery, and [the completion plan](docs/COMPLETION.md) for remaining extensions.

## Technologies and structure

| Layer | Technologies / purpose |
| --- | --- |
| Domain | C# entities and enums for companies, users, HR, projects, purchasing, inventory, and finance. |
| Application | .NET 8, MediatR commands/queries, FluentValidation, result models, and interfaces. |
| Infrastructure | EF Core 8, Npgsql/PostgreSQL, BCrypt password hashing, JWT generation, and database seeding. |
| API | ASP.NET Core controllers, role authorization, exception middleware, Swagger, and dependency injection. |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, React Router 7, Zustand 5, Axios, React Hook Form, and Zod. |
| Verification | xUnit, EF InMemory handler tests, Vitest, React Testing Library, ESLint, Playwright with PostgreSQL 16, and GitHub Actions. |

Backend projects live under `backend/`; the frontend application is in **`frontend/bizcore-web/`**.

The browser sends REST requests to the API. HR and administration controllers dispatch commands/queries to application handlers; operations controllers call a scoped application service. Infrastructure supplies PostgreSQL persistence and token services through dependency injection. Company IDs establish tenant context. Middleware re-reads account status, role and credential version before authorization; personal HR actions also re-read the user's current account and employee link so stale JWT claims cannot preserve a removed link.

## Local setup

Prerequisites: .NET 8 SDK, Node.js 22.12+ with npm, and a PostgreSQL database you can migrate. The API applies its existing EF migrations at startup. Use a development database, not a database belonging to another app.

### Backend

From the repository root:

```bash
cd backend/BizCore.API

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=bizcore;Username=YOUR_ROLE;Password=YOUR_PASSWORD"
dotnet user-secrets set "JwtSettings:SecretKey" "YOUR_PRIVATE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"

dotnet run --launch-profile http
```

Replace the placeholders. For hosted PostgreSQL, use the provider's host and TLS configuration in .NET/Npgsql key/value format. Keep credentials in user secrets or private host environment variables.

- API: `http://localhost:5001/api`
- Swagger in Development: `http://localhost:5001/swagger`
- Optional HTTPS launch profile: `https://localhost:7205`; trust the development certificate first and adjust the frontend URL accordingly.

### Frontend

Open a second terminal at the repository root:

```bash
cd frontend/bizcore-web
npm ci
npm run dev
```

Open `http://localhost:5173`. The committed development configuration points to port 5001. Use `.env.development.local` to override `VITE_API_BASE_URL`, with `.env.example` as a reference. Restart Vite after changes.

Use **Register** to create your first company and CompanyAdmin account. A seeded super-admin is not required for the company workflow.

### Optional platform administrator

There is no automatically created shared-password account. For a fresh local database, explicitly opt into seeding:

```bash
# Run from backend/BizCore.API; replace these sample values.
dotnet user-secrets set "Seed:Enabled" "true"
dotnet user-secrets set "Seed:SuperAdminEmail" "YOUR_ADMIN_EMAIL"
dotnet user-secrets set "Seed:SuperAdminPassword" "YOUR_PRIVATE_PASSWORD_AT_LEAST_12_CHARACTERS"
```

Start the API once, then disable `Seed:Enabled`. The seeder does not reset an existing administrator or print the password. Existing databases created with the old default login retain that account: change its credentials through a controlled administrative process before exposing that database publicly. Use **Account Security → Change password** while signed in.

## Configuration

| Backend environment variable | Purpose |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | Private PostgreSQL/Npgsql connection string. |
| `JwtSettings__SecretKey` | Private signing key of at least 32 characters. |
| `JwtSettings__Issuer` / `JwtSettings__Audience` | Must match token generation and validation; defaults are in appsettings. |
| `JwtSettings__AccessTokenExpiryMinutes` | Access-token duration; default 15 minutes. |
| `Seed__Enabled` | Optional privileged-account bootstrap; disabled by default. |
| `Seed__SuperAdminEmail` / `Seed__SuperAdminPassword` | Credentials used only when explicitly bootstrapping. |

`VITE_API_BASE_URL` is a public frontend value. Database credentials and signing keys must never be frontend environment variables.

Local development permits Vite origins on ports 5173–5175. Hosted CORS origins come from `Cors__AllowedOrigins__0` (and subsequent indices). The deployment uses Docker, a separate static frontend and Neon; see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Verification

From the repository root:

```bash
dotnet restore backend/BizCore.sln
dotnet build backend/BizCore.sln --configuration Release --no-restore
dotnet test backend/BizCore.sln --configuration Release --no-build

cd frontend/bizcore-web
npm ci
npm run lint
npm test
npm run build
```

Backend tests cover employee ownership, company boundaries, revoked links, inactive accounts, per-context tenant filtering, token subject validation, and refresh rotation. These fast handler tests use EF InMemory. A separate Playwright job starts the real API with PostgreSQL 16 and exercises registration, employee linking, attendance/CSV export, mobile leave applications, reviews/cancellation, and revocation through the browser. It also sends concurrent leave applications and duplicate approvals against PostgreSQL to verify balance protection. It also follows projects, time logs, supplier contracts, purchasing, inventory and finance through connected browser/API workflows, including concurrent receipts and payments. It runs twice against the same database to check fresh and repeated migration startup.

Frontend tests cover concurrent refresh, refresh failures, logout during refresh, employee route access, profile loading, attendance errors, failed leave application preservation, and dashboard error/retry states. CI runs backend, frontend and browser jobs on work branches and pull requests. The browser test also covers a phone-sized employee view; this is not a complete responsive or accessibility audit.

For exact setup, expected results, automated browser commands and phone-friendly CI instructions, see [Testing BizCore](docs/TESTING.md).

## Try the employee workflow

1. Register a company and sign in as CompanyAdmin.
2. Create a department and an employee record.
3. Create an Employee user and link it through **Give Login Access**.
4. In a separate browser, log in as that employee and open **My Profile**.
5. Clock in, refresh, and verify the entry remains. Clock out and verify the saved time.
6. Return to the administrator account and review the attendance list.
7. Remove the employee-account link and verify self-service access stops, even in the already signed-in employee browser.

Attendance currently uses UTC calendar days and a fixed 09:30 UTC lateness threshold. It is a learning workflow, not payroll-ready timekeeping. Company timezones, shifts, corrections, and audit history belong in a later milestone.


## Leave workflow and business rules

1. A company administrator creates an annual policy under **HR Module → Leave Management** (for example, Annual leave: 12 days).
2. A linked employee opens **My Leave**, chooses dates and a reason, and submits a request. The UI shows used, pending, and available days separately.
3. A manager or administrator approves or rejects it. The server records the signed-in reviewer; an administrator does not need an employee profile. Self-review is forbidden.
4. Approval spends the reserved days. Rejection or employee cancellation of a pending request releases them. Final decisions cannot be repeated; approved requests cannot yet be cancelled.

Requests use whole Monday–Friday days, count public holidays, start today or later (UTC), and stay within this or next calendar year. Allowances are not prorated; there is no carryover, holiday calendar, policy editing, or payroll integration. Policies are company-scoped, and newly added policies are available to existing employees automatically.

Applications, cancellations, and reviews acquire a PostgreSQL transaction-scoped advisory lock for the employee. Balance checks and writes run inside that transaction, so two API instances cannot approve the same request twice or reserve the same final day. The reviewer migration adds two nullable columns and preserves existing accounts, records, and historical reviewer relationships.

CSV export quotes values, neutralizes spreadsheet formula prefixes in employee fields, and caps downloads at 10,000 rows. The API supports date ranges of up to 366 days; the UI exports the selected UTC day and employee filter, independently of table pagination. It is an attendance report, not a payroll calculation.


## Connected operations: why these modules matter

A small team can assign office-setup work, order supplies, receive them into stock, and record the supplier expense without re-entering that purchase in Finance. An administrator can issue a customer invoice, record partial payments, and compare receipts with paid expenses. A vendor sees only the orders and contracts shared with its linked supplier account.

See [OPERATIONS.md](docs/OPERATIONS.md) for the complete demo, role matrix, data model, API map, business rules, and explicit limitations. All operations data is company-scoped. The new migration adds an `ops` schema and preserves existing HR and account records.

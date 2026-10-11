# BizCore completion plan

## Milestone 1 — build, authentication, and employee self-service

- Fix production TypeScript errors and baseline lint failures without disabling the project's lint rules globally.
- Remove the unused competing auth context and keep one Zustand-backed session store.
- Refresh tokens once for concurrent failed requests; preserve login errors; prevent a late refresh from restoring a logged-out session.
- Read the validated JWT subject correctly, validate issuer/audience/algorithm during refresh, and reject inactive accounts/companies.
- Make My Profile visible and accessible to employees, using the personal attendance endpoint.
- Keep network errors distinct from a missing employee link, show clock-action errors, and allow retry.
- Verify current database account, company, role, and employee link for attendance and personal leave operations.
- Scope clock-out by company; restrict employees to their own HR records; allow managers to act only within their company.
- Define the user tenant filter for every EF model build and evaluate tenant context per request. Keep inactive users visible to their administrators.
- Add attendance pagination and error presentation; reset list pagination in filter change events.
- Replace implicit shared super-admin credentials with opt-in private seeding and remove connection/signing secrets from base configuration.
- Remove unused AutoMapper registrations/packages flagged by dependency audit.
- Add meaningful backend/frontend tests and CI; correct frontend folder and local API port in setup instructions.

No schema migration is introduced by this milestone. Existing accounts and records are not deleted or reset. Set private database and JWT configuration before running the new branch.

## Milestone 2 — complete leave management

Implemented in the HR completion update:

- Server-derived reviewer identity, including company administrators without an employee profile; self-review and cross-company decisions are denied.
- Annual leave policy creation, lazy per-year balances, employee application/history/cancellation, and review endpoints with responsive screens.
- Whole weekdays, date/overlap checks, pending balance reservation, and atomic decisions under per-employee PostgreSQL transaction locks.
- A non-destructive migration adds reviewer account ID/name while retaining historical employee reviewer links.
- Handler tests, frontend failure/retry tests, and real PostgreSQL browser/API tests for competing applications and duplicate approvals.
- Company/personal dashboard figures now come from the API. Navigation exposes working modules, and attendance has CSV export.

Remaining policy features: holidays, half-days, carryover, proration, policy editing, and approved-leave cancellation.

## Milestone 3 — finish administration and tenant boundaries

- Audit every company/user/HR endpoint, including code that bypasses query filters.
- Resolve globally ambiguous email login: storage currently permits the same email in different companies, but login has no company selector.
- Finish department update, employee edit/deactivate, and user password reset/change.
- Verify employee/user links and employee-code generation under concurrent creation.
- Review salary visibility, stale role claims outside the hardened HR endpoints, token storage/revocation, and audit logs.
- Continue reviewing the platform-wide SuperAdmin experience; the company/employee overview now uses real records.

## Milestone 4 — real database and deployment checks

- Added a PostgreSQL 16 + Chromium CI workflow for registration, login, employee creation/linking, mobile attendance and immediate link revocation. It starts the API twice against the same schema. See [TESTING.md](TESTING.md) for manual and automated checks.
- Leave balance concurrency is now exercised against PostgreSQL. Still needed: broader constraint/concurrency tests, existing-record persistence assertions across process restarts, and the wider tenant audit.
- Render frontend/API and Neon PostgreSQL are deployed, with Docker, CORS, and a process health endpoint. See DEPLOYMENT.md.
- Verify persistence after restart, database backup/restore, responsive layouts, and keyboard interactions.
- Define company timezones, shifts, overnight attendance, and correction approval before payroll use.

## Later modules

Projects, inventory, purchasing/vendors, and finance remain planned and are hidden from main navigation. Build one complete business workflow at a time after HR is stable. Billing, an embeddable module, and a complete ERP are not delivered by milestone 1.

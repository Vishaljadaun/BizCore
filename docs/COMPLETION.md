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

## Milestone 3 — administration and tenant boundaries

Implemented: current-account middleware before role authorization; company-code login for ambiguous emails; department/manager editing; employee editing, viewing and deactivation; password change and administrator-assisted reset; privilege/last-admin checks; serialized employee-code allocation and linking. Targeted unit and real PostgreSQL browser/API tests cover these boundaries. See [ADMINISTRATION.md](ADMINISTRATION.md) for the explicit role matrix and limitations.

Remaining production work: granular salary permissions, MFA/email verification, emailed password recovery, rate limiting, hardened browser sessions and an independent security audit. Password/employee audit events are recorded; a complete audit-history interface remains an extension.

## Milestone 4 — database and deployment checks

- PostgreSQL 16 + Chromium CI runs the application workflows, then restarts the API against the same database and explicitly logs in to the pre-restart account and compares original company, user and department IDs.
- CI dumps the populated disposable database, restores into a separate database, and compares row counts and hashes of all row values in every application table. The script accepts only the isolated CI container, never a production connection string.
- `scripts/check-live-persistence.py` prepares fictional records before a live deployment and verifies the original IDs afterward. Keep its temporary credential checkpoint private and outside Git.
- This verifies the recovery mechanism with test data. It does not configure a scheduled production backup, verify provider backup retention or perform a production restore. Those require an operator-owned backup schedule and recovery plan.
- Render frontend/API and Neon PostgreSQL are deployed. See [DEPLOYMENT.md](DEPLOYMENT.md).
- Company timezones, shifts, overnight attendance and correction approval remain prerequisites for payroll use.

## Milestone 5 — connected operations

Implemented core workflows for Projects, Inventory, Vendors, and Finance. See [OPERATIONS.md](OPERATIONS.md): persistent data and responsive forms, employee task ownership, vendor supplier ownership, transaction-protected stock receipts and expense creation, recorded invoice payments, cash-flow reporting, and CSV export. Operations permissions re-read the current account and role on every request. Database/model consistency and real PostgreSQL concurrency are covered by automated checks.

Remaining extensions include payroll, accounting journals, tax-compliant invoicing, payment gateways, refunds/credit notes, partial deliveries/returns, multi-warehouse stock, project budgets, and a complete audit-history interface. Completing core modules does not imply those advanced features are included.

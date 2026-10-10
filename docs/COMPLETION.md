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
- Add meaningful backend/frontend tests and CI; correct frontend folder and local API port in setup instructions.

No schema migration is introduced by this milestone. Existing accounts and records are not deleted or reset. Set private database and JWT configuration before running the new branch.

## Milestone 2 — complete leave management

The UI calls `/api/hr/leave`, `/approve`, and `/reject`, but there is no matching controller. Do not simply expose the existing handlers unchanged:

- Derive the approver from the authenticated account; the UI currently supplies the applicant's employee ID as approver.
- Decide how a company administrator without an employee profile approves leave.
- Prevent self-approval, cross-company decisions, invalid date ranges, unsupported cross-year requests, and balance overspending.
- Make decisions and balance changes atomic under concurrent requests.
- Implement leave-type/balance setup, employee application/history UI, and approval/rejection endpoints with tests.

## Milestone 3 — finish administration and tenant boundaries

- Audit every company/user/HR endpoint, including code that bypasses query filters.
- Resolve globally ambiguous email login: storage currently permits the same email in different companies, but login has no company selector.
- Finish department update, employee edit/deactivate, and user password reset/change.
- Verify employee/user links and employee-code generation under concurrent creation.
- Review salary visibility, stale role claims outside the hardened HR endpoints, token storage/revocation, and audit logs.
- Remove hardcoded/sample dashboard metrics or label them clearly; align role-specific dashboards and vendor routes with real capabilities.

## Milestone 4 — real database and deployment checks

- Test PostgreSQL initial/repeated migrations, constraints, registration, login, and a complete two-browser HR workflow.
- Add host configuration, CORS environment settings, health checks, Docker/Render and Vercel configuration.
- Verify persistence after restart, database backup/restore, responsive layouts, and keyboard interactions.
- Define company timezones, shifts, overnight attendance, and correction approval before payroll use.

## Later modules

Projects, inventory, purchasing/vendors, and finance currently have placeholder pages. Build one complete business workflow at a time after HR is stable. Billing, an embeddable module, and a complete ERP are not delivered by milestone 1.

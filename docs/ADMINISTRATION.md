# Administration and account security

## Try it in the portfolio app

1. Sign in as CompanyAdmin and open **HR Module → Departments**. Use **Edit** to rename a department, update its description, or choose an active employee as manager. Search the manager selector when there are more than 100 matches.
2. Open **Employees → View** to inspect a record, or **Edit** to update contact details, designation, department, joining date, and salary. Employee email is an HR contact field; changing it does not change the linked account's login email. Change login email in **User Management**.
3. Choose **Deactivate**, read the confirmation and confirm. The employee and history remain; their linked login is disabled and previous sessions are revoked. Clock out open attendance first. Reactivating an employee does **not** automatically restore login: explicitly activate the account in **User Management** when appropriate.
4. Open **Account Security** to change your own password. Enter your current password, a new password and confirmation. New passwords require at least 12 characters, uppercase, lowercase, a digit and a symbol, with at most 72 UTF-8 bytes. A successful change signs out every device; sign in again.
5. To recover a staff account, use **User Management → Reset password**. Enter **your administrator password** and a temporary password. Verify the person's identity and share it privately. The user must choose a new password at their next login before accessing business modules. This is administrator-assisted recovery; BizCore does not send password-reset email or implement a public forgot-password flow. A sole administrator who has forgotten their password still needs a controlled operator-assisted recovery process.
6. If an email belongs to accounts in multiple companies, enter the **company code** on the login form. Find it on Account Security. Without a code, an ambiguous login fails rather than selecting an arbitrary company. Existing single-company email logins continue to work.

## Permission boundaries

| Action | Allowed |
| --- | --- |
| View company employee records, including salary | CompanyAdmin, SuperAdmin and Manager in their company |
| Edit departments/employees, link accounts, deactivate employees | CompanyAdmin and SuperAdmin in their current company |
| Change own password | Any active user, including Vendor |
| Reset another staff/vendor password | CompanyAdmin in the same company; SuperAdmin can manage a target company |
| Modify another CompanyAdmin or assign CompanyAdmin role | SuperAdmin only |
| Modify another SuperAdmin or assign SuperAdmin through ordinary user endpoints | Denied |
| Change own role, disable/delete self | Denied |
| Remove/demote/deactivate the last active CompanyAdmin | Denied |
| Company platform administration | SuperAdmin only |

For this portfolio's simple policy, managers can see company salary data. A production HR deployment needs a more granular payroll permission model. The employee table shows whether an account is linked; the authoritative login status is in User Management. A login account and employee record are separate: unlinking a profile removes HR self-service access but leaves the login account active. Deactivation disables the linked account as well.

## How it works

- `CurrentAccountMiddleware` runs between JWT authentication and role authorization. It loads the account and company, rejects inactive records, compares the signed credential version, then replaces role and profile claims with current database values. A stale Manager JWT cannot retain manager permissions after a demotion.
- The additive `AccountSecurity` migration introduces `CredentialVersion` and `MustChangePassword`. Existing accounts start at version zero; previous signed tokens without that claim are treated as zero. No existing accounts, passwords or business records are reset by the migration.
- Password changes and resets increment the version and revoke refresh tokens. Temporary credentials can access account details, password change and logout, but business endpoints return `password_change_required` until the password is changed.
- PostgreSQL transaction-scoped advisory locks serialize credential changes against login/refresh. Company locks protect employee-code allocation, employee links, email uniqueness checks and last-admin mutations. Nested locks reuse the current transaction; acquisition order is company, employee, then account where these apply.
- Password and employee mutations add audit events with actor and target identifiers, never plaintext passwords. There is no complete audit-log UI or immutable compliance log yet.
- Authenticated requests perform a current-account database lookup. An already executing request may finish while an administrator changes access; this is not a guarantee of cancelling in-flight work.
- Tokens remain in browser storage in this portfolio version. HttpOnly cookie sessions, MFA, email verification, public recovery and rate limiting remain production-hardening work.

## Regression evidence

`AccountSecurityTests.cs` checks wrong-password handling, credential revocation, administrator-assisted reset restrictions, cross-company references, role escalation and last-admin protection. `administration.e2e.ts` exercises edits, deactivation/reactivation, duplicate-email login, old-token permissions, temporary-password restrictions, mobile password change and concurrent refreshes against real PostgreSQL.

See [TESTING.md](TESTING.md) for restart and backup/restore verification. These targeted tests do not replace an independent security assessment.

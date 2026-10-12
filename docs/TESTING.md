# Try BizCore yourself

Try the hosted app at **https://bizcore-web.onrender.com/#/login**. Choose **Register your company**, then follow the employee workflow in section 2. You can do this from your phone without installing anything. The free API can take about a minute to wake after inactivity. Local setup is also available below.

## 1. Start the app on a computer

Install .NET 8 SDK, Node.js 22.12+ and PostgreSQL, then follow the [README setup](../README.md#local-setup). Use a dedicated development database and your own private JWT secret. The API applies migrations when it starts.

From the repository root, start the API in one terminal after configuring user secrets:

```sh
dotnet run --project backend/BizCore.API --launch-profile http
```

In another terminal:

```sh
cd frontend/bizcore-web
npm ci
npm run dev
```

Open **http://localhost:5173**. The API listens at **http://localhost:5001**. Keep both terminals running. If Vite chooses another port because 5173 is occupied, stop the other server and restart Vite on 5173.

## 2. Check the complete employee workflow

Use fictional information. The employee account needs a different email from the company administrator. There is no shared default admin password.

| Step | Action | Expected result |
| --- | --- | --- |
| Company registration | Open `/register`; enter a company name, your admin details and a password with uppercase, lowercase, digit and special character (at least 8 characters). | You reach the dashboard as CompanyAdmin. |
| Department | Open HR → Departments; choose **Add Department** and create Engineering. | Engineering appears in the list. |
| Employee | Open HR → Employees; choose **Add Employee**, fill in the required fields and choose Engineering. | The employee appears with **No account linked**. |
| Login access | Choose **Give Access**, set and confirm a strong test password. | The row changes to **Account linked**. |
| Separate login | Open an incognito/private window and sign in with the employee's email and password. | The employee has their own session. Two normal tabs share login storage, so use separate browser profiles or a private window. |
| Attendance | In the employee window, open **My Profile**, choose **Clock In**, refresh, then **Clock Out**. | The saved clock-in survives refresh; worked hours appear after clock-out. A short demo can show 0 hours and HalfDay. |
| Admin review | In the admin window, open HR → Attendance for today's date. | The employee's attendance is visible. |
| Revoke profile access | Open HR → Employees, choose **Revoke** and confirm. Refresh My Profile in the employee window. | The employee sees **No Employee Profile Linked** and cannot clock in/out. The user account still exists; unlinking is not account deletion or disabling login. |
| Persistence | Stop and restart the API with the same development database; sign back in as admin. | The company, employee and attendance should remain. This is a manual persistence check. |

Attendance currently uses UTC dates. Test clock-in/out on the same UTC day. Company timezones, overnight shifts and payroll rules are not implemented.

## 3. Run the automated browser test

This test launches the real API and frontend, uses PostgreSQL 16, and drives Chromium through the workflow above. The employee session uses a 390 × 844 viewport. It also checks that the existing employee token cannot clock in after revocation.

Prerequisites: the SDK and Node version above, plus Docker with Compose. Stop any existing API/frontend on ports 5001 and 5173 first; the test deliberately refuses to reuse them.

From the repository root:

```sh
docker compose -f compose.e2e.yml up -d --wait
dotnet build backend/BizCore.sln --configuration Release
cd frontend/bizcore-web
npm ci
npx playwright install chromium
npm run test:e2e
npx playwright show-report
```

On Linux, use `npx playwright install --with-deps chromium` if browser system libraries are missing. To watch the test, run `npm run test:e2e -- --headed`.

The test only targets localhost PostgreSQL database `bizcore_e2e` on port 55432 with the disposable credentials from `compose.e2e.yml`. Its JWT key is test-only. Do not use either in a deployment. Test companies have unique names so repeated runs can use the existing schema. No application tables are cleared by the test.

When finished, from the repository root:

```sh
docker compose -f compose.e2e.yml down --volumes
```

This removes the disposable test database's containers and volumes. Do not use this Compose database for important work.

## 4. Check tests from your phone

Open [GitHub Actions](https://github.com/Vishaljadaun/BizCore/actions), select the latest **Build and test** run for your branch, and check all three jobs:

- **backend**: build and handler/token regression tests.
- **frontend**: lint, component/auth tests and production build.
- **browser**: the real PostgreSQL and Chromium workflow, followed by another run after restarting the API against the existing schema.

The browser report is attached as `browser-test-report`. Failure traces can include fictional test records and disposable authentication tokens; don't upload traces from a real customer database.

The second run also sets `BIZCORE_VERIFY_PERSISTENCE=true`: `persistence.e2e.ts` reads the private checkpoint from the first run, logs in with the same credentials, and asserts the original user, company and department IDs. A missing checkpoint fails instead of creating replacement records. The file is ignored by Git and excluded from report artifacts.

After the API stops, CI executes `scripts/check-ci-recovery.sh`. PostgreSQL 16 dumps the populated test database, restores it to a separate disposable database, and compares counts and hashes of complete row values in every application table. Only test data is used; no production database is restored or modified. This does not set up a production backup schedule.

Opening `localhost` on your phone refers to the phone, not your computer. Use **https://bizcore-web.onrender.com/#/login** for the hosted version instead.

## What is outside this test

The browser workflow now also covers mobile leave applications, admin approval/rejection, employee cancellation, CSV download, company overview counts, and simultaneous leave applications/duplicate decisions. The connected operations test covers Projects, Inventory, Vendors and Finance, including duplicate receipt/payment attempts and vendor ownership. Administration tests cover editing, password reset/change, company-code login, deactivation and stale roles. These targeted checks do not establish complete tenant isolation, payroll accuracy or production readiness. See [the completion plan](COMPLETION.md).

## Troubleshooting

- **API exits on startup:** read its first error. Configure the database connection and a JWT secret of at least 32 characters; ensure PostgreSQL is reachable.
- **Browser cannot reach the API:** check both terminals and `VITE_API_BASE_URL=http://localhost:5001/api`. Restart Vite after changing its environment file.
- **Employee has no profile:** create the employee and grant/link their login access from the administrator account.
- **Browser test fails:** open the HTML report and inspect the failing step/trace. Check the API startup logs for migration errors instead of treating a page timeout as a frontend failure.


## Try leave management and reporting

1. As the company administrator, open **HR Module → Leave Management**. Add a policy such as `Annual leave`, with 12 days per year.
2. In the employee browser, open **My Leave**. Pick a weekday in the current or next year, choose the policy, and submit a reason. Check that pending days increase and available days decrease.
3. As admin, approve the request. Refresh the employee page: the status, reviewer, and used days should update. Try another request and reject it with a reason, then try cancelling a pending request as the employee.
4. Check **Dashboard**: company counts reflect your records; the employee sees their own attendance and leave metrics.
5. Open **Attendance**, select a date, and choose **Export CSV**. It contains all matching records for the chosen day/filter, including records on other table pages.

Leave uses whole Monday–Friday days without public-holiday exclusions or carryover. A request cannot span calendar years. Admins and managers can also apply using a linked employee profile, but another reviewer must decide their request.

The CI browser report includes desktop dashboard and 390px mobile leave screenshots. The PostgreSQL test concurrently requests the last available leave day and submits two approvals of one request: only one application and one decision may succeed.

## Administration and recovery

Follow [ADMINISTRATION.md](ADMINISTRATION.md) for the new screens and security rules. CI runs four browser/API scenarios twice: employee/leave workflow, connected operations, administration/account security, and persistence. Backend handler and frontend regression suites run separately.

For an authorized live deployment check, run from the repository root before deployment:

```sh
python scripts/check-live-persistence.py prepare --checkpoint /tmp/bizcore-persistence.json
```

After the deployment is live:

```sh
python scripts/check-live-persistence.py verify --checkpoint /tmp/bizcore-persistence.json
```

The file contains only the newly created fictional account's credentials. Keep it private, never commit or attach it to CI reports, and remove it after verification. Preparation refuses to overwrite an existing checkpoint. Live smoke scripts create clearly named fictional company records; they do not touch another company's records.

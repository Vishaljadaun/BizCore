# Hosted BizCore

- Frontend: **https://bizcore-web.onrender.com/#/login**
- API health: **https://bizcore-api-e7is.onrender.com/health**

The portfolio deployment uses a Render static site for React, a free Render
Docker web service for the .NET 8 API, and a separate PostgreSQL 16 project on
Neon. API and database are in Singapore. Existing PulseBoard resources are not
reused or changed.

## Configuration

The API builds from `backend/Dockerfile`, with `backend` as its Docker context.
The non-root runtime listens on Render's `PORT` (10000 by default). `/health`
returns 200 after startup and migrations finish. This is a process health check,
not a continuous database availability probe. Render provides public HTTPS;
the container accepts internal HTTP.

Set these API environment variables in Render:

| Key | Value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Private Npgsql connection string for the BizCore Neon database; use the direct endpoint because startup also runs migrations. Enable TLS certificate validation with `SSL Mode=VerifyFull`. |
| `JwtSettings__SecretKey` | Private random signing key of at least 32 characters, stable across deployments. |
| `Cors__AllowedOrigins__0` | Exact public frontend origin, starting with `https://` and without a trailing slash. |
| `Seed__Enabled` | `false`; register your own company instead of using shared credentials. |

Never commit these secrets or put them in `VITE_` variables: Vite variables are
public, embedded in the browser bundle. The deployment provisions runtime
secrets through the connected services without adding them to the repository.

The frontend build command is:

```sh
cd frontend/bizcore-web && npm ci && npm run build
```

Publish `frontend/bizcore-web/dist`, using these public build settings:

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `SKIP_INSTALL_DEPS` | `true` |
| `VITE_API_BASE_URL` | Public API URL followed by `/api`. |
| `VITE_USE_HASH_ROUTER` | `true`; links look like `/#/my-profile` and refresh without CDN rewrite rules. |
| `VITE_API_TIMEOUT_MS` | `120000`; allows time for the free API to wake up. |

Changing a Vite variable requires rebuilding the static site. Local development
keeps BrowserRouter and a 30-second request timeout unless explicitly overridden.

`render.yaml` documents how to recreate this setup. The initial services are
created directly through the Render connector. Do not apply the template over
them as a second deployment; it could create duplicate services.

## Trying the app

Open the frontend link, choose **Create Account**, and register a fictional
company. That account is the company administrator. Follow the employee and
attendance checklist in [TESTING.md](TESTING.md), using a private browser window
for the separate employee account.

Free API hosting can sleep when idle. The first sign-in or registration can take
around a minute; wait for the request to finish before submitting again. Records
live in Neon, so an API restart does not erase them. Free plans have usage limits
and are appropriate for this portfolio preview; no paid upgrade is configured.

The deployment includes HR, Projects, Inventory, Vendors, and Finance core workflows. See [OPERATIONS.md](OPERATIONS.md) for a guided demo and scope.

## Updating

Both Render services track `main`. Although auto-deploy is enabled, recent merges did not trigger builds on these services. After CI passes and the PR is merged, check the deployed commit in Render; if it is still the old commit, use **Manual Deploy → Deploy latest commit** on the API and static site. Wait for both to be live, then run the live check. Keep the JWT key and database configuration unchanged across routine deployments.

## Manual live verification

The **Check live portfolio deployment** GitHub Actions workflow runs on demand. It checks public frontend delivery, API health, CORS, registration, employee linking, attendance/CSV export, leave application/review/balances, dashboard counts, and revocation. Each run creates one clearly named fictional `Deployment Check` company in the hosted database; it does not delete records or use real customer data. The regular CI browser workflow still uses its own disposable PostgreSQL database.

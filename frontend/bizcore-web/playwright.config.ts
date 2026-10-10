import { defineConfig, devices } from '@playwright/test';

// Only the disposable local/CI database is supported. Never point E2E at production.
const databasePort = process.env.BIZCORE_E2E_DB_PORT ?? '55432';
if (!/^\d+$/.test(databasePort)) throw new Error('BIZCORE_E2E_DB_PORT must be a port number.');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'dotnet run --project ../../backend/BizCore.API --configuration Release --no-build --no-launch-profile',
      url: 'http://localhost:5001/api/auth/me',
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: 'http://localhost:5001',
        ConnectionStrings__DefaultConnection: `Host=localhost;Port=${databasePort};Database=bizcore_e2e;Username=bizcore_e2e;Password=local-e2e-only`,
        JwtSettings__SecretKey: 'BizCore-Disposable-E2E-Key-Not-For-Deployment-2026',
        Seed__Enabled: 'false',
      },
    },
    {
      command: 'npm run dev -- --host localhost --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: 'http://localhost:5001/api' },
    },
  ],
});

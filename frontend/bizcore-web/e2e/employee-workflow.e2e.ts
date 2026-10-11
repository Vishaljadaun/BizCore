import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const password = 'DemoOnly-Strong42!';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('company onboarding, mobile employee attendance and immediate access revocation', async ({ page, browser }, testInfo) => {
  test.setTimeout(150_000);
  const suffix = randomUUID().slice(0, 8);
  const adminEmail = `admin-${suffix}@example.com`;
  const employeeEmail = `employee-${suffix}@example.com`;
  const employeeName = `Asha Tester${suffix}`;

  await test.step('Register a company through the public form', async () => {
    await page.goto('/register');
    await page.getByLabel('Company Name', { exact: true }).fill(`Workflow ${suffix}`);
    await page.getByLabel('First Name', { exact: true }).fill('Demo');
    await page.getByLabel('Last Name', { exact: true }).fill('Admin');
    await page.getByLabel('Business Email', { exact: true }).fill(adminEmail);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step('Create a department and an employee', async () => {
    await page.goto('/hr/departments');
    await page.getByRole('button', { name: '+ Add Department', exact: true }).click();
    await page.getByLabel('Department Name', { exact: true }).fill('Engineering');
    await page.getByRole('button', { name: 'Create Department', exact: true }).click();
    await expect(page.getByLabel('Department Name', { exact: true })).toBeHidden();
    await page.goto('/hr/employees');
    await page.getByRole('button', { name: '+ Add Employee', exact: true }).click();
    await page.getByLabel('First Name', { exact: true }).fill('Asha');
    await page.getByLabel('Last Name', { exact: true }).fill(`Tester${suffix}`);
    await page.getByLabel('Email', { exact: true }).fill(employeeEmail);
    await page.getByLabel('Designation', { exact: true }).fill('Software Engineer');
    await page.getByLabel('Department', { exact: true }).selectOption({ label: 'Engineering' });
    await page.getByLabel('Joining Date', { exact: true }).fill('2026-01-01');
    await page.getByLabel('Salary (₹)', { exact: true }).fill('50000');
    await page.getByRole('button', { name: 'Add Employee', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: employeeEmail })).toBeVisible();
  });

  await test.step('Grant a separate employee login', async () => {
    const row = page.getByRole('row').filter({ hasText: employeeEmail });
    await row.getByRole('button', { name: /Give Access/ }).click();
    await page.getByLabel('Set Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Give Access', exact: true }).click();
    await expect(row.getByText('Has Access', { exact: true })).toBeVisible();
    await page.reload();
    await expect(row.getByText('Has Access', { exact: true })).toBeVisible();
  });

  // A separate browser context gives the employee their own cookies/localStorage.
  const employeeContext = await browser.newContext({
    baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 },
  });
  try {
    const employeePage = await employeeContext.newPage();
    await test.step('Employee signs in and clocks in/out on a phone-sized screen', async () => {
      await signIn(employeePage, employeeEmail);
      await employeePage.goto('/my-profile');
      await expect(employeePage.getByRole('heading', { name: employeeName, exact: true })).toBeVisible();
      await employeePage.getByRole('button', { name: /Clock In/ }).click();
      await expect(employeePage.getByRole('button', { name: /Clock Out/ })).toBeVisible();
      await employeePage.reload();
      await employeePage.getByRole('button', { name: /Clock Out/ }).click();
      await expect(employeePage.getByText(/h worked today/)).toBeVisible();
      await expect(employeePage.getByRole('button', { name: /Clock (In|Out)/ })).toHaveCount(0);
      await employeePage.reload();
      await expect(employeePage.getByText(/h worked today/)).toBeVisible();
    });

    await test.step('Admin sees the stored attendance', async () => {
      await page.goto('/hr/attendance');
      const row = page.getByRole('row').filter({ hasText: employeeName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('HalfDay');
      const downloadEvent = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
      const download = await downloadEvent;
      const stream = await download.createReadStream();
      let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
      expect(csv).toContain(employeeName);
      expect(csv).toContain('Clock in (UTC)');
    });

    const leaveYear = new Date().getUTCFullYear() + 1;
    const date = new Date(Date.UTC(leaveYear, 0, 5));
    while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
    const leaveDay = (weeks: number) => new Date(date.getTime() + weeks * 7 * 86400000).toISOString().slice(0, 10);
    await test.step('Admin sets a policy and employee submits leave on mobile', async () => {
      await page.goto('/hr/leaves');
      await page.getByLabel('Policy name', { exact: true }).fill('Annual leave');
      await page.getByLabel('Days per year', { exact: true }).fill('10');
      await page.getByRole('button', { name: 'Add policy', exact: true }).click();
      await expect(page.getByText('Leave policy added for all employees.')).toBeVisible();
      await employeePage.goto('/my-leave');
      await employeePage.getByLabel('Leave type', { exact: true }).selectOption({ label: 'Annual leave' });
      await employeePage.getByLabel('Start date', { exact: true }).fill(leaveDay(0));
      await employeePage.getByLabel('End date', { exact: true }).fill(leaveDay(0));
      await employeePage.getByLabel('Reason', { exact: true }).fill('Family appointment');
      await employeePage.getByRole('button', { name: 'Submit request', exact: true }).click();
      await expect(employeePage.getByText('Family appointment', { exact: true })).toBeVisible();
      await expect(employeePage.getByText('0 used · 1 pending · 10 total')).toBeVisible();
      expect(await employeePage.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
      await employeePage.screenshot({ path: testInfo.outputPath('my-leave-mobile.png'), fullPage: true });
    });
    await test.step('Admin reviews with server identity and employee sees decisions', async () => {
      await page.reload();
      await page.getByRole('article').filter({ hasText: 'Family appointment' }).getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(page.getByText('Leave approved and balance updated.')).toBeVisible();
      await employeePage.reload();
      await expect(employeePage.getByText('Approved', { exact: true })).toBeVisible();
      await expect(employeePage.getByText('1 used · 0 pending · 10 total')).toBeVisible();
      await expect(employeePage.getByText('Reviewed by Demo Admin')).toBeVisible();
      await employeePage.getByLabel('Leave type', { exact: true }).selectOption({ label: 'Annual leave' });
      await employeePage.getByLabel('Start date', { exact: true }).fill(leaveDay(1));
      await employeePage.getByLabel('End date', { exact: true }).fill(leaveDay(1));
      await employeePage.getByLabel('Reason', { exact: true }).fill('Second appointment');
      await employeePage.getByRole('button', { name: 'Submit request', exact: true }).click();
      await expect(employeePage.getByText('Second appointment', { exact: true })).toBeVisible();
      await page.reload();
      const request = page.getByRole('article').filter({ hasText: 'Second appointment' });
      await request.getByRole('button', { name: 'Reject', exact: true }).click();
      await page.getByLabel('Rejection reason', { exact: true }).fill('Please choose another date');
      await page.getByRole('button', { name: 'Confirm rejection', exact: true }).click();
      await expect(page.getByText('Leave rejected. Reserved days are available again.')).toBeVisible();
      await employeePage.reload();
      await expect(employeePage.getByText('Reason: Please choose another date')).toBeVisible();
      await employeePage.getByLabel('Leave type', { exact: true }).selectOption({ label: 'Annual leave' });
      await employeePage.getByLabel('Start date', { exact: true }).fill(leaveDay(2));
      await employeePage.getByLabel('End date', { exact: true }).fill(leaveDay(2));
      await employeePage.getByLabel('Reason', { exact: true }).fill('Tentative appointment');
      await employeePage.getByRole('button', { name: 'Submit request', exact: true }).click();
      await employeePage.getByRole('button', { name: 'Cancel request', exact: true }).click();
      await expect(employeePage.getByText('Cancelled', { exact: true })).toBeVisible();
      await expect(employeePage.getByText('1 used · 0 pending · 10 total')).toBeVisible();
    });
    await test.step('Real PostgreSQL serializes competing requests and duplicate approvals', async () => {
      const adminToken = await page.evaluate(() => JSON.parse(localStorage.getItem('bizcore-auth')!).state.accessToken as string);
      const employeeToken = await employeePage.evaluate(() => JSON.parse(localStorage.getItem('bizcore-auth')!).state.accessToken as string);
      const admin = { Authorization: `Bearer ${adminToken}` };
      const employee = { Authorization: `Bearer ${employeeToken}` };
      const api = 'http://localhost:5001/api';
      const profile = await (await page.request.get(`${api}/hr/employees/me`, { headers: employee })).json();
      const policyResponse = await page.request.post(`${api}/hr/leave/types`, { headers: admin, data: { name: 'Limited leave', daysAllowed: 1 } });
      expect(policyResponse.status()).toBe(201);
      const policy = await policyResponse.json();
      const applications = await Promise.all([3, 4].map(week => page.request.post(`${api}/hr/employees/${profile.id}/apply-leave`, {
        headers: employee, data: { leaveTypeId: policy.id, startDate: leaveDay(week), endDate: leaveDay(week), reason: 'Concurrent application' },
      })));
      expect(applications.map(response => response.status()).sort()).toEqual([201, 409]);
      const accepted = await applications.find(response => response.status() === 201)!.json();
      expect((await page.request.put(`${api}/hr/leave/${accepted.id}/approve`, { headers: employee })).status()).toBe(403);
      const reviews = await Promise.all([1, 2].map(() => page.request.put(`${api}/hr/leave/${accepted.id}/approve`, { headers: admin })));
      expect(reviews.map(response => response.status()).sort()).toEqual([200, 409]);
      const balances = await (await page.request.get(`${api}/hr/employees/${profile.id}/leave-balances?year=${leaveYear}`, { headers: employee })).json();
      expect(balances.find((balance: { leaveTypeId: string }) => balance.leaveTypeId === policy.id)).toMatchObject({ usedDays: 1, availableDays: 0, pendingDays: 0 });
      const overview = await (await page.request.get(`${api}/hr/overview`, { headers: admin })).json();
      expect(overview).toMatchObject({ scope: 'company', activeEmployees: 1, clockInsToday: 1, pendingRequests: 0 });
      expect((await page.request.get(`${api}/hr/attendance/export?from=${leaveDay(0)}&to=${leaveDay(0)}`, { headers: employee })).status()).toBe(403);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Company overview', exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
      // Original revocation assertion below targets the employee profile.
      await employeePage.goto('/my-profile');
    });

    await test.step('Revocation blocks the employee even with their existing token', async () => {
      await page.goto('/hr/employees');
      const row = page.getByRole('row').filter({ hasText: employeeEmail });
      page.once('dialog', dialog => dialog.accept());
      await row.getByRole('button', { name: 'Revoke', exact: true }).click();
      await expect(row.getByText('No Access', { exact: true })).toBeVisible();
      await employeePage.reload();
      await expect(employeePage.getByRole('heading', { name: 'No Employee Profile Linked' })).toBeVisible();
      const token = await employeePage.evaluate(() =>
        JSON.parse(localStorage.getItem('bizcore-auth')!).state.accessToken as string);
      const denied = await employeeContext.request.post('http://localhost:5001/api/hr/employees/clock-in', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(denied.status()).toBe(404);
    });
  } finally {
    await employeeContext.close();
  }

  await test.step('A fresh browser can log in to the registered company', async () => {
    const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
    try {
      const returningAdmin = await context.newPage();
      await signIn(returningAdmin, adminEmail);
      await returningAdmin.goto('/hr/employees');
      await expect(returningAdmin.getByRole('row').filter({ hasText: employeeEmail })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

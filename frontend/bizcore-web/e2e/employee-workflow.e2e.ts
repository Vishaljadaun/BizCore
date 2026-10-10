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

test('company onboarding, mobile employee attendance and immediate access revocation', async ({ page, browser }) => {
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

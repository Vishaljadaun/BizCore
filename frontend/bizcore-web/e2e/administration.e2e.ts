import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
type Auth = { accessToken: string; refreshToken: string; user: { id: string; companyId: string; companyCode: string; mustChangePassword: boolean } };
const root = 'http://localhost:5001/api';
const password = 'DemoOnly-Strong42!';
const replacement = 'Private-Replacement73!';
async function session(page: Page, auth: Auth) {
  await page.goto('/login');
  await page.evaluate(data => localStorage.setItem('bizcore-auth', JSON.stringify({ state: { ...data, isAuthenticated: true }, version: 0 })), auth);
}

test('administration edits, current roles, tenant login and password recovery', async ({ page, request }, info) => {
  test.setTimeout(180_000);
  const suffix = randomUUID().slice(0, 8);
  const register = async (name: string) => {
    const r = await request.post(`${root}/auth/register`, { data: { companyName: `${name} ${suffix}`, firstName: 'Demo', lastName: 'Admin', email: `${name}-${suffix}@example.com`, password } });
    expect(r.status(), await r.text()).toBe(201); return await r.json() as Auth;
  };
  const admin = await register('adminchecks'); const outside = await register('outsidechecks');
  const headers = { Authorization: `Bearer ${admin.accessToken}` };
  const email = `shared-${suffix}@example.com`;
  const createUser = async (auth: Auth, role: string) => {
    const r = await request.post(`${root}/users`, { headers: { Authorization: `Bearer ${auth.accessToken}` }, data: { firstName: 'Mira', lastName: 'Tester', email, password, role } });
    expect(r.status(), await r.text()).toBe(201); return r.json();
  };
  const user = await createUser(admin, 'Manager'); await createUser(outside, 'Employee');
  const login = async (pw: string, code = admin.user.companyCode) => {
    const r = await request.post(`${root}/auth/login`, { data: { email, password: pw, companyCode: code } });
    expect(r.status(), await r.text()).toBe(200); return await r.json() as Auth;
  };
  const ambiguous = await request.post(`${root}/auth/login`, { data: { email, password } }); expect(ambiguous.status()).toBe(401);
  const manager = await login(password); expect(manager.user.companyId).toBe(admin.user.companyId);
  const other = await login(password, outside.user.companyCode); expect(other.user.companyId).toBe(outside.user.companyId);
  const mh = { Authorization: `Bearer ${manager.accessToken}` };
  const dh = await request.post(`${root}/hr/departments`, { headers, data: { name: 'Support', description: 'Initial team' } }); expect(dh.status()).toBe(201); const dept = await dh.json();
  const employeeInput = { firstName: 'Mira', lastName: 'Tester', email, designation: 'Support Analyst', departmentId: dept.id, joiningDate: '2026-01-01', salary: 40000, userId: user.id };
  const er = await request.post(`${root}/hr/employees`, { headers, data: employeeInput }); expect(er.status(), await er.text()).toBe(201); const employee = await er.json();
  await session(page, admin);
  await test.step('Edit a department and employee through the interface', async () => {
    await page.goto('/hr/departments'); await page.getByRole('button', { name: 'Edit Support', exact: true }).click();
    await page.getByLabel('Department Name', { exact: true }).fill('Customer Success');
    await page.getByLabel('Department manager', { exact: true }).selectOption(employee.id);
    await page.getByRole('button', { name: 'Save Department', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Customer Success', exact: true })).toBeVisible();
    await page.goto('/hr/employees'); const row = page.getByRole('row').filter({ hasText: email });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Designation', { exact: true }).fill('Senior Support Analyst');
    await page.getByRole('button', { name: 'Save Employee', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await page.reload(); await expect(row).toContainText('Senior Support Analyst');
    await row.getByRole('button', { name: 'View', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('40,000'); await page.getByRole('button', { name: 'Close dialog' }).click();
  });
  await test.step('Deactivation revokes access and preserves the employee record', async () => {
    const row = page.getByRole('row').filter({ hasText: email }); await row.getByRole('button', { name: 'Deactivate', exact: true }).click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    expect((await request.get(`${root}/hr/employees`, { headers: mh })).status()).toBe(403);
    await row.getByRole('button', { name: 'Reactivate', exact: true }).click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    expect((await request.get(`${root}/hr/employees`, { headers: mh })).status()).toBe(403);
    expect((await request.put(`${root}/users/${user.id}/toggle`, { headers })).status()).toBe(200);
    expect((await request.get(`${root}/hr/employees`, { headers: mh })).status()).toBe(401);
  });
  const active = await login(password); const ah = { Authorization: `Bearer ${active.accessToken}` };
  expect((await request.get(`${root}/hr/employees`, { headers: ah })).status()).toBe(200);
  expect((await request.put(`${root}/users/${user.id}/role`, { headers, data: { role: 'CompanyAdmin' } })).status()).toBe(403);
  expect((await request.put(`${root}/users/${user.id}/role`, { headers, data: { role: 'Employee' } })).status()).toBe(200);
  expect((await request.get(`${root}/hr/employees`, { headers: ah })).status()).toBe(403); // stale Manager JWT
  expect((await request.get(`${root}/companies`, { headers })).status()).toBe(403);
  expect((await request.put(`${root}/users/${other.user.id}/toggle`, { headers })).status()).toBe(404);
  expect((await request.put(`${root}/hr/employees/${employee.id}`, { headers: { Authorization: `Bearer ${outside.accessToken}` }, data: employeeInput })).status()).toBe(404);
  await test.step('Administrator reset forces password change and revokes old credentials', async () => {
    await page.goto('/users'); await page.getByRole('row').filter({ hasText: email }).getByRole('button', { name: 'Reset password', exact: true }).click();
    await page.getByLabel('Your admin password', { exact: true }).fill('wrong');
    await page.getByLabel('Temporary password', { exact: true }).fill(replacement);
    await page.getByRole('dialog').getByRole('button', { name: 'Reset password', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('incorrect');
    await page.getByLabel('Your admin password', { exact: true }).fill(password); await page.getByRole('dialog').getByRole('button', { name: 'Reset password', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Password reset'); await page.getByRole('button', { name: 'Done', exact: true }).click();
    expect((await request.get(`${root}/auth/me`, { headers: ah })).status()).toBe(401);
    expect((await request.post(`${root}/auth/refresh`, { data: { accessToken: active.accessToken, refreshToken: active.refreshToken } })).status()).toBe(401);
    const temp = await login(replacement); expect(temp.user.mustChangePassword).toBe(true);
    const locked = await request.get(`${root}/operations/projects`, { headers: { Authorization: `Bearer ${temp.accessToken}` } }); expect(locked.status()).toBe(403); expect((await locked.json()).code).toBe('password_change_required');
    await session(page, temp); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/dashboard'); await expect(page).toHaveURL(/account-security$/);
    await page.getByLabel('Current password', { exact: true }).fill(replacement); await page.getByLabel('New password', { exact: true }).fill('My-New-Password91!'); await page.getByLabel('Confirm new password', { exact: true }).fill('My-New-Password91!');
    await page.screenshot({ path: info.outputPath('account-security-mobile.png'), fullPage: true }); expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBeTruthy();
    await page.getByRole('button', { name: 'Change password', exact: true }).click(); await expect(page).toHaveURL(/login$/); await expect(page.getByRole('status')).toContainText('Password changed');
    const signedIn = await login('My-New-Password91!'); expect(signedIn.user.mustChangePassword).toBe(false);
    expect((await request.get(`${root}/auth/me`, { headers: { Authorization: `Bearer ${temp.accessToken}` } })).status()).toBe(401);
    // Concurrent refreshes serialize: a refresh token can only succeed once.
    const results = await Promise.all([0, 1].map(() => request.post(`${root}/auth/refresh`, { data: { accessToken: signedIn.accessToken, refreshToken: signedIn.refreshToken } })));
    expect(results.map(r => r.status()).sort()).toEqual([200, 401]);
  });
});

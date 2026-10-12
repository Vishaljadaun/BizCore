import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
type AuthResponse = { accessToken: string; refreshToken: string; user: Record<string, unknown> };
const root = 'http://localhost:5001/api';
const password = 'DemoOnly-Strong42!';
const day = new Date().toISOString().slice(0, 10);
async function session(page: Page, auth: AuthResponse) {
  await page.goto('/login');
  await page.evaluate(data => localStorage.setItem('bizcore-auth', JSON.stringify({ state: { ...data, isAuthenticated: true }, version: 0 })), auth);
}
async function save(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
}
async function action(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}
test('connected operations persist, enforce ownership and serialize money and stock', async ({ page, request, browser }, info) => {
  test.setTimeout(180_000);
  const suffix = randomUUID().slice(0, 8);
  const register = async (name: string) => {
    const result = await request.post(`${root}/auth/register`, { data: { companyName: `${name} ${suffix}`, firstName: 'Demo', lastName: 'Admin', email: `${name}-${suffix}@example.com`, password } });
    expect(result.ok()).toBeTruthy(); return await result.json() as AuthResponse;
  };
  const admin = await register('ops');
  const headers = { Authorization: `Bearer ${admin.accessToken}` };
  const post = async (path: string, data: unknown) => { const r = await request.post(`${root}/${path}`, { headers, data }); expect(r.status(), await r.text()).toBe(201); return r.json(); };
  const get = async (path: string) => { const r = await request.get(`${root}/operations/${path}`, { headers }); expect(r.status(), await r.text()).toBe(200); return r.json(); };
  const put = async (path: string, data: unknown) => { const r = await request.put(`${root}/operations/${path}`, { headers, data }); expect(r.status(), await r.text()).toBe(200); return r.json(); };
  const employee = await post('users', { firstName: 'Asha', lastName: 'Worker', email: `worker-${suffix}@example.com`, password, role: 'Employee' });
  const vendor = await post('users', { firstName: 'Ravi', lastName: 'Supplier', email: `vendor-${suffix}@example.com`, password, role: 'Vendor' });
  const login = async (email: string) => { const r = await request.post(`${root}/auth/login`, { data: { email, password } }); expect(r.ok()).toBeTruthy(); return await r.json() as AuthResponse; };
  await session(page, admin);
  await test.step('Create a project and assign a task in the UI', async () => {
    await page.goto('/projects/list');
    await page.getByRole('button', { name: '+ New project', exact: true }).click();
    await page.getByLabel('Project name', { exact: false }).fill('Office launch');
    await page.getByLabel('Description', { exact: false }).fill('Prepare a new workspace');
    await save(page);
    await page.getByRole('link', { name: 'View tasks →' }).click();
    await page.getByRole('button', { name: '+ New task', exact: true }).click();
    await page.getByLabel('Task title', { exact: false }).fill('Inspect desks');
    await page.getByLabel('Assigned to', { exact: true }).selectOption(employee.id);
    await save(page);
    await expect(page.getByRole('article')).toContainText('Asha Worker');
  });
  const project = (await get('projects')).items[0]; const task = (await get('tasks')).items[0];
  const employeeAuth = await login(`worker-${suffix}@example.com`);
  const employeeContext = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 } });
  const employeePage = await employeeContext.newPage();
  await session(employeePage, employeeAuth);
  await test.step('Employee completes assigned work and logs time on mobile', async () => {
    await employeePage.goto('/projects/my-tasks');
    await action(employeePage, 'Start task');
    await employeePage.getByRole('button', { name: 'Log time', exact: true }).click();
    await employeePage.getByLabel('Minutes', { exact: false }).fill('45');
    await employeePage.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(employeePage.getByRole('dialog')).toBeHidden();
    await action(employeePage, 'Mark done');
    await employeePage.reload();
    await expect(employeePage.getByRole('article')).toContainText('Done');
    expect((await employeePage.getByLabel('Search tasks', { exact: true }).boundingBox())!.width).toBeGreaterThan(250);
    await employeePage.screenshot({ path: info.outputPath('mobile-tasks.png'), fullPage: true });
    expect(await employeePage.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBeTruthy();
    await employeePage.goto('/projects/time-logs');
    await expect(employeePage.getByRole('article')).toContainText('45');
  });
  await put(`projects/${project.id}/status`, { status: 'Completed' });
  const supplierData = { name: 'Acme Furnishings', email: 'acme@example.com', phone: '', address: 'Demo address', portalUserId: vendor.id, isActive: true };
  await test.step('Create supplier, contract, product and purchase order through forms', async () => {
    await page.goto('/vendors/list'); await page.getByRole('button', { name: '+ New supplier', exact: true }).click();
    await page.getByLabel('Supplier name', { exact: false }).fill(supplierData.name);
    await page.getByLabel('Vendor portal account', { exact: true }).selectOption(vendor.id);
    await save(page);
    await page.goto('/vendors/contracts'); await page.getByRole('button', { name: '+ New contract', exact: true }).click();
    await page.getByLabel('Supplier *', { exact: true }).selectOption({ label: supplierData.name });
    await page.getByLabel('Contract title', { exact: false }).fill('Annual supply');
    await page.getByLabel('Terms', { exact: true }).fill('Deliver inspected goods.');
    await page.getByLabel('End date', { exact: false }).fill(`${Number(day.slice(0, 4)) + 1}-12-31`);
    await save(page); await action(page, 'Activate contract');
    await page.goto('/inventory/products'); await page.getByRole('button', { name: '+ New product', exact: true }).click();
    await page.getByLabel('SKU', { exact: false }).fill('DESK-01');
    await page.getByLabel('Product name', { exact: false }).fill('Office desk');
    await page.getByLabel('Reorder level', { exact: false }).fill('2');
    await page.getByLabel('Unit cost (INR)', { exact: false }).fill('100');
    await save(page); await expect(page.getByRole('article')).toContainText('Reorder needed');
    await page.goto('/inventory/purchase-orders'); await page.getByRole('button', { name: '+ New purchase order', exact: true }).click();
    await page.getByLabel('Supplier *', { exact: true }).selectOption({ label: supplierData.name });
    await page.getByLabel('Product *', { exact: true }).selectOption({ label: 'Office desk' });
    await page.getByLabel('Quantity', { exact: false }).fill('3');
    await page.getByLabel('Unit cost (INR)', { exact: false }).fill('100');
    await save(page); await action(page, 'Place order');
  });
  const supplier = (await get('suppliers')).items[0]; const product = (await get('products')).items[0]; const order = (await get('orders')).items[0];
  const vendorAuth = await login(`vendor-${suffix}@example.com`);
  const vendorContext = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const vendorPage = await vendorContext.newPage(); await session(vendorPage, vendorAuth);
  await test.step('Vendor acknowledges only the linked order and reads the contract', async () => {
    await vendorPage.goto('/vendor-portal');
    await action(vendorPage, 'Acknowledge order');
    await vendorPage.getByRole('button', { name: 'Contracts', exact: true }).click();
    await expect(vendorPage.getByRole('article')).toContainText('Annual supply');
    const forbidden = await request.put(`${root}/operations/orders/${order.id}/status`, { headers: { Authorization: `Bearer ${vendorAuth.accessToken}` }, data: { status: 'Received' } });
    expect(forbidden.status()).toBe(403);
  });
  await test.step('Concurrent receipt updates stock and creates exactly one expense', async () => {
    const receipts = await Promise.all([1, 2].map(() => request.put(`${root}/operations/orders/${order.id}/status`, { headers, data: { status: 'Received' } })));
    expect(receipts.map(r => r.status()).sort()).toEqual([200, 409]);
    expect((await get('products')).items[0].onHand).toBe(3);
    expect((await get('movements')).totalCount).toBe(1);
    expect((await get('expenses')).items).toHaveLength(1);
    expect((await get('expenses')).items[0].amount).toBe(300);
    await page.goto('/inventory/products'); await expect(page.getByRole('article')).not.toContainText('Reorder needed');
    await page.getByRole('button', { name: 'Adjust stock', exact: true }).click();
    await page.getByLabel('Stock change', { exact: false }).fill('-4');
    await page.getByLabel('Reason', { exact: false }).fill('Count correction');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Stock must stay');
    await page.getByLabel('Stock change', { exact: false }).fill('-1');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    expect((await get('products')).items[0].onHand).toBe(2);
    await page.goto('/inventory/alerts'); await expect(page.getByRole('article')).toContainText('Office desk');
  });
  await test.step('Invoice and expense forms connect to cash-flow totals and CSV', async () => {
    await page.goto('/finance/invoices'); await page.getByRole('button', { name: '+ New invoice', exact: true }).click();
    await page.getByLabel('Customer name', { exact: false }).fill('Example Customer');
    await page.getByLabel('Due date', { exact: false }).fill(day);
    await page.getByLabel('Tax (%)', { exact: false }).fill('10');
    await page.getByLabel('Item description', { exact: false }).fill('Workspace setup');
    await page.getByLabel('Unit price (INR)', { exact: false }).fill('1000');
    await save(page); await action(page, 'Issue invoice');
    await page.getByRole('button', { name: 'Record payment', exact: true }).click();
    await page.getByLabel('Amount received (INR)', { exact: false }).fill('500');
    await page.getByLabel('Payment reference', { exact: false }).fill('BANK-DEMO-1');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('article')).toContainText('Part Paid');
    await page.goto('/finance/expenses'); await action(page, 'Mark paid');
    await page.getByRole('button', { name: '+ New expense', exact: true }).click();
    await page.getByLabel('Description', { exact: false }).fill('Office delivery');
    await page.getByLabel('Amount (INR)', { exact: false }).fill('50');
    await save(page);
    await page.getByRole('article', { name: 'Office delivery', exact: true }).getByRole('button', { name: 'Mark paid', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await page.goto('/finance/reports'); await expect(page.getByRole('heading', { name: 'Cash-flow report' })).toBeVisible();
    await expect(page.getByText('₹150.00', { exact: true })).toBeVisible();
    const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export cash-flow CSV', exact: true }).click();
    const stream = await (await event).createReadStream(); let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
    expect(csv).toContain('BANK-DEMO-1'); expect(csv).toContain('Office delivery'); expect(csv).toContain('INR');
    await page.screenshot({ path: info.outputPath('desktop-finance.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('aside')).not.toBeInViewport(); await page.screenshot({ path: info.outputPath('mobile-finance.png'), fullPage: true });
    expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBeTruthy();
  });
  await test.step('Payment retries are idempotent and concurrent overpayment is rejected', async () => {
    const invoice = (await get('invoices')).items[0]; const payment = { amount: 400, date: day, reference: 'Concurrent test', requestId: randomUUID() };
    const results = await Promise.all([1, 2].map(() => request.post(`${root}/operations/invoices/${invoice.id}/payments`, { headers, data: payment })));
    expect(results.map(r => r.status())).toEqual([201, 201]);
    expect((await get('invoices')).items[0].paid).toBe(900);
    const payments = await Promise.all([1, 2].map(() => request.post(`${root}/operations/invoices/${invoice.id}/payments`, { headers, data: { ...payment, amount: 150, requestId: randomUUID() } })));
    expect(payments.map(r => r.status()).sort()).toEqual([201, 409]);
    expect((await get('invoices')).items[0].paid).toBe(1050);
  });
  await test.step('Cross-company IDs and employee financial access are blocked', async () => {
    const outsider = await register('outside'); const foreignHeaders = { Authorization: `Bearer ${outsider.accessToken}` };
    for (const resource of ['projects', 'products', 'orders', 'invoices', 'suppliers', 'contracts', 'expenses', 'time-entries']) {
      const r = await request.get(`${root}/operations/${resource}`, { headers: foreignHeaders }); expect(r.status()).toBe(200); expect((await r.json()).totalCount).toBe(0);
    }
    const foreign = await request.put(`${root}/operations/projects/${project.id}/status`, { headers: foreignHeaders, data: { status: 'Active' } }); expect(foreign.status()).toBe(404);
    const foreignProduct = await request.post(`${root}/operations/orders`, { headers: foreignHeaders, data: { supplierId: supplier.id, notes: '', expectedDate: null, lines: [{ productId: product.id, quantity: 1, unitCost: 1 }] } }); expect(foreignProduct.status()).toBe(404);
    for (const resource of ['products', 'invoices', 'suppliers', 'expenses']) expect((await request.get(`${root}/operations/${resource}`, { headers: { Authorization: `Bearer ${employeeAuth.accessToken}` } })).status()).toBe(403);
    expect((await get('time-entries')).items[0].taskId).toBe(task.id);
  });
  await test.step('A failed multi-line receipt rolls back all stock and expense changes', async () => {
    const full = await post('operations/products', { sku: 'FULL', name: 'Capacity test', unit: 'units', reorderLevel: 0, unitCost: 1, isActive: true });
    await post(`operations/products/${full.id}/stock`, { delta: 999999, reason: 'Test capacity boundary', requestId: randomUUID() });
    const attempt = await post('operations/orders', { supplierId: supplier.id, expectedDate: null, notes: '', lines: [{ productId: product.id, quantity: 1, unitCost: 100 }, { productId: full.id, quantity: 2, unitCost: 1 }] });
    await put(`orders/${attempt.id}/status`, { status: 'Placed' });
    const result = await request.put(`${root}/operations/orders/${attempt.id}/status`, { headers, data: { status: 'Received' } }); expect(result.status()).toBe(409);
    const products = (await get('products')).items;
    expect(products.find((p: { id: string }) => p.id === product.id).onHand).toBe(2);
    expect(products.find((p: { id: string }) => p.id === full.id).onHand).toBe(999999);
    expect((await get('expenses')).totalCount).toBe(2);
    expect((await get('orders')).items.find((o: { id: string }) => o.id === attempt.id).status).toBe('Placed');
    // Revocation must apply to an already issued token, without waiting for expiry.
    const toggle = await request.put(`${root}/users/${vendor.id}/toggle`, { headers }); expect(toggle.status()).toBe(200);
    expect((await request.get(`${root}/operations/orders`, { headers: { Authorization: `Bearer ${vendorAuth.accessToken}` } })).status()).toBe(403);
  });
  await employeeContext.close(); await vendorContext.close();
});

import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
const root = 'http://localhost:5001/api';
const checkpoint = '.e2e-persistence.json';
test('previously saved account and records survive API restart', async ({ request }) => {
  const verify = process.env.BIZCORE_VERIFY_PERSISTENCE === 'true';
  if (!verify) {
    const suffix = randomUUID().slice(0, 8); const email = `persistence-${suffix}@example.com`; const password = `Test-Only-${randomUUID()}!`;
    const r = await request.post(`${root}/auth/register`, { data: { companyName: `Persistence ${suffix}`, firstName: 'Test', lastName: 'Only', email, password } }); expect(r.status()).toBe(201); const auth = await r.json();
    const saved = await request.post(`${root}/hr/departments`, { headers: { Authorization: `Bearer ${auth.accessToken}` }, data: { name: `Before restart ${suffix}` } }); expect(saved.status()).toBe(201); const dept = await saved.json();
    await writeFile(checkpoint, JSON.stringify({ email, password, userId: auth.user.id, companyId: auth.user.companyId, departmentId: dept.id, departmentName: dept.name }), { mode: 0o600 });
  } else {
    // Deliberately fail when a checkpoint is missing; never create fresh data in verification mode.
    const previous = JSON.parse(await readFile(checkpoint, 'utf8'));
    const r = await request.post(`${root}/auth/login`, { data: { email: previous.email, password: previous.password } }); expect(r.status()).toBe(200); const auth = await r.json();
    expect(auth.user.id).toBe(previous.userId); expect(auth.user.companyId).toBe(previous.companyId);
    const stored = await request.get(`${root}/hr/departments`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }); expect(stored.status()).toBe(200);
    expect((await stored.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: previous.departmentId, name: previous.departmentName })]));
  }
});

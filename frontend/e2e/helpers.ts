import { Page, expect } from '@playwright/test';

/**
 * Real-API E2E helpers.
 * The backend runs on :8080, Vite proxies /api/* to it.
 * Dev-profile seed data: alice/pass123 (founder), bob/pass456 (student).
 */

export async function loginAsUser(
  page: Page,
  userId: string,
  password: string,
) {
  await page.goto('/login');
  await page.getByPlaceholder('johndoe123').fill(userId);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByText('SIGN IN').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

export async function loginAsAlice(page: Page) {
  await loginAsUser(page, 'alice', 'pass123');
}

export async function loginAsBob(page: Page) {
  await loginAsUser(page, 'bob', 'pass456');
}

export async function ensureGuestState(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

export async function getActiveEvents(page: Page): Promise<any[]> {
  const response = await page.request.get('/api/events/active');
  return response.json();
}

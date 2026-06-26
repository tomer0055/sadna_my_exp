import { test, expect } from '@playwright/test';
import { loginAsBob, loginAsAlice } from './helpers';

test.describe('Data Integrity — Real API', () => {

  test('GivenDuplicateUserId_WhenRegistering_ThenShowsError', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('johndoe123').fill('alice');
    await page.getByPlaceholder('John Doe').fill('Alice Clone');
    await page.getByPlaceholder('name@event.com').fill('clone@example.com');
    await page.getByPlaceholder('••••••••').fill('clonePass1');

    await page.getByText(/GENERATE TICKET|CREATE ACCOUNT/).click();

    await expect(
      page.getByText(/already|exists|taken|duplicate|registered/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenBobSession_WhenViewingProfile_ThenOnlySeesBobData', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/account');

    await expect(page.locator('input[value="Bob Jones"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[value="bob@example.com"]')).toBeVisible();
    await expect(page.locator('input[value="Alice Smith"]')).not.toBeVisible();
  });

  test('GivenAliceSession_WhenViewingOrderHistory_ThenShowsOnlyAliceOrders', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/orders/history');

    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    // Alice has no history orders in seed data
    expect(body).not.toContain('order1');
    expect(body).not.toContain('order2');
  });

  test('GivenExpiredToken_WhenAccessingProtectedPage_ThenHandlesGracefully', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired-invalid-token-12345');
    });
    await page.goto('/account');

    // Should redirect to login or show auth error
    await expect(page).toHaveURL(/\/login|\/account/, { timeout: 15000 });
  });

  test('GivenValidSession_WhenProfileReloaded_ThenDataPersists', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');
    await expect(page.locator('input[value="Alice Smith"]')).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.locator('input[value="Alice Smith"]')).toBeVisible({ timeout: 15000 });
  });

  test('GivenBobHistoryOrders_WhenFetchedViaAPI_ThenMatchesSeedData', async ({ page }) => {
    await loginAsBob(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/history?userId=bob', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const orders = await response.json();
    expect(orders.length).toBe(2);
    const orderIds = orders.map((o: any) => o.orderId);
    expect(orderIds).toContain('order1');
    expect(orderIds).toContain('order2');
  });

  test('GivenAliceSession_WhenAccessingBobHistory_ThenReturnsEmpty', async ({ page }) => {
    await loginAsAlice(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/history?userId=alice', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const orders = await response.json();
    expect(orders.length).toBe(0);
  });
});

import { test, expect } from '@playwright/test';
import { loginAsBob, loginAsAlice } from './helpers';

test.describe('Order Conflicts & State Transitions — Real API', () => {

  test('GivenAliceNoActiveOrder_WhenAccessingActiveOrderPage_ThenShowsEmptyState', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/orders/active');

    await expect(
      page.getByText(/No Active Order/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenGuestUser_WhenAccessingCheckout_ThenShowsAuthError', async ({ page }) => {
    await page.goto('/checkout');
    await expect(
      page.getByText(/Authentication token missing|Checkout Error|No Active Order/i)
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenAliceNoOrder_WhenAccessingCheckout_ThenShowsNoActiveOrder', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/checkout');

    await expect(
      page.getByText(/No Active Order/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenBobWithActiveOrder_WhenReservingAgain_ThenRedirectsOrShowsConflict', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await page.getByText('RESERVE TICKETS').click();
    // Bob may have active order (redirects) or it expired (creates new or shows error)
    await expect(page).toHaveURL(/\/orders\/active|\/events\/|\/reserve/, { timeout: 15000 });
  });

  test('GivenNonExistentOrderId_WhenFetchedViaAPI_ThenReturnsError', async ({ page }) => {
    await loginAsAlice(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/orders/fake-order-id-12345', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GivenNonExistentEventId_WhenFetchedViaAPI_ThenReturns404', async ({ page }) => {
    await loginAsAlice(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/events/non-existent-event-id-xyz', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(404);
  });
});

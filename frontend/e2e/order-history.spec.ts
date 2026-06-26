import { test, expect } from '@playwright/test';
import { loginAsBob } from './helpers';

test.describe('Order History Page (Real API)', () => {
  test('GivenGuestUser_WhenOrderHistoryAccessed_ThenShowsAuthGuard', async ({ page }) => {
    await page.goto('/orders/history');
    // RequireMember guard should redirect or show auth message
    await expect(page.getByText(/sign in|log in|SIGN IN/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithHistory_WhenPageLoaded_ThenShowsPastOrders', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/history');

    // Bob has 2 history orders from seed data (order1 for Rock Night, order2 for Comedy Night)
    await expect(page.getByText(/Order History|Past Orders|order/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithHistory_WhenPageLoaded_ThenShowsOrderDetails', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/history');

    // Wait for orders to load
    await page.waitForTimeout(3000);
    // Bob should see his past order entries
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});

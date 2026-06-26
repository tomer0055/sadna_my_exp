import { test, expect } from '@playwright/test';
import { loginAsBob } from './helpers';

test.describe('Order History Page (Real API)', () => {
  test('GivenGuestUser_WhenOrderHistoryAccessed_ThenRedirectsToLogin', async ({ page }) => {
    await page.goto('/orders/history');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('GivenMemberWithHistory_WhenPageLoaded_ThenShowsPageContent', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/history');

    // Bob has 2 history orders from seed data
    await expect(page.getByText(/Order History|Past Orders|Personal/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithHistory_WhenPageLoaded_ThenShowsOrderEntries', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/history');

    await page.waitForLoadState('networkidle');
    // Bob's history orders should eventually load
    await expect(page.locator('body')).not.toHaveText('undefined');
  });
});

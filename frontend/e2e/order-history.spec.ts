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

    // Bob has 2 history orders — verify they render
    await expect(page.getByText('Rock Night').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Comedy Night').first()).toBeVisible({ timeout: 15000 });
  });
});

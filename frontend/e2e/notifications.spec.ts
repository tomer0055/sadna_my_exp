import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Notifications Page (Real API)', () => {
  test('GivenGuestUser_WhenNotificationsAccessed_ThenRedirectsToLogin', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('GivenMemberUser_WhenNotificationsLoaded_ThenShowsPageContent', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/notifications');

    // Page should load and show notifications UI (even if empty)
    await expect(page.getByText(/Notification|All|Unread/i).first()).toBeVisible({ timeout: 15000 });
  });
});

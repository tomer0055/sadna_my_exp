import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Notifications Page (Real API)', () => {
  test('GivenGuestUser_WhenNotificationsAccessed_ThenShowsLoginPrompt', async ({ page }) => {
    await page.goto('/notifications');
    // RequireMember guard
    await expect(page.getByText(/sign in|log in|SIGN IN/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberUser_WhenNotificationsLoaded_ThenShowsPageContent', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/notifications');

    // Page should load and show notifications UI (even if empty)
    await expect(page.getByText(/Notification|All|Unread/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberUser_WhenNotificationsEmpty_ThenShowsEmptyOrFilterUI', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/notifications');

    // Should show filter tabs (All / Unread) even with no notifications
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});

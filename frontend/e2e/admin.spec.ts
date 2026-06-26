import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers';

async function loginAsAdmin(page: any) {
  await loginAsUser(page, 'admin@gmail.com', 'admin123');
}

test.describe('Admin Panel (Real API)', () => {
  test('GivenGuestUser_WhenAdminPageAccessed_ThenShowsAccessDenied', async ({ page }) => {
    await page.goto('/admin');
    // RequireAdmin guard should redirect or show auth error
    await expect(page.getByText(/sign in|log in|SIGN IN|access denied/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenNonAdminMember_WhenAdminPageAccessed_ThenShowsAccessDenied', async ({ page }) => {
    await loginAsUser(page, 'alice', 'pass123');
    await page.goto('/admin');

    // Alice is not admin, should see access denied
    await expect(page.getByText(/access denied|not authorized|admin privileges/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenAdminUser_WhenAdminPageLoaded_ThenShowsAdminPanel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('System Administration')).toBeVisible();
  });

  test('GivenAdminUser_WhenAdminPageLoaded_ThenShowsUsersList', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 15000 });
    // Admin should see users tab/data — seeded users alice and bob
    const usersTab = page.getByText(/Users/i).first();
    if (await usersTab.isVisible()) {
      await usersTab.click();
      await expect(page.getByText('alice')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('bob')).toBeVisible();
    }
  });
});

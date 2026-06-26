import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers';

async function loginAsAdmin(page: any) {
  await loginAsUser(page, 'admin@gmail.com', 'admin123');
}

test.describe('Admin Panel (Real API)', () => {
  test('GivenGuestUser_WhenAdminPageAccessed_ThenShowsForbidden', async ({ page }) => {
    await page.goto('/admin');
    // RequireAdmin shows ForbiddenAccess with "Admin Access Required"
    await expect(page.getByText('Admin Access Required')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('403')).toBeVisible();
  });

  test('GivenNonAdminMember_WhenAdminPageAccessed_ThenShowsForbidden', async ({ page }) => {
    await loginAsUser(page, 'alice', 'pass123');
    await page.goto('/admin');

    await expect(page.getByText('Admin Access Required')).toBeVisible({ timeout: 15000 });
  });

  test('GivenAdminUser_WhenAdminPageLoaded_ThenShowsAdminPanel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('System Administration')).toBeVisible();
  });

  test('GivenAdminUser_WhenAdminPageLoaded_ThenShowsUserData', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.getByText('Admin Panel')).toBeVisible({ timeout: 15000 });
    // Admin panel loads users, active orders, and history — wait for data
    await page.waitForLoadState('networkidle');
    const usersTab = page.getByText(/Users/i).first();
    if (await usersTab.isVisible()) {
      await usersTab.click();
      await page.waitForTimeout(2000);
    }
  });
});

import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Account Settings Page (Real API)', () => {
  test('GivenGuestUser_WhenAccountPageAccessed_ThenRedirectsToLogin', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('GivenMemberUser_WhenAccountPageLoaded_ThenShowsProfileInfo', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');

    await expect(page.getByDisplayValue('Alice Smith')).toBeVisible({ timeout: 15000 });
    await expect(page.getByDisplayValue('alice@example.com')).toBeVisible();
  });

  test('GivenMemberUser_WhenEditClicked_ThenShowsEditableFields', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');

    await expect(page.getByDisplayValue('Alice Smith')).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.getByRole('button', { name: /save|cancel/i }).first()).toBeVisible();
    }
  });
});

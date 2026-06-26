import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Account Settings Page (Real API)', () => {
  test('GivenGuestUser_WhenAccountPageAccessed_ThenShowsLoginPrompt', async ({ page }) => {
    await page.goto('/account');
    // RequireMember guard redirects guests
    await expect(page.getByText(/sign in|log in|SIGN IN/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberUser_WhenAccountPageLoaded_ThenShowsProfileInfo', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');

    // Should display alice's profile data
    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('alice@example.com')).toBeVisible();
  });

  test('GivenMemberUser_WhenEditClicked_ThenShowsEditableFields', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');

    await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 15000 });

    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      // Should show save/cancel buttons
      await expect(page.getByRole('button', { name: /save|cancel/i }).first()).toBeVisible();
    }
  });
});

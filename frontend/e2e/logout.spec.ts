import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Logout Flow (Real API)', () => {
  test('GivenLoggedInMember_WhenLogoutClicked_ThenReturnsToGuestState', async ({ page }) => {
    await loginAsAlice(page);
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 });

    // Click logout button in top navbar
    await page.getByRole('button', { name: /Logout/i }).click();

    // Should return to guest state — dashboard shows guest welcome
    await expect(page.getByText('Welcome to TicketFlow')).toBeVisible({ timeout: 15000 });
  });

  test('GivenLoggedInMember_WhenLogoutClicked_ThenMemberNavItemsDisappear', async ({ page }) => {
    await loginAsAlice(page);
    await expect(page.getByRole('link', { name: 'Order History', exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page.getByText('Welcome to TicketFlow')).toBeVisible({ timeout: 15000 });

    // Member-only nav items should no longer be visible
    await expect(page.getByRole('link', { name: 'Order History', exact: true })).not.toBeVisible();
  });

  test('GivenGuestUser_WhenOnDashboard_ThenLogoutButtonNotVisible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Welcome to TicketFlow')).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: /Logout/i })).not.toBeVisible();
  });
});

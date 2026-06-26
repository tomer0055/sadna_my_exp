import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Dashboard Page (Real API)', () => {
  test('GivenGuestUser_WhenDashboardLoaded_ThenShowsGuestWelcomeBanner', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Welcome to TicketFlow')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/browsing as a guest/i)).toBeVisible();
    await expect(page.getByText('Sign in')).toBeVisible();
  });

  test('GivenGuestUser_WhenDashboardLoaded_ThenShowsQuickAccessGrid', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Quick Access')).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberUser_WhenDashboardLoaded_ThenShowsPersonalizedWelcome', async ({ page }) => {
    await loginAsAlice(page);
    await expect(page.getByText(/Welcome back, Alice Smith/i)).toBeVisible({ timeout: 10000 });
  });

  test('GivenGuestUser_WhenSignInLinkClicked_ThenNavigatesToLogin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Sign in')).toBeVisible({ timeout: 15000 });
    await page.getByText('Sign in').click();
    await expect(page).toHaveURL(/\/login/);
  });
});

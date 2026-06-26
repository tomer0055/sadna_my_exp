import { test, expect } from '@playwright/test';
import { loginAsAlice } from './helpers';

test.describe('Navigation & Layout (Real API)', () => {
  test('GivenGuestUser_WhenVisitingRoot_ThenRedirectsToDashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('GivenGuestUser_WhenOnDashboard_ThenShowsSidebarWithPublicItems', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Home')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Events')).toBeVisible();
  });

  test('GivenGuestUser_WhenClickingEvents_ThenNavigatesToEventsPage', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Events/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /Events/i }).first().click();
    await expect(page).toHaveURL(/\/events/);
  });

  test('GivenMemberUser_WhenOnDashboard_ThenShowsMemberNavItems', async ({ page }) => {
    await loginAsAlice(page);
    await expect(page.getByRole('link', { name: 'Order History', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
  });

  test('GivenUnknownRoute_WhenVisited_ThenRedirectsToDashboard', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

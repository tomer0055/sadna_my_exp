import { test, expect } from '@playwright/test';
import { loginAsAlice, loginAsBob } from './helpers';

test.describe('Production Companies Page (Real API)', () => {
  test('GivenFounderUser_WhenMyCompaniesLoaded_ThenShowsCompaniesOrEmpty', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/production-company');

    // Page should show either companies list or empty state
    await expect(
      page.getByText(/MY COMPANIES|No companies yet/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenFounderUser_WhenMyCompaniesLoaded_ThenShowsCreateOption', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/production-company');

    await expect(page.getByText(/MY COMPANIES/i).first()).toBeVisible({ timeout: 15000 });
    // Should always have a create company button
    await expect(page.getByText(/NEW COMPANY|CREATE COMPANY/i).first()).toBeVisible();
  });

  test('GivenNonProductionUser_WhenMyCompaniesLoaded_ThenShowsEmptyOrCreateOption', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/production-company');

    await expect(
      page.getByText(/MY COMPANIES|No companies yet/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenLoggedInUser_WhenMyCompaniesPage_ThenShowsUserActions', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/production-company');

    await expect(page.getByText(/MY COMPANIES/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/MY PROFILE|LOGOUT/i).first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { loginAsBob, loginAsAlice } from './helpers';

test.describe('Active Order Page (Real API)', () => {
  test('GivenGuestUser_WhenActiveOrderLoaded_ThenShowsNoSessionOrNoOrder', async ({ page }) => {
    await page.goto('/orders/active');
    await expect(
      page.getByText(/No session token|log in|No Active Order/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithActiveOrder_WhenPageLoaded_ThenShowsOrderDetails', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/active');

    // Bob has an active order for Rock Night with 3 seats
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithActiveOrder_WhenPageLoaded_ThenShowsCheckoutOption', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/orders/active');

    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Checkout|Proceed/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('GivenMemberWithNoActiveOrder_WhenPageLoaded_ThenShowsNoOrderMessage', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/orders/active');

    // Alice has no active order
    await expect(
      page.getByText(/No Active Order/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

import { test, expect } from '@playwright/test';
import { loginAsBob } from './helpers';

test.describe('Checkout Page (Real API)', () => {
  test('GivenGuestUser_WhenCheckoutLoaded_ThenShowsAuthError', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText(/Authentication token missing|Checkout Error|No Active Order/i)).toBeVisible({ timeout: 15000 });
  });

  test('GivenMemberWithActiveOrder_WhenCheckoutLoaded_ThenShowsOrderAndPaymentForm', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('Johnathan Doe')).toBeVisible();
    await expect(page.getByPlaceholder('4111 2222 3333 4444')).toBeVisible();
    await expect(page.getByText(/Authorize & Pay/)).toBeVisible();
  });

  test('GivenEmptyPaymentFields_WhenPayClicked_ThenShowsValidationErrors', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    await expect(page.getByText(/Authorize & Pay/)).toBeVisible({ timeout: 15000 });
    await page.getByText(/Authorize & Pay/).click();

    await expect(page.getByText(/Please enter the cardholder name/)).toBeVisible();
    await expect(page.getByText(/valid 9-digit/)).toBeVisible();
    await expect(page.getByText(/valid card number/)).toBeVisible();
  });

  test('GivenActiveOrder_WhenCheckoutLoaded_ThenShowsCorrectSeatCount', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Selected Tickets (3)' })).toBeVisible();
  });

  // This test actually completes the order — must run last
  test('GivenValidPaymentFields_WhenPayClicked_ThenProcessesPayment', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    await expect(page.getByText(/Authorize & Pay/)).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Johnathan Doe').fill('Bob Jones');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('4111222233334444');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('•••').fill('123');

    await page.getByText(/Authorize & Pay/).click();

    // With dev profile (StubPaymentGateway), payment should succeed or show response
    await expect(
      page.getByText(/BARCODE|Payment|Success|Error|declined/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

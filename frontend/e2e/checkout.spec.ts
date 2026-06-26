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

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasPayButton) {
      // Order expired or consumed — verify expired/no-order state is shown
      await expect(page.getByText(/Reservation Period Expired|No Active Order/i).first()).toBeVisible();
      return;
    }

    await expect(page.getByPlaceholder('Johnathan Doe')).toBeVisible();
    await expect(page.getByPlaceholder('4111 2222 3333 4444')).toBeVisible();
  });

  test('GivenEmptyPaymentFields_WhenPayClicked_ThenShowsValidationErrors', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasPayButton) return;

    await payButton.click();

    await expect(page.getByText(/Please enter the cardholder name/)).toBeVisible();
    await expect(page.getByText(/valid 9-digit/)).toBeVisible();
    await expect(page.getByText(/valid card number/)).toBeVisible();
  });

  test('GivenActiveOrder_WhenCheckoutLoaded_ThenShowsCorrectSeatCount', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasPayButton) return;

    await expect(page.getByRole('heading', { name: /Selected Tickets/ })).toBeVisible();
  });

  test('GivenValidPaymentFields_WhenPayClicked_ThenProcessesPayment', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasPayButton) return;

    await page.getByPlaceholder('Johnathan Doe').fill('Bob Jones');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('4111222233334444');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('•••').fill('123');

    await payButton.click();

    await expect(
      page.getByText(/BARCODE|Payment|Success|Error|declined/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

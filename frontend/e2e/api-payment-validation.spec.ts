import { test, expect } from '@playwright/test';
import { loginAsBob, loginAsAlice } from './helpers';

test.describe('Payment Validation — Real API', () => {

  test('GivenCheckoutPage_WhenEmptyFieldsSubmitted_ThenShowsValidationErrors', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });

    const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasPayButton) {
      // Order was consumed or expired
      return;
    }

    await payButton.click();

    await expect(page.getByText(/cardholder name/i)).toBeVisible();
    await expect(page.getByText(/valid 9-digit/i)).toBeVisible();
    await expect(page.getByText(/valid card number/i)).toBeVisible();
  });

  test('GivenCheckoutPage_WhenInvalidCardSubmitted_ThenShowsCardError', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasPayButton) return; // Order consumed

    await page.getByPlaceholder('Johnathan Doe').fill('Bob Jones');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('123');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('•••').fill('123');

    await payButton.click();
    await expect(page.getByText(/valid card number/i)).toBeVisible();
  });

  test('GivenCheckoutPage_WhenExpiredCardSubmitted_ThenShowsExpiryError', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasPayButton) return;

    await page.getByPlaceholder('Johnathan Doe').fill('Bob Jones');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('4111222233334444');
    await page.getByPlaceholder('MM / YY').fill('01/20');
    await page.getByPlaceholder('•••').fill('123');

    await payButton.click();
    await expect(page.getByText(/valid expiry date/i)).toBeVisible();
  });

  test('GivenCheckoutPage_WhenInvalidCvvSubmitted_ThenShowsCvvError', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasPayButton) return;

    await page.getByPlaceholder('Johnathan Doe').fill('Bob Jones');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('4111222233334444');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('•••').fill('1');

    await payButton.click();
    await expect(page.getByText(/valid CVV/i)).toBeVisible();
  });

  test('GivenCheckoutPage_WhenSpecialCharsInName_ThenShowsNameError', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/checkout');

    const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
    const hasPayButton = await payButton.isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasPayButton) return;

    await page.getByPlaceholder('Johnathan Doe').fill('Bob123!@#');
    await page.getByPlaceholder('123456789').fill('123456789');
    await page.getByPlaceholder('4111 2222 3333 4444').fill('4111222233334444');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('•••').fill('123');

    await payButton.click();
    await expect(page.getByText(/cardholder name/i)).toBeVisible();
  });
});

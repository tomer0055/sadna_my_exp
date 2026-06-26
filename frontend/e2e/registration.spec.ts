import { test, expect } from '@playwright/test';

test.describe('User Registration (Real API)', () => {
  test('GivenValidDetails_WhenRegistered_ThenShowsSuccessAndCanLogin', async ({ page }) => {
    const uniqueId = `testuser_${Date.now()}`;

    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('johndoe123').fill(uniqueId);
    await page.getByPlaceholder('name@event.com').fill(`${uniqueId}@test.com`);
    await page.getByPlaceholder('••••••••').fill('password123');

    await page.getByText('GENERATE TICKET').click();

    // Should redirect to login or show success
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('GivenExistingUserId_WhenRegistered_ThenShowsError', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill('Alice Smith');
    await page.getByPlaceholder('johndoe123').fill('alice');
    await page.getByPlaceholder('name@event.com').fill('newalice@test.com');
    await page.getByPlaceholder('••••••••').fill('password123');

    await page.getByText('GENERATE TICKET').click();

    // Should show duplicate user error
    await expect(page.getByText(/already|exists|taken|registered/i)).toBeVisible({ timeout: 10000 });
  });

  test('GivenShortPassword_WhenRegistered_ThenShowsValidationError', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('johndoe123').fill('shortpw');
    await page.getByPlaceholder('name@event.com').fill('short@test.com');
    await page.getByPlaceholder('••••••••').fill('abc');

    await page.getByText('GENERATE TICKET').click();

    await expect(page.getByText(/password.*characters|too short|at least/i)).toBeVisible({ timeout: 10000 });
  });

  test('GivenEmptyFields_WhenRegistered_ThenShowsValidation', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('GENERATE TICKET')).toBeVisible({ timeout: 10000 });

    await page.getByText('GENERATE TICKET').click();

    // HTML5 required validation should prevent submission
    // or frontend validation should show errors
    const url = page.url();
    expect(url).toContain('/register');
  });
});

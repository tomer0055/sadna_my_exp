import { test, expect } from '@playwright/test';

test.describe('Authentication Flow (Real API)', () => {
  test('GivenLoginPage_WhenLoaded_ThenShowsLoginForm', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('johndoe123')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByText('SIGN IN')).toBeVisible();
  });

  test('GivenLoginPage_WhenLinksClicked_ThenNavigatesToRegisterAndForgot', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Register here')).toBeVisible();
    await expect(page.getByText('Lost Access?')).toBeVisible();

    await page.getByText('Register here').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('GivenRegisterPage_WhenLoaded_ThenShowsRegistrationForm', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('johndoe123')).toBeVisible();
    await expect(page.getByPlaceholder('name@event.com')).toBeVisible();
    await expect(page.getByText('GENERATE TICKET')).toBeVisible();
  });

  test('GivenRegisterPage_WhenInvalidNameSubmitted_ThenShowsValidationError', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill('John123');
    await page.getByPlaceholder('johndoe123').fill('testuser');
    await page.getByPlaceholder('name@event.com').fill('test@email.com');
    await page.getByPlaceholder('••••••••').fill('password123');

    await page.getByText('GENERATE TICKET').click();
    await expect(page.getByText(/only letters, spaces, hyphens/i)).toBeVisible();
  });

  test('GivenRegisterPage_WhenEmailAsUserId_ThenShowsValidationError', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill('John Doe');
    await page.getByPlaceholder('johndoe123').fill('user@email.com');
    await page.getByPlaceholder('name@event.com').fill('test@email.com');
    await page.getByPlaceholder('••••••••').fill('password123');

    await page.getByText('GENERATE TICKET').click();
    await expect(page.getByText(/should be a unique username/i)).toBeVisible();
  });

  test('GivenForgotPasswordPage_WhenLoaded_ThenShowsResetInstructions', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Reset Access Key')).toBeVisible();
    await expect(page.getByText(/Contact your system administrator/i)).toBeVisible();
    await expect(page.getByText('Return to Gate')).toBeVisible();
  });

  test('GivenLoginPage_WhenInvalidCredentials_ThenShowsError', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('johndoe123')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('johndoe123').fill('nonexistentuser');
    await page.getByPlaceholder('••••••••').fill('wrongpass');
    await page.getByText('SIGN IN').click();

    await expect(page.getByText('Invalid user ID or password')).toBeVisible({ timeout: 10000 });
  });

  test('GivenValidCredentials_WhenLogin_ThenRedirectsToDashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('johndoe123')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('johndoe123').fill('alice');
    await page.getByPlaceholder('••••••••').fill('pass123');
    await page.getByText('SIGN IN').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from '@playwright/test';
import { loginAsAlice, loginAsBob, loginAsUser } from './helpers';

test.describe('Auth & Session Edge Cases — Real API', () => {

  test('GivenWrongPassword_WhenLoginAttempted_ThenShowsAuthError', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('johndoe123').fill('alice');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByText('SIGN IN').click();

    await expect(
      page.getByText(/invalid|incorrect|failed|wrong|error/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenNonExistentUser_WhenLoginAttempted_ThenShowsError', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('johndoe123').fill('userThatDoesNotExist999');
    await page.getByPlaceholder('••••••••').fill('somePassword');
    await page.getByText('SIGN IN').click();

    await expect(
      page.getByText(/invalid|not found|incorrect|error/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenLoggedInUser_WhenTokenCleared_ThenCannotAccessProtectedPages', async ({ page }) => {
    await loginAsAlice(page);
    await page.goto('/account');
    await expect(page.locator('input[value="Alice Smith"]')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => localStorage.removeItem('token'));
    await page.goto('/account');

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('GivenConcurrentSessions_WhenBothAccessProfile_ThenEachSeesOwnData', async ({ browser }) => {
    test.setTimeout(60000);
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    await loginAsAlice(alicePage);
    await loginAsBob(bobPage);

    await alicePage.goto('/account');
    await bobPage.goto('/account');

    await expect(alicePage.locator('input[value="Alice Smith"]')).toBeVisible({ timeout: 15000 });
    await expect(bobPage.locator('input[value="Bob Jones"]')).toBeVisible({ timeout: 15000 });

    await expect(alicePage.locator('input[value="Bob Jones"]')).not.toBeVisible();
    await expect(bobPage.locator('input[value="Alice Smith"]')).not.toBeVisible();

    await aliceContext.close();
    await bobContext.close();
  });

  test('GivenShortPassword_WhenRegistering_ThenShowsValidationError', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('johndoe123').fill('testuser_short_pw');
    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('name@event.com').fill('test_short@example.com');
    await page.getByPlaceholder('••••••••').fill('ab');

    await page.getByText(/GENERATE TICKET|CREATE ACCOUNT/).click();

    await expect(
      page.getByText(/password|too short|minimum|at least|characters/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('GivenValidGuestToken_WhenCallingMeAPI_ThenDoesNotReturnMemberProfile', async ({ page }) => {
    const guestResponse = await page.request.post('/api/identity/guest');
    expect(guestResponse.ok()).toBeTruthy();
    const { token } = await guestResponse.json();
    expect(token).toBeTruthy();

    const meResponse = await page.request.get('/api/identity/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await meResponse.json();
    // Guest token should not return a registered user's profile (no userId like 'alice' or 'bob')
    if (meResponse.ok()) {
      expect(body.userId).not.toBe('alice');
      expect(body.userId).not.toBe('bob');
    }
  });
});

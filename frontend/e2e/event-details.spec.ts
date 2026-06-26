import { test, expect } from '@playwright/test';
import { loginAsBob } from './helpers';

test.describe('Event Details Page (Real API)', () => {
  test('GivenActiveEvent_WhenViewDetailsClicked_ThenShowsEventInfo', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tel Aviv Arena')).toBeVisible();
  });

  test('GivenEventDetailsPage_WhenLoaded_ThenShowsBackToEventsLink', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await expect(page.getByText('BACK TO EVENTS')).toBeVisible({ timeout: 10000 });
  });

  test('GivenEventDetailsPage_WhenBackClicked_ThenReturnsToEvents', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await page.getByText('BACK TO EVENTS').click();
    await expect(page).toHaveURL(/\/events$/, { timeout: 10000 });
  });

  test('GivenEventDetailsPage_WhenLoaded_ThenShowsReserveTicketsButton', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await expect(page.getByText('RESERVE TICKETS')).toBeVisible({ timeout: 10000 });
  });

  test('GivenMemberWithExistingOrder_WhenReserveClicked_ThenRedirectsToActiveOrder', async ({ page }) => {
    await loginAsBob(page);
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await page.getByText('RESERVE TICKETS').click();
    // Bob already has an active order for Rock Night, so he should be redirected
    await expect(page).toHaveURL(/\/orders\/active/, { timeout: 15000 });
  });

  test('GivenInvalidEventId_WhenPageLoaded_ThenShowsNotFound', async ({ page }) => {
    await page.goto('/events/nonexistent-event-id');
    await expect(page.getByText(/EVENT NOT FOUND|does not exist/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('BROWSE ALL EVENTS')).toBeVisible();
  });

  test('GivenNotFoundPage_WhenBrowseAllClicked_ThenNavigatesToEvents', async ({ page }) => {
    await page.goto('/events/nonexistent-event-id');
    await expect(page.getByText('BROWSE ALL EVENTS')).toBeVisible({ timeout: 15000 });
    await page.getByText('BROWSE ALL EVENTS').click();
    await expect(page).toHaveURL(/\/events$/, { timeout: 10000 });
  });
});

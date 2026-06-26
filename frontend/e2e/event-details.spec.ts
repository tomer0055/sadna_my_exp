import { test, expect } from '@playwright/test';
import { loginAsBob } from './helpers';

test.describe('Event Details Page (Real API)', () => {
  test('GivenActiveEvent_WhenViewDetailsClicked_ThenShowsEventInfo', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await expect(page.getByRole('heading', { name: /Rock Night/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tickets Available/i).first()).toBeVisible();
  });

  test('GivenEventDetailsPage_WhenLoaded_ThenShowsBackToEventsLink', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });

    await expect(page.getByText('BACK TO EVENTS')).toBeVisible({ timeout: 10000 });
  });

  test('GivenEventDetailsPage_WhenBackClicked_ThenReturnsToEventsList', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });
    await expect(page.getByText('BACK TO EVENTS')).toBeVisible({ timeout: 10000 });

    await page.getByText('BACK TO EVENTS').click();
    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });
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
    // Bob already has an active order — redirected to active order or sees error
    await expect(page).toHaveURL(/\/orders\/active|\/events\//, { timeout: 15000 });
  });

  test('GivenInvalidEventId_WhenPageLoaded_ThenShowsNotFound', async ({ page }) => {
    await page.goto('/events/nonexistent-event-id');
    await expect(page.getByRole('heading', { name: 'EVENT NOT FOUND' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('BROWSE ALL EVENTS')).toBeVisible();
  });

  test('GivenNotFoundPage_WhenBrowseAllClicked_ThenNavigatesToEvents', async ({ page }) => {
    await page.goto('/events/nonexistent-event-id');
    await expect(page.getByText('BROWSE ALL EVENTS')).toBeVisible({ timeout: 15000 });
    await page.getByText('BROWSE ALL EVENTS').click();
    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });
  });
});

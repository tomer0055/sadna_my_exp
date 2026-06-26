import { test, expect } from '@playwright/test';

test.describe('Events Page (Real API)', () => {
  test('GivenEventsExist_WhenPageLoaded_ThenShowsSeededEventCards', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Jazz Evening')).toBeVisible();
    await expect(page.getByText('Comedy Night 18+')).toBeVisible();
  });

  test('GivenEventsPage_WhenLoaded_ThenShowsEventCount', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('3 EVENTS')).toBeVisible({ timeout: 15000 });
  });

  test('GivenEventsPage_WhenLoaded_ThenShowsEventLocations', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Tel Aviv Arena')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Haifa Jazz Club')).toBeVisible();
    await expect(page.getByText('Jerusalem Theater')).toBeVisible();
  });

  test('GivenEventsPage_WhenLoaded_ThenShowsPriceRanges', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('$60.00 – $120.00')).toBeVisible();
  });

  test('GivenEventCard_WhenViewDetailsClicked_ThenNavigatesToEventDetails', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });
    await page.getByText('VIEW DETAILS').first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 10000 });
  });

  test('GivenSearchInput_WhenSearchingRock_ThenFiltersToRockEvent', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/search/i).fill('Rock');
    await page.getByText('SEARCH').click();

    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Results for "Rock"/)).toBeVisible();
  });

  test('GivenSearchInput_WhenSearchingNonexistent_ThenShowsNoResults', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/search/i).fill('xyznonexistent');
    await page.getByText('SEARCH').click();

    await expect(page.getByText('No events found')).toBeVisible({ timeout: 10000 });
  });

  test('GivenSearchResults_WhenClearClicked_ThenShowsAllEvents', async ({ page }) => {
    await page.goto('/events?search=Rock');
    await expect(page.getByText('Rock Night')).toBeVisible({ timeout: 15000 });

    await page.getByText('CLEAR').click();
    await expect(page.getByText('Live Events')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('3 EVENTS')).toBeVisible();
  });
});

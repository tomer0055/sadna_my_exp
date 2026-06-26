import { test, expect } from '@playwright/test';
import { loginAsAlice, loginAsBob } from './helpers';

test.describe('Invalid Entity Access — Real API', () => {

  test('GivenNoAuthHeader_WhenAccessingProtectedAPI_ThenReturnsError', async ({ page }) => {
    const response = await page.request.get('/api/identity/me');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GivenInvalidToken_WhenAccessingUserProfile_ThenReturnsError', async ({ page }) => {
    const response = await page.request.get('/api/identity/me', {
      headers: { Authorization: 'Bearer completely-invalid-token' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GivenValidToken_WhenFetchingNonExistentUserOrders_ThenReturnsEmptyOrError', async ({ page }) => {
    await loginAsAlice(page);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/history?userId=nonexistent-user-xyz', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok()) {
      const data = await response.json();
      expect(Array.isArray(data) ? data.length : 0).toBe(0);
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('GivenValidSession_WhenAccessingEventByRealId_ThenReturnsCorrectData', async ({ page }) => {
    const eventsResponse = await page.request.get('/api/events/active');
    const events = await eventsResponse.json();
    expect(events.length).toBeGreaterThan(0);

    const rockNight = events.find((e: any) => e.eventName === 'Rock Night');
    expect(rockNight).toBeTruthy();

    await page.goto(`/events/${rockNight.eventId}`);
    await expect(page.getByRole('heading', { name: /Rock Night/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Tickets Available/i).first()).toBeVisible();
  });

  test('GivenActiveEventsAPI_WhenCalled_ThenReturnsAllSeededEvents', async ({ page }) => {
    const response = await page.request.get('/api/events/active');
    expect(response.ok()).toBeTruthy();
    const events = await response.json();
    expect(events.length).toBe(3);
    const names = events.map((e: any) => e.eventName);
    expect(names).toContain('Rock Night');
    expect(names).toContain('Jazz Evening');
    expect(names).toContain('Comedy Night 18+');
  });

  test('GivenSearchAPI_WhenSearchingByName_ThenReturnsMatchingEvents', async ({ page }) => {
    const response = await page.request.get('/api/events/search?q=Rock');
    expect(response.ok()).toBeTruthy();
    const events = await response.json();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventName).toBe('Rock Night');
  });

  test('GivenSearchAPI_WhenSearchingNonExistent_ThenReturnsEmpty', async ({ page }) => {
    const response = await page.request.get('/api/events/search?q=xyznonexistent');
    expect(response.ok()).toBeTruthy();
    const events = await response.json();
    expect(events.length).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupFetchInterceptor } from './fetchInterceptor';

describe('fetchInterceptor', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.fetch = originalFetch;
    document.body.innerHTML = '';
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  // Passes through successful requests
  it('GivenOnlineAndSuccessfulFetch_WhenFetchCalled_ThenReturnsResponse', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    window.fetch = vi.fn().mockResolvedValue(mockResponse);
    const savedFetch = window.fetch;
    setupFetchInterceptor();

    const result = await window.fetch('/api/test');

    expect(result).toBe(mockResponse);
  });

  // Offline detection via navigator.onLine
  it('GivenOfflineStatus_WhenFetchCalled_ThenThrowsOfflineError', async () => {
    setupFetchInterceptor();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    try {
      await window.fetch('/api/test');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.name).toBe('OfflineError');
      expect(err.message).toContain('No internet connection');
    }
  });

  // Shows offline modal when offline
  it('GivenOfflineStatus_WhenFetchCalled_ThenShowsOfflineModal', async () => {
    setupFetchInterceptor();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    try {
      await window.fetch('/api/test');
    } catch { /* expected */ }

    const modal = document.getElementById('global-offline-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Connection Failed');
    expect(modal?.textContent).toContain('Retry');
  });

  // Does not create duplicate modals
  it('GivenExistingModal_WhenOfflineAgain_ThenDoesNotDuplicateModal', async () => {
    setupFetchInterceptor();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    try { await window.fetch('/api/test'); } catch { /* expected */ }
    try { await window.fetch('/api/test2'); } catch { /* expected */ }

    const modals = document.querySelectorAll('#global-offline-modal');
    expect(modals).toHaveLength(1);
  });

  // Network error triggers offline modal
  it('GivenFailedToFetchError_WhenFetchFails_ThenShowsOfflineModal', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    setupFetchInterceptor();

    try {
      await window.fetch('/api/test');
    } catch (err: any) {
      expect(err.name).toBe('OfflineError');
    }

    const modal = document.getElementById('global-offline-modal');
    expect(modal).not.toBeNull();
  });

  // Non-network errors are re-thrown as-is
  it('GivenNonNetworkError_WhenFetchFails_ThenRethrowsOriginalError', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('CORS error'));
    setupFetchInterceptor();

    await expect(window.fetch('/api/test')).rejects.toThrow('CORS error');

    const modal = document.getElementById('global-offline-modal');
    expect(modal).toBeNull();
  });
});

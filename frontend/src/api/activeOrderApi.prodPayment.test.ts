import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activeOrderApi } from './activeOrderApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function errorResponse(body: any, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const checkoutPayload = {
  amount: 100,
  creditCardNumber: '4111111111111111',
  cardHolderName: 'John Doe',
  expirationDate: '12/30',
  cvv: '123',
  id: '123456789',
};

describe('activeOrderApi – prod payment gateway error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GivenReadTimedOut_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Read timed out' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenConnectionRefused_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Connection refused' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenSocketTimeout_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Socket timeout' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenConnectTimedOut_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Connect timed out' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenPostRequestIOError_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'I/O error on POST request for "https://external-payment.com/charge"' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenNetworkError_WhenCheckoutFails_ThenShowsFriendlyPaymentMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Network error' }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenJavaExceptionWrappingIOError_WhenCheckoutFails_ThenStripsAndShowsFriendly', async () => {
    mockFetch.mockReturnValue(errorResponse({
      error: 'org.springframework.web.client.ResourceAccessException: I/O error on POST request for "https://pay.example.com"',
    }));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Payment could not be processed. Please try again in a moment.');
  });

  it('GivenCardDeclined_WhenCheckoutFails_ThenShowsRawDeclinedMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Card declined by issuer' }, 402));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Card declined by issuer');
  });

  it('GivenInsufficientFunds_WhenCheckoutFails_ThenShowsRawMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ message: 'Insufficient funds' }, 400));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Insufficient funds');
  });

  it('GivenExpiredCard_WhenCheckoutFails_ThenShowsRawMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({ error: 'Card expired' }, 422));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('Card expired');
  });

  it('GivenEmptyErrorWith400_WhenCheckoutFails_ThenShowsStatusCodeFallback', async () => {
    mockFetch.mockReturnValue(errorResponse({}, 400));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('The request could not be completed. Please check the information and try again.');
  });

  it('GivenEmptyErrorWith403_WhenCheckoutFails_ThenShowsPermissionDenied', async () => {
    mockFetch.mockReturnValue(errorResponse({}, 403));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('You do not have permission to perform this action.');
  });

  it('GivenEmptyErrorWith409_WhenCheckoutFails_ThenShowsConflictMessage', async () => {
    mockFetch.mockReturnValue(errorResponse({}, 409));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('A conflict occurred. Please refresh and try again.');
  });

  it('GivenEmptyErrorWith500_WhenCheckoutFails_ThenShowsGenericFallback', async () => {
    mockFetch.mockReturnValue(errorResponse({}, 500));
    await expect(activeOrderApi.checkout('tok', 'o1', checkoutPayload))
      .rejects.toThrow('An unexpected error occurred. Please try again.');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activeOrderApi } from './activeOrderApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

function textResponse(text: string, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text || '{}')),
  } as Response);
}

describe('activeOrderApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createOrder
  it('GivenOrderData_WhenCreateOrderCalled_ThenPostsToOrdersEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ orderId: 'o1', userId: 'u1', eventId: 'e1' }));

    const result = await activeOrderApi.createOrder('tok', { userId: 'u1', eventId: 'e1' });

    expect(result.orderId).toBe('o1');
    expect(mockFetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST' }));
  });

  // getActiveOrderByUserId - found
  it('GivenExistingOrder_WhenGetByUserIdCalled_ThenReturnsOrder', async () => {
    mockFetch.mockReturnValue(textResponse('{"orderId":"o1","userId":"u1","eventId":"e1"}'));

    const result = await activeOrderApi.getActiveOrderByUserId('tok', 'u1');

    expect(result?.orderId).toBe('o1');
    expect(mockFetch).toHaveBeenCalledWith('/api/orders/user/u1', expect.objectContaining({ method: 'GET' }));
  });

  // getActiveOrderByUserId - not found returns null
  it('GivenNoOrder_WhenGetByUserIdCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') } as Response));

    const result = await activeOrderApi.getActiveOrderByUserId('tok', 'u1');

    expect(result).toBeNull();
  });

  // getActiveOrderByUserId - empty text returns null
  it('GivenEmptyResponse_WhenGetByUserIdCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(textResponse('', true));

    const result = await activeOrderApi.getActiveOrderByUserId('tok', 'u1');

    expect(result).toBeNull();
  });

  // getActiveOrder
  it('GivenOrderId_WhenGetActiveOrderCalled_ThenGetsOrder', async () => {
    mockFetch.mockReturnValue(jsonResponse({ orderId: 'o1', userId: 'u1', eventId: 'e1' }));

    const result = await activeOrderApi.getActiveOrder('tok', 'o1');

    expect(result.orderId).toBe('o1');
    expect(mockFetch).toHaveBeenCalledWith('/api/orders/o1', expect.objectContaining({ method: 'GET' }));
  });

  // cancelOrder
  it('GivenOrderId_WhenCancelOrderCalled_ThenDeletesOrder', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Cancelled' }));

    const result = await activeOrderApi.cancelOrder('tok', 'o1', 'u1');

    expect(result.message).toBe('Cancelled');
    expect(mockFetch).toHaveBeenCalledWith('/api/orders/o1', expect.objectContaining({ method: 'DELETE' }));
  });

  // addSeats
  it('GivenSeatIds_WhenAddSeatsCalled_ThenPostsSeats', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Seats added' }));

    await activeOrderApi.addSeats('tok', 'o1', { seatIds: ['A1', 'A2'] });

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/o1/seats', expect.objectContaining({ method: 'POST' }));
  });

  // addStandingArea
  it('GivenStandingData_WhenAddStandingAreaCalled_ThenPostsStanding', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Standing added' }));

    await activeOrderApi.addStandingArea('tok', 'o1', { areaId: 'ga1', quantity: 3 });

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/o1/standing', expect.objectContaining({ method: 'POST' }));
  });

  // checkout - transforms expiration date
  it('GivenCheckoutData_WhenCheckoutCalled_ThenSplitsExpirationDate', async () => {
    mockFetch.mockReturnValue(jsonResponse({ barcodes: ['BC1'] }));

    await activeOrderApi.checkout('tok', 'o1', {
      amount: 100,
      creditCardNumber: '4111111111111111',
      cardHolderName: 'John',
      expirationDate: '12/25',
      cvv: '123',
      id: '123456789'
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.month).toBe('12');
    expect(body.year).toBe('25');
    expect(body.cardNumber).toBe('4111111111111111');
    expect(body.holder).toBe('John');
    expect(body.currency).toBe('USD');
  });

  // updateActiveOrder - returns boolean
  it('GivenOrder_WhenUpdateActiveOrderCalled_ThenReturnsTrueOnSuccess', async () => {
    mockFetch.mockReturnValue(Promise.resolve({ ok: true, status: 200 } as Response));

    const result = await activeOrderApi.updateActiveOrder('tok', 'o1', { orderId: 'o1', userId: 'u1', eventId: 'e1' });

    expect(result).toBe(true);
  });

  // Error handling - Java exception stripping
  it('GivenJavaException_WhenErrorOccurs_ThenStripsClassPrefix', async () => {
    mockFetch.mockReturnValue(jsonResponse({ error: 'com.example.ServiceException: Seat already taken' }, false, 409));

    await expect(activeOrderApi.createOrder('tok', { userId: 'u1', eventId: 'e1' }))
      .rejects.toThrow('Seat already taken');
  });

  // Error handling - network error friendly message
  it('GivenNetworkError_WhenCheckoutFails_ThenReturnsPaymentFriendlyMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse({ error: 'I/O error on POST request' }, false, 500));

    await expect(activeOrderApi.checkout('tok', 'o1', {
      amount: 100, creditCardNumber: '4111', cardHolderName: 'J', expirationDate: '12/25', cvv: '123', id: '1'
    })).rejects.toThrow('Payment could not be processed');
  });

  // Error handling - status code fallback
  it('GivenEmptyErrorBody_WhenErrorOccurs_ThenUsesStatusCodeMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 401));

    await expect(activeOrderApi.getActiveOrder('tok', 'o1'))
      .rejects.toThrow('Your session has expired');
  });
});

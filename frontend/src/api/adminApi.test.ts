import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from './adminApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('adminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // getActiveOrders
  it('GivenValidToken_WhenGetActiveOrdersCalled_ThenReturnsOrderArray', async () => {
    const orders = [{ orderId: 'o1', userId: 'u1' }];
    mockFetch.mockReturnValue(jsonResponse(orders));

    const result = await adminApi.getActiveOrders('tok');

    expect(result).toEqual(orders);
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/active-orders', expect.objectContaining({ method: 'GET' }));
  });

  // getActiveOrders - non-array throws
  it('GivenNonArrayResponse_WhenGetActiveOrdersCalled_ThenThrowsError', async () => {
    mockFetch.mockReturnValue(jsonResponse({ data: 'not-array' }));

    await expect(adminApi.getActiveOrders('tok')).rejects.toThrow('Active orders response is not an array.');
  });

  // getOrderHistory
  it('GivenValidToken_WhenGetOrderHistoryCalled_ThenReturnsHistoryArray', async () => {
    const history = [{ orderId: 'h1' }];
    mockFetch.mockReturnValue(jsonResponse(history));

    const result = await adminApi.getOrderHistory('tok');

    expect(result).toEqual(history);
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/history-orders', expect.objectContaining({ method: 'GET' }));
  });

  // getOrderHistory - non-array throws
  it('GivenNonArrayResponse_WhenGetOrderHistoryCalled_ThenThrowsError', async () => {
    mockFetch.mockReturnValue(jsonResponse({}));

    await expect(adminApi.getOrderHistory('tok')).rejects.toThrow('History orders response is not an array.');
  });

  // getSystemUsers
  it('GivenValidToken_WhenGetSystemUsersCalled_ThenReturnsUsersArray', async () => {
    const users = [{ userId: 'u1', name: 'Alice' }];
    mockFetch.mockReturnValue(jsonResponse(users));

    const result = await adminApi.getSystemUsers('tok');

    expect(result).toEqual(users);
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'GET' }));
  });

  // getSystemUsers - non-array throws
  it('GivenNonArrayResponse_WhenGetSystemUsersCalled_ThenThrowsError', async () => {
    mockFetch.mockReturnValue(jsonResponse('string-data'));

    await expect(adminApi.getSystemUsers('tok')).rejects.toThrow('Users response is not an array.');
  });

  // API error
  it('GivenServerError_WhenAnyCalled_ThenThrowsErrorMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse({ error: 'Forbidden' }, false, 403));

    await expect(adminApi.getSystemUsers('tok')).rejects.toThrow('Forbidden');
  });
});

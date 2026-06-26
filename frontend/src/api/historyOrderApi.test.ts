import { describe, it, expect, vi, beforeEach } from 'vitest';
import { historyOrderApi } from './historyOrderApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('historyOrderApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // getUserOrders
  it('GivenUserId_WhenGetUserOrdersCalled_ThenReturnsOrders', async () => {
    const orders = [{ orderId: 'o1', userId: 'u1', standingAreaQuantities: { ga: 2 } }];
    mockFetch.mockReturnValue(jsonResponse(orders));

    const result = await historyOrderApi.getUserOrders('tok', 'u1');

    expect(result).toHaveLength(1);
    expect(result[0].standingAreaQuantities).toEqual({ ga: 2 });
    expect(mockFetch).toHaveBeenCalledWith('/api/history?userId=u1', expect.objectContaining({ method: 'GET' }));
  });

  // getOrdersByCompany
  it('GivenCompanyId_WhenGetOrdersByCompanyCalled_ThenReturnsOrders', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ orderId: 'o1' }]));

    const result = await historyOrderApi.getOrdersByCompany('tok', 5);

    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/history?companyId=5', expect.objectContaining({ method: 'GET' }));
  });

  // getAllOrders
  it('GivenAdminToken_WhenGetAllOrdersCalled_ThenReturnsAllOrders', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ orderId: 'o1' }, { orderId: 'o2' }]));

    const result = await historyOrderApi.getAllOrders('tok');

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith('/api/history', expect.objectContaining({ method: 'GET' }));
  });

  // mapStandingAreas normalizes PascalCase field
  it('GivenPascalCaseField_WhenFetched_ThenNormalizesToCamelCase', async () => {
    const orders = [{ orderId: 'o1', StandingAreaQuantities: { vip: 3 } }];
    mockFetch.mockReturnValue(jsonResponse(orders));

    const result = await historyOrderApi.getUserOrders('tok', 'u1');

    expect(result[0].standingAreaQuantities).toEqual({ vip: 3 });
  });

  // mapStandingAreas handles missing field
  it('GivenNoStandingField_WhenFetched_ThenDefaultsToEmptyObject', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ orderId: 'o1' }]));

    const result = await historyOrderApi.getUserOrders('tok', 'u1');

    expect(result[0].standingAreaQuantities).toEqual({});
  });

  // Error handling - throws object, not Error
  it('GivenApiError_WhenFetched_ThenThrowsObjectWithStatusAndMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse({ error: 'Not authorized' }, false, 403));

    try {
      await historyOrderApi.getUserOrders('tok', 'u1');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(403);
      expect(err.message).toBe('Not authorized');
    }
  });

  // Non-array response returns empty
  it('GivenNonArrayResponse_WhenFetched_ThenReturnsEmptyArray', async () => {
    mockFetch.mockReturnValue(jsonResponse({ data: 'not-array' }));

    const result = await historyOrderApi.getUserOrders('tok', 'u1');

    expect(result).toEqual([]);
  });
});

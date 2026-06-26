import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompanyPolicyDTO, setCompanyPolicyDTO, getCompanyPolicy, assignCompanyPolicy } from './purchasePoliciesApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response);
}

describe('purchasePoliciesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // getCompanyPolicyDTO - success
  it('GivenCompanyId_WhenGetPolicyDTOCalled_ThenReturnsPolicy', async () => {
    const policy = { minTickets: 1, maxTickets: 10, isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true };
    mockFetch.mockReturnValue(jsonResponse(policy));

    const result = await getCompanyPolicyDTO(5);

    expect(result).toEqual(policy);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/production/companies/5/purchase-policy',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  // getCompanyPolicyDTO - 404 returns null
  it('GivenNotFound_WhenGetPolicyDTOCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 404));

    const result = await getCompanyPolicyDTO(5);

    expect(result).toBeNull();
  });

  // getCompanyPolicyDTO - 403 returns null
  it('GivenForbidden_WhenGetPolicyDTOCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 403));

    const result = await getCompanyPolicyDTO(5);

    expect(result).toBeNull();
  });

  // getCompanyPolicyDTO - other error throws
  it('GivenServerError_WhenGetPolicyDTOCalled_ThenThrows', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    await expect(getCompanyPolicyDTO(5)).rejects.toThrow('Failed to fetch company policy (500)');
  });

  // setCompanyPolicyDTO - success
  it('GivenPolicyData_WhenSetPolicyDTOCalled_ThenPutsPolicy', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    await setCompanyPolicyDTO(5, { minTickets: 2, maxTickets: 8, isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/production/companies/5/purchase-policy',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  // setCompanyPolicyDTO - error throws
  it('GivenApiError_WhenSetPolicyDTOCalled_ThenThrowsMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse('Invalid policy config', false, 400));

    await expect(setCompanyPolicyDTO(5, { isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true }))
      .rejects.toThrow('Invalid policy config');
  });

  // getCompanyPolicy (legacy)
  it('GivenCompanyId_WhenGetCompanyPolicyCalled_ThenReturnsDescription', async () => {
    mockFetch.mockReturnValue(jsonResponse({ description: 'Min 2 tickets' }));

    const result = await getCompanyPolicy(5);

    expect(result?.description).toBe('Min 2 tickets');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/policies/company/5',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  // getCompanyPolicy - 404 returns null
  it('GivenNotFound_WhenGetCompanyPolicyCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 404));

    const result = await getCompanyPolicy(5);

    expect(result).toBeNull();
  });

  // assignCompanyPolicy
  it('GivenPolicyForm_WhenAssignCalled_ThenPostsBuiltPolicy', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    await assignCompanyPolicy(5, { minTickets: 2, maxTickets: 10, composition: 'AND' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/policies/assign/company/5',
      expect.objectContaining({ method: 'POST' })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('AND');
    expect(body.subPolicies).toHaveLength(2);
  });

  // assignCompanyPolicy - single rule doesn't wrap in composite
  it('GivenSingleRule_WhenAssignCalled_ThenSendsSinglePolicy', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    await assignCompanyPolicy(5, { minTickets: 3 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('MIN_TICKETS');
    expect(body.minTickets).toBe(3);
    expect(body.subPolicies).toBeUndefined();
  });
});

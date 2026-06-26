import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventApi } from './eventsApi';

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

describe('eventApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createEvent - success
  it('GivenEventData_WhenCreateEventCalled_ThenReturnsEventId', async () => {
    mockFetch.mockReturnValue(jsonResponse('evt-1', true));

    const result = await eventApi.createEvent('tok', {
      event: { eventName: 'Test', eventCapacity: 100, eventDateTime: '2027-01-01T20:00:00' },
      purchasePolicy: { isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true }
    });

    expect(result).toContain('evt-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' }));
  });

  // createEvent - failure returns null
  it('GivenApiError_WhenCreateEventCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    const result = await eventApi.createEvent('tok', {
      event: { eventName: 'Test', eventCapacity: 100, eventDateTime: '2027-01-01T20:00:00' },
      purchasePolicy: { isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true }
    });

    expect(result).toBeNull();
  });

  // getAllActiveEvents
  it('GivenActiveEvents_WhenGetAllCalled_ThenReturnsEventArray', async () => {
    const events = [{ eventId: 'e1', eventName: 'Rock' }];
    mockFetch.mockReturnValue(jsonResponse(events));

    const result = await eventApi.getAllActiveEvents();

    expect(result).toEqual(events);
    expect(mockFetch).toHaveBeenCalledWith('/api/events/active', expect.objectContaining({ method: 'GET' }));
  });

  // getAllActiveEvents - error returns empty
  it('GivenApiError_WhenGetAllActiveEventsCalled_ThenReturnsEmptyArray', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    const result = await eventApi.getAllActiveEvents();

    expect(result).toEqual([]);
  });

  // getEvent
  it('GivenEventId_WhenGetEventCalled_ThenReturnsEvent', async () => {
    mockFetch.mockReturnValue(jsonResponse({ eventId: 'e1', eventName: 'Jazz' }));

    const result = await eventApi.getEvent('tok', 'e1');

    expect(result?.eventName).toBe('Jazz');
  });

  // getEvent - not found
  it('GivenInvalidId_WhenGetEventCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 404));

    const result = await eventApi.getEvent('tok', 'missing');

    expect(result).toBeNull();
  });

  // getEventsByCompany
  it('GivenCompanyId_WhenGetEventsByCompanyCalled_ThenReturnsCompanyEvents', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ eventId: 'e1' }]));

    const result = await eventApi.getEventsByCompany('tok', 5);

    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/events?companyId=5', expect.objectContaining({ method: 'GET' }));
  });

  // getEventsByCompany - error throws
  it('GivenApiError_WhenGetEventsByCompanyCalled_ThenThrows', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    await expect(eventApi.getEventsByCompany('tok', 5)).rejects.toThrow('Failed to fetch events');
  });

  // editEventDate
  it('GivenNewDate_WhenEditEventDateCalled_ThenReturnsTrueOnSuccess', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    const result = await eventApi.editEventDate('tok', 'e1', { newDateTime: '2027-02-01T20:00:00' });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/events/e1/date', expect.objectContaining({ method: 'PUT' }));
  });

  // removeEvent
  it('GivenEventId_WhenRemoveEventCalled_ThenReturnsTrueOnSuccess', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    const result = await eventApi.removeEvent('tok', 'e1');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/events/e1', expect.objectContaining({ method: 'DELETE' }));
  });

  // searchEvents
  it('GivenQuery_WhenSearchEventsCalled_ThenSearchesWithEncodedQuery', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ eventId: 'e1' }]));

    const result = await eventApi.searchEvents('rock & roll');

    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/events/search?q=rock%20%26%20roll',
      expect.objectContaining({ method: 'GET' })
    );
  });

  // validatePurchasePolicy - valid (200)
  it('GivenValidPolicy_WhenValidateCalled_ThenReturnsNull', async () => {
    mockFetch.mockReturnValue(jsonResponse('', true, 200));

    const result = await eventApi.validatePurchasePolicy('tok', 'e1', 2, 25);

    expect(result).toBeNull();
  });

  // validatePurchasePolicy - invalid (422)
  it('GivenPolicyViolation_WhenValidateCalled_ThenReturnsErrorString', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Must buy at least 2 tickets'),
    } as Response));

    const result = await eventApi.validatePurchasePolicy('tok', 'e1', 1, 25);

    expect(result).toBe('Must buy at least 2 tickets');
  });

  // getEventSeatingMap
  it('GivenEventId_WhenGetSeatingMapCalled_ThenReturnsMap', async () => {
    const map = { assignedSeats: [], standingAreas: [] };
    mockFetch.mockReturnValue(jsonResponse(map));

    const result = await eventApi.getEventSeatingMap('tok', 'e1');

    expect(result).toEqual(map);
  });

  // getEventPurchasePolicy
  it('GivenEventId_WhenGetPurchasePolicyCalled_ThenReturnsPolicy', async () => {
    const policy = { minTickets: 1, maxTickets: 10, isQuantityOr: true, isAgeOr: true, isAgeAndQuantityOr: true };
    mockFetch.mockReturnValue(jsonResponse(policy));

    const result = await eventApi.getEventPurchasePolicy('tok', 'e1');

    expect(result).toEqual(policy);
  });
});

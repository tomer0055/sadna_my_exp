import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRolesTree,
  getPurchaseHistory,
  assignOwner,
  appointManager,
  modifyManagerPermissions,
  removeManager,
  removeOwner,
  getMyCompanies,
  createCompany,
  getMyMemberInfo,
  getPendingAppointments,
  acceptAppointment,
  denyAppointment,
  ALL_PERMISSIONS
} from './productionCompanyApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('productionCompanyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // ALL_PERMISSIONS constant
  it('GivenAllPermissions_WhenAccessed_ThenContainsSevenPermissions', () => {
    expect(ALL_PERMISSIONS).toHaveLength(7);
    expect(ALL_PERMISSIONS).toContain('INVENTORY_MANAGEMENT');
    expect(ALL_PERMISSIONS).toContain('SALES_REPORT_GENERATION');
  });

  // getRolesTree
  it('GivenCompanyId_WhenGetRolesTreeCalled_ThenReturnsRolesTree', async () => {
    const tree = { companyId: 5, companyName: 'Test Co', founderId: 'u1', ownershipTree: {}, managerTree: {}, managerPermissions: {} };
    mockFetch.mockReturnValue(jsonResponse(tree));

    const result = await getRolesTree(5);

    expect(result.companyName).toBe('Test Co');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/roles', expect.objectContaining({ method: 'GET' }));
  });

  // getPurchaseHistory
  it('GivenCompanyId_WhenGetPurchaseHistoryCalled_ThenReturnsOrders', async () => {
    mockFetch.mockReturnValue(jsonResponse([{ orderId: 'o1' }]));

    const result = await getPurchaseHistory(5);

    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/history', expect.objectContaining({ method: 'GET' }));
  });

  // assignOwner
  it('GivenUserId_WhenAssignOwnerCalled_ThenPostsOwner', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Owner assigned' }));

    const result = await assignOwner(5, 'user-2');

    expect(result.message).toBe('Owner assigned');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/owners', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.appointeeUserId).toBe('user-2');
  });

  // appointManager
  it('GivenManagerData_WhenAppointManagerCalled_ThenPostsManager', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Manager appointed' }));

    const result = await appointManager(5, 'mgr-1', ['INVENTORY_MANAGEMENT']);

    expect(result.message).toBe('Manager appointed');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.managerId).toBe('mgr-1');
    expect(body.permissions).toEqual(['INVENTORY_MANAGEMENT']);
  });

  // modifyManagerPermissions
  it('GivenNewPermissions_WhenModifyCalled_ThenPutsPermissions', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Permissions updated' }));

    await modifyManagerPermissions(5, 'mgr-1', ['INVENTORY_MANAGEMENT', 'SALES_REPORT_GENERATION']);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/production/companies/5/managers/mgr-1/permissions',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  // removeManager
  it('GivenManagerId_WhenRemoveManagerCalled_ThenDeletesManager', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Manager removed' }));

    const result = await removeManager(5, 'mgr-1');

    expect(result.message).toBe('Manager removed');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/managers/mgr-1', expect.objectContaining({ method: 'DELETE' }));
  });

  // removeOwner
  it('GivenOwnerId_WhenRemoveOwnerCalled_ThenDeletesOwner', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Owner removed' }));

    await removeOwner(5, 'owner-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/owners/owner-1', expect.objectContaining({ method: 'DELETE' }));
  });

  // getMyCompanies
  it('GivenToken_WhenGetMyCompaniesCalled_ThenReturnsCompanyList', async () => {
    const companies = [{ companyId: 5, companyName: 'Co', role: 'FOUNDER' }];
    mockFetch.mockReturnValue(jsonResponse(companies));

    const result = await getMyCompanies();

    expect(result).toEqual(companies);
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/my', expect.objectContaining({ method: 'GET' }));
  });

  // createCompany
  it('GivenCompanyData_WhenCreateCompanyCalled_ThenPostsCompany', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Created', companyId: '7' }));

    const result = await createCompany('New Co', 'A company', 'co@test.com');

    expect(result.companyId).toBe('7');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.companyName).toBe('New Co');
    expect(body.companyEmail).toBe('co@test.com');
  });

  // getMyMemberInfo
  it('GivenCompanyId_WhenGetMyMemberInfoCalled_ThenReturnsMemberInfo', async () => {
    const info = { role: 'FOUNDER', permissions: [], companyName: 'Co', founderId: 'u1' };
    mockFetch.mockReturnValue(jsonResponse(info));

    const result = await getMyMemberInfo(5);

    expect(result.role).toBe('FOUNDER');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/companies/5/my-role', expect.objectContaining({ method: 'GET' }));
  });

  // getPendingAppointments
  it('GivenToken_WhenGetPendingAppointmentsCalled_ThenReturnsAppointments', async () => {
    const appointments = [{ companyId: 5, role: 'OWNER', appointerId: 'u1' }];
    mockFetch.mockReturnValue(jsonResponse(appointments));

    const result = await getPendingAppointments();

    expect(result).toEqual(appointments);
    expect(mockFetch).toHaveBeenCalledWith('/api/production/appointments/pending', expect.objectContaining({ method: 'GET' }));
  });

  // acceptAppointment
  it('GivenCompanyId_WhenAcceptAppointmentCalled_ThenPostsAccept', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Accepted' }));

    const result = await acceptAppointment(5);

    expect(result.message).toBe('Accepted');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/appointments/5/accept', expect.objectContaining({ method: 'POST' }));
  });

  // denyAppointment
  it('GivenCompanyId_WhenDenyAppointmentCalled_ThenPostsDeny', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Denied' }));

    const result = await denyAppointment(5);

    expect(result.message).toBe('Denied');
    expect(mockFetch).toHaveBeenCalledWith('/api/production/appointments/5/deny', expect.objectContaining({ method: 'POST' }));
  });

  // Error handling - Java exception stripping
  it('GivenJavaException_WhenApiRequestFails_ThenStripsPrefix', async () => {
    mockFetch.mockReturnValue(jsonResponse({ error: 'com.example.ServiceException: Company not found' }, false, 404));

    await expect(getRolesTree(999)).rejects.toThrow('Company not found');
  });

  // Error handling - status code fallback
  it('GivenEmptyError_WhenApiRequestFails_ThenUsesStatusMessage', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 403));

    await expect(assignOwner(5, 'u2')).rejects.toThrow('You do not have permission');
  });

  // Bearer token in auth header
  it('GivenStoredToken_WhenAnyCalled_ThenSendsBearerHeader', async () => {
    mockFetch.mockReturnValue(jsonResponse([]));

    await getMyCompanies();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });
});

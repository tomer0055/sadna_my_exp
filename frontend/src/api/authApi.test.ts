import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './authApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // guestEntry
  it('GivenGuestEntry_WhenCalled_ThenPostsToGuestEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ token: 'guest-tok' }));

    const result = await authApi.guestEntry();

    expect(result.token).toBe('guest-tok');
    expect(mockFetch).toHaveBeenCalledWith('/api/identity/guest', expect.objectContaining({ method: 'POST' }));
  });

  // register
  it('GivenRegisterData_WhenCalled_ThenPostsToRegisterEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ token: 'new-tok', userId: 'u1' }));

    const result = await authApi.register('tok', { userId: 'u1', name: 'A', email: 'a@b.com' });

    expect(result.userId).toBe('u1');
    expect(mockFetch).toHaveBeenCalledWith('/api/identity/register', expect.objectContaining({ method: 'POST' }));
  });

  // login - regular user
  it('GivenRegularUser_WhenLoginCalled_ThenPostsToLoginEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ token: 'member-tok', userId: 'u1' }));

    await authApi.login('tok', { userId: 'user1', password: 'pass' });

    expect(mockFetch).toHaveBeenCalledWith('/api/identity/login', expect.objectContaining({ method: 'POST' }));
  });

  // login - admin routes to admin/login
  it('GivenAdminEmail_WhenLoginCalled_ThenPostsToAdminLoginEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ token: 'admin-tok', userId: 'admin' }));

    await authApi.login('tok', { userId: 'admin@gmail.com', password: 'admin' });

    expect(mockFetch).toHaveBeenCalledWith('/api/identity/admin/login', expect.objectContaining({ method: 'POST' }));
  });

  // logout
  it('GivenLogout_WhenCalled_ThenPostsToLogoutEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Logged out' }));

    const result = await authApi.logout('tok', 'u1');

    expect(result.message).toBe('Logged out');
    expect(mockFetch).toHaveBeenCalledWith('/api/identity/logout', expect.objectContaining({ method: 'POST' }));
  });

  // getPermissions
  it('GivenToken_WhenGetPermissionsCalled_ThenGetsPermissions', async () => {
    mockFetch.mockReturnValue(jsonResponse({ userId: 'u1', state: 'MEMBER', isAdmin: false, productionRoles: {} }));

    const result = await authApi.getPermissions('tok');

    expect(result.state).toBe('MEMBER');
    expect(mockFetch).toHaveBeenCalledWith('/api/identity/permissions', expect.objectContaining({ method: 'GET' }));
  });

  // getCurrentUser
  it('GivenToken_WhenGetCurrentUserCalled_ThenReturnsProfile', async () => {
    mockFetch.mockReturnValue(jsonResponse({ userId: 'u1', name: 'Alice', email: 'a@b.com' }));

    const result = await authApi.getCurrentUser('tok');

    expect(result.name).toBe('Alice');
  });

  // updateProfile
  it('GivenProfileData_WhenUpdateProfileCalled_ThenPutsToProfileEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Updated' }));

    await authApi.updateProfile('tok', { name: 'Bob' });

    expect(mockFetch).toHaveBeenCalledWith('/api/identity/profile', expect.objectContaining({ method: 'PUT' }));
  });

  // editPassword
  it('GivenPasswordData_WhenEditPasswordCalled_ThenPutsToEditPasswordEndpoint', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Password changed' }));

    await authApi.editPassword('tok', { currentPassword: 'old', newPassword: 'new' });

    expect(mockFetch).toHaveBeenCalledWith('/api/identity/editPassword', expect.objectContaining({ method: 'PUT' }));
  });

  // Error handling
  it('GivenApiError_WhenCalled_ThenThrowsFriendlyError', async () => {
    mockFetch.mockReturnValue(jsonResponse({ message: 'Invalid credentials' }, false, 401));

    await expect(authApi.login('tok', { userId: 'u1', password: 'wrong' }))
      .rejects.toThrow('Invalid credentials');
  });

  // Bearer prefix
  it('GivenTokenWithBearerPrefix_WhenCalled_ThenDoesNotDuplicate', async () => {
    mockFetch.mockReturnValue(jsonResponse({ userId: 'u1', name: 'A', email: 'a@b.com' }));

    await authApi.getCurrentUser('Bearer my-token');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });

  // Token without Bearer prefix gets it added
  it('GivenTokenWithoutBearer_WhenCalled_ThenAddsBearerPrefix', async () => {
    mockFetch.mockReturnValue(jsonResponse({ userId: 'u1', name: 'A', email: 'a@b.com' }));

    await authApi.getCurrentUser('my-token');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });
});

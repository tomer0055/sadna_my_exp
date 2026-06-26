import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockGuestEntry = vi.fn();
const mockGetPermissions = vi.fn();
const mockLogout = vi.fn();
const mockConnectPresence = vi.fn();
const mockDisconnectPresence = vi.fn();

vi.mock('../api/authApi', () => ({
  authApi: {
    guestEntry: (...args: any[]) => mockGuestEntry(...args),
    getPermissions: (...args: any[]) => mockGetPermissions(...args),
    logout: (...args: any[]) => mockLogout(...args),
  }
}));

vi.mock('../api/presenceSocket', () => ({
  connectPresence: (...args: any[]) => mockConnectPresence(...args),
  disconnectPresence: (...args: any[]) => mockDisconnectPresence(...args),
}));

import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="isGuest">{String(auth.isGuest)}</span>
      <span data-testid="isMember">{String(auth.isMember)}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="isProductionUser">{String(auth.isProductionUser)}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <button onClick={() => auth.loginWithToken('member-token', 'user-1')}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // useAuth outside provider throws
  it('GivenNoProvider_WhenUseAuthCalled_ThenThrowsError', () => {
    function Bad() {
      useAuth();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useAuth must be used within an AuthProvider');
  });

  // Guest flow: no token in localStorage
  it('GivenNoStoredToken_WhenProviderMounts_ThenObtainsGuestToken', async () => {
    mockGuestEntry.mockResolvedValue({ token: 'guest-token-1' });
    mockGetPermissions.mockResolvedValue({
      state: 'GUEST',
      userId: 'guest-id',
      isAdmin: false,
      productionRoles: {}
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    expect(screen.getByTestId('isMember')).toHaveTextContent('false');
    expect(mockGuestEntry).toHaveBeenCalled();
    expect(mockDisconnectPresence).toHaveBeenCalled();
  });

  // Existing valid token
  it('GivenValidStoredToken_WhenProviderMounts_ThenUsesExistingToken', async () => {
    localStorage.setItem('token', 'existing-token');
    mockGetPermissions.mockResolvedValue({
      state: 'MEMBER',
      userId: 'user-1',
      isAdmin: false,
      productionRoles: {}
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isMember')).toHaveTextContent('true');
    expect(screen.getByTestId('isGuest')).toHaveTextContent('false');
    expect(mockGuestEntry).not.toHaveBeenCalled();
    expect(mockConnectPresence).toHaveBeenCalledWith('existing-token');
  });

  // Expired token falls back to guest
  it('GivenExpiredToken_WhenProviderMounts_ThenFallsBackToGuest', async () => {
    localStorage.setItem('token', 'expired-token');
    mockGetPermissions
      .mockRejectedValueOnce(new Error('Token expired'))
      .mockResolvedValueOnce({
        state: 'GUEST',
        userId: 'guest-id',
        isAdmin: false,
        productionRoles: {}
      });
    mockGuestEntry.mockResolvedValue({ token: 'new-guest-token' });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    expect(mockGuestEntry).toHaveBeenCalled();
  });

  // Admin detection
  it('GivenAdminPermissions_WhenProviderMounts_ThenIsAdminTrue', async () => {
    localStorage.setItem('token', 'admin-token');
    mockGetPermissions.mockResolvedValue({
      state: 'MEMBER',
      userId: 'admin-1',
      isAdmin: true,
      productionRoles: {}
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    });
  });

  // Production user detection
  it('GivenProductionRoles_WhenProviderMounts_ThenIsProductionUserTrue', async () => {
    localStorage.setItem('token', 'prod-token');
    mockGetPermissions.mockResolvedValue({
      state: 'MEMBER',
      userId: 'prod-1',
      isAdmin: false,
      productionRoles: { '5': 'FOUNDER' }
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isProductionUser')).toHaveTextContent('true');
    });
  });

  // loginWithToken
  it('GivenGuestSession_WhenLoginCalled_ThenBecomesAMember', async () => {
    mockGuestEntry.mockResolvedValue({ token: 'guest-token' });
    mockGetPermissions
      .mockResolvedValueOnce({ state: 'GUEST', userId: 'g1', isAdmin: false, productionRoles: {} })
      .mockResolvedValueOnce({ state: 'MEMBER', userId: 'user-1', isAdmin: false, productionRoles: {} });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    });

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('isMember')).toHaveTextContent('true');
    });

    expect(mockConnectPresence).toHaveBeenCalledWith('member-token');
    expect(localStorage.getItem('token')).toBe('member-token');
    expect(localStorage.getItem('userId')).toBe('user-1');
  });

  // logout
  it('GivenMemberSession_WhenLogoutCalled_ThenBecomesGuest', async () => {
    localStorage.setItem('token', 'member-token');
    localStorage.setItem('userId', 'user-1');
    mockGetPermissions
      .mockResolvedValueOnce({ state: 'MEMBER', userId: 'user-1', isAdmin: false, productionRoles: {} })
      .mockResolvedValueOnce({ state: 'GUEST', userId: 'g2', isAdmin: false, productionRoles: {} });
    mockLogout.mockResolvedValue({});
    mockGuestEntry.mockResolvedValue({ token: 'new-guest' });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isMember')).toHaveTextContent('true');
    });

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    });

    expect(mockLogout).toHaveBeenCalledWith('member-token', 'user-1');
    expect(mockDisconnectPresence).toHaveBeenCalled();
  });

  // Guest state has no production roles
  it('GivenGuestPermissions_WhenProviderMounts_ThenIsProductionUserFalse', async () => {
    mockGuestEntry.mockResolvedValue({ token: 'guest-token' });
    mockGetPermissions.mockResolvedValue({
      state: 'GUEST',
      userId: 'g1',
      isAdmin: false,
      productionRoles: {}
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isProductionUser')).toHaveTextContent('false');
  });
});

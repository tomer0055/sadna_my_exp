import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getPermissions: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isProductionUser: false }),
}));

import DashboardPage from './DashboardPage';
import { authApi } from '../../api/authApi';

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenNoToken_WhenPageLoads_ThenShowsGuestBannerWithoutCrash', async () => {
    localStorage.removeItem('token');
    renderPage();
    await waitFor(() => expect(screen.getByText(/Welcome to TicketFlow/)).toBeInTheDocument());
    expect(screen.getByText(/browsing as a guest/i)).toBeInTheDocument();
  });

  it('GivenNetworkOffline_WhenLoadingUserData_ThenShowsConnectionFailedError', async () => {
    localStorage.setItem('token', 'tok');
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    (authApi.getPermissions as any).mockRejectedValue(new Error('Failed to fetch'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Failed to fetch'));

    renderPage();

    await waitFor(() => expect(screen.getByText('Connection Failed')).toBeInTheDocument());
    expect(screen.getByText(/No internet connection/)).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('GivenServerError_WhenLoadingUserData_ThenFallsToGuestView', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockRejectedValue(new Error('500 Internal Server Error'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('500 Internal Server Error'));

    renderPage();

    await waitFor(() => expect(screen.getByText(/Welcome to TicketFlow/)).toBeInTheDocument());
  });

  it('GivenPermissionsFailButProfileSucceeds_WhenLoading_ThenFallsToGuestView', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockRejectedValue(new Error('Forbidden'));
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });

    renderPage();

    await waitFor(() => expect(screen.getByText(/Welcome to TicketFlow/)).toBeInTheDocument());
  });

  it('GivenProfileFailsButPermissionsSucceed_WhenLoading_ThenFallsToGuestView', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('User not found'));

    renderPage();

    await waitFor(() => expect(screen.getByText(/Welcome to TicketFlow/)).toBeInTheDocument());
  });

  it('GivenLoadFailedError_WhenLoadingUserData_ThenShowsOfflineError', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockRejectedValue(new Error('Load failed'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Load failed'));

    renderPage();

    await waitFor(() => expect(screen.getByText('Connection Failed')).toBeInTheDocument());
  });

  it('GivenSuccessfulLoad_WhenUserIsAdmin_ThenShowsAdminPanel', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: true, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'Admin', email: 'a@test.com' });

    renderPage();

    await waitFor(() => expect(screen.getByText(/Welcome back, Admin/)).toBeInTheDocument());
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });
});

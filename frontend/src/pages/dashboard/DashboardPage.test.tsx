import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import DashboardPage from './DashboardPage';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    getPermissions: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

function setupMember(overrides: { isAdmin?: boolean; isProductionUser?: boolean } = {}) {
  (useAuth as any).mockReturnValue({
    isProductionUser: overrides.isProductionUser ?? false
  });
  (authApi.getPermissions as any).mockResolvedValue({
    isAdmin: overrides.isAdmin ?? false,
    isMember: true,
    productionRoles: {}
  });
  (authApi.getCurrentUser as any).mockResolvedValue({
    name: 'Alice', email: 'alice@test.com', userId: 'u1'
  });
}

function setupGuest() {
  (useAuth as any).mockReturnValue({ isProductionUser: false });
  localStorage.removeItem('token');
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'valid-token');
    Object.defineProperty(navigator, 'onLine', {
      writable: true, value: true, configurable: true
    });
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', () => {
    (useAuth as any).mockReturnValue({ isProductionUser: false });
    (authApi.getPermissions as any).mockReturnValue(new Promise(() => {}));
    (authApi.getCurrentUser as any).mockReturnValue(new Promise(() => {}));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  // Guest banner
  it('GivenNoToken_WhenPageLoads_ThenDisplaysGuestBanner', async () => {
    setupGuest();

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Welcome to TicketFlow')).toBeInTheDocument();
    });
    expect(screen.getByText(/browsing as a guest/i)).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  // Member welcome banner
  it('GivenLoggedInMember_WhenPageLoads_ThenDisplaysWelcomeBanner', async () => {
    setupMember();

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Alice!')).toBeInTheDocument();
    });
  });

  // Quick access section
  it('GivenLoggedInMember_WhenPageLoads_ThenDisplaysQuickAccessLinks', async () => {
    setupMember();

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
    });
    expect(screen.getByText('Browse Events')).toBeInTheDocument();
    expect(screen.getByText('Active Order')).toBeInTheDocument();
    expect(screen.getByText('Order History')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  // Guest sees limited quick links (no memberOnly cards)
  it('GivenGuestUser_WhenPageLoads_ThenHidesMemberOnlyQuickLinks', async () => {
    setupGuest();

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
    });
    expect(screen.getByText('Browse Events')).toBeInTheDocument();
    expect(screen.getByText('Active Order')).toBeInTheDocument();
    expect(screen.queryByText('Order History')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  // Admin sees Admin Panel link
  it('GivenAdminUser_WhenPageLoads_ThenDisplaysAdminPanelLink', async () => {
    setupMember({ isAdmin: true });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  // Non-admin doesn't see Admin Panel
  it('GivenNonAdminMember_WhenPageLoads_ThenHidesAdminPanelLink', async () => {
    setupMember({ isAdmin: false });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  // Production user sees My Companies
  it('GivenProductionUser_WhenPageLoads_ThenDisplaysMyCompaniesLink', async () => {
    setupMember({ isProductionUser: true });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('My Companies')).toBeInTheDocument();
    });
  });

  // Non-production user hides My Companies
  it('GivenNonProductionMember_WhenPageLoads_ThenHidesMyCompaniesLink', async () => {
    setupMember({ isProductionUser: false });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
    });
    expect(screen.queryByText('My Companies')).not.toBeInTheDocument();
  });

  // Network error
  it('GivenOfflineNetwork_WhenDashboardLoads_ThenDisplaysConnectivityErrorMessage', async () => {
    (useAuth as any).mockReturnValue({ isProductionUser: false });
    Object.defineProperty(navigator, 'onLine', {
      writable: true, value: false, configurable: true
    });
    (authApi.getPermissions as any).mockRejectedValue(new Error('Failed to fetch'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Failed to fetch'));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('No internet connection. Please check your network settings.')).toBeInTheDocument();
    });
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
  });

  // API error that is not network-related shows guest view
  it('GivenApiErrorNonNetwork_WhenPageLoads_ThenShowsGuestBanner', async () => {
    (useAuth as any).mockReturnValue({ isProductionUser: false });
    (authApi.getPermissions as any).mockRejectedValue(new Error('Unauthorized'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Welcome to TicketFlow')).toBeInTheDocument();
    });
  });
});

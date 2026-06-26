import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('./TopNavbar.scss', () => ({}));
vi.mock('../../../assets/Logo.png', () => ({ default: 'logo.png' }));

function setupGuest() {
  (useAuth as any).mockReturnValue({
    isGuest: true,
    isMember: false,
    isProductionUser: false,
    isAdmin: false,
    logout: vi.fn()
  });
}

function setupMember(overrides: { isProductionUser?: boolean; isAdmin?: boolean } = {}) {
  const logoutMock = vi.fn().mockResolvedValue(undefined);
  (useAuth as any).mockReturnValue({
    isGuest: false,
    isMember: true,
    isProductionUser: overrides.isProductionUser ?? false,
    isAdmin: overrides.isAdmin ?? false,
    logout: logoutMock
  });
  return logoutMock;
}

describe('TopNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Guest view
  it('GivenGuestUser_WhenNavbarRendered_ThenShowsLoginAndRegisterButtons', () => {
    setupGuest();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    expect(screen.getByText('Browsing as Guest')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  // Member view
  it('GivenMemberUser_WhenNavbarRendered_ThenShowsAccountAndLogoutButtons', () => {
    setupMember();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
    expect(screen.queryByText('Browsing as Guest')).not.toBeInTheDocument();
  });

  // Production user badge
  it('GivenProductionUser_WhenNavbarRendered_ThenShowsProductionBadge', () => {
    setupMember({ isProductionUser: true });

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    expect(screen.getByText('Production User')).toBeInTheDocument();
  });

  // Admin badge
  it('GivenAdminUser_WhenNavbarRendered_ThenShowsAdminBadge', () => {
    setupMember({ isAdmin: true });

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // No badges for regular member
  it('GivenRegularMember_WhenNavbarRendered_ThenHidesRoleBadges', () => {
    setupMember();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    expect(screen.queryByText('Production User')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // Logout calls auth.logout
  it('GivenMemberUser_WhenLogoutClicked_ThenCallsLogoutFunction', async () => {
    const logoutMock = setupMember();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
    });
  });

  // Logo links to dashboard
  it('GivenNavbar_WhenRendered_ThenLogoLinksToHome', () => {
    setupGuest();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    const brandLink = screen.getByRole('link', { name: /idodo/i });
    expect(brandLink).toHaveAttribute('href', '/dashboard');
  });

  // Account link path
  it('GivenMemberUser_WhenNavbarRendered_ThenAccountLinksToAccountPage', () => {
    setupMember();

    render(<MemoryRouter><TopNavbar /></MemoryRouter>);

    const accountLink = screen.getByText('Account').closest('a');
    expect(accountLink).toHaveAttribute('href', '/account');
  });
});

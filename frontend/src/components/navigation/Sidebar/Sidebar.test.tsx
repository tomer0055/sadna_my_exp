import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('./Sidebar.scss', () => ({}));

function setupAuth(overrides: Partial<{ isMember: boolean; isProductionUser: boolean; isAdmin: boolean }> = {}) {
  (useAuth as any).mockReturnValue({
    isMember: overrides.isMember ?? false,
    isProductionUser: overrides.isProductionUser ?? false,
    isAdmin: overrides.isAdmin ?? false
  });
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Guest sees only 'all' visibility items
  it('GivenGuestUser_WhenSidebarRendered_ThenShowsOnlyPublicLinks', () => {
    setupAuth({ isMember: false });

    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Active Order')).toBeInTheDocument();
    expect(screen.queryByText('Order History')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('My Companies')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // Member sees member items
  it('GivenMemberUser_WhenSidebarRendered_ThenShowsMemberLinks', () => {
    setupAuth({ isMember: true });

    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Active Order')).toBeInTheDocument();
    expect(screen.getByText('Order History')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('My Companies')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // Admin sees admin link
  it('GivenAdminUser_WhenSidebarRendered_ThenShowsAdminLink', () => {
    setupAuth({ isMember: true, isAdmin: true });

    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // Non-admin member doesn't see admin link
  it('GivenNonAdminMember_WhenSidebarRendered_ThenHidesAdminLink', () => {
    setupAuth({ isMember: true, isAdmin: false });

    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // Links have correct hrefs
  it('GivenMemberUser_WhenSidebarRendered_ThenLinksHaveCorrectPaths', () => {
    setupAuth({ isMember: true });

    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Events').closest('a')).toHaveAttribute('href', '/events');
    expect(screen.getByText('Active Order').closest('a')).toHaveAttribute('href', '/orders/active');
    expect(screen.getByText('Order History').closest('a')).toHaveAttribute('href', '/orders/history');
    expect(screen.getByText('Notifications').closest('a')).toHaveAttribute('href', '/notifications');
    expect(screen.getByText('My Companies').closest('a')).toHaveAttribute('href', '/production-company');
  });
});

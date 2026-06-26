import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockAuth = {
  token: 'admin-tok',
  isAdmin: true,
  loading: false,
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getSystemUsers: vi.fn(),
    getActiveOrders: vi.fn(),
    getOrderHistory: vi.fn(),
  },
}));

vi.mock('../../api/historyOrderApi', () => ({
  historyOrderApi: {
    getUserOrders: vi.fn(),
    getOrdersByCompany: vi.fn(),
  },
}));

import AdminPage from './AdminPage';
import { adminApi } from '../../api/adminApi';
import { historyOrderApi } from '../../api/historyOrderApi';

const mockUsers = [
  { userId: 'u1', name: 'Alice', email: 'a@t.com', userState: 'ACTIVE', isAdmin: false },
];
const mockActiveOrders = [
  { orderId: 'ao1', userId: 'u1', eventId: 'e1', createdAt: Date.now() },
];
const mockHistoryOrders = [
  { orderId: 'ho1', userId: 'u1', eventId: 'e1', price: 100 },
  { orderId: 'ho2', userId: 'u2', eventId: 'e2', price: 250 },
];

function setupSuccess() {
  (adminApi.getSystemUsers as any).mockResolvedValue(mockUsers);
  (adminApi.getActiveOrders as any).mockResolvedValue(mockActiveOrders);
  (adminApi.getOrderHistory as any).mockResolvedValue(mockHistoryOrders);
}

function clickTab(name: string) {
  const matches = screen.getAllByText(name);
  const tab = matches.find(el => el.className?.includes?.('admin-page__tab')) ?? matches[matches.length - 1];
  fireEvent.click(tab);
}

describe('AdminPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.token = 'admin-tok';
    mockAuth.isAdmin = true;
    mockAuth.loading = false;
  });

  it('GivenNoToken_WhenPageLoads_ThenShowsAccessDenied', async () => {
    mockAuth.token = null as any;
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText(/Access denied/i)).toBeInTheDocument());
  });

  it('GivenNonAdmin_WhenPageLoads_ThenShowsAccessDenied', async () => {
    mockAuth.isAdmin = false;
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText(/admin privileges required/i)).toBeInTheDocument());
  });

  it('GivenUsersFetchFails_WhenPageLoads_ThenShowsErrorWithPrefix', async () => {
    (adminApi.getSystemUsers as any).mockRejectedValue(new Error('Forbidden'));
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockResolvedValue([]);
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText(/Users: Forbidden/)).toBeInTheDocument());
  });

  it('GivenAllApiFails_WhenPageLoads_ThenShowsFirstError', async () => {
    (adminApi.getSystemUsers as any).mockRejectedValue(new Error('DB down'));
    (adminApi.getActiveOrders as any).mockRejectedValue(new Error('DB down'));
    (adminApi.getOrderHistory as any).mockRejectedValue(new Error('DB down'));
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText(/DB down/)).toBeInTheDocument());
  });

  it('GivenDataLoaded_WhenOverviewShown_ThenShowsStatsAndRevenue', async () => {
    setupSuccess();
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());
    expect(screen.getByText('₪350.00')).toBeInTheDocument();
    expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
  });

  it('GivenDataLoaded_WhenUsersTabClicked_ThenShowsUsersTable', async () => {
    setupSuccess();
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    clickTab('Users');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('a@t.com')).toBeInTheDocument();
  });

  it('GivenNoUsers_WhenUsersTabClicked_ThenShowsEmptyMessage', async () => {
    (adminApi.getSystemUsers as any).mockResolvedValue([]);
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockResolvedValue([]);
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    clickTab('Users');
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('GivenNoActiveOrders_WhenActiveOrdersTabClicked_ThenShowsEmptyMessage', async () => {
    (adminApi.getSystemUsers as any).mockResolvedValue([]);
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockResolvedValue([]);
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    clickTab('Active Orders');
    expect(screen.getByText('No active orders found.')).toBeInTheDocument();
  });

  it('GivenHistoryTab_WhenSearchByUserFails_ThenShowsSearchError', async () => {
    setupSuccess();
    (historyOrderApi.getUserOrders as any).mockRejectedValue(new Error('User not found'));
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    clickTab('History Orders');
    await waitFor(() => expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Enter user ID'), { target: { value: 'unknown' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByText('User not found')).toBeInTheDocument());
  });

  it('GivenHistoryTab_WhenSearchByCompanySucceeds_ThenShowsResults', async () => {
    setupSuccess();
    (historyOrderApi.getOrdersByCompany as any).mockResolvedValue([]);
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    clickTab('History Orders');
    await waitFor(() => expect(screen.getByDisplayValue('By User')).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue('By User'), { target: { value: 'company' } });
    fireEvent.change(screen.getByPlaceholderText('Enter company ID'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByText(/No orders found for this company/)).toBeInTheDocument());
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    getPermissions: vi.fn(),
  },
}));

vi.mock('../../api/historyOrderApi', () => ({
  historyOrderApi: {
    getUserOrders: vi.fn(),
    getOrdersByCompany: vi.fn(),
    getAllOrders: vi.fn(),
  },
}));

import OrderHistory from './OrderHistoryPage';
import { authApi } from '../../api/authApi';
import { historyOrderApi } from '../../api/historyOrderApi';

describe('OrderHistoryPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // BUG: When initUser fails, isLoading is never set to false, so the error
  // message is hidden behind the loading spinner. The page stays stuck on
  // "Retrieving Records..." instead of showing the error.
  it('GivenNoToken_WhenPageLoads_ThenStaysOnLoadingSpinner_BUG', async () => {
    localStorage.removeItem('token');
    render(<OrderHistory />);
    await waitFor(() => expect(screen.getByText(/Retrieving Records/i)).toBeInTheDocument());
  });

  // BUG: Same issue — auth failure sets error state but isLoading stays true
  it('GivenAuthFails_WhenPageLoads_ThenStaysOnLoadingSpinner_BUG', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Token expired'));
    (authApi.getPermissions as any).mockRejectedValue(new Error('Token expired'));
    render(<OrderHistory />);
    await waitFor(() => expect(screen.getByText(/Retrieving Records/i)).toBeInTheDocument());
  });

  it('GivenUserWithNoOrders_WhenPageLoads_ThenShowsEmptyState', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (authApi.getPermissions as any).mockResolvedValue({ userId: 'u1', isAdmin: false, productionRoles: {} });
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    render(<OrderHistory />);
    await waitFor(() => expect(screen.getByText(/No Records Found/i)).toBeInTheDocument());
  });

  it('GivenOrdersFetchFails_WhenPageLoads_ThenShowsError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (authApi.getPermissions as any).mockResolvedValue({ userId: 'u1', isAdmin: false, productionRoles: {} });
    (historyOrderApi.getUserOrders as any).mockRejectedValue(new Error('Database unavailable'));
    render(<OrderHistory />);
    await waitFor(() => expect(screen.getByText(/Database unavailable/i)).toBeInTheDocument());
  });

  it('GivenProductionUser_WhenSwitchingToCompanyView_ThenFetchesCompanyOrders', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (authApi.getPermissions as any).mockResolvedValue({
      userId: 'u1', isAdmin: false, productionRoles: { 1: 'FOUNDER' },
    });
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    (historyOrderApi.getOrdersByCompany as any).mockResolvedValue([]);
    render(<OrderHistory />);

    await waitFor(() => expect(screen.getByText(/Company Orders/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Company Orders/i));

    await waitFor(() => {
      expect(historyOrderApi.getOrdersByCompany).toHaveBeenCalled();
    });
  });

  it('GivenCompanyOrdersFail_WhenViewingCompanyTab_ThenShowsError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (authApi.getPermissions as any).mockResolvedValue({
      userId: 'u1', isAdmin: false, productionRoles: { 1: 'FOUNDER' },
    });
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    (historyOrderApi.getOrdersByCompany as any).mockRejectedValue(new Error('Access denied'));
    render(<OrderHistory />);

    await waitFor(() => expect(screen.getByText(/Company Orders/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Company Orders/i));

    await waitFor(() => expect(screen.getAllByText(/Access denied/i).length).toBeGreaterThan(0));
  });

  it('GivenOrderWithMissingEventDetails_WhenRendered_ThenDoesNotCrash', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (authApi.getPermissions as any).mockResolvedValue({ userId: 'u1', isAdmin: false, productionRoles: {} });
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      {
        orderId: 'o1',
        userId: 'u1',
        eventId: 'e1',
        seatIds: ['s1'],
        standingAreaQuantities: {},
        purchaseDate: new Date().toISOString(),
        price: 50,
      },
    ]);
    // Event details fetch uses raw fetch() which won't work in test env — silently fails
    render(<OrderHistory />);
    await waitFor(() => {
      expect(screen.getAllByText(/Event #e1/i).length).toBeGreaterThan(0);
    });
  });

  it('GivenAdminUser_WhenSwitchingToAllView_ThenFetchesAllOrders', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Admin' });
    (authApi.getPermissions as any).mockResolvedValue({
      userId: 'u1', isAdmin: true, productionRoles: {},
    });
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    (historyOrderApi.getAllOrders as any).mockResolvedValue([]);
    render(<OrderHistory />);

    await waitFor(() => expect(screen.getByText(/All System Orders/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/All System Orders/i));

    await waitFor(() => {
      expect(historyOrderApi.getAllOrders).toHaveBeenCalled();
    });
  });
});

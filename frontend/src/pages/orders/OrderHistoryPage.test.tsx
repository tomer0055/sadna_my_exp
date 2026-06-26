import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import OrderHistory from './OrderHistoryPage';
import { historyOrderApi } from '../../api/historyOrderApi';
import { authApi } from '../../api/authApi';

vi.mock('../../api/historyOrderApi', () => ({
  historyOrderApi: {
    getUserOrders: vi.fn(),
    getOrdersByCompany: vi.fn(),
    getAllOrders: vi.fn()
  }
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    getPermissions: vi.fn()
  }
}));

const mockProfile = { userId: 'user-1', name: 'John Doe', email: 'john@test.com' };

const mockMemberPermissions = {
  isAdmin: false,
  isMember: true,
  productionRoles: {}
};

const mockAdminPermissions = {
  isAdmin: true,
  isMember: true,
  productionRoles: {}
};

const mockCompanyManagerPermissions = {
  isAdmin: false,
  isMember: true,
  productionRoles: { 1: 'MANAGER' }
};

const mockOrder = (overrides: any = {}) => ({
  orderId: 'order-1',
  userId: 'user-1',
  eventId: 'evt-1',
  companyId: 1,
  purchaseDate: '2027-01-15T10:00:00',
  price: 200,
  seatIds: ['0_1_1', '0_1_2'],
  standingAreaQuantities: {},
  ...overrides
});

function setupUser(permissions: any = mockMemberPermissions) {
  (authApi.getCurrentUser as any).mockResolvedValue(mockProfile);
  (authApi.getPermissions as any).mockResolvedValue(permissions);
}

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ eventName: 'Rock Festival', isActive: true, location: 'Tel Aviv' })
    }) as any;
  });

  // UC II.6.1 - Personal orders: displays order list
  it('GivenUserWithOrders_WhenPageLoads_ThenDisplaysPersonalOrders', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      mockOrder(),
      mockOrder({ orderId: 'order-2', price: 150 })
    ]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Order History')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(historyOrderApi.getUserOrders).toHaveBeenCalledWith('test-token', 'user-1');
    });
  });

  // UC II.6.1 - Empty order history
  it('GivenUserWithNoOrders_WhenPageLoads_ThenDisplaysEmptyState', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('No Records Found')).toBeInTheDocument();
      expect(screen.getByText('No orders found in this category.')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockReturnValue(new Promise(() => {}));

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Retrieving Records...')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - Auth error: when user init fails, error is set but loading persists
  it('GivenNoAuthToken_WhenPageLoads_ThenSetsErrorState', async () => {
    localStorage.removeItem('token');
    (authApi.getCurrentUser as any).mockRejectedValue({ status: 401, message: 'You are not logged in.' });
    (authApi.getPermissions as any).mockRejectedValue({ status: 401 });

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Retrieving Records...')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - Order card shows ticket details (seats)
  it('GivenOrderWithSeats_WhenRendered_ThenDisplaysSeatIds', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      mockOrder({ seatIds: ['A1', 'A2'] })
    ]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('A2')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - Order card shows standing quantities
  it('GivenOrderWithStandingTickets_WhenRendered_ThenDisplaysStandingQuantities', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      mockOrder({ seatIds: [], standingAreaQuantities: { 'GA': 3 } })
    ]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('3x GA')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - Order shows price
  it('GivenOrder_WhenRendered_ThenDisplaysTotalPrice', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      mockOrder({ price: 350 })
    ]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('$350.00')).toBeInTheDocument();
    });
  });

  // UC II.6.1 - View ticket detail modal
  it('GivenOrderCard_WhenUserClicksViewTicket_ThenDisplaysTicketModal', async () => {
    setupUser();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([mockOrder()]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('VIEW TICKET')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('VIEW TICKET'));

    await waitFor(() => {
      expect(screen.getByText('Entry Pass')).toBeInTheDocument();
      expect(screen.getByText('Scan at Entrance')).toBeInTheDocument();
      expect(screen.getByText('order-1')).toBeInTheDocument();
    });
  });

  // UC II.6.2 - Admin view mode tab visible
  it('GivenAdminUser_WhenPageLoads_ThenShowsAllSystemOrdersTab', async () => {
    setupUser(mockAdminPermissions);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('All System Orders')).toBeInTheDocument();
    });
  });

  // UC II.6.2 - Admin switches to all orders view
  it('GivenAdminUser_WhenClicksAllOrdersTab_ThenFetchesAllOrders', async () => {
    setupUser(mockAdminPermissions);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    (historyOrderApi.getAllOrders as any).mockResolvedValue([
      mockOrder({ orderId: 'order-all-1', userId: 'other-user' })
    ]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('All System Orders')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('All System Orders'));

    await waitFor(() => {
      expect(historyOrderApi.getAllOrders).toHaveBeenCalledWith('test-token');
    });
  });

  // UC II.6.2 - Company manager view mode
  it('GivenCompanyManager_WhenPageLoads_ThenShowsCompanyOrdersTab', async () => {
    setupUser(mockCompanyManagerPermissions);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Company Orders')).toBeInTheDocument();
    });
  });

  // UC II.6.2 - Company manager switches to company view
  it('GivenCompanyManager_WhenClicksCompanyTab_ThenFetchesCompanyOrders', async () => {
    setupUser(mockCompanyManagerPermissions);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    (historyOrderApi.getOrdersByCompany as any).mockResolvedValue([]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Company Orders')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Company Orders'));

    await waitFor(() => {
      expect(historyOrderApi.getOrdersByCompany).toHaveBeenCalledWith('test-token', 1);
    });
  });

  // UC II.6.1 - Regular member doesn't see admin/company tabs
  it('GivenRegularMember_WhenPageLoads_ThenDoesNotShowViewModeTabs', async () => {
    setupUser(mockMemberPermissions);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('Order History')).toBeInTheDocument();
    });

    expect(screen.queryByText('All System Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Company Orders')).not.toBeInTheDocument();
  });
});

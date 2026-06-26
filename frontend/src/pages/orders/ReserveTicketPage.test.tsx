import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ReserveTicketsPage from './ReserveTicketPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';
import { historyOrderApi } from '../../api/historyOrderApi';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    updateActiveOrder: vi.fn(),
  },
}));

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    getEventSeatingMap: vi.fn(),
    getEventPurchasePolicy: vi.fn(),
    getEventCompanyId: vi.fn(),
  },
}));

vi.mock('../../api/historyOrderApi', () => ({
  historyOrderApi: {
    getUserOrders: vi.fn(),
  },
}));

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn().mockResolvedValue(null),
}));

const mockUser = { userId: 'user-1', name: 'John Doe', email: 'john@test.com' };

const mockOrder = {
  orderId: 'order-1',
  userId: 'user-1',
  eventId: 'evt-1',
  createdAt: new Date().toISOString(),
  seatIds: [],
  StandingAreaQuantities: {},
};

const mockEvent = {
  eventId: 'evt-1',
  eventName: 'Rock Festival',
  eventCapacity: 500,
  eventDateTime: '2027-12-31T20:00:00',
  isActive: true,
  eventLocation: 'Tel Aviv Arena',
  companyId: 1,
};

const mockSeatingMap = {
  assignedSeats: [
    { id: '0_1_1', isBooked: false, priceForTicket: 100 },
    { id: '0_1_2', isBooked: true, priceForTicket: 100 },
  ],
  standingAreas: [
    { areaId: 'GA', availableSeats: 50, capacity: 100, priceForTicket: 40 },
  ],
};

const mockPolicy = {
  minTickets: 1,
  maxTickets: 10,
  isQuantityOr: false,
  minAge: null,
  maxAge: null,
  isAgeOr: false,
  isAgeAndQuantityOr: false,
};

function setupDefaults(overrides: {
  order?: any;
  event?: any;
  seatingMap?: any;
  policy?: any;
  pastOrders?: any[];
} = {}) {
  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(overrides.order ?? mockOrder);
  (eventApi.getEvent as any).mockResolvedValue(overrides.event ?? mockEvent);
  (eventApi.getEventSeatingMap as any).mockResolvedValue(overrides.seatingMap ?? mockSeatingMap);
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(overrides.policy ?? mockPolicy);
  (eventApi.getEventCompanyId as any).mockResolvedValue(1);
  (historyOrderApi.getUserOrders as any).mockResolvedValue(overrides.pastOrders ?? []);
}

describe('ReserveTicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // 1. Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingSkeleton', () => {
    (authApi.getCurrentUser as any).mockReturnValue(new Promise(() => {}));

    render(<ReserveTicketsPage />);

    expect(screen.getByText('Venue Map')).toBeInTheDocument();
  });

  // 2. Error state (API failure)
  it('GivenApiFails_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Network error'));

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Could not load event details. Please refresh or try again later.')).toBeInTheDocument();
    });
  });

  // 3. No active order state
  it('GivenNoActiveOrder_WhenPageLoads_ThenDisplaysNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('No active order.')).toBeInTheDocument();
      expect(screen.getByText('Select tickets to get started.')).toBeInTheDocument();
    });
  });

  // 4. Venue map renders zones from seating map
  it('GivenSeatingMapData_WhenPageLoads_ThenRendersZones', async () => {
    setupDefaults();

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Zone 0')).toBeInTheDocument();
      expect(screen.getByText('STAGE')).toBeInTheDocument();
    });
  });

  // 5. Standing zone displays availability and price
  it('GivenStandingAreas_WhenPageLoads_ThenDisplaysAvailabilityAndPrice', async () => {
    setupDefaults();

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('GA')).toBeInTheDocument();
      expect(screen.getByText('50 available • $40/ticket')).toBeInTheDocument();
    });
  });

  // 6. Purchase rules section (collapsible)
  it('GivenPolicy_WhenUserClicksPurchaseRules_ThenExpandsRules', async () => {
    setupDefaults();

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Purchase Rules & Policies')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Purchase Rules & Policies'));

    await waitFor(() => {
      expect(screen.getByText('Between 1 and 10 tickets per order.')).toBeInTheDocument();
    });
  });

  // 7. Empty order panel
  it('GivenNoTicketsSelected_WhenPageLoads_ThenShowsEmptyOrderPanel', async () => {
    setupDefaults();

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Active Order')).toBeInTheDocument();
      expect(screen.getByText('No active order.')).toBeInTheDocument();
      expect(screen.getByText('Select tickets to get started.')).toBeInTheDocument();
    });
  });

  // 8. Order panel shows selected tickets (order with pre-selected seats)
  it('GivenOrderWithSelectedSeats_WhenPageLoads_ThenShowsTicketsInOrder', async () => {
    const orderWithSeat = {
      ...mockOrder,
      seatIds: ['0_1_1'],
    };
    setupDefaults({ order: orderWithSeat });

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Zone 0')).toBeInTheDocument();
      expect(screen.getByText('Row 1, Seat 1 • Qty 1')).toBeInTheDocument();
      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });
  });

  // 9. Proceed to Checkout button navigates to /checkout
  it('GivenSelectedTickets_WhenUserClicksCheckout_ThenNavigatesToCheckout', async () => {
    const orderWithSeat = {
      ...mockOrder,
      seatIds: ['0_1_1'],
    };
    setupDefaults({ order: orderWithSeat });
    (activeOrderApi.updateActiveOrder as any).mockResolvedValue(true);

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Proceed to Checkout'));

    await waitFor(() => {
      expect(activeOrderApi.updateActiveOrder).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
    });
  });

  // 10. No auth token - API still called with empty string, may error
  it('GivenNoAuthToken_WhenPageLoads_ThenApiCalledAndMayError', async () => {
    localStorage.removeItem('token');
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Could not load event details. Please refresh or try again later.')).toBeInTheDocument();
    });
  });

  // 11. Seating map error
  it('GivenSeatingMapFails_WhenPageLoads_ThenDisplaysMapError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(mockOrder);
    (eventApi.getEvent as any).mockResolvedValue(mockEvent);
    (eventApi.getEventSeatingMap as any).mockRejectedValue(new Error('Map error'));
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(mockPolicy);
    (eventApi.getEventCompanyId as any).mockResolvedValue(1);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Could not load seating map. Please refresh or try again later.')).toBeInTheDocument();
    });
  });

  // 12. Standing zone quantity controls
  it('GivenStandingArea_WhenPageLoads_ThenShowsQuantityControls', async () => {
    setupDefaults();

    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('GA')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
    });
  });
});

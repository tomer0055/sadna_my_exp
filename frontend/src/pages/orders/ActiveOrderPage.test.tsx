import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ActiveOrderPage from './ActiveOrderPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn()
  }
}));

vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    cancelOrder: vi.fn()
  }
}));

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    getEventSeatingMap: vi.fn(),
    getEventPurchasePolicy: vi.fn()
  }
}));

const mockUser = { userId: 'user-1', name: 'John Doe', email: 'john@test.com' };

const mockOrder = {
  orderId: 'order-abc-123',
  userId: 'user-1',
  eventId: 'evt-1',
  createdAt: new Date().toISOString(),
  seatIds: ['0_1_1', '0_1_2'],
  StandingAreaQuantities: {}
};

const mockEvent = {
  eventId: 'evt-1',
  eventName: 'Rock Festival',
  eventCapacity: 500,
  eventDateTime: '2027-12-31T20:00:00',
  isActive: true,
  eventLocation: 'Tel Aviv Arena',
  ticketPrice: 150
};

const mockSeatingMap = {
  assignedSeats: [
    { id: '0_1_1', isBooked: true, priceForTicket: 100 },
    { id: '0_1_2', isBooked: true, priceForTicket: 100 }
  ],
  standingAreas: []
};

const mockPolicy = {
  minTickets: 1,
  maxTickets: 10,
  isQuantityOr: false,
  minAge: null,
  maxAge: null,
  isAgeOr: false,
  isAgeAndQuantityOr: false
};

function setupFullOrder(overrides: { order?: any; event?: any; seatingMap?: any; policy?: any } = {}) {
  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(overrides.order || mockOrder);
  (eventApi.getEvent as any).mockResolvedValue(overrides.event || mockEvent);
  (eventApi.getEventSeatingMap as any).mockResolvedValue(overrides.seatingMap || mockSeatingMap);
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(overrides.policy || mockPolicy);
}

describe('ActiveOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // UC II.2.5 - Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', () => {
    (authApi.getCurrentUser as any).mockReturnValue(new Promise(() => {}));

    render(<ActiveOrderPage />);

    expect(screen.getByText('Securing your session data...')).toBeInTheDocument();
  });

  // UC II.2.5 - No active order
  it('GivenNoActiveOrder_WhenPageLoads_ThenDisplaysNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockRejectedValue(new Error('Not found'));

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('No Active Order Found')).toBeInTheDocument();
      expect(screen.getByText('Browse Events')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Null order response
  it('GivenNullOrderResponse_WhenPageLoads_ThenDisplaysNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('No Active Order Found')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - API error
  it('GivenApiError_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Network error'));

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Displays event name and tickets
  it('GivenActiveOrderWithSeats_WhenPageLoads_ThenDisplaysEventAndTickets', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Rock Festival').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Selected Tickets (2)')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Displays seat pricing
  it('GivenActiveOrderWithSeats_WhenPageLoads_ThenDisplaysSeatPrices', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      const priceElements = screen.getAllByText('$100.00');
      expect(priceElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // UC II.2.5 - Displays order summary totals
  it('GivenActiveOrderWithSeats_WhenPageLoads_ThenDisplaysOrderSummary', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Subtotal (2 Tickets)')).toBeInTheDocument();
      expect(screen.getAllByText('$200.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  // UC II.2.5 - Standing area tickets
  it('GivenOrderWithStandingTickets_WhenPageLoads_ThenDisplaysStandingAreas', async () => {
    setupFullOrder({
      order: { ...mockOrder, seatIds: [], StandingAreaQuantities: { 'area-ga': 3 } },
      seatingMap: {
        assignedSeats: [],
        standingAreas: [{ areaId: 'area-ga', availableSeats: 50, capacity: 100, priceForTicket: 40 }]
      }
    });

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('General Standing Admission')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 3')).toBeInTheDocument();
      expect(screen.getAllByText('$120.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  // UC II.2.5 - Empty order selection warning
  it('GivenOrderWithNoTickets_WhenPageLoads_ThenDisplaysEmptyWarning', async () => {
    setupFullOrder({
      order: { ...mockOrder, seatIds: [], StandingAreaQuantities: {} }
    });

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Your order selection is currently empty.')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Reservation timer display
  it('GivenActiveOrder_WhenPageLoads_ThenDisplaysReservationTimer', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText(/Reservation expires in/)).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Manual cancel order with confirmation
  it('GivenActiveOrder_WhenUserCancelsOrder_ThenShowsExpiredState', async () => {
    setupFullOrder();
    (activeOrderApi.cancelOrder as any).mockResolvedValue({ message: 'Canceled' });
    window.confirm = vi.fn().mockReturnValue(true);

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel Order'));

    await waitFor(() => {
      expect(activeOrderApi.cancelOrder).toHaveBeenCalledWith('test-token', 'order-abc-123', 'user-1');
      expect(screen.getByText('Reservation Handled / Expired')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Cancel order declined by user
  it('GivenActiveOrder_WhenUserDeclinesCancel_ThenOrderRemains', async () => {
    setupFullOrder();
    window.confirm = vi.fn().mockReturnValue(false);

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel Order'));

    expect(activeOrderApi.cancelOrder).not.toHaveBeenCalled();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
  });

  // UC II.2.5 - Minimum ticket policy enforcement
  it('GivenPolicyWithMinTickets_WhenBelowMinimum_ThenDisablesCheckoutAndShowsWarning', async () => {
    setupFullOrder({
      order: { ...mockOrder, seatIds: ['0_1_1'], StandingAreaQuantities: {} },
      seatingMap: {
        assignedSeats: [{ id: '0_1_1', isBooked: true, priceForTicket: 100 }],
        standingAreas: []
      },
      policy: { ...mockPolicy, minTickets: 3 }
    });

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Policy requires a minimum of 3 tickets.')).toBeInTheDocument();
    });

    const checkoutButton = screen.getByText('Go to Checkout');
    expect(checkoutButton.closest('button')).toBeDisabled();
  });

  // UC II.2.5 - Billing details display
  it('GivenActiveOrder_WhenPageLoads_ThenDisplaysBillingDetails', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Billing Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - No token shows error
  it('GivenNoAuthToken_WhenPageLoads_ThenDisplaysAuthError', async () => {
    localStorage.removeItem('token');

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument();
      expect(screen.getByText('No session token found. Please log in to proceed.')).toBeInTheDocument();
    });
  });

  // UC II.2.5 - Checkout button states: event canceled during session
  it('GivenEventCanceledDuringSession_WhenUserClicksCheckout_ThenShowsError', async () => {
    setupFullOrder();

    render(<ActiveOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Go to Checkout')).toBeInTheDocument();
    });

    (eventApi.getEvent as any).mockResolvedValue({ ...mockEvent, isActive: false });

    fireEvent.click(screen.getByText('Go to Checkout'));

    await waitFor(() => {
      expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument();
      expect(screen.getByText('Event got canceled')).toBeInTheDocument();
    });
  });
});

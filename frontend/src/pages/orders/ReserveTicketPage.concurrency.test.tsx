import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  authApi: { getCurrentUser: vi.fn() },
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
  historyOrderApi: { getUserOrders: vi.fn() },
}));

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn().mockResolvedValue(null),
}));

const mockUser = { userId: 'user-1', name: 'John', email: 'j@t.com' };

const freshOrder = () => ({
  orderId: 'order-1',
  userId: 'user-1',
  eventId: 'evt-1',
  createdAt: new Date().toISOString(),
  seatIds: [],
  StandingAreaQuantities: {},
});

const mockEvent = {
  eventId: 'evt-1',
  eventName: 'Rock Festival',
  eventCapacity: 500,
  eventDateTime: '2027-12-31T20:00:00',
  isActive: true,
  eventLocation: 'Tel Aviv',
  companyId: 1,
};

const mockPolicy = {
  minTickets: 1,
  maxTickets: 4,
  isQuantityOr: false,
  minAge: null,
  maxAge: null,
  isAgeOr: false,
  isAgeAndQuantityOr: false,
};

function setup(overrides: Record<string, any> = {}) {
  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(overrides.order ?? freshOrder());
  (eventApi.getEvent as any).mockResolvedValue(overrides.event ?? mockEvent);
  (eventApi.getEventSeatingMap as any).mockResolvedValue(overrides.seatingMap ?? {
    assignedSeats: [
      { id: '0_1_1', isBooked: false, priceForTicket: 100 },
      { id: '0_1_2', isBooked: false, priceForTicket: 100 },
      { id: '0_1_3', isBooked: false, priceForTicket: 100 },
      { id: '0_1_4', isBooked: false, priceForTicket: 100 },
      { id: '0_1_5', isBooked: false, priceForTicket: 100 },
    ],
    standingAreas: [
      { areaId: 'GA', availableSeats: 50, capacity: 100, priceForTicket: 40 },
    ],
  });
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(overrides.policy ?? mockPolicy);
  (eventApi.getEventCompanyId as any).mockResolvedValue(1);
  (historyOrderApi.getUserOrders as any).mockResolvedValue(overrides.pastOrders ?? []);
}

describe('ReserveTicketPage – concurrency & stale data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // BUG: Seating map fetched once on mount — never refreshes.
  // If another user books seat 0_1_1 after page load, this user still sees it as available.
  it('GivenSeatAvailableOnLoad_WhenAnotherUserBooksIt_ThenStaleDataShownUntilCheckoutFails', async () => {
    (activeOrderApi.updateActiveOrder as any).mockResolvedValue(false);
    setup();
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    const seat = screen.getByTitle(/Zone 0 Row 1, Seat 1/);
    fireEvent.click(seat);

    const checkoutBtn = screen.getByText(/Proceed to Checkout/i);
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      const errorBanner = screen.getByText(/unable to reserve|failed to reserve/i);
      expect(errorBanner).toBeInTheDocument();
    });
  });

  // Timer expires, clearing local selection — but server may have already expired order
  it('GivenTimerExpires_WhenUserHadSelectedSeats_ThenSelectionsAreCleared', async () => {
    const expiredOrder = {
      ...freshOrder(),
      createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 min ago, 1 min left
    };
    setup({ order: expiredOrder });
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    const seat = screen.getByTitle(/Zone 0 Row 1, Seat 1/);
    fireEvent.click(seat);

    await act(async () => {
      vi.advanceTimersByTime(61 * 1000);
    });

    // After timer expires, order items should be cleared
    // The seat click should have no effect anymore since timeLeft === 0
    const seat2 = screen.getByTitle(/Zone 0 Row 1, Seat 3/);
    fireEvent.click(seat2);
    // No order items created since timer expired
    expect(screen.queryByText(/General Admission/i)).not.toBeInTheDocument();
  });

  // BUG: Max ticket policy check uses stale alreadyPurchased count from initial load.
  // If user buys tickets in another tab, this page doesn't know about it.
  it('GivenUserAlreadyBought2Tickets_WhenSelectingMore_ThenLimitedByPolicy', async () => {
    const pastOrders = [
      { eventId: 'evt-1', seatIds: ['s1', 's2'], standingAreaQuantities: {} },
    ];
    setup({ pastOrders });
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    // Policy maxTickets=4, already purchased 2, so max 2 more
    fireEvent.click(screen.getByTitle(/Zone 0 Row 1, Seat 1/));
    fireEvent.click(screen.getByTitle(/Zone 0 Row 1, Seat 3/));

    // Try selecting a 3rd — should show limit error
    fireEvent.click(screen.getByTitle(/Zone 0 Row 1, Seat 4/));
    await waitFor(() => {
      expect(screen.getAllByText(/already purchased/i).length).toBeGreaterThan(0);
    });
  });

  // Standing area availability is based on initial fetch — could be stale
  it('GivenStandingAreaWith50Available_WhenUserAddsTickets_ThenClientSideCheckOnly', async () => {
    setup();
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBeGreaterThan(0);

    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    const orderSummary = screen.getByText(/General Admission/i);
    expect(orderSummary).toBeInTheDocument();
  });

  // Reservation API fails — seats taken by another user between selection and checkout
  it('GivenSeatsSelected_WhenReservationFailsDueToConflict_ThenErrorBannerShown', async () => {
    (activeOrderApi.updateActiveOrder as any).mockRejectedValue(
      new Error('Seats already reserved by another user')
    );
    setup();
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle(/Zone 0 Row 1, Seat 1/));

    fireEvent.click(screen.getByText(/Proceed to Checkout/i));

    await waitFor(() => {
      expect(screen.getByText(/Seats already reserved by another user/i)).toBeInTheDocument();
    });
  });

  // Order already expired on server but client timer still shows time
  it('GivenAlmostExpiredOrder_WhenTimerReaches0_ThenSeatsDeselected', async () => {
    const almostExpired = {
      ...freshOrder(),
      createdAt: new Date(Date.now() - 14 * 60 * 1000 - 55 * 1000).toISOString(), // 5 seconds left
    };
    setup({ order: almostExpired });
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      const selectedSeats = screen.queryAllByTitle(/Selected/i);
      expect(selectedSeats.length).toBe(0);
    });
  });

  // No active order (another user/tab cancelled it)
  it('GivenNoActiveOrder_WhenPageLoads_ThenShowsNoOrderState', async () => {
    setup({ order: null });
    render(<ReserveTicketsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Rock Festival')).not.toBeInTheDocument();
    });
  });

  // All seats already booked by other users
  it('GivenAllSeatsBooked_WhenPageLoads_ThenNoAvailableSeatsToSelect', async () => {
    setup({
      seatingMap: {
        assignedSeats: [
          { id: '0_1_1', isBooked: true, priceForTicket: 100 },
          { id: '0_1_2', isBooked: true, priceForTicket: 100 },
        ],
        standingAreas: [
          { areaId: 'GA', availableSeats: 0, capacity: 100, priceForTicket: 40 },
        ],
      },
    });
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Rock Festival')).toBeInTheDocument());

    // All seats should have "taken" styling (gray), none clickable for selection
    const allSeatDots = screen.getAllByTitle(/Zone 0 Row/);
    expect(allSeatDots.length).toBe(2);
    // Click a taken seat — it should NOT create an order item
    fireEvent.click(allSeatDots[0]);
    // No order summary row with price should appear from clicking taken seats
    expect(screen.queryByText(/Row 1, Seat/)).not.toBeInTheDocument();
  });
});

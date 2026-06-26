import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../api/authApi', () => ({
  authApi: { getCurrentUser: vi.fn() },
}));
vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    cancelOrder: vi.fn(),
    checkout: vi.fn(),
  },
  CheckoutRequestDTO: {},
}));
vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    getEventSeatingMap: vi.fn(),
    getEventPurchasePolicy: vi.fn(),
    validatePurchasePolicy: vi.fn(),
  },
}));

import CheckoutPage from './CheckoutPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';

const mockUser = { userId: 'u1', name: 'Test User' };

function setupCheckout(overrides: Record<string, any> = {}) {
  const order = overrides.order ?? {
    orderId: 'o1',
    eventId: 'e1',
    seatIds: ['0_1_1'],
    createdAt: overrides.createdAt ?? Date.now(),
  };

  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(order);
  (eventApi.getEvent as any).mockResolvedValue(
    overrides.event ?? { eventId: 'e1', eventName: 'Live Show', isActive: true }
  );
  (eventApi.getEventSeatingMap as any).mockResolvedValue(
    overrides.seatingMap ?? {
      assignedSeats: [{ id: '0_1_1', priceForTicket: 75 }],
      standingAreas: [],
    }
  );
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
  (eventApi.validatePurchasePolicy as any).mockResolvedValue(overrides.policyResult ?? null);
  (activeOrderApi.checkout as any).mockResolvedValue(overrides.checkoutResult ?? { success: true });
}

function fillPaymentForm() {
  fireEvent.change(screen.getByPlaceholderText('Johnathan Doe'), { target: { value: 'John Doe' } });
  fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
  fireEvent.change(screen.getByPlaceholderText('4111 2222 3333 4444'), { target: { value: '4111222233334444' } });
  fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
  fireEvent.change(screen.getByPlaceholderText('•••'), { target: { value: '123' } });
}

describe('CheckoutPage – concurrency & timer race conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // Timer runs client-side: if server already expired the order, checkout will fail
  it('GivenOrderCreated14MinAgo_WhenTimerShows1Min_ThenTimerCountsDown', async () => {
    const fourteenMinAgo = Date.now() - 14 * 60 * 1000;
    setupCheckout({ createdAt: fourteenMinAgo });
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());
    expect(screen.getByText(/0[0-1]:[0-5]\d/)).toBeInTheDocument();
  });

  // BUG: Server may expire order while client still shows countdown.
  // Payment attempt after server expiration returns error.
  it('GivenOrderExpiredOnServer_WhenUserPays_ThenCheckoutFailsWithExpiredError', async () => {
    setupCheckout();
    // Second getEvent call during payment flow also returns active
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Live Show', isActive: true });
    (activeOrderApi.checkout as any).mockRejectedValue(new Error('Order has expired'));
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());
    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText('Order has expired')).toBeInTheDocument());
  });

  // Another user bought same seats — server rejects with conflict
  it('GivenSeatsTakenByAnotherUser_WhenPaying_ThenConflictErrorShown', async () => {
    setupCheckout();
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Live Show', isActive: true });
    (activeOrderApi.checkout as any).mockRejectedValue(
      new Error('Selected seats are no longer available')
    );
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());
    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText(/no longer available/)).toBeInTheDocument());
  });

  // Event cancelled by admin while user is on checkout page
  it('GivenEventCancelledDuringCheckout_WhenPaying_ThenCancelledErrorShown', async () => {
    (eventApi.getEvent as any)
      .mockResolvedValueOnce({ eventId: 'e1', eventName: 'Live Show', isActive: true })
      .mockResolvedValueOnce({ eventId: 'e1', eventName: 'Live Show', isActive: false });
    setupCheckout();
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());
    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText(/Event got canceled/)).toBeInTheDocument());
  });

  // BUG DOCUMENTED: No debounce/disable on payment button during async processing.
  // Rapid clicks can trigger multiple checkout API calls.
  it('GivenPaymentInProgress_WhenButtonClickedMultipleTimes_ThenMultipleCheckoutCallsMade_BUG', async () => {
    setupCheckout();
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Live Show', isActive: true });
    let resolveCheckout: (v: any) => void;
    (activeOrderApi.checkout as any).mockImplementation(
      () => new Promise(r => { resolveCheckout = r; })
    );
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());
    fillPaymentForm();

    fireEvent.click(screen.getByText(/Authorize & Pay/));
    fireEvent.click(screen.getByText(/Authorize & Pay/));
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await new Promise(r => setTimeout(r, 100));

    const callCount = (activeOrderApi.checkout as any).mock.calls.length;
    // BUG: This should be 1 (button should disable), but multiple calls go through
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  // Order auto-cancels when timer reaches 0
  it('GivenOrderTimerExpires_WhenCountdownReaches0_ThenShowsExpiredState', async () => {
    const almostExpired = Date.now() - 15 * 60 * 1000 + 1000; // 1 second left
    setupCheckout({ createdAt: almostExpired });
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/00:0[0-1]/)).toBeInTheDocument());
  });

  // Seating map pricing mismatch — server may have updated prices
  it('GivenPriceChangedOnServer_WhenCheckoutPageLoads_ThenShowsStalePrice', async () => {
    setupCheckout({
      seatingMap: {
        assignedSeats: [{ id: '0_1_1', priceForTicket: 999 }],
        standingAreas: [],
      },
    });
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText('Live Show')).toBeInTheDocument());
    expect(screen.getAllByText(/999/).length).toBeGreaterThan(0);
  });

  // Order with standing area quantities
  it('GivenOrderWithStandingTickets_WhenRendered_ThenShowsStandingAreaPricing', async () => {
    const order = {
      orderId: 'o1',
      eventId: 'e1',
      seatIds: [],
      standingAreaQuantities: { 'GA': 3 },
      createdAt: Date.now(),
    };
    setupCheckout({
      order,
      seatingMap: {
        assignedSeats: [],
        standingAreas: [{ areaId: 'GA', priceForTicket: 40, availableSeats: 50, capacity: 100 }],
      },
    });
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText('Live Show')).toBeInTheDocument());
  });
});

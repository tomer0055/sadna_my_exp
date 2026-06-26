import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

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

import ReserveTicketsPage from './ReserveTicketPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';
import { historyOrderApi } from '../../api/historyOrderApi';

const mockUser = { userId: 'u1', name: 'Test User' };
const mockOrder = {
  orderId: 'o1', userId: 'u1', eventId: 'e1',
  createdAt: new Date().toISOString(), seatIds: [], StandingAreaQuantities: {},
};
const mockEvent = {
  eventId: 'e1', eventName: 'Concert', eventCapacity: 500,
  eventDateTime: '2027-12-01T20:00:00', isActive: true,
};
const mockSeatingMap = {
  assignedSeats: [
    { id: 'A_1_1', isBooked: false, priceForTicket: 100 },
    { id: 'A_1_2', isBooked: false, priceForTicket: 100 },
    { id: 'A_1_3', isBooked: true, priceForTicket: 100 },
  ],
  standingAreas: [
    { areaId: 'GA', availableSeats: 50, capacity: 100, priceForTicket: 40 },
  ],
};

function setupFull() {
  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(mockOrder);
  (eventApi.getEvent as any).mockResolvedValue(mockEvent);
  (eventApi.getEventSeatingMap as any).mockResolvedValue(mockSeatingMap);
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
  (eventApi.getEventCompanyId as any).mockResolvedValue(null);
  (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
}

describe('ReserveTicketPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'tok');
  });

  it('GivenAuthFails_WhenPageLoads_ThenShowsEventError', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText(/Could not load event details/)).toBeInTheDocument());
  });

  it('GivenNoActiveOrder_WhenPageLoads_ThenShowsNoActiveOrderState', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText('No active order.')).toBeInTheDocument());
  });

  it('GivenEventFetchFails_WhenPageLoads_ThenShowsEventError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(mockOrder);
    (eventApi.getEvent as any).mockRejectedValue(new Error('Not found'));
    (eventApi.getEventSeatingMap as any).mockResolvedValue(mockSeatingMap);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    (eventApi.getEventCompanyId as any).mockResolvedValue(null);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText(/Could not load event details/)).toBeInTheDocument());
  });

  it('GivenSeatingMapFails_WhenPageLoads_ThenShowsMapError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(mockOrder);
    (eventApi.getEvent as any).mockResolvedValue(mockEvent);
    (eventApi.getEventSeatingMap as any).mockRejectedValue(new Error('Map unavailable'));
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    (eventApi.getEventCompanyId as any).mockResolvedValue(null);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText(/Could not load seating map/)).toBeInTheDocument());
  });

  it('GivenPolicyFetchFails_WhenPageLoads_ThenPageStillRendersWithoutPolicy', async () => {
    setupFull();
    (eventApi.getEventPurchasePolicy as any).mockRejectedValue(new Error('Policy error'));
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());
  });

  it('GivenHistoryFetchFails_WhenPageLoads_ThenPageStillRendersWithZeroPurchased', async () => {
    setupFull();
    (historyOrderApi.getUserOrders as any).mockRejectedValue(new Error('History error'));
    render(<ReserveTicketsPage />);
    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());
  });

  it('GivenReserveFails_WhenCheckoutClicked_ThenShowsErrorBanner', async () => {
    setupFull();
    (activeOrderApi.updateActiveOrder as any).mockRejectedValue(new Error('Seats already taken'));
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());

    const availableSeats = screen.getAllByTitle(/Zone A Row 1, Seat 1/);
    fireEvent.click(availableSeats[0]);

    fireEvent.click(screen.getByText('Proceed to Checkout'));
    await waitFor(() => expect(screen.getByText(/Seats already taken/)).toBeInTheDocument());
  });

  it('GivenNoTicketsSelected_WhenLoaded_ThenShowsEmptyOrderPanel', async () => {
    setupFull();
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());
    expect(screen.getByText('No active order.')).toBeInTheDocument();
    expect(screen.getByText('Select tickets to get started.')).toBeInTheDocument();
  });

  it('GivenMaxTicketPolicy_WhenExceedingLimit_ThenShowsLimitBanner', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(mockOrder);
    (eventApi.getEvent as any).mockResolvedValue(mockEvent);
    (eventApi.getEventSeatingMap as any).mockResolvedValue(mockSeatingMap);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue({
      minTickets: null, maxTickets: 1, minAge: null, maxAge: null,
      isQuantityOr: false, isAgeOr: false, isAgeAndQuantityOr: false,
    });
    (eventApi.getEventCompanyId as any).mockResolvedValue(null);
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);
    render(<ReserveTicketsPage />);

    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());

    const seat1 = screen.getAllByTitle(/Zone A Row 1, Seat 1/);
    fireEvent.click(seat1[0]);

    const seat2 = screen.getAllByTitle(/Zone A Row 1, Seat 2/);
    fireEvent.click(seat2[0]);

    await waitFor(() => expect(screen.getByText(/Maximum 1 ticket/)).toBeInTheDocument());
  });
});

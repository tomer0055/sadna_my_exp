import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import EventDetailsPage from './EventDetailsPage';
import { eventApi } from '../../api/eventsApi';
import { activeOrderApi } from '../../api/activeOrderApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    searchEvents: vi.fn()
  }
}));

vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    createOrder: vi.fn()
  }
}));

vi.mock('../../utils/errorUtils', () => ({
  getUserFriendlyError: (e: any) => e?.message || ''
}));

const futureDate = '2027-12-31T20:00:00';
const pastDate = '2020-01-01T20:00:00';

function renderWithRoute(eventId = 'evt-1') {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user-1');

    // Mock the policy fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ description: 'No policy' })
    }) as any;
  });

  // UC II.2.3 - View event details
  it('GivenValidEvent_WhenPageLoads_ThenDisplaysEventDetails', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Rock Festival')).toBeInTheDocument();
      expect(screen.getByText('500 Tickets')).toBeInTheDocument();
      expect(screen.getByText('$150')).toBeInTheDocument();
    });
  });

  // UC II.2.3 - Event not found
  it('GivenInvalidEventId_WhenPageLoads_ThenDisplaysNotFoundMessage', async () => {
    (eventApi.getEvent as any).mockResolvedValue(null);

    renderWithRoute('nonexistent');

    await waitFor(() => {
      expect(screen.getByText('EVENT NOT FOUND')).toBeInTheDocument();
    });
  });

  // UC II.2.3 - Past event shows "already taken place" message
  it('GivenPastEvent_WhenPageLoads_ThenShowsPastEventBanner', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Old Show',
      eventCapacity: 100,
      eventDateTime: pastDate,
      isActive: true,
      ticketPrice: 50
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('THIS EVENT HAS ALREADY TAKEN PLACE')).toBeInTheDocument();
    });
  });

  // UC II.2.3 - Canceled event shows unavailable message
  it('GivenCanceledEvent_WhenPageLoads_ThenShowsCanceledBanner', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Canceled Show',
      eventCapacity: 100,
      eventDateTime: futureDate,
      isActive: false,
      ticketPrice: 50
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText(/EVENT CANCELED/)).toBeInTheDocument();
    });
  });

  // UC II.2.4 - Start order: creates order and navigates to reserve page
  it('GivenActiveEvent_WhenUserClicksReserve_ThenCreatesOrderAndNavigates', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);
    (activeOrderApi.createOrder as any).mockResolvedValue({ orderId: 'order-1' });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => {
      expect(activeOrderApi.createOrder).toHaveBeenCalledWith('test-token', {
        userId: 'user-1',
        eventId: 'evt-1'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/events/evt-1/reserve');
    });
  });

  // UC II.2.4 - User already has active order for same event: redirects to active order
  it('GivenExistingOrderForSameEvent_WhenUserClicksReserve_ThenRedirectsToActiveOrder', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'order-1',
      eventId: 'evt-1'
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders/active');
    });
  });

  // UC II.2.4 - User has active order for different event: shows error
  it('GivenExistingOrderForDifferentEvent_WhenUserClicksReserve_ThenShowsError', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'order-1',
      eventId: 'evt-2'
    });
    (eventApi.getEvent as any).mockImplementation((_token: string, id: string) => {
      if (id === 'evt-2') return Promise.resolve({ eventName: 'Jazz Night' });
      return Promise.resolve({
        eventId: 'evt-1',
        eventName: 'Rock Festival',
        eventCapacity: 500,
        eventDateTime: futureDate,
        isActive: true,
        ticketPrice: 150
      });
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => {
      expect(screen.getByText(/You already have an active order for: Jazz Night/)).toBeInTheDocument();
    });
  });

  // UC II.2.3 - Has "back to events" link
  it('GivenEventDetailsPage_WhenRendered_ThenHasBackToEventsLink', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('BACK TO EVENTS')).toBeInTheDocument();
    });
  });

  // UC II.2.3 - Displays purchase policy when available
  it('GivenEventWithPolicy_WhenPageLoads_ThenDisplaysPolicySummary', async () => {
    (eventApi.getEvent as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: 'Rock Festival',
      eventCapacity: 500,
      eventDateTime: futureDate,
      isActive: true,
      ticketPrice: 150
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ description: 'Max 4 tickets per person' })
    }) as any;

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Purchase Policy Summary')).toBeInTheDocument();
      expect(screen.getByText('Max 4 tickets per person')).toBeInTheDocument();
    });
  });
});

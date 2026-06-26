import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
  },
}));
vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    createOrder: vi.fn(),
  },
}));
vi.mock('../../utils/errorUtils', () => ({
  getUserFriendlyError: (e: any) => e?.message || 'Unknown error',
}));

import EventDetailsPage from './EventDetailsPage';
import { eventApi } from '../../api/eventsApi';
import { activeOrderApi } from '../../api/activeOrderApi';

function renderPage(eventId = 'evt-1') {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
        <Route path="/events" element={<div>EventsList</div>} />
        <Route path="/orders/active" element={<div>ActiveOrder</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventDetailsPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user-1');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
  });

  it('GivenApiReturnsNull_WhenLoadingEvent_ThenShowsNotFoundMessage', async () => {
    (eventApi.getEvent as any).mockResolvedValue(null);
    renderPage();
    await waitFor(() => expect(screen.getByText('EVENT NOT FOUND')).toBeInTheDocument());
    expect(screen.getByText(/does not exist or has been removed/)).toBeInTheDocument();
  });

  it('GivenApiThrowsNetworkError_WhenLoadingEvent_ThenShowsErrorMessage', async () => {
    (eventApi.getEvent as any).mockRejectedValue(new Error('Failed to fetch'));
    renderPage();
    await waitFor(() => expect(screen.getByText('EVENT NOT FOUND')).toBeInTheDocument());
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('GivenApiThrowsServerError_WhenLoadingEvent_ThenShowsFriendlyError', async () => {
    (eventApi.getEvent as any).mockRejectedValue(new Error('Internal Server Error'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument());
  });

  it('GivenEventLoaded_WhenCreateOrderThrows_ThenShowsOrderError', async () => {
    const event = { eventId: 'evt-1', eventName: 'Concert', eventCapacity: 100, ticketPrice: 50, isActive: true };
    (eventApi.getEvent as any).mockResolvedValue(event);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);
    (activeOrderApi.createOrder as any).mockRejectedValue(new Error('Server is down'));
    renderPage();

    await waitFor(() => expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument());
    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => expect(screen.getByText('Server is down')).toBeInTheDocument());
  });

  it('GivenExistingOrderForDifferentEvent_WhenCreatingOrder_ThenShowsConflictError', async () => {
    const event = { eventId: 'evt-1', eventName: 'Concert', eventCapacity: 100, ticketPrice: 50, isActive: true };
    (eventApi.getEvent as any).mockResolvedValue(event);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({ eventId: 'evt-other', orderId: 'ord-1' });
    renderPage();

    await waitFor(() => expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument());
    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => expect(screen.getByText(/already have an active order/)).toBeInTheDocument());
  });

  it('GivenPastEvent_WhenRendered_ThenShowsPastEventMessage', async () => {
    const pastDate = new Date(2020, 0, 1).toISOString();
    const event = { eventId: 'evt-1', eventName: 'Old Concert', eventCapacity: 100, ticketPrice: 50, isActive: true, eventDateTime: pastDate };
    (eventApi.getEvent as any).mockResolvedValue(event);
    renderPage();

    await waitFor(() => expect(screen.getByText('THIS EVENT HAS ALREADY TAKEN PLACE')).toBeInTheDocument());
  });

  it('GivenCanceledEvent_WhenRendered_ThenShowsCanceledMessage', async () => {
    const event = { eventId: 'evt-1', eventName: 'Canceled Show', eventCapacity: 100, ticketPrice: 50, isActive: false };
    (eventApi.getEvent as any).mockResolvedValue(event);
    renderPage();

    await waitFor(() => expect(screen.getByText(/EVENT CANCELED/)).toBeInTheDocument());
  });

  it('GivenNoToken_WhenLoadingEvent_ThenUsesEmptyTokenGracefully', async () => {
    localStorage.removeItem('token');
    (eventApi.getEvent as any).mockResolvedValue(null);
    renderPage();
    await waitFor(() => expect(screen.getByText('EVENT NOT FOUND')).toBeInTheDocument());
  });

  it('GivenEventWithMissingPrice_WhenRendered_ThenShowsTBD', async () => {
    const event = { eventId: 'evt-1', eventName: 'No Price', eventCapacity: 50, ticketPrice: null, isActive: true };
    (eventApi.getEvent as any).mockResolvedValue(event);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('TBD').length).toBeGreaterThan(0));
  });

  it('GivenEventWithMissingDateTime_WhenRendered_ThenShowsTBDDate', async () => {
    const event = { eventId: 'evt-1', eventName: 'No Date', eventCapacity: 50, ticketPrice: 10, isActive: true, eventDateTime: null };
    (eventApi.getEvent as any).mockResolvedValue(event);
    renderPage();
    await waitFor(() => expect(screen.getByText('TBD')).toBeInTheDocument());
  });

  it('GivenCreateOrderReturnsNoOrderId_WhenCreating_ThenDoesNotNavigate', async () => {
    const event = { eventId: 'evt-1', eventName: 'Concert', eventCapacity: 100, ticketPrice: 50, isActive: true };
    (eventApi.getEvent as any).mockResolvedValue(event);
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);
    (activeOrderApi.createOrder as any).mockResolvedValue({});
    renderPage();

    await waitFor(() => expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument());
    fireEvent.click(screen.getByText('RESERVE TICKETS'));

    await waitFor(() => expect(screen.getByText('RESERVE TICKETS')).toBeInTheDocument());
  });
});

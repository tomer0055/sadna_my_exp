import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getAllActiveEvents: vi.fn(),
    searchEvents: vi.fn(),
  },
  EventDTO: {},
}));

import EventsPage from './EventsPage';
import { eventApi } from '../../api/eventsApi';

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[search ? `/events?search=${search}` : '/events']}>
      <EventsPage />
    </MemoryRouter>
  );
}

describe('EventsPage – stale data & capacity display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // BUG: EventsPage fetches events once on mount. If another user buys tickets
  // reducing capacity, this user sees stale availability until page refresh.
  it('GivenEventWith100Capacity_WhenRendered_ThenShowsAvailableLabel', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Concert', eventCapacity: 100, ticketPrice: 50 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Concert')).toBeInTheDocument());
    expect(screen.getByText('100+ AV.')).toBeInTheDocument();
  });

  it('GivenEventWithCapacity0_WhenAnotherUserBuysLastTicket_ThenShowsSoldOut', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Sold Out Show', eventCapacity: 0, ticketPrice: 50 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('SOLD OUT')).toBeInTheDocument());
  });

  // Event capacity of 1 — last ticket scenario
  it('GivenEventWith1Remaining_WhenRendered_ThenShowsLimitedAvailability', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Exclusive', eventCapacity: 1, ticketPrice: 200 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Exclusive')).toBeInTheDocument());
    expect(screen.getByText('1 LEFT')).toBeInTheDocument();
  });

  // Multiple events with different capacity states
  it('GivenMixedCapacityEvents_WhenRendered_ThenEachShowsCorrectAvailability', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Sold Out', eventCapacity: 0, ticketPrice: 50 },
      { eventId: '2', eventName: 'Popular', eventCapacity: 5, ticketPrice: 50 },
      { eventId: '3', eventName: 'New Show', eventCapacity: 1000, ticketPrice: 50 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Sold Out')).toBeInTheDocument());
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
    expect(screen.getByText('5 LEFT')).toBeInTheDocument();
    expect(screen.getByText('1000+ AV.')).toBeInTheDocument();
  });

  // BUG: No real-time update mechanism. After initial load, capacity data is frozen.
  // This test documents that the API is only called once per mount.
  it('GivenEventsLoaded_WhenTimeElapses_ThenNoAutoRefreshOccurs', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Test', eventCapacity: 10, ticketPrice: 50 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    expect(eventApi.getAllActiveEvents).toHaveBeenCalledTimes(1);

    await new Promise(r => setTimeout(r, 100));

    expect(eventApi.getAllActiveEvents).toHaveBeenCalledTimes(1);
  });

  // Price display with zone pricing (min/max)
  it('GivenEventWithZonePricing_WhenRendered_ThenShowsPriceRange', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Zones', eventCapacity: 100, minZonePrice: 30, maxZonePrice: 150 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Zones')).toBeInTheDocument());
    expect(screen.getByText(/\$30/)).toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import EventsPage from './EventsPage';
import { eventApi } from '../../api/eventsApi';
import type { EventDTO } from '../../api/eventsApi';

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getAllActiveEvents: vi.fn(),
    searchEvents: vi.fn()
  }
}));

const mockEvent = (overrides: Partial<EventDTO> = {}): EventDTO => ({
  eventId: 'evt-1',
  eventName: 'Rock Festival',
  eventCapacity: 500,
  eventDateTime: '2027-08-15T20:00:00',
  isActive: true,
  eventLocation: 'Tel Aviv Arena',
  ticketPrice: 150,
  imageUrl: null,
  minZonePrice: null,
  maxZonePrice: null,
  ...overrides
});

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UC II.2.1 - View list of active events
  it('GivenActiveEvents_WhenPageLoads_ThenDisplaysEventCards', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent(),
      mockEvent({ eventId: 'evt-2', eventName: 'Jazz Night', eventLocation: 'Haifa' })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Rock Festival')).toBeInTheDocument();
      expect(screen.getByText('Jazz Night')).toBeInTheDocument();
    });
    expect(screen.getByText('2 EVENTS')).toBeInTheDocument();
  });

  // UC II.2.1 - Empty state when no events exist
  it('GivenNoEvents_WhenPageLoads_ThenDisplaysEmptyMessage', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('No events yet')).toBeInTheDocument();
      expect(screen.getByText('Check back soon!')).toBeInTheDocument();
    });
  });

  // UC II.2.2 - Search events by name/location
  it('GivenSearchQuery_WhenUserSearches_ThenDisplaysFilteredResults', async () => {
    (eventApi.searchEvents as any).mockResolvedValue([
      mockEvent({ eventName: 'Jazz Night' })
    ]);

    render(
      <MemoryRouter initialEntries={['/events?search=jazz']}>
        <EventsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(eventApi.searchEvents).toHaveBeenCalledWith('jazz');
      expect(screen.getByText('Jazz Night')).toBeInTheDocument();
      expect(screen.getByText('Results for "jazz"')).toBeInTheDocument();
    });
  });

  // UC II.2.2 - Search returns no results
  it('GivenNoMatchingEvents_WhenUserSearches_ThenDisplaysNoResultsMessage', async () => {
    (eventApi.searchEvents as any).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/events?search=nonexistent']}>
        <EventsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No events found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
    });
  });

  // UC II.2.1 - Event card shows location
  it('GivenEventWithLocation_WhenRendered_ThenDisplaysLocation', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent({ eventLocation: 'Jerusalem Hall' })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Jerusalem Hall')).toBeInTheDocument();
    });
  });

  // UC II.2.1 - Event card shows price range
  it('GivenEventWithZonePricing_WhenRendered_ThenDisplaysPriceRange', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent({ minZonePrice: 50, maxZonePrice: 200, ticketPrice: null })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('$50.00 – $200.00')).toBeInTheDocument();
    });
  });

  // UC II.2.1 - Event card shows "SOLD OUT" when capacity is 0
  it('GivenSoldOutEvent_WhenRendered_ThenDisplaysSoldOutLabel', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent({ eventCapacity: 0 })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
    });
  });

  // UC II.2.1 - Event card shows low availability warning
  it('GivenLowCapacityEvent_WhenRendered_ThenDisplaysLimitedAvailability', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent({ eventCapacity: 5 })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('5 LEFT')).toBeInTheDocument();
    });
  });

  // UC II.2.1 - Event card links to details page
  it('GivenEventCard_WhenRendered_ThenHasViewDetailsLink', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([mockEvent()]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      const link = screen.getByText('VIEW DETAILS');
      expect(link.closest('a')).toHaveAttribute('href', '/events/evt-1');
    });
  });

  // UC II.2.1 - Free event display
  it('GivenFreeEvent_WhenRendered_ThenDisplaysFreeLabel', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      mockEvent({ ticketPrice: null, minZonePrice: null, maxZonePrice: null })
    ]);

    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });
});

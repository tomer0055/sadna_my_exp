import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

class TestErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <div>REACT_CRASH</div> : this.props.children; }
}

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

describe('EventsPage – error & crash resilience', () => {
  let originalListeners: Function[];

  beforeEach(() => {
    vi.clearAllMocks();
    originalListeners = process.listeners('unhandledRejection') as Function[];
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', () => {});
  });

  afterEach(() => {
    process.removeAllListeners('unhandledRejection');
    originalListeners.forEach(l => process.on('unhandledRejection', l as any));
  });

  it('GivenNetworkError_WhenLoadingEvents_ThenInfiniteSpinnerShown', async () => {
    (eventApi.getAllActiveEvents as any).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('refresh')).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText('refresh')).toBeInTheDocument();
  });

  // BUG DOCUMENTED: EventsPage has no .catch() on its API calls.
  // When the API throws, the promise rejection goes unhandled and the spinner stays forever.
  it('GivenApiThrows_WhenLoadingEvents_ThenSpinnerStaysForever_BUG', async () => {
    (eventApi.getAllActiveEvents as any).mockRejectedValue(new Error('Failed to fetch'));
    renderPage();
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText('refresh')).toBeInTheDocument();
  });

  // BUG DOCUMENTED: If API returns null instead of [], events.length crashes
  it('GivenApiReturnsNull_WhenLoadingEvents_ThenPageCrashes_BUG', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (eventApi.getAllActiveEvents as any).mockResolvedValue(null);
    render(
      <MemoryRouter initialEntries={['/events']}>
        <TestErrorBoundary><EventsPage /></TestErrorBoundary>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('REACT_CRASH')).toBeInTheDocument());
    spy.mockRestore();
  });

  it('GivenApiReturnsEmptyArray_WhenLoadingEvents_ThenShowsNoEventsMessage', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('No events yet')).toBeInTheDocument());
  });

  it('GivenSearchApiThrows_WhenSearching_ThenSpinnerStaysForever_BUG', async () => {
    (eventApi.searchEvents as any).mockRejectedValue(new Error('Server error'));
    renderPage('concert');
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText('refresh')).toBeInTheDocument();
  });

  it('GivenEventMissingFields_WhenRendered_ThenFallbacksUsed', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '1', eventName: 'Test', eventCapacity: 0 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('SOLD OUT')).toBeInTheDocument());
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('GivenEventWithNullDateTime_WhenRendered_ThenDoesNotCrash', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '2', eventName: 'Null Date Event', eventCapacity: 50, eventDateTime: null, ticketPrice: 10 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Null Date Event')).toBeInTheDocument());
  });

  it('GivenEventWithInvalidDate_WhenRendered_ThenDoesNotCrash', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '3', eventName: 'Bad Date', eventCapacity: 100, eventDateTime: 'not-a-date', eventLocation: null },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Bad Date')).toBeInTheDocument());
  });

  it('GivenEventWithZeroPrices_WhenRendered_ThenShowsFree', async () => {
    (eventApi.getAllActiveEvents as any).mockResolvedValue([
      { eventId: '4', eventName: 'Free Event', eventCapacity: 200, minZonePrice: null, maxZonePrice: null, ticketPrice: null },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Free')).toBeInTheDocument());
  });
});

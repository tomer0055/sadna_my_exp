import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));
vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    cancelOrder: vi.fn(),
  },
}));
vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    getEventSeatingMap: vi.fn(),
    getEventPurchasePolicy: vi.fn(),
  },
}));

import ActiveOrderPage from './ActiveOrderPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';

describe('ActiveOrderPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('GivenNoToken_WhenPageLoads_ThenShowsLoginError', async () => {
    localStorage.removeItem('token');
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument());
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('GivenUserProfileFails_WhenPageLoads_ThenShowsError', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument());
  });

  it('GivenNoActiveOrder_WhenPageLoads_ThenShowsNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(null);
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('No Active Order Found')).toBeInTheDocument());
    expect(screen.getByText('Browse Events')).toBeInTheDocument();
  });

  it('GivenActiveOrderApiThrows_WhenPageLoads_ThenShowsNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockRejectedValue(new Error('Not found'));
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('No Active Order Found')).toBeInTheDocument());
  });

  it('GivenOrderExistsButEventFails_WhenPageLoads_ThenShowsError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({ orderId: 'o1', eventId: 'e1', seatIds: [] });
    (eventApi.getEvent as any).mockResolvedValue(null);
    (eventApi.getEventSeatingMap as any).mockResolvedValue(null);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('Checkout Interrupted')).toBeInTheDocument());
    expect(screen.getByText(/Failed to retrieve details/)).toBeInTheDocument();
  });

  it('GivenNullSeatingMap_WhenPageLoads_ThenShowsZeroPricesWithoutCrash', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test', email: 't@t.com' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['0_1_1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', eventDateTime: new Date().toISOString(), eventLocation: 'NYC' });
    (eventApi.getEventSeatingMap as any).mockResolvedValue(null);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getAllByText(/Show/).length).toBeGreaterThan(0));
    const zeroPrices = screen.getAllByText('$0.00');
    expect(zeroPrices.length).toBeGreaterThan(0);
  });

  it('GivenSeatingMapWithNoMatchingSeat_WhenRendered_ThenDefaultsToZeroPrice', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test', email: 't@t.com' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['0_1_1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', eventDateTime: new Date().toISOString() });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getAllByText(/Show/).length).toBeGreaterThan(0));
  });

  it('GivenOrderWithNoEventId_WhenPageLoads_ThenShowsNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({ orderId: 'o1', eventId: '', seatIds: [] });
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText('No Active Order Found')).toBeInTheDocument());
  });

  it('GivenEmptyStandingAreaQuantities_WhenRendered_ThenShowsEmptyOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test', email: 't@t.com' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: [], standingAreaQuantities: {}, createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', eventDateTime: new Date().toISOString() });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<ActiveOrderPage />);
    await waitFor(() => expect(screen.getByText(/order selection is currently empty/)).toBeInTheDocument());
  });
});

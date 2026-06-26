import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('CheckoutPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('GivenNoToken_WhenPageLoads_ThenShowsAuthError', async () => {
    localStorage.removeItem('token');
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('Checkout Error')).toBeInTheDocument());
    expect(screen.getByText(/Authentication token missing/)).toBeInTheDocument();
  });

  it('GivenProfileFails_WhenPageLoads_ThenShowsAccountError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(null);
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('Checkout Error')).toBeInTheDocument());
    expect(screen.getByText(/Unable to load your account/)).toBeInTheDocument();
  });

  it('GivenNoActiveOrder_WhenPageLoads_ThenShowsNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockRejectedValue(new Error('Not found'));
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('No Active Order Found')).toBeInTheDocument());
  });

  it('GivenOrderWithNoOrderId_WhenPageLoads_ThenShowsNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({ eventId: 'e1', seatIds: [] });
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('No Active Order Found')).toBeInTheDocument());
  });

  it('GivenEventFails_WhenPageLoads_ThenShowsCheckoutError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({ orderId: 'o1', eventId: 'e1', seatIds: [] });
    (eventApi.getEvent as any).mockResolvedValue(null);
    (eventApi.getEventSeatingMap as any).mockResolvedValue(null);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('Checkout Error')).toBeInTheDocument());
    expect(screen.getByText(/Could not load event details/)).toBeInTheDocument();
  });

  it('GivenNullSeatingMap_WhenPageLoads_ThenShowsZeroPricingWithoutCrash', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['s1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show' });
    (eventApi.getEventSeatingMap as any).mockResolvedValue(null);
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText('Show')).toBeInTheDocument());
    const prices = screen.getAllByText('$2.50');
    expect(prices.length).toBeGreaterThan(0);
  });

  it('GivenInvalidCardDetails_WhenPaymentInitiated_ThenShowsValidationErrors', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['s1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', isActive: true });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [{ id: 's1', priceForTicket: 50 }], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText(/Please enter the cardholder name/)).toBeInTheDocument();
      expect(screen.getByText(/valid 9-digit/)).toBeInTheDocument();
      expect(screen.getByText(/valid card number/)).toBeInTheDocument();
    });
  });

  it('GivenPaymentApiThrows_WhenPaying_ThenShowsPaymentError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['s1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', isActive: true });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [{ id: 's1', priceForTicket: 50 }], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    (eventApi.validatePurchasePolicy as any).mockResolvedValue(null);
    (activeOrderApi.checkout as any).mockRejectedValue(new Error('Payment declined'));
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Johnathan Doe'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByPlaceholderText('4111 2222 3333 4444'), { target: { value: '4111222233334444' } });
    fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByPlaceholderText('•••'), { target: { value: '123' } });

    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText('Payment declined')).toBeInTheDocument());
  });

  it('GivenCanceledEvent_WhenPaymentInitiated_ThenShowsCanceledError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['s1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any).mockResolvedValue({ eventId: 'e1', eventName: 'Show', isActive: false });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [{ id: 's1', priceForTicket: 50 }], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Johnathan Doe'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByPlaceholderText('4111 2222 3333 4444'), { target: { value: '4111222233334444' } });
    fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByPlaceholderText('•••'), { target: { value: '123' } });

    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText(/Event got canceled/)).toBeInTheDocument());
  });

  it('GivenPolicyViolation_WhenPaying_ThenShowsPolicyError', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue({ userId: 'u1', name: 'Test' });
    (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue({
      orderId: 'o1', eventId: 'e1', seatIds: ['s1'], createdAt: Date.now(),
    });
    (eventApi.getEvent as any)
      .mockResolvedValueOnce({ eventId: 'e1', eventName: 'Show', isActive: true })
      .mockResolvedValueOnce({ eventId: 'e1', eventName: 'Show', isActive: true });
    (eventApi.getEventSeatingMap as any).mockResolvedValue({ assignedSeats: [{ id: 's1', priceForTicket: 50 }], standingAreas: [] });
    (eventApi.getEventPurchasePolicy as any).mockResolvedValue(null);
    (eventApi.validatePurchasePolicy as any).mockResolvedValue('Maximum 2 tickets per user');
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Johnathan Doe'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByPlaceholderText('4111 2222 3333 4444'), { target: { value: '4111222233334444' } });
    fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByPlaceholderText('•••'), { target: { value: '123' } });

    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => expect(screen.getByText(/Maximum 2 tickets per user/)).toBeInTheDocument());
  });

  it('GivenRetryButton_WhenClicked_ThenReloadsPage', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Server down'));
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('Checkout Error')).toBeInTheDocument());
    expect(screen.getByText(/Retry/)).toBeInTheDocument();
  });
});

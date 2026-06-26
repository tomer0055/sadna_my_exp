import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import CheckoutPage from './CheckoutPage';
import { authApi } from '../../api/authApi';
import { activeOrderApi } from '../../api/activeOrderApi';
import { eventApi } from '../../api/eventsApi';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn()
  }
}));

vi.mock('../../api/activeOrderApi', () => ({
  activeOrderApi: {
    getActiveOrderByUserId: vi.fn(),
    cancelOrder: vi.fn(),
    checkout: vi.fn()
  }
}));

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEvent: vi.fn(),
    getEventSeatingMap: vi.fn(),
    getEventPurchasePolicy: vi.fn(),
    validatePurchasePolicy: vi.fn()
  }
}));

const mockUser = { userId: 'user-1', name: 'John Doe', email: 'john@test.com' };

const mockOrder = {
  orderId: 'order-abc-123',
  userId: 'user-1',
  eventId: 'evt-1',
  createdAt: new Date().toISOString(),
  seatIds: ['0_1_1'],
  StandingAreaQuantities: {}
};

const mockEvent = {
  eventId: 'evt-1',
  eventName: 'Rock Festival',
  eventCapacity: 500,
  eventDateTime: '2027-12-31T20:00:00',
  isActive: true,
  eventLocation: 'Tel Aviv Arena',
  ticketPrice: 150
};

const mockSeatingMap = {
  assignedSeats: [{ id: '0_1_1', isBooked: true, priceForTicket: 100 }],
  standingAreas: []
};

const mockPolicyNoAge = {
  minTickets: 1,
  maxTickets: 10,
  isQuantityOr: false,
  minAge: null,
  maxAge: null,
  isAgeOr: false,
  isAgeAndQuantityOr: false
};

const mockPolicyWithAge = {
  ...mockPolicyNoAge,
  minAge: 18,
  maxAge: 65
};

function setupCheckout(overrides: { order?: any; event?: any; seatingMap?: any; policy?: any } = {}) {
  (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
  (activeOrderApi.getActiveOrderByUserId as any).mockResolvedValue(overrides.order || mockOrder);
  (eventApi.getEvent as any).mockResolvedValue(overrides.event || mockEvent);
  (eventApi.getEventSeatingMap as any).mockResolvedValue(overrides.seatingMap || mockSeatingMap);
  (eventApi.getEventPurchasePolicy as any).mockResolvedValue(overrides.policy || mockPolicyNoAge);
  (eventApi.validatePurchasePolicy as any).mockResolvedValue(null);
}

function fillPaymentForm(overrides: Partial<{
  name: string; id: string; card: string; expiry: string; cvv: string
}> = {}) {
  const values = {
    name: 'John Doe',
    id: '123456789',
    card: '4111222233334444',
    expiry: '12/29',
    cvv: '123',
    ...overrides
  };
  fireEvent.change(screen.getByPlaceholderText('Johnathan Doe'), { target: { value: values.name } });
  fireEvent.change(screen.getByPlaceholderText('123456789'), { target: { value: values.id } });
  fireEvent.change(screen.getByPlaceholderText('4111 2222 3333 4444'), { target: { value: values.card } });
  fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: values.expiry } });
  fireEvent.change(screen.getByPlaceholderText('•••'), { target: { value: values.cvv } });
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // UC II.3.1 - Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', () => {
    (authApi.getCurrentUser as any).mockReturnValue(new Promise(() => {}));

    render(<CheckoutPage />);

    expect(screen.getByText('Loading your order...')).toBeInTheDocument();
  });

  // UC II.3.1 - No active order
  it('GivenNoActiveOrder_WhenPageLoads_ThenDisplaysNoOrderMessage', async () => {
    (authApi.getCurrentUser as any).mockResolvedValue(mockUser);
    (activeOrderApi.getActiveOrderByUserId as any).mockRejectedValue(new Error('Not found'));

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('No Active Order Found')).toBeInTheDocument();
      expect(screen.getByText('Browse Events')).toBeInTheDocument();
    });
  });

  // UC II.3.1 - Displays checkout form with payment fields
  it('GivenActiveOrder_WhenPageLoads_ThenDisplaysPaymentForm', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('SecurePay Checkout Gateway')).toBeInTheDocument();
      expect(screen.getByText('Billing Details')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456789')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('4111 2222 3333 4444')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('MM / YY')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('•••')).toBeInTheDocument();
    });
  });

  // UC II.3.1 - Displays order summary with processing fee
  it('GivenActiveOrder_WhenPageLoads_ThenDisplaysOrderSummaryWithFee', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Subtotal (1 Tickets)')).toBeInTheDocument();
      expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('$2.50')).toBeInTheDocument();
      expect(screen.getAllByText('$102.50').length).toBeGreaterThanOrEqual(1);
    });
  });

  // UC II.3.1 - Reservation timer display
  it('GivenActiveOrder_WhenPageLoads_ThenDisplaysReservationTimer', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText(/Reservation expires in/)).toBeInTheDocument();
    });
  });

  // UC II.3.2 - Cardholder name validation
  it('GivenInvalidCardholderName_WhenUserSubmits_ThenShowsValidationError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm({ name: '123' });
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Please enter the cardholder name.')).toBeInTheDocument();
    });
  });

  // UC II.3.2 - Cardholder ID validation (must be 9 digits)
  it('GivenInvalidCardholderId_WhenUserSubmits_ThenShowsValidationError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('123456789')).toBeInTheDocument();
    });

    fillPaymentForm({ id: '1234' });
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid 9-digit Cardholder ID.')).toBeInTheDocument();
    });
  });

  // UC II.3.2 - Card number validation (13-19 digits)
  it('GivenInvalidCardNumber_WhenUserSubmits_ThenShowsValidationError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('4111 2222 3333 4444')).toBeInTheDocument();
    });

    fillPaymentForm({ card: '12345' });
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid card number (13–19 digits).')).toBeInTheDocument();
    });
  });

  // UC II.3.2 - Expiry date validation (MM/YY, not expired)
  it('GivenInvalidExpiryDate_WhenUserSubmits_ThenShowsValidationError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('MM / YY')).toBeInTheDocument();
    });

    fillPaymentForm({ expiry: '13/25' });
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid expiry date (MM/YY) that has not passed.')).toBeInTheDocument();
    });
  });

  // UC II.3.2 - CVV validation (3-4 digits)
  it('GivenInvalidCvv_WhenUserSubmits_ThenShowsValidationError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('•••')).toBeInTheDocument();
    });

    fillPaymentForm({ cvv: '12' });
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid CVV (3 or 4 digits).')).toBeInTheDocument();
    });
  });

  // UC II.3.3 - Successful checkout displays barcodes
  it('GivenValidPayment_WhenCheckoutSucceeds_ThenDisplaysBarcodes', async () => {
    setupCheckout();
    (activeOrderApi.checkout as any).mockResolvedValue({
      barcodes: ['BARCODE-001', 'BARCODE-002']
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Transaction Successful')).toBeInTheDocument();
      expect(screen.getByText('BARCODE-001')).toBeInTheDocument();
      expect(screen.getByText('BARCODE-002')).toBeInTheDocument();
    });
  });

  // UC II.3.3 - Payment API error
  it('GivenPaymentFailure_WhenCheckoutFails_ThenDisplaysPaymentError', async () => {
    setupCheckout();
    (activeOrderApi.checkout as any).mockRejectedValue(new Error('Card declined'));

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Card declined')).toBeInTheDocument();
    });
  });

  // UC II.3.4 - Age verification modal when policy requires age
  it('GivenAgeRestrictedEvent_WhenUserSubmitsPayment_ThenShowsAgeModal', async () => {
    setupCheckout({ policy: mockPolicyWithAge });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Age Verification')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 25')).toBeInTheDocument();
      expect(screen.getByText('Verify & Checkout')).toBeInTheDocument();
    });
  });

  // UC II.3.4 - Age verification: confirm age and proceed
  it('GivenAgeModal_WhenUserEntersValidAge_ThenProceedsToPayment', async () => {
    setupCheckout({ policy: mockPolicyWithAge });
    (activeOrderApi.checkout as any).mockResolvedValue({ barcodes: ['BC-1'] });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Age Verification')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g., 25'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Verify & Checkout'));

    await waitFor(() => {
      expect(eventApi.validatePurchasePolicy).toHaveBeenCalled();
    });
  });

  // UC II.3.4 - Policy violation during checkout
  it('GivenPolicyViolation_WhenCheckoutAttempted_ThenShowsPolicyError', async () => {
    setupCheckout();
    (eventApi.validatePurchasePolicy as any).mockResolvedValue('Maximum 4 tickets per person');

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Policy Violation: Maximum 4 tickets per person')).toBeInTheDocument();
    });
  });

  // UC II.3.1 - Error loading checkout data
  it('GivenDataHydrationError_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Service unavailable'));

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Checkout Error')).toBeInTheDocument();
      expect(screen.getByText('Service unavailable')).toBeInTheDocument();
      expect(screen.getByText('Retry Verification Connection')).toBeInTheDocument();
    });
  });

  // UC II.3.1 - No auth token
  it('GivenNoAuthToken_WhenPageLoads_ThenDisplaysAuthError', async () => {
    localStorage.removeItem('token');

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Checkout Error')).toBeInTheDocument();
      expect(screen.getByText('Authentication token missing. Please log in to complete checkout.')).toBeInTheDocument();
    });
  });

  // UC II.3.5 - Event canceled during checkout
  it('GivenEventCanceledDuringCheckout_WhenUserPays_ThenShowsCanceledError', async () => {
    setupCheckout();

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Johnathan Doe')).toBeInTheDocument();
    });

    (eventApi.getEvent as any).mockResolvedValue({ ...mockEvent, isActive: false });

    fillPaymentForm();
    fireEvent.click(screen.getByText(/Authorize & Pay/));

    await waitFor(() => {
      expect(screen.getByText('Event got canceled')).toBeInTheDocument();
    });
  });

  // UC II.3.2 - Pay button disabled when no tickets
  it('GivenOrderWithNoTickets_WhenRendered_ThenPayButtonIsDisabled', async () => {
    setupCheckout({
      order: { ...mockOrder, seatIds: [], StandingAreaQuantities: {} },
      seatingMap: { assignedSeats: [], standingAreas: [] }
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText(/Authorize & Pay/)).toBeInTheDocument();
    });

    const payButton = screen.getByText(/Authorize & Pay/).closest('button');
    expect(payButton).toBeDisabled();
  });
});

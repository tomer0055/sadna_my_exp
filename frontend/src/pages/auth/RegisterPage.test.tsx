import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RegisterPage from './RegisterPage';
import { authApi } from '../../api/authApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../assets/Logo.png', () => ({ default: 'logo-mock-path' }));

vi.mock('../../api/authApi', () => ({
  authApi: {
    guestEntry: vi.fn(),
    register: vi.fn()
  }
}));

function fillForm(overrides: Partial<{ name: string; userId: string; email: string; password: string }> = {}) {
  const values = {
    name: 'John Doe',
    userId: 'johndoe123',
    email: 'john@example.com',
    password: 'Pass123',
    ...overrides
  };
  fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: values.name } });
  fireEvent.change(screen.getByPlaceholderText('johndoe123'), { target: { value: values.userId } });
  fireEvent.change(screen.getByPlaceholderText('name@event.com'), { target: { value: values.email } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: values.password } });
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: /generate ticket/i }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authApi.guestEntry as any).mockResolvedValue({ token: 'guest-token-123' });
    (authApi.register as any).mockResolvedValue({ message: 'Registration successful' });
  });

  // UC II.1.3 - Happy path: successful registration navigates to login
  it('GivenValidFormData_WhenUserSubmitsRegistration_ThenNavigatesToLoginPage', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm();
    submitForm();

    await waitFor(() => {
      expect(authApi.guestEntry).toHaveBeenCalledTimes(1);
      expect(authApi.register).toHaveBeenCalledWith('guest-token-123', {
        userId: 'johndoe123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass123',
        userGroupDiscount: 'NONE'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // UC II.1.3 - Name validation: rejects names with numbers/special chars
  it('GivenNameWithNumbers_WhenUserSubmits_ThenDisplaysNameValidationError', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm({ name: 'John123' });
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText("Full name must contain only letters, spaces, hyphens, or apostrophes.")
      ).toBeInTheDocument();
    });
    expect(authApi.guestEntry).not.toHaveBeenCalled();
  });

  // UC II.1.3 - Name validation: allows hyphens and apostrophes
  it('GivenNameWithHyphensAndApostrophes_WhenUserSubmits_ThenAcceptsTheName', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm({ name: "Mary-Jane O'Brien" });
    submitForm();

    await waitFor(() => {
      expect(authApi.guestEntry).toHaveBeenCalled();
    });
  });

  // UC II.1.3 - ID validation: rejects email as userId
  it('GivenEmailAsAccountId_WhenUserSubmits_ThenDisplaysIdValidationError', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm({ userId: 'john@email.com' });
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText("Account ID should be a unique username/identifier, not an email.")
      ).toBeInTheDocument();
    });
    expect(authApi.guestEntry).not.toHaveBeenCalled();
  });

  // UC II.1.3 - Backend error: duplicate user
  it('GivenDuplicateUserId_WhenBackendRejects_ThenDisplaysCleanedErrorMessage', async () => {
    (authApi.register as any).mockRejectedValue(
      new Error('java.lang.RuntimeException: User already exists')
    );

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });
  });

  // UC II.1.3 - Backend error: guest token failure
  it('GivenGuestEntryFails_WhenUserSubmits_ThenDisplaysErrorMessage', async () => {
    (authApi.guestEntry as any).mockRejectedValue(new Error('Service unavailable'));

    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    });
  });

  // UC II.1.3 - UI: form renders all required fields
  it('GivenRegisterPage_WhenRendered_ThenDisplaysAllFormFields', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('johndoe123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@event.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate ticket/i })).toBeInTheDocument();
  });

  // UC II.1.3 - UI: has link to login page
  it('GivenRegisterPage_WhenRendered_ThenDisplaysSignInLink', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  // UC II.1.3 - Trims whitespace from inputs before sending
  it('GivenInputsWithWhitespace_WhenUserSubmits_ThenTrimsValuesBeforeSending', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fillForm({ userId: '  johndoe  ', name: '  John Doe  ', email: '  john@test.com  ' });
    submitForm();

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith('guest-token-123', expect.objectContaining({
        userId: 'johndoe',
        name: 'John Doe',
        email: 'john@test.com'
      }));
    });
  });
});

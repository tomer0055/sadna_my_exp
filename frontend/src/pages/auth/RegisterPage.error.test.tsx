import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    guestEntry: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('../../assets/Logo.png', () => ({ default: 'logo.png' }));

import RegisterPage from './RegisterPage';
import { authApi } from '../../api/authApi';

function fillForm(overrides: Record<string, string> = {}) {
  fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: overrides.name ?? 'John Doe' } });
  fireEvent.change(screen.getByPlaceholderText('johndoe123'), { target: { value: overrides.userId ?? 'johndoe123' } });
  fireEvent.change(screen.getByPlaceholderText('name@event.com'), { target: { value: overrides.email ?? 'j@e.com' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: overrides.password ?? 'pass1234' } });
}

describe('RegisterPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authApi.guestEntry as any).mockResolvedValue({ token: 'guest-tok' });
  });

  it('GivenInvalidName_WhenSubmitted_ThenShowsNameValidationError', async () => {
    render(<RegisterPage />);
    fillForm({ name: 'John123' });
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(screen.getByText(/only letters, spaces, hyphens/i)).toBeInTheDocument());
  });

  it('GivenEmailAsUserId_WhenSubmitted_ThenShowsIdValidationError', async () => {
    render(<RegisterPage />);
    fillForm({ userId: 'user@email.com' });
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(screen.getByText(/should be a unique username/i)).toBeInTheDocument());
  });

  it('GivenGuestTokenFails_WhenSubmitted_ThenShowsError', async () => {
    (authApi.guestEntry as any).mockRejectedValue(new Error('Service unavailable'));
    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(screen.getByText('Service unavailable')).toBeInTheDocument());
  });

  it('GivenUserAlreadyExists_WhenSubmitted_ThenShowsBackendError', async () => {
    (authApi.register as any).mockRejectedValue(new Error('User already exists'));
    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(screen.getByText('User already exists')).toBeInTheDocument());
  });

  it('GivenJavaException_WhenSubmitted_ThenStripsExceptionPrefix', async () => {
    (authApi.register as any).mockRejectedValue(new Error('java.lang.RuntimeException: Email already in use'));
    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
  });

  it('GivenRegistrationSucceeds_WhenSubmitted_ThenNavigatesToLogin', async () => {
    (authApi.register as any).mockResolvedValue({ success: true });
    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });

  it('GivenSpecialCharsInName_WhenSubmitted_ThenAllowsHyphensAndApostrophes', async () => {
    (authApi.register as any).mockResolvedValue({ success: true });
    render(<RegisterPage />);
    fillForm({ name: "O'Brien-Smith" });
    fireEvent.click(screen.getByText('GENERATE TICKET'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText(/only letters/i)).not.toBeInTheDocument();
  });

  it('GivenPageRendered_WhenViewed_ThenShowsPasswordRequirements', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/at least 7 characters/i)).toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import LoginPage from './LoginPage';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../assets/Logo.png', () => ({
  default: 'logo-mock-path'
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    login: vi.fn()
  }
}));

function fillAndSubmit(userId = 'testuser', password = 'password123') {
  fireEvent.change(screen.getByPlaceholderText('johndoe123'), { target: { value: userId } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginPage', () => {
  const mockEnsureGuestToken = vi.fn();
  const mockLoginWithToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      isMember: false,
      loading: false,
      ensureGuestToken: mockEnsureGuestToken,
      loginWithToken: mockLoginWithToken
    });

    mockEnsureGuestToken.mockResolvedValue('guest-token-abc');

    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true
    });
  });

  // UC II.1.4 - Happy path: successful login navigates to dashboard
  it('GivenValidCredentials_WhenUserSubmitsLogin_ThenNavigatesToDashboard', async () => {
    (authApi.login as any).mockResolvedValue({ token: 'member-token', userId: 'testuser' });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit();

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('guest-token-abc', {
        userId: 'testuser',
        password: 'password123'
      });
      expect(mockLoginWithToken).toHaveBeenCalledWith('member-token', 'testuser');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  // UC II.1.4 - Invalid credentials error
  it('GivenInvalidCredentials_WhenBackendRejects_ThenDisplaysInvalidCredentialsMessage', async () => {
    (authApi.login as any).mockRejectedValue(new Error('Invalid user ID or password'));

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('Invalid user ID or password')).toBeInTheDocument();
    });
  });

  // UC II.1.4 - User not found error
  it('GivenNonExistentUser_WhenBackendRejects_ThenDisplaysInvalidCredentialsMessage', async () => {
    (authApi.login as any).mockRejectedValue(new Error('User not found'));

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit('nonexistent', 'pass123');

    await waitFor(() => {
      expect(screen.getByText('Invalid user ID or password')).toBeInTheDocument();
    });
  });

  // UC II.1.4 - Server error sanitization (Java exceptions)
  it('GivenServerError_WhenBackendThrowsJavaException_ThenDisplaysSanitizedMessage', async () => {
    (authApi.login as any).mockRejectedValue(
      new Error('java.lang.NullPointerException: something broke')
    );

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByText('The authentication server is having trouble. Please try again later.')
      ).toBeInTheDocument();
    });
  });

  // UC II.1.4 - Already authenticated: redirects to dashboard
  it('GivenAlreadyLoggedIn_WhenLoginPageLoads_ThenRedirectsToDashboard', () => {
    (useAuth as any).mockReturnValue({
      isMember: true,
      loading: false,
      ensureGuestToken: mockEnsureGuestToken,
      loginWithToken: mockLoginWithToken
    });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

  // UC II.1.4 - Loading state: renders nothing while auth loads
  it('GivenAuthLoading_WhenLoginPageLoads_ThenRendersNothing', () => {
    (useAuth as any).mockReturnValue({
      isMember: false,
      loading: true,
      ensureGuestToken: mockEnsureGuestToken,
      loginWithToken: mockLoginWithToken
    });

    const { container } = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  // UC II.1.4 - UI: form renders all expected elements
  it('GivenLoginPage_WhenRendered_ThenDisplaysAllFormElements', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByPlaceholderText('johndoe123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register here/i })).toHaveAttribute('href', '/register');
  });

  // UC II.1.4 - Trims userId whitespace before sending
  it('GivenUserIdWithWhitespace_WhenUserSubmits_ThenTrimsBeforeSending', async () => {
    (authApi.login as any).mockResolvedValue({ token: 'tok', userId: 'testuser' });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit('  testuser  ', 'pass123');

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('guest-token-abc', {
        userId: 'testuser',
        password: 'pass123'
      });
    });
  });

  // Existing offline test
  it('GivenOfflineNetwork_WhenUserAttemptsLogin_ThenDisplaysConnectivityErrorMessage', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
      configurable: true
    });

    mockEnsureGuestToken.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByText('No internet connection. Please check your Wi-Fi or mobile data and try again.')
      ).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  Navigate: ({ to }: any) => <div data-testid="redirect">{to}</div>,
  useNavigate: () => mockNavigate,
}));

const mockAuth = {
  isMember: false,
  loading: false,
  ensureGuestToken: vi.fn(),
  loginWithToken: vi.fn(),
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../api/authApi', () => ({
  authApi: { login: vi.fn() },
}));

vi.mock('../../assets/Logo.png', () => ({ default: 'logo.png' }));

import LoginPage from './LoginPage';
import { authApi } from '../../api/authApi';

function fillAndSubmit(userId = 'testuser', password = 'pass123') {
  fireEvent.change(screen.getByPlaceholderText('johndoe123'), { target: { value: userId } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } });
  fireEvent.click(screen.getByText('SIGN IN'));
}

describe('LoginPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isMember = false;
    mockAuth.loading = false;
    mockAuth.ensureGuestToken.mockResolvedValue('guest-token');
  });

  it('GivenAlreadyAuthenticated_WhenPageLoads_ThenRedirectsToDashboard', () => {
    mockAuth.isMember = true;
    render(<LoginPage />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/dashboard');
  });

  it('GivenAuthLoading_WhenPageLoads_ThenRendersNothing', () => {
    mockAuth.loading = true;
    const { container } = render(<LoginPage />);
    expect(container.innerHTML).toBe('');
  });

  it('GivenInvalidCredentials_WhenSubmitted_ThenShowsAuthError', async () => {
    (authApi.login as any).mockRejectedValue(new Error('Invalid user ID or password'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Invalid user ID or password')).toBeInTheDocument());
  });

  it('GivenUserNotFound_WhenSubmitted_ThenShowsSanitizedAuthError', async () => {
    (authApi.login as any).mockRejectedValue(new Error('User not found'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Invalid user ID or password')).toBeInTheDocument());
  });

  it('GivenNetworkOffline_WhenSubmitted_ThenShowsOfflineError', async () => {
    (authApi.login as any).mockRejectedValue(new Error('Failed to fetch'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/No internet connection/i)).toBeInTheDocument());
  });

  it('GivenJavaException_WhenSubmitted_ThenShowsSanitizedServerError', async () => {
    (authApi.login as any).mockRejectedValue(new Error('java.lang.NullPointerException: Something broke'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/authentication server is having trouble/i)).toBeInTheDocument());
  });

  it('GivenInternalServerError_WhenSubmitted_ThenShowsSanitizedServerError', async () => {
    (authApi.login as any).mockRejectedValue(new Error('Internal Server Error'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/authentication server is having trouble/i)).toBeInTheDocument());
  });

  it('GivenGuestTokenFails_WhenSubmitted_ThenShowsFallbackError', async () => {
    mockAuth.ensureGuestToken.mockRejectedValue(new Error('Service unavailable'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Service unavailable')).toBeInTheDocument());
  });

  it('GivenUnknownError_WhenSubmitted_ThenShowsRawMessage', async () => {
    (authApi.login as any).mockRejectedValue(new Error('Rate limit exceeded'));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument());
  });

  it('GivenPageRendered_WhenViewed_ThenShowsNavigationLinks', () => {
    render(<LoginPage />);
    expect(screen.getByText('Register here')).toBeInTheDocument();
    expect(screen.getByText('Lost Access?')).toBeInTheDocument();
  });

  it('GivenLoginSucceeds_WhenSubmitted_ThenNavigatesToDashboard', async () => {
    (authApi.login as any).mockResolvedValue({ token: 'tok', userId: 'u1' });
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getPermissions: vi.fn(),
    getCurrentUser: vi.fn(),
    editPassword: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock('../../utils/errorUtils', () => ({
  getUserFriendlyError: (e: any) => e?.message || 'Unknown error',
}));

import AccountSettingsPage from './AccountSettingsPage';
import { authApi } from '../../api/authApi';

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountSettingsPage />
    </MemoryRouter>
  );
}

describe('AccountSettingsPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenNoToken_WhenPageLoads_ThenShowsGuestViewWithoutCrash', async () => {
    localStorage.removeItem('token');
    renderPage();
    await waitFor(() => expect(screen.getByText('Guest Identity')).toBeInTheDocument());
    expect(screen.getByText('Public Visitor')).toBeInTheDocument();
  });

  it('GivenApiFails_WhenLoadingProfile_ThenFallsBackToGuestView', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockRejectedValue(new Error('Server error'));
    (authApi.getCurrentUser as any).mockRejectedValue(new Error('Server error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Guest Identity')).toBeInTheDocument());
  });

  it('GivenPasswordMismatch_WhenSaving_ThenShowsValidationError', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Edit Details'));

    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'newpass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'different' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText(/do not match/)).toBeInTheDocument());
  });

  it('GivenIncompletePasswordFields_WhenSaving_ThenShowsValidationError', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'oldpass' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText(/Complete all password fields/)).toBeInTheDocument());
  });

  it('GivenPasswordApiFails_WhenSaving_ThenShowsServerError', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    (authApi.editPassword as any).mockRejectedValue(new Error('Old password does not match current password'));
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'newpass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'newpass1' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText(/Current password is incorrect/)).toBeInTheDocument());
  });

  it('GivenProfileUpdateFails_WhenSaving_ThenShowsError', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    (authApi.updateProfile as any).mockRejectedValue(new Error('Invalid email format'));
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getAllByText(/valid email address/).length).toBeGreaterThan(0));
  });

  it('GivenCancelClicked_WhenEditing_ThenRevertsChanges', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Edit Details'));
    const usernameInput = screen.getByDisplayValue('John');
    fireEvent.change(usernameInput, { target: { value: 'Changed' } });

    fireEvent.click(screen.getAllByText('Cancel')[0]);

    expect(screen.queryByDisplayValue('Changed')).not.toBeInTheDocument();
  });

  it('GivenLogoutFails_WhenClicked_ThenStillClearsLocalStorage', async () => {
    localStorage.setItem('token', 'tok');
    (authApi.getPermissions as any).mockResolvedValue({ isAdmin: false, userId: 'u1' });
    (authApi.getCurrentUser as any).mockResolvedValue({ name: 'John', email: 'j@test.com' });
    (authApi.logout as any).mockRejectedValue(new Error('Server unreachable'));
    renderPage();

    await waitFor(() => expect(screen.getAllByText('John').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByTitle('Logout'));

    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
  });
});

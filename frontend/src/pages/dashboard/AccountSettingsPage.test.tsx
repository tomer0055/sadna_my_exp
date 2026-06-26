import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AccountSettingsPage from './AccountSettingsPage';
import { authApi } from '../../api/authApi';

vi.mock('../../api/authApi', () => ({
  authApi: {
    getPermissions: vi.fn(),
    getCurrentUser: vi.fn(),
    editPassword: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('../../utils/errorUtils', () => ({
  getUserFriendlyError: (err: any) => err?.message || err?.error || String(err)
}));

const mockPermissions = {
  isAdmin: false,
  isMember: true,
  userId: 'user-1',
  productionRoles: {}
};

const mockProfile = {
  name: 'Alice', email: 'alice@test.com', userId: 'user-1'
};

function setupMember() {
  (authApi.getPermissions as any).mockResolvedValue(mockPermissions);
  (authApi.getCurrentUser as any).mockResolvedValue(mockProfile);
}

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', () => {
    (authApi.getPermissions as any).mockReturnValue(new Promise(() => {}));
    (authApi.getCurrentUser as any).mockReturnValue(new Promise(() => {}));

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    expect(screen.getByText('Loading configuration settings...')).toBeInTheDocument();
  });

  // Guest view
  it('GivenNoToken_WhenPageLoads_ThenDisplaysGuestView', async () => {
    localStorage.removeItem('token');

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Guest Identity')).toBeInTheDocument();
      expect(screen.getByText('Public Visitor')).toBeInTheDocument();
    });
  });

  // Member view displays profile
  it('GivenLoggedInMember_WhenPageLoads_ThenDisplaysProfileInfo', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    const usernameInput = screen.getByDisplayValue('Alice');
    expect(usernameInput).toBeInTheDocument();

    const emailInput = screen.getByDisplayValue('alice@test.com');
    expect(emailInput).toBeInTheDocument();
  });

  // Edit mode toggle
  it('GivenViewMode_WhenEditDetailsClicked_ThenEnablesEditing', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    expect(screen.getAllByText('Cancel').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Current Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
  });

  // Cancel reverts changes
  it('GivenEditMode_WhenCancelClicked_ThenRevertsToViewMode', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    const usernameInput = screen.getByDisplayValue('Alice');
    fireEvent.change(usernameInput, { target: { value: 'Bob' } });

    // Click the Cancel in the footer
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(screen.getByText('Edit Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  // Save profile successfully
  it('GivenValidProfileChanges_WhenSaveClicked_ThenDisplaysSuccessMessage', async () => {
    setupMember();
    (authApi.updateProfile as any).mockResolvedValue({});

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    const usernameInput = screen.getByDisplayValue('Alice');
    fireEvent.change(usernameInput, { target: { value: 'Alice Updated', id: 'input-username' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Changes saved')).toBeInTheDocument();
      expect(screen.getByText('Your account changes were saved.')).toBeInTheDocument();
    });
  });

  // Password mismatch validation
  it('GivenMismatchedPasswords_WhenSaveClicked_ThenShowsValidationError', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'newpass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'different' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument();
    });
  });

  // Incomplete password fields
  it('GivenPartialPasswordFields_WhenSaveClicked_ThenShowsValidationError', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'oldpass' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Complete all password fields to update your password.')).toBeInTheDocument();
    });
  });

  // API error on save
  it('GivenApiError_WhenSaveClicked_ThenDisplaysErrorMessage', async () => {
    setupMember();
    (authApi.updateProfile as any).mockRejectedValue(new Error('Invalid email format'));

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText("Couldn't save changes")).toBeInTheDocument();
      expect(screen.getAllByText('Enter a valid email address.').length).toBeGreaterThanOrEqual(1);
    });
  });

  // Verified member badge
  it('GivenLoggedInMember_WhenPageLoads_ThenDisplaysVerifiedMemberBadge', async () => {
    setupMember();

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Verified Member')).toBeInTheDocument();
    });
  });

  // Password change calls editPassword API
  it('GivenValidPasswordChange_WhenSaveClicked_ThenCallsEditPasswordApi', async () => {
    setupMember();
    (authApi.editPassword as any).mockResolvedValue({});
    (authApi.updateProfile as any).mockResolvedValue({});

    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    fireEvent.change(screen.getByPlaceholderText('Current Password'), { target: { value: 'oldpass123' } });
    fireEvent.change(screen.getByPlaceholderText('New Password'), { target: { value: 'newpass456' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), { target: { value: 'newpass456' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(authApi.editPassword).toHaveBeenCalledWith('test-token', {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456'
      });
    });
  });
});

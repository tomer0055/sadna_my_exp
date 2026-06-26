import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MyCompaniesPage from './MyCompaniesPage';
import * as api from '../../api/productionCompanyApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../api/productionCompanyApi', () => ({
  getMyCompanies: vi.fn(),
  getPendingAppointments: vi.fn(),
  createCompany: vi.fn(),
  acceptAppointment: vi.fn(),
  denyAppointment: vi.fn(),
}));

vi.mock('../../api/authApi', () => ({
  authApi: { logout: vi.fn() },
}));

const mockCompanies: api.CompanySummary[] = [
  { companyId: 1, companyName: 'Acme Events', companyDescription: 'Event production', companyEmail: 'acme@test.com', role: 'FOUNDER' },
  { companyId: 2, companyName: 'Beta Corp', companyDescription: 'Beta stuff', companyEmail: 'beta@test.com', role: 'OWNER' },
];

const mockPending: api.PendingAppointment[] = [
  { companyId: 10, companyName: 'Gamma LLC', role: 'OWNER', appointerId: 'alice', permissions: [] },
  { companyId: 11, companyName: 'Delta Inc', role: 'MANAGER', appointerId: 'bob', permissions: ['INVENTORY_MANAGEMENT'] },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MyCompaniesPage />
    </MemoryRouter>
  );
}

describe('MyCompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user42');
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenShowsLoadingIndicator', () => {
    (api.getMyCompanies as any).mockReturnValue(new Promise(() => {}));
    (api.getPendingAppointments as any).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('LOADING YOUR COMPANIES...')).toBeInTheDocument();
  });

  // Error state
  it('GivenApiFails_WhenDataLoads_ThenShowsErrorMessage', async () => {
    (api.getMyCompanies as any).mockRejectedValue(new Error('Network error'));
    (api.getPendingAppointments as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('RETURN TO LOGIN')).toBeInTheDocument();
  });

  // Empty state
  it('GivenNoCompanies_WhenDataLoads_ThenShowsEmptyState', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No companies yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Create your first production company to get started.')).toBeInTheDocument();
  });

  // Data display
  it('GivenCompaniesExist_WhenDataLoads_ThenDisplaysCompanyCards', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Events')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta Corp')).toBeInTheDocument();
    expect(screen.getByText('Event production')).toBeInTheDocument();
    expect(screen.getByText('acme@test.com')).toBeInTheDocument();
    expect(screen.getByText('FOUNDER')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
  });

  // Company count in header
  it('GivenCompaniesExist_WhenDataLoads_ThenShowsCompanyCount', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/2 companies/)).toBeInTheDocument();
    });
  });

  // Navigate to company detail
  it('GivenCompanyCard_WhenClicked_ThenNavigatesToCompanyPage', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Events')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Acme Events'));
    expect(mockNavigate).toHaveBeenCalledWith('/production-company/1');
  });

  // Create company modal opens
  it('GivenNewCompanyButton_WhenClicked_ThenOpensCreateModal', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No companies yet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CREATE COMPANY'));
    expect(screen.getByText('CREATE NEW COMPANY')).toBeInTheDocument();
  });

  // Create company form submission
  it('GivenCreateForm_WhenSubmitted_ThenCallsApiAndNavigates', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    (api.createCompany as any).mockResolvedValue({ message: 'ok', companyId: '99' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No companies yet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CREATE COMPANY'));

    fireEvent.change(screen.getByPlaceholderText('e.g. Awesome Events Co.'), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByPlaceholderText('What does your company do?'), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByPlaceholderText('contact@company.com'), { target: { value: 'new@co.com' } });

    fireEvent.submit(screen.getByText('CREATE COMPANY', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(api.createCompany).toHaveBeenCalledWith('New Co', 'Desc', 'new@co.com');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/production-company/99');
    });
  });

  // Create company error
  it('GivenCreateApiFails_WhenFormSubmitted_ThenShowsError', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    (api.createCompany as any).mockRejectedValue(new Error('Name taken'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No companies yet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CREATE COMPANY'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Awesome Events Co.'), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText('What does your company do?'), { target: { value: 'Y' } });
    fireEvent.change(screen.getByPlaceholderText('contact@company.com'), { target: { value: 'x@y.com' } });
    fireEvent.submit(screen.getByText('CREATE COMPANY', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(screen.getByText('Name taken')).toBeInTheDocument();
    });
  });

  // Pending appointments displayed
  it('GivenPendingAppointments_WhenDataLoads_ThenDisplaysAppointmentRequests', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue(mockPending);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Appointment Requests')).toBeInTheDocument();
    });
    expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    expect(screen.getByText('Delta Inc')).toBeInTheDocument();
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/INVENTORY MANAGEMENT/)).toBeInTheDocument();
  });

  // Accept appointment
  it('GivenPendingAppointment_WhenAcceptClicked_ThenCallsAcceptApi', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([mockPending[0]]);
    (api.acceptAppointment as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ACCEPT'));
    await waitFor(() => {
      expect(api.acceptAppointment).toHaveBeenCalledWith(10);
    });
  });

  // Deny appointment
  it('GivenPendingAppointment_WhenDenyClicked_ThenCallsDenyApi', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([mockPending[0]]);
    (api.denyAppointment as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('DENY'));
    await waitFor(() => {
      expect(api.denyAppointment).toHaveBeenCalledWith(10);
    });
  });

  // Logout
  it('GivenLogoutButton_WhenClicked_ThenNavigatesToLogin', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Events')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('LOGOUT'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // Profile navigation
  it('GivenProfileButton_WhenClicked_ThenNavigatesToProfile', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Events')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('MY PROFILE'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  // Close create modal
  it('GivenCreateModalOpen_WhenCloseClicked_ThenModalCloses', async () => {
    (api.getMyCompanies as any).mockResolvedValue(mockCompanies);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Events')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('NEW COMPANY'));
    expect(screen.getByText('CREATE NEW COMPANY')).toBeInTheDocument();
    // Click the close button (the one inside the modal header)
    const closeButtons = screen.getAllByText('close');
    fireEvent.click(closeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText('CREATE NEW COMPANY')).not.toBeInTheDocument();
    });
  });
});

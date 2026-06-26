import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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

import MyCompaniesPage from './MyCompaniesPage';
import * as api from '../../api/productionCompanyApi';

describe('MyCompaniesPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'tok');
    localStorage.setItem('userId', 'u1');
  });

  it('GivenApiFails_WhenLoadingCompanies_ThenShowsErrorMessage', async () => {
    (api.getMyCompanies as any).mockRejectedValue(new Error('Unauthorized'));
    (api.getPendingAppointments as any).mockRejectedValue(new Error('Unauthorized'));
    render(<MyCompaniesPage />);
    await waitFor(() => expect(screen.getByText('Unauthorized')).toBeInTheDocument());
    expect(screen.getByText('RETURN TO LOGIN')).toBeInTheDocument();
  });

  it('GivenNoCompanies_WhenPageLoads_ThenShowsEmptyState', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    render(<MyCompaniesPage />);
    await waitFor(() => expect(screen.getByText('MY COMPANIES')).toBeInTheDocument());
    expect(screen.getByText('No companies yet')).toBeInTheDocument();
  });

  it('GivenCompaniesExist_WhenPageLoads_ThenShowsCompanyCards', async () => {
    (api.getMyCompanies as any).mockResolvedValue([
      { companyId: 1, companyName: 'Test Co', role: 'FOUNDER' },
    ]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    render(<MyCompaniesPage />);
    await waitFor(() => expect(screen.getByText('Test Co')).toBeInTheDocument());
    expect(screen.getByText('FOUNDER')).toBeInTheDocument();
  });

  it('GivenPendingAppointment_WhenAcceptFails_ThenShowsActionError', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([
      { companyId: 2, companyName: 'Invite Co', role: 'MANAGER', appointerId: 'boss', permissions: [] },
    ]);
    (api.acceptAppointment as any).mockRejectedValue(new Error('Appointment expired'));
    render(<MyCompaniesPage />);

    await waitFor(() => expect(screen.getByText('Invite Co')).toBeInTheDocument());

    fireEvent.click(screen.getByText('ACCEPT'));

    await waitFor(() => expect(screen.getByText('Appointment expired')).toBeInTheDocument());
  });

  it('GivenPendingAppointment_WhenDenyFails_ThenShowsActionError', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([
      { companyId: 2, companyName: 'Invite Co', role: 'MANAGER', appointerId: 'boss', permissions: [] },
    ]);
    (api.denyAppointment as any).mockRejectedValue(new Error('Server error'));
    render(<MyCompaniesPage />);

    await waitFor(() => expect(screen.getByText('Invite Co')).toBeInTheDocument());

    fireEvent.click(screen.getByText('DENY'));

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('GivenCreateCompanyFails_WhenSubmitting_ThenShowsModalError', async () => {
    (api.getMyCompanies as any).mockResolvedValue([]);
    (api.getPendingAppointments as any).mockResolvedValue([]);
    (api.createCompany as any).mockRejectedValue(new Error('Company name already exists'));
    render(<MyCompaniesPage />);

    await waitFor(() => expect(screen.getByText('MY COMPANIES')).toBeInTheDocument());

    fireEvent.click(screen.getByText('NEW COMPANY'));

    fireEvent.change(screen.getByPlaceholderText('e.g. Awesome Events Co.'), { target: { value: 'Dup Co' } });
    fireEvent.change(screen.getByPlaceholderText('What does your company do?'), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByPlaceholderText('contact@company.com'), { target: { value: 'a@b.com' } });

    const createBtns = screen.getAllByText('CREATE COMPANY');
    fireEvent.click(createBtns[createBtns.length - 1]);

    await waitFor(() => expect(screen.getByText('Company name already exists')).toBeInTheDocument());
  });

  it('GivenNetworkError_WhenLoadingCompanies_ThenShowsGenericError', async () => {
    (api.getMyCompanies as any).mockRejectedValue(new Error('Failed to fetch'));
    (api.getPendingAppointments as any).mockRejectedValue(new Error('Failed to fetch'));
    render(<MyCompaniesPage />);
    await waitFor(() => expect(screen.getByText('Failed to fetch')).toBeInTheDocument());
  });
});

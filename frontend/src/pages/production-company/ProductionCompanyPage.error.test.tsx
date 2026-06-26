import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ companyId: '1' }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../api/productionCompanyApi', () => ({
  getRolesTree: vi.fn(),
  getMyMemberInfo: vi.fn(),
  getPurchaseHistory: vi.fn(),
  assignOwner: vi.fn(),
  appointManager: vi.fn(),
  modifyManagerPermissions: vi.fn(),
  removeManager: vi.fn(),
  removeOwner: vi.fn(),
  ALL_PERMISSIONS: [
    'INVENTORY_MANAGEMENT',
    'VENUE_CONFIGURATION_AND_EVENT_MAPPING',
    'COMPANY_POLICY_MANAGEMENT',
    'PURCHASING_AND_DISCOUNT_POLICY_MANAGEMENT',
    'CUSTOMER_INQUIRY_AND_RESPONSE_MANAGEMENT',
    'PURCHASE_AND_ORDER_HISTORY_ACCESS',
    'SALES_REPORT_GENERATION',
  ],
}));

vi.mock('../../api/authApi', () => ({
  authApi: { logout: vi.fn() },
}));

import ProductionCompanyPage from './ProductionCompanyPage';
import * as api from '../../api/productionCompanyApi';

const mockRolesTree = {
  founderId: 'u1',
  ownershipTree: {},
  managerTree: {},
  managerPermissions: {},
};

describe('ProductionCompanyPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'tok');
    localStorage.setItem('userId', 'u1');
  });

  it('GivenBothApisFail_WhenPageLoads_ThenShowsError', async () => {
    (api.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (api.getMyMemberInfo as any).mockRejectedValue(new Error('Not a member'));
    render(<ProductionCompanyPage />);
    await waitFor(() => expect(screen.getByText('Not a member')).toBeInTheDocument());
  });

  it('GivenRolesTreeFails_WhenManagerFallbackSucceeds_ThenShowsManagerView', async () => {
    (api.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (api.getMyMemberInfo as any).mockResolvedValue({
      role: 'MANAGER',
      permissions: ['INVENTORY_MANAGEMENT'],
      companyName: 'Test Company',
      founderId: 'founder1',
      ownershipTree: {},
      managerTree: { u1: { userId: 'u1', appointerId: 'founder1' } },
      managerPermissions: { u1: ['INVENTORY_MANAGEMENT'] },
    });
    render(<ProductionCompanyPage />);

    // Default tab is TEAM — switch to ACTIONS to see "Manage Events"
    await waitFor(() => expect(screen.getByText('ACTIONS')).toBeInTheDocument());
    fireEvent.click(screen.getByText('ACTIONS'));

    await waitFor(() => expect(screen.getByText('Manage Events')).toBeInTheDocument());
  });

  it('GivenFounderView_WhenAssignOwnerFails_ThenShowsModalError', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.assignOwner as any).mockRejectedValue(new Error('User not found'));
    render(<ProductionCompanyPage />);

    await waitFor(() => expect(screen.getByText('TEAM')).toBeInTheDocument());

    fireEvent.click(screen.getByText('ACTIONS'));

    await waitFor(() => expect(screen.getByText('Assign Owner')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Assign Owner'));

    const input = screen.getByPlaceholderText('Enter user ID...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    fireEvent.click(screen.getByText('CONFIRM'));

    await waitFor(() => expect(screen.getByText('User not found')).toBeInTheDocument());
  });

  it('GivenFounderView_WhenAppointManagerFails_ThenShowsModalError', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.appointManager as any).mockRejectedValue(new Error('User already has role'));
    render(<ProductionCompanyPage />);

    await waitFor(() => expect(screen.getByText('TEAM')).toBeInTheDocument());
    fireEvent.click(screen.getByText('ACTIONS'));

    await waitFor(() => expect(screen.getByText('Appoint Manager')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Appoint Manager'));

    const input = screen.getByPlaceholderText('Enter user ID...');
    fireEvent.change(input, { target: { value: 'existingUser' } });
    fireEvent.click(screen.getByText('CONFIRM'));

    await waitFor(() => expect(screen.getByText('User already has role')).toBeInTheDocument());
  });

  it('GivenFounderViewWithOwners_WhenRemoveOwnerFails_ThenShowsToastError', async () => {
    const treeWithOwner = {
      ...mockRolesTree,
      ownershipTree: { owner1: { userId: 'owner1', appointerId: 'u1' } },
    };
    (api.getRolesTree as any).mockResolvedValue(treeWithOwner);
    (api.removeOwner as any).mockRejectedValue(new Error('Cannot remove owner'));
    window.confirm = vi.fn().mockReturnValue(true);
    render(<ProductionCompanyPage />);

    await waitFor(() => expect(screen.getByText('owner1')).toBeInTheDocument());

    const removeBtn = screen.getByTitle('Remove owner');
    fireEvent.click(removeBtn);

    await waitFor(() => expect(screen.getByText('Cannot remove owner')).toBeInTheDocument());
  });

  it('GivenHistoryTabActive_WhenHistoryApiFails_ThenShowsEmptyHistory', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.getPurchaseHistory as any).mockRejectedValue(new Error('Restricted'));
    render(<ProductionCompanyPage />);

    await waitFor(() => expect(screen.getByText('TEAM')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HISTORY'));

    await waitFor(() => {
      expect(screen.getByText('No purchase history yet')).toBeInTheDocument();
    });
  });

  it('GivenEmptyTeam_WhenRendered_ThenShowsFounderAndEmptyStates', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    render(<ProductionCompanyPage />);

    await waitFor(() => expect(screen.getAllByText('u1').length).toBeGreaterThan(0));
    expect(screen.getByText('No owners assigned yet')).toBeInTheDocument();
    expect(screen.getByText('No managers appointed yet')).toBeInTheDocument();
  });
});

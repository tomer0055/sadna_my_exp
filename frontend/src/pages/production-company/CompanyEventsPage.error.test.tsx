import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ companyId: '1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEventsByCompany: vi.fn(),
    createEvent: vi.fn(),
    editSeatingMap: vi.fn(),
    removeEvent: vi.fn(),
  },
}));

vi.mock('../../api/productionCompanyApi', () => ({
  getRolesTree: vi.fn(),
  getMyMemberInfo: vi.fn(),
  getPurchaseHistory: vi.fn(),
}));

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn().mockResolvedValue(null),
}));

import CompanyEventsPage from './CompanyEventsPage';
import { eventApi } from '../../api/eventsApi';
import * as companyApi from '../../api/productionCompanyApi';

const mockRolesTree = {
  companyName: 'Test Co',
  founderId: 'u1',
  ownershipTree: {},
  managerTree: {},
  managerPermissions: {},
};

function setupSuccess(events: any[] = []) {
  (eventApi.getEventsByCompany as any).mockResolvedValue(events);
  (companyApi.getRolesTree as any).mockResolvedValue(mockRolesTree);
  (companyApi.getMyMemberInfo as any).mockResolvedValue(null);
  (companyApi.getPurchaseHistory as any).mockResolvedValue([]);
}

describe('CompanyEventsPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'tok');
    localStorage.setItem('userId', 'u1');
  });

  it('GivenEventsFetchFails_WhenPageLoads_ThenShowsError', async () => {
    (eventApi.getEventsByCompany as any).mockRejectedValue(new Error('Unauthorized'));
    (companyApi.getRolesTree as any).mockRejectedValue(new Error('fail'));
    (companyApi.getMyMemberInfo as any).mockRejectedValue(new Error('fail'));
    (companyApi.getPurchaseHistory as any).mockRejectedValue(new Error('fail'));
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('Unauthorized')).toBeInTheDocument());
  });

  it('GivenNoEvents_WhenPageLoads_ThenShowsEmptyState', async () => {
    setupSuccess([]);
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('No events yet')).toBeInTheDocument());
    expect(screen.getByText(/Create your first event/)).toBeInTheDocument();
  });

  it('GivenEventsExist_WhenPageLoads_ThenShowsEventCards', async () => {
    setupSuccess([
      { eventId: 'e1', eventName: 'Rock Fest', eventCapacity: 500, eventDateTime: '2027-06-01T20:00', isActive: true },
    ]);
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('Rock Fest')).toBeInTheDocument());
  });

  it('GivenFounderUser_WhenViewed_ThenShowsNewEventButton', async () => {
    setupSuccess([]);
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('No events yet')).toBeInTheDocument());
    expect(screen.getAllByText(/NEW EVENT|CREATE EVENT/).length).toBeGreaterThan(0);
  });

  it('GivenManagerWithoutInventoryPerm_WhenViewed_ThenHidesNewEventButton', async () => {
    (eventApi.getEventsByCompany as any).mockResolvedValue([]);
    (companyApi.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (companyApi.getMyMemberInfo as any).mockResolvedValue({
      role: 'MANAGER',
      permissions: ['PURCHASE_AND_ORDER_HISTORY_ACCESS'],
      companyName: 'Test Co',
      founderId: 'founder1',
      ownershipTree: {},
      managerTree: { u1: { userId: 'u1', appointerId: 'founder1' } },
      managerPermissions: { u1: ['PURCHASE_AND_ORDER_HISTORY_ACCESS'] },
    });
    (companyApi.getPurchaseHistory as any).mockResolvedValue([]);
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('No events yet')).toBeInTheDocument());
    expect(screen.queryByText('NEW EVENT')).not.toBeInTheDocument();
    expect(screen.queryByText('CREATE EVENT')).not.toBeInTheDocument();
  });

  it('GivenRolesTreeFails_WhenMemberInfoSucceeds_ThenPageStillLoads', async () => {
    (eventApi.getEventsByCompany as any).mockResolvedValue([]);
    (companyApi.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (companyApi.getMyMemberInfo as any).mockResolvedValue({
      role: 'MANAGER',
      permissions: ['INVENTORY_MANAGEMENT'],
      companyName: 'Fallback Co',
      founderId: 'founder1',
      ownershipTree: {},
      managerTree: { u1: { userId: 'u1', appointerId: 'founder1' } },
      managerPermissions: { u1: ['INVENTORY_MANAGEMENT'] },
    });
    (companyApi.getPurchaseHistory as any).mockResolvedValue([]);
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText(/Fallback Co/)).toBeInTheDocument());
  });

  it('GivenDeleteConfirmed_WhenRemoveEventFails_ThenShowsAlert', async () => {
    setupSuccess([
      { eventId: 'e1', eventName: 'Doomed Event', eventCapacity: 100, isActive: true },
    ]);
    (eventApi.removeEvent as any).mockResolvedValue(false);
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
    render(<CompanyEventsPage />);

    await waitFor(() => expect(screen.getByText('Doomed Event')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to cancel event'));
  });

  it('GivenHistoryFetchFails_WhenPageLoads_ThenStillShowsEventsWithZeroStats', async () => {
    (eventApi.getEventsByCompany as any).mockResolvedValue([
      { eventId: 'e1', eventName: 'Stats Event', eventCapacity: 200, isActive: true },
    ]);
    (companyApi.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (companyApi.getMyMemberInfo as any).mockResolvedValue(null);
    (companyApi.getPurchaseHistory as any).mockRejectedValue(new Error('History restricted'));
    render(<CompanyEventsPage />);
    await waitFor(() => expect(screen.getByText('Stats Event')).toBeInTheDocument());
  });
});

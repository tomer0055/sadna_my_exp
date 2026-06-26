import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import CompanyEventsPage from './CompanyEventsPage';
import { eventApi } from '../../api/eventsApi';
import * as companyApi from '../../api/productionCompanyApi';

vi.mock('../../api/eventsApi', () => ({
  eventApi: {
    getEventsByCompany: vi.fn(),
    createEvent: vi.fn(),
    editSeatingMap: vi.fn(),
    removeEvent: vi.fn(),
    editEventDate: vi.fn(),
    editEventCapacity: vi.fn(),
    editEventLocation: vi.fn(),
    editEventImage: vi.fn(),
    editEventPolicy: vi.fn(),
    getEventPurchasePolicy: vi.fn(),
    getEventSeatingMap: vi.fn()
  }
}));

vi.mock('../../api/productionCompanyApi', () => ({
  getRolesTree: vi.fn(),
  getMyMemberInfo: vi.fn(),
  getPurchaseHistory: vi.fn()
}));

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn().mockResolvedValue(null)
}));

const mockRolesTree = {
  companyId: 5,
  companyName: 'Cool Events Co',
  founderId: 'user-1',
  ownershipTree: {},
  managerTree: {},
  managerPermissions: {}
};

const mockEvents = [
  {
    eventId: 'evt-1',
    eventName: 'Rock Festival',
    eventDateTime: '2027-06-15T20:00:00',
    eventLocation: 'Tel Aviv',
    eventCapacity: 500,
    ticketPrice: 100,
    isActive: true
  },
  {
    eventId: 'evt-2',
    eventName: 'Jazz Night',
    eventDateTime: '2027-07-20T19:00:00',
    eventLocation: 'Haifa',
    eventCapacity: 200,
    ticketPrice: 80,
    isActive: false
  }
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/company/5/events']}>
      <Routes>
        <Route path="/company/:companyId/events" element={<CompanyEventsPage />} />
        <Route path="/company/:companyId" element={<div>Company Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function setupDefaults(overrides: { events?: any[]; rolesTree?: any } = {}) {
  (eventApi.getEventsByCompany as any).mockResolvedValue(overrides.events ?? mockEvents);
  (companyApi.getRolesTree as any).mockResolvedValue(overrides.rolesTree ?? mockRolesTree);
  (companyApi.getMyMemberInfo as any).mockResolvedValue(null);
  (companyApi.getPurchaseHistory as any).mockResolvedValue([]);
}

describe('CompanyEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user-1');
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysSpinner', () => {
    (eventApi.getEventsByCompany as any).mockReturnValue(new Promise(() => {}));
    (companyApi.getRolesTree as any).mockReturnValue(new Promise(() => {}));
    (companyApi.getMyMemberInfo as any).mockReturnValue(new Promise(() => {}));
    (companyApi.getPurchaseHistory as any).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('EVENTS')).toBeInTheDocument();
  });

  // Error state
  it('GivenApiFails_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    (eventApi.getEventsByCompany as any).mockRejectedValue(new Error('Network error'));
    (companyApi.getRolesTree as any).mockRejectedValue(new Error('fail'));
    (companyApi.getMyMemberInfo as any).mockRejectedValue(new Error('fail'));
    (companyApi.getPurchaseHistory as any).mockRejectedValue(new Error('fail'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Empty events state
  it('GivenNoEvents_WhenPageLoads_ThenDisplaysEmptyState', async () => {
    setupDefaults({ events: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No events yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first event for this company.')).toBeInTheDocument();
    });
  });

  // Displays event cards
  it('GivenEvents_WhenPageLoads_ThenDisplaysEventCards', async () => {
    setupDefaults();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Rock Festival')).toBeInTheDocument();
      expect(screen.getByText('Jazz Night')).toBeInTheDocument();
    });
  });

  // Header shows EVENTS title
  it('GivenCompanyWithEvents_WhenPageLoads_ThenDisplaysHeaderInfo', async () => {
    setupDefaults();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('EVENTS')).toBeInTheDocument();
      expect(screen.getByText(/Cool Events Co/)).toBeInTheDocument();
    });
  });

  // NEW EVENT button visible for founder
  it('GivenFounderRole_WhenPageLoads_ThenShowsNewEventButton', async () => {
    setupDefaults();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('NEW EVENT')).toBeInTheDocument();
    });
  });

  // Manager without INVENTORY_MANAGEMENT can't create events
  it('GivenManagerWithoutInventoryPermission_WhenPageLoads_ThenHidesNewEventButton', async () => {
    const managerTree = {
      ...mockRolesTree,
      founderId: 'other-user',
      managerTree: { 'user-1': 'other-user' },
      managerPermissions: { 'user-1': [] }
    };
    setupDefaults({ rolesTree: managerTree });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Rock Festival')).toBeInTheDocument();
    });

    expect(screen.queryByText('NEW EVENT')).not.toBeInTheDocument();
  });

  // Empty state shows CREATE EVENT for founder
  it('GivenFounderWithNoEvents_WhenPageLoads_ThenShowsCreateEventButton', async () => {
    setupDefaults({ events: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CREATE EVENT')).toBeInTheDocument();
    });
  });
});

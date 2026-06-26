import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ProductionCompanyPage from './ProductionCompanyPage';
import * as api from '../../api/productionCompanyApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const mockRolesTree: api.RolesTreeDTO = {
  companyId: 5,
  companyName: 'Test Company',
  founderId: 'user42',
  ownershipTree: {
    user42: { userId: 'user42', appointerId: null },
    owner1: { userId: 'owner1', appointerId: 'user42' },
  },
  managerTree: {
    mgr1: { userId: 'mgr1', appointerId: 'user42', permissions: [] },
  },
  managerPermissions: {
    mgr1: ['INVENTORY_MANAGEMENT'],
  },
};

const mockHistory: api.HistoryOrderItem[] = [
  {
    orderId: 'ord-1',
    userId: 'buyer1',
    eventId: 'evt-1',
    companyId: 5,
    purchaseDate: '2024-06-01T12:00:00Z',
    price: 49.99,
    seatIds: ['A1', 'A2'],
    standingAreaQuantities: {},
  },
];

function renderPage(companyId = '5') {
  return render(
    <MemoryRouter initialEntries={[`/production-company/${companyId}`]}>
      <Routes>
        <Route path="/production-company/:companyId" element={<ProductionCompanyPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProductionCompanyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user42');
    window.confirm = vi.fn(() => true);
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenShowsLoadingIndicator', () => {
    (api.getRolesTree as any).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('LOADING COMPANY DATA...')).toBeInTheDocument();
  });

  // Error state — both endpoints fail
  it('GivenBothApisFail_WhenDataLoads_ThenShowsAccessDenied', async () => {
    (api.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (api.getMyMemberInfo as any).mockRejectedValue(new Error('No access'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ACCESS DENIED')).toBeInTheDocument();
    });
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  // Company name displayed
  it('GivenRolesTreeLoaded_WhenRendered_ThenShowsCompanyName', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
  });

  // Founder shown in team tab
  it('GivenRolesTree_WhenTeamTabActive_ThenShowsFounder', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    // Founder ID displayed in the team tab
    const founderElements = screen.getAllByText('user42');
    expect(founderElements.length).toBeGreaterThanOrEqual(1);
  });

  // Owners displayed
  it('GivenRolesTree_WhenTeamTabActive_ThenShowsOwners', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('owner1')).toBeInTheDocument();
    });
  });

  // Managers displayed
  it('GivenRolesTree_WhenTeamTabActive_ThenShowsManagers', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('mgr1')).toBeInTheDocument();
    });
    expect(screen.getByText('Inventory Management')).toBeInTheDocument();
  });

  // Stat cards
  it('GivenRolesTree_WhenRendered_ThenShowsStatCards', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('OWNERS')).toBeInTheDocument();
    });
    expect(screen.getByText('MANAGERS')).toBeInTheDocument();
  });

  // History tab - empty
  it('GivenNoHistory_WhenHistoryTabClicked_ThenShowsEmptyState', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.getPurchaseHistory as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('HISTORY'));
    await waitFor(() => {
      expect(screen.getByText('No purchase history yet')).toBeInTheDocument();
    });
  });

  // History tab - with data
  it('GivenHistoryExists_WhenHistoryTabClicked_ThenShowsOrders', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.getPurchaseHistory as any).mockResolvedValue(mockHistory);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('HISTORY'));
    await waitFor(() => {
      expect(screen.getByText('ord-1')).toBeInTheDocument();
    });
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('2 seat(s)')).toBeInTheDocument();
  });

  // Actions tab - founder sees all actions
  it('GivenFounderRole_WhenActionsTabClicked_ThenShowsAllActions', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ACTIONS'));
    await waitFor(() => {
      expect(screen.getByText('Manage Events')).toBeInTheDocument();
    });
    expect(screen.getByText('Assign Owner')).toBeInTheDocument();
    expect(screen.getByText('Appoint Manager')).toBeInTheDocument();
    expect(screen.getByText('Manage Policies')).toBeInTheDocument();
    expect(screen.getByText('Purchase History')).toBeInTheDocument();
  });

  // Assign owner modal
  it('GivenTeamTab_WhenAssignOwnerClicked_ThenOpensModal', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ASSIGN'));
    await waitFor(() => {
      expect(screen.getByText('ASSIGN OWNER')).toBeInTheDocument();
    });
  });

  // Submit assign owner
  it('GivenAssignOwnerModal_WhenSubmitted_ThenCallsApi', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.assignOwner as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ASSIGN'));
    await waitFor(() => {
      expect(screen.getByText('ASSIGN OWNER')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Enter user ID...'), { target: { value: 'newowner' } });
    fireEvent.submit(screen.getByText('CONFIRM'));
    await waitFor(() => {
      expect(api.assignOwner).toHaveBeenCalledWith(5, 'newowner');
    });
  });

  // Appoint manager modal
  it('GivenTeamTab_WhenAppointManagerClicked_ThenOpensModal', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('APPOINT'));
    await waitFor(() => {
      expect(screen.getByText('APPOINT MANAGER')).toBeInTheDocument();
    });
  });

  // Submit appoint manager with permissions
  it('GivenAppointManagerModal_WhenSubmittedWithPerms_ThenCallsApiWithPermissions', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.appointManager as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('APPOINT'));
    await waitFor(() => {
      expect(screen.getByText('APPOINT MANAGER')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Enter user ID...'), { target: { value: 'newmgr' } });
    // Toggle a permission checkbox
    const inventoryLabels = screen.getAllByText('Inventory Management');
    fireEvent.click(inventoryLabels[inventoryLabels.length - 1]);
    fireEvent.submit(screen.getByText('CONFIRM'));
    await waitFor(() => {
      expect(api.appointManager).toHaveBeenCalledWith(5, 'newmgr', ['INVENTORY_MANAGEMENT']);
    });
  });

  // Remove manager
  it('GivenManager_WhenRemoveClicked_ThenCallsRemoveManagerApi', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.removeManager as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('mgr1')).toBeInTheDocument();
    });
    // Find the remove button for the manager (the one with person_remove icon next to mgr1)
    const removeButtons = screen.getAllByTitle('Remove manager');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(api.removeManager).toHaveBeenCalledWith(5, 'mgr1');
    });
  });

  // Remove owner
  it('GivenOwner_WhenRemoveClicked_ThenCallsRemoveOwnerApi', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.removeOwner as any).mockResolvedValue({ message: 'ok' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('owner1')).toBeInTheDocument();
    });
    const removeButtons = screen.getAllByTitle('Remove owner');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(api.removeOwner).toHaveBeenCalledWith(5, 'owner1');
    });
  });

  // Fallback to memberInfo when rolesTree fails
  it('GivenRolesTreeFails_WhenMemberInfoSucceeds_ThenShowsCompanyFromMemberInfo', async () => {
    (api.getRolesTree as any).mockRejectedValue(new Error('Forbidden'));
    (api.getMyMemberInfo as any).mockResolvedValue({
      role: 'MANAGER',
      permissions: ['INVENTORY_MANAGEMENT'],
      companyName: 'Fallback Co',
      founderId: 'founderX',
      ownershipTree: {},
      managerTree: { user42: { userId: 'user42', appointerId: 'founderX', permissions: [] } },
      managerPermissions: { user42: ['INVENTORY_MANAGEMENT'] },
    } satisfies api.MemberInfo);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Fallback Co')).toBeInTheDocument();
    });
  });

  // Logout
  it('GivenLogoutButton_WhenClicked_ThenNavigatesToLogin', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('LOGOUT'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // Tab switching
  it('GivenTeamTab_WhenHistoryTabClicked_ThenSwitchesToHistory', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.getPurchaseHistory as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('HISTORY'));
    await waitFor(() => {
      expect(screen.getByText('No purchase history yet')).toBeInTheDocument();
    });
  });

  // Assign owner error handling
  it('GivenAssignOwnerFails_WhenSubmitted_ThenShowsError', async () => {
    (api.getRolesTree as any).mockResolvedValue(mockRolesTree);
    (api.assignOwner as any).mockRejectedValue(new Error('User not found'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ASSIGN'));
    await waitFor(() => {
      expect(screen.getByText('ASSIGN OWNER')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Enter user ID...'), { target: { value: 'ghost' } });
    fireEvent.submit(screen.getByText('CONFIRM'));
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  // Manager with no permissions visible in Actions tab
  it('GivenManagerRole_WhenActionsTab_ThenHidesOwnerOnlyActions', async () => {
    const managerTree: api.RolesTreeDTO = {
      ...mockRolesTree,
      founderId: 'someone_else',
      ownershipTree: {},
      managerTree: { user42: { userId: 'user42', appointerId: 'someone_else', permissions: [] } },
      managerPermissions: { user42: ['INVENTORY_MANAGEMENT'] },
    };
    (api.getRolesTree as any).mockResolvedValue(managerTree);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ACTIONS'));
    await waitFor(() => {
      expect(screen.getByText('Manage Events')).toBeInTheDocument();
    });
    expect(screen.queryByText('Assign Owner')).not.toBeInTheDocument();
    expect(screen.queryByText('Appoint Manager')).not.toBeInTheDocument();
  });
});

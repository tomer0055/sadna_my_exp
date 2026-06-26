import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AdminPage from './AdminPage';
import { adminApi } from '../../api/adminApi';
import { historyOrderApi } from '../../api/historyOrderApi';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getSystemUsers: vi.fn(),
    getActiveOrders: vi.fn(),
    getOrderHistory: vi.fn()
  }
}));

vi.mock('../../api/historyOrderApi', () => ({
  historyOrderApi: {
    getUserOrders: vi.fn(),
    getOrdersByCompany: vi.fn(),
    getAllOrders: vi.fn()
  }
}));

vi.mock('./AdminPage.scss', () => ({}));

const mockUsers = [
  { id: 'u1', userId: 'user-1', username: 'alice', name: 'Alice A', email: 'alice@test.com', userState: 'ACTIVE', isAdmin: true },
  { id: 'u2', userId: 'user-2', username: 'bob', name: 'Bob B', email: 'bob@test.com', userState: 'ACTIVE', isAdmin: false },
];

const mockActiveOrders = [
  { orderId: 'ao-1', userId: 'user-1', eventId: 'evt-1', companyId: 1, price: 100 },
  { orderId: 'ao-2', userId: 'user-2', eventId: 'evt-2', companyId: 2, price: 250 },
];

const mockHistoryOrders = [
  { orderId: 'ho-1', userId: 'user-1', eventId: 'evt-1', companyId: 1, purchaseDate: '2027-01-10', price: 150, seatIds: ['A1'], standingAreaQuantities: {} },
  { orderId: 'ho-2', userId: 'user-2', eventId: 'evt-2', companyId: 2, purchaseDate: '2027-02-15', price: 300, seatIds: [], standingAreaQuantities: { GA: 2 } },
];

function setupAuthAdmin() {
  (useAuth as any).mockReturnValue({
    token: 'test-token',
    isAdmin: true,
    loading: false,
  });
}

function setupAuthNonAdmin() {
  (useAuth as any).mockReturnValue({
    token: 'test-token',
    isAdmin: false,
    loading: false,
  });
}

function setupAuthLoading() {
  (useAuth as any).mockReturnValue({
    token: null,
    isAdmin: false,
    loading: true,
  });
}

function setupAuthNoToken() {
  (useAuth as any).mockReturnValue({
    token: null,
    isAdmin: false,
    loading: false,
  });
}

function mockAllApisSuccess(users = mockUsers, active = mockActiveOrders, history = mockHistoryOrders) {
  (adminApi.getSystemUsers as any).mockResolvedValue(users);
  (adminApi.getActiveOrders as any).mockResolvedValue(active);
  (adminApi.getOrderHistory as any).mockResolvedValue(history);
}

function mockAllApisEmpty() {
  mockAllApisSuccess([], [], []);
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // --- Loading state ---

  it('GivenAuthIsLoading_WhenPageRenders_ThenNoErrorAndNoDataShown', () => {
    setupAuthLoading();
    render(<AdminPage />);

    expect(screen.queryByText('Access denied: admin privileges required.')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('GivenAdminUser_WhenDataIsLoading_ThenDisplaysLoadingMessage', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockReturnValue(new Promise(() => {}));
    (adminApi.getActiveOrders as any).mockReturnValue(new Promise(() => {}));
    (adminApi.getOrderHistory as any).mockReturnValue(new Promise(() => {}));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Loading admin data...')).toBeInTheDocument();
    });
  });

  // --- Access denied ---

  it('GivenNoToken_WhenPageRenders_ThenDisplaysAccessDeniedError', async () => {
    setupAuthNoToken();
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied: admin privileges required.')).toBeInTheDocument();
    });
  });

  it('GivenNonAdminUser_WhenPageRenders_ThenDisplaysAccessDeniedError', async () => {
    setupAuthNonAdmin();
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied: admin privileges required.')).toBeInTheDocument();
    });
  });

  // --- Overview tab (default) ---

  it('GivenAdminWithData_WhenPageLoads_ThenDisplaysOverviewTabByDefault', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Active Orders Monitoring')).toBeInTheDocument();
    expect(screen.getByText('History Orders Search')).toBeInTheDocument();
  });

  // --- Stat cards ---

  it('GivenAdminWithData_WhenPageLoads_ThenDisplaysCorrectStatCounts', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const statValues = screen.getAllByText('2');
    expect(statValues.length).toBeGreaterThanOrEqual(1);
  });

  it('GivenAdminWithHistoryOrders_WhenPageLoads_ThenDisplaysTotalRevenue', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Recorded Revenue')).toBeInTheDocument();
    });

    // 150 + 300 = 450
    expect(screen.getByText('₪450.00')).toBeInTheDocument();
  });

  it('GivenAdminWithNoHistoryOrders_WhenPageLoads_ThenDisplaysZeroRevenue', async () => {
    setupAuthAdmin();
    mockAllApisSuccess(mockUsers, mockActiveOrders, []);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('₪0.00')).toBeInTheDocument();
    });
  });

  // --- Tab switching ---

  it('GivenAdminOnOverview_WhenClicksUsersTab_ThenDisplaysUsersTable', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const usersTabButtons = screen.getAllByRole('button', { name: 'Users' });
    const usersTab = usersTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(usersTab!);

    await waitFor(() => {
      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  it('GivenAdminOnOverview_WhenClicksActiveOrdersTab_ThenDisplaysActiveOrdersTable', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const activeTabButtons = screen.getAllByRole('button', { name: 'Active Orders' });
    const activeTab = activeTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(activeTab!);

    await waitFor(() => {
      expect(screen.getByText('Active Orders', { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('GivenAdminOnOverview_WhenClicksHistoryOrdersTab_ThenDisplaysHistorySearch', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByText('History Orders', { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('GivenAdminOnUsersTab_WhenClicksOverviewTab_ThenDisplaysOverview', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    // Switch to users
    const usersTabButtons = screen.getAllByRole('button', { name: 'Users' });
    const usersTab = usersTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(usersTab!);

    await waitFor(() => {
      expect(screen.getByText('User ID')).toBeInTheDocument();
    });

    // Switch back to overview
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });
  });

  // --- Users table ---

  it('GivenAdminWithUsers_WhenUsersTabSelected_ThenDisplaysUserDetails', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const usersTabButtons = screen.getAllByRole('button', { name: 'Users' });
    const usersTab = usersTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(usersTab!);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('alice@test.com')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('GivenAdminWithUsers_WhenUsersTabSelected_ThenDisplaysAdminStatus', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const usersTabButtons = screen.getAllByRole('button', { name: 'Users' });
    const usersTab = usersTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(usersTab!);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  // --- Empty states ---

  it('GivenAdminWithNoUsers_WhenUsersTabSelected_ThenDisplaysEmptyMessage', async () => {
    setupAuthAdmin();
    mockAllApisSuccess([], mockActiveOrders, mockHistoryOrders);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const usersTabButtons = screen.getAllByRole('button', { name: 'Users' });
    const usersTab = usersTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(usersTab!);

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });

  it('GivenAdminWithNoActiveOrders_WhenActiveOrdersTabSelected_ThenDisplaysEmptyMessage', async () => {
    setupAuthAdmin();
    mockAllApisSuccess(mockUsers, [], mockHistoryOrders);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const activeTabButtons = screen.getAllByRole('button', { name: 'Active Orders' });
    const activeTab = activeTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(activeTab!);

    await waitFor(() => {
      expect(screen.getByText('No active orders found.')).toBeInTheDocument();
    });
  });

  // --- Error handling ---

  it('GivenUsersApiFails_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockRejectedValue(new Error('Network error'));
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Users: Network error')).toBeInTheDocument();
    });
  });

  it('GivenActiveOrdersApiFails_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockResolvedValue([]);
    (adminApi.getActiveOrders as any).mockRejectedValue(new Error('Server error'));
    (adminApi.getOrderHistory as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Active orders: Server error')).toBeInTheDocument();
    });
  });

  it('GivenHistoryOrdersApiFails_WhenPageLoads_ThenDisplaysErrorMessage', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockResolvedValue([]);
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockRejectedValue(new Error('Timeout'));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('History orders: Timeout')).toBeInTheDocument();
    });
  });

  it('GivenErrorOccurred_WhenPageRenders_ThenTabsAndStatsAreHidden', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockRejectedValue(new Error('fail'));
    (adminApi.getActiveOrders as any).mockResolvedValue([]);
    (adminApi.getOrderHistory as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Users: fail')).toBeInTheDocument();
    });

    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
  });

  // --- Active orders data display ---

  it('GivenAdminWithActiveOrders_WhenActiveOrdersTabSelected_ThenDisplaysOrderData', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const activeTabButtons = screen.getAllByRole('button', { name: 'Active Orders' });
    const activeTab = activeTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(activeTab!);

    await waitFor(() => {
      expect(screen.getByText('ao-1')).toBeInTheDocument();
      expect(screen.getByText('ao-2')).toBeInTheDocument();
    });
  });

  // --- Stat card clicks ---

  it('GivenAdminOnOverview_WhenClicksUsersStatCard_ThenSwitchesToUsersTab', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    // Click the stat card button (not the tab button)
    const statCards = screen.getAllByRole('button');
    const usersStatCard = statCards.find(btn =>
      btn.classList.contains('admin-page__stat-card') &&
      btn.textContent?.includes('Users')
    );
    fireEvent.click(usersStatCard!);

    await waitFor(() => {
      expect(screen.getByText('User ID')).toBeInTheDocument();
    });
  });

  // --- History Orders search ---

  it('GivenHistoryTab_WhenSearchByUser_ThenCallsUserOrdersApi', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByText('History Orders', { selector: 'h2' })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter user ID');
    fireEvent.change(input, { target: { value: 'user-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(historyOrderApi.getUserOrders).toHaveBeenCalledWith('test-token', 'user-1');
    });
  });

  it('GivenHistoryTab_WhenSwitchToCompanyAndSearch_ThenCallsCompanyOrdersApi', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getOrdersByCompany as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByText('History Orders', { selector: 'h2' })).toBeInTheDocument();
    });

    // Switch to company mode
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'company' } });

    const input = screen.getByPlaceholderText('Enter company ID');
    fireEvent.change(input, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(historyOrderApi.getOrdersByCompany).toHaveBeenCalledWith('test-token', 5);
    });
  });

  it('GivenHistoryTab_WhenSearchReturnsResults_ThenDisplaysResultsTable', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      { orderId: 'ho-1', userId: 'user-1', eventId: 'evt-1', companyId: 1, purchaseDate: '2027-01-10', price: 150, seatIds: ['A1'], standingAreaQuantities: {} },
    ]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter user ID');
    fireEvent.change(input, { target: { value: 'user-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('ho-1')).toBeInTheDocument();
    });
  });

  it('GivenHistoryTab_WhenSearchReturnsNoResults_ThenDisplaysEmptyMessage', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter user ID');
    fireEvent.change(input, { target: { value: 'user-999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('No orders found for this user.')).toBeInTheDocument();
    });
  });

  it('GivenHistoryTabCompanyMode_WhenSearchReturnsNoResults_ThenDisplaysCompanyEmptyMessage', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getOrdersByCompany as any).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'company' } });

    const input = screen.getByPlaceholderText('Enter company ID');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('No orders found for this company.')).toBeInTheDocument();
    });
  });

  it('GivenHistoryTabCompanyMode_WhenEmptyInput_ThenSearchButtonIsDisabled', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'company' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).toBeDisabled();
  });

  it('GivenHistoryTab_WhenSearchFails_ThenDisplaysErrorMessage', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getUserOrders as any).mockRejectedValue(new Error('Search failed'));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter user ID');
    fireEvent.change(input, { target: { value: 'user-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('GivenHistoryTab_WhenModeChanges_ThenClearsInputAndResults', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();
    (historyOrderApi.getUserOrders as any).mockResolvedValue([
      { orderId: 'ho-1', userId: 'user-1', eventId: 'evt-1', companyId: 1, purchaseDate: '2027-01-10', price: 150, seatIds: [], standingAreaQuantities: {} },
    ]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Available Admin Actions')).toBeInTheDocument();
    });

    const historyTabButtons = screen.getAllByRole('button', { name: 'History Orders' });
    const historyTab = historyTabButtons.find(btn => btn.classList.contains('admin-page__tab'));
    fireEvent.click(historyTab!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument();
    });

    // Search for user
    const input = screen.getByPlaceholderText('Enter user ID');
    fireEvent.change(input, { target: { value: 'user-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('ho-1')).toBeInTheDocument();
    });

    // Switch mode
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'company' } });

    // Results should be cleared, placeholder should change
    expect(screen.queryByText('ho-1')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter company ID')).toBeInTheDocument();
  });

  // --- API called with correct token ---

  it('GivenAdminUser_WhenPageLoads_ThenCallsApisWithToken', async () => {
    setupAuthAdmin();
    mockAllApisSuccess();

    render(<AdminPage />);

    await waitFor(() => {
      expect(adminApi.getSystemUsers).toHaveBeenCalledWith('test-token');
      expect(adminApi.getActiveOrders).toHaveBeenCalledWith('test-token');
      expect(adminApi.getOrderHistory).toHaveBeenCalledWith('test-token');
    });
  });

  // --- All data empty ---

  it('GivenAdminWithNoData_WhenPageLoads_ThenDisplaysZeroCounts', async () => {
    setupAuthAdmin();
    mockAllApisEmpty();

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('₪0.00')).toBeInTheDocument();
    });

    // All stat values should be 0
    const statValues = screen.getAllByText('0', { selector: '.admin-page__stat-value' });
    expect(statValues.length).toBe(3);
  });

  // --- Stat card disabled during loading ---

  it('GivenDataIsLoading_WhenStatCardsRendered_ThenTheyAreDisabled', async () => {
    setupAuthAdmin();
    (adminApi.getSystemUsers as any).mockReturnValue(new Promise(() => {}));
    (adminApi.getActiveOrders as any).mockReturnValue(new Promise(() => {}));
    (adminApi.getOrderHistory as any).mockReturnValue(new Promise(() => {}));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Loading admin data...')).toBeInTheDocument();
    });

    const statButtons = screen.getAllByRole('button').filter(btn =>
      btn.classList.contains('admin-page__stat-card')
    );
    statButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });
});

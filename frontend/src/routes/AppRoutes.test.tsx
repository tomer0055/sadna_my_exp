import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    isGuest: false,
    isMember: true,
    isAdmin: true,
    isProductionUser: true,
    token: 'tok',
    permissions: { isAdmin: true, userId: 'u1', state: 'MEMBER', productionRoles: {} },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../layouts/MainLayout/MainLayout', () => ({
  default: () => <div data-testid="main-layout"><Outlet /></div>,
}));

vi.mock('../pages/auth/LoginPage', () => ({ default: () => <div>LoginPage</div> }));
vi.mock('../pages/auth/RegisterPage', () => ({ default: () => <div>RegisterPage</div> }));
vi.mock('../pages/auth/ForgotPasswordPage', () => ({ default: () => <div>ForgotPasswordPage</div> }));
vi.mock('../pages/dashboard/DashboardPage', () => ({ default: () => <div>DashboardPage</div> }));
vi.mock('../pages/events/EventsPage', () => ({ default: () => <div>EventsPage</div> }));
vi.mock('../pages/events/EventDetailsPage', () => ({ default: () => <div>EventDetailsPage</div> }));
vi.mock('../pages/orders/ActiveOrderPage', () => ({ default: () => <div>ActiveOrderPage</div> }));
vi.mock('../pages/orders/OrderHistoryPage', () => ({ default: () => <div>OrderHistoryPage</div> }));
vi.mock('../pages/orders/ReserveTicketPage', () => ({ default: () => <div>ReserveTicketPage</div> }));
vi.mock('../pages/orders/CheckoutPage', () => ({ default: () => <div>CheckoutPage</div> }));
vi.mock('../pages/notifications/NotificationsPage', () => ({ default: () => <div>NotificationsPage</div> }));
vi.mock('../pages/production-company/MyCompaniesPage', () => ({ default: () => <div>MyCompaniesPage</div> }));
vi.mock('../pages/production-company/ProductionCompanyPage', () => ({ default: () => <div>ProductionCompanyPage</div> }));
vi.mock('../pages/production-company/CompanyEventsPage', () => ({ default: () => <div>CompanyEventsPage</div> }));
vi.mock('../pages/production-company/CompanyPurchasePolicyPage', () => ({ default: () => <div>CompanyPurchasePolicyPage</div> }));
vi.mock('../pages/policies/PurchasePolicyPage', () => ({ default: () => <div>PurchasePolicyPage</div> }));
vi.mock('../pages/admin/AdminPage', () => ({ default: () => <div>AdminPage</div> }));
vi.mock('../pages/dashboard/AccountSettingsPage', () => ({ default: () => <div>AccountSettingsPage</div> }));
vi.mock('../components/auth/RequireMember', () => ({ default: () => <Outlet /> }));
vi.mock('../components/auth/RequireAdmin', () => ({ default: () => <Outlet /> }));

import AppRoutes from './AppRoutes';

function renderRoute(path: string) {
  // AppRoutes uses BrowserRouter internally, so we can't wrap it in MemoryRouter.
  // Instead we test route mapping logic by verifying the component structure.
  // We'll test via window.history for BrowserRouter.
  window.history.pushState({}, '', path);
  return render(<AppRoutes />);
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Auth routes outside main layout
  it('GivenLoginPath_WhenNavigated_ThenRendersLoginPage', () => {
    renderRoute('/login');
    expect(screen.getByText('LoginPage')).toBeInTheDocument();
  });

  it('GivenRegisterPath_WhenNavigated_ThenRendersRegisterPage', () => {
    renderRoute('/register');
    expect(screen.getByText('RegisterPage')).toBeInTheDocument();
  });

  it('GivenForgotPasswordPath_WhenNavigated_ThenRendersForgotPasswordPage', () => {
    renderRoute('/forgot-password');
    expect(screen.getByText('ForgotPasswordPage')).toBeInTheDocument();
  });

  // Main layout routes
  it('GivenDashboardPath_WhenNavigated_ThenRendersDashboardInLayout', () => {
    renderRoute('/dashboard');
    expect(screen.getByText('DashboardPage')).toBeInTheDocument();
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('GivenEventsPath_WhenNavigated_ThenRendersEventsPage', () => {
    renderRoute('/events');
    expect(screen.getByText('EventsPage')).toBeInTheDocument();
  });

  it('GivenActiveOrderPath_WhenNavigated_ThenRendersActiveOrderPage', () => {
    renderRoute('/orders/active');
    expect(screen.getByText('ActiveOrderPage')).toBeInTheDocument();
  });

  it('GivenCheckoutPath_WhenNavigated_ThenRendersCheckoutPage', () => {
    renderRoute('/checkout');
    expect(screen.getByText('CheckoutPage')).toBeInTheDocument();
  });

  // Member-only routes
  it('GivenOrderHistoryPath_WhenNavigated_ThenRendersOrderHistoryPage', () => {
    renderRoute('/orders/history');
    expect(screen.getByText('OrderHistoryPage')).toBeInTheDocument();
  });

  it('GivenNotificationsPath_WhenNavigated_ThenRendersNotificationsPage', () => {
    renderRoute('/notifications');
    expect(screen.getByText('NotificationsPage')).toBeInTheDocument();
  });

  // Admin route
  it('GivenAdminPath_WhenNavigated_ThenRendersAdminPage', () => {
    renderRoute('/admin');
    expect(screen.getByText('AdminPage')).toBeInTheDocument();
  });

  // Root redirects to dashboard
  it('GivenRootPath_WhenNavigated_ThenRedirectsToDashboard', () => {
    renderRoute('/');
    expect(screen.getByText('DashboardPage')).toBeInTheDocument();
  });

  // Unknown path redirects to dashboard
  it('GivenUnknownPath_WhenNavigated_ThenRedirectsToDashboard', () => {
    renderRoute('/some-random-page');
    expect(screen.getByText('DashboardPage')).toBeInTheDocument();
  });
});

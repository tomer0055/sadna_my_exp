import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RequireProductionUser from './RequireProductionUser';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

function renderWithRoutes(authState: any) {
  (useAuth as any).mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<RequireProductionUser />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard Redirect</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireProductionUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenProductionUser_WhenAccessingProtectedRoute_ThenRendersOutlet', () => {
    renderWithRoutes({ isProductionUser: true, loading: false });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('GivenNonProductionUser_WhenAccessingProtectedRoute_ThenRedirectsToDashboard', () => {
    renderWithRoutes({ isProductionUser: false, loading: false });

    expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('GivenLoadingState_WhenAccessingProtectedRoute_ThenRendersNothing', () => {
    const { container } = renderWithRoutes({ isProductionUser: false, loading: true });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Redirect')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });
});

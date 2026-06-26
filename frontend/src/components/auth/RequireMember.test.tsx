import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RequireMember from './RequireMember';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

function renderWithRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<RequireMember />}>
          <Route path="/account" element={<div>Account Page</div>} />
          <Route path="/orders/history" element={<div>Order History</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenAuthenticatedMember_WhenAccessingProtectedRoute_ThenRendersChildRoute', () => {
    (useAuth as any).mockReturnValue({ isMember: true, loading: false });

    renderWithRoute('/account');

    expect(screen.getByText('Account Page')).toBeInTheDocument();
  });

  it('GivenUnauthenticatedGuest_WhenAccessingProtectedRoute_ThenRedirectsToLogin', () => {
    (useAuth as any).mockReturnValue({ isMember: false, loading: false });

    renderWithRoute('/account');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Account Page')).not.toBeInTheDocument();
  });

  it('GivenAuthLoading_WhenAccessingProtectedRoute_ThenRendersNothing', () => {
    (useAuth as any).mockReturnValue({ isMember: false, loading: true });

    const { container } = renderWithRoute('/account');

    expect(container.innerHTML).toBe('');
  });
});

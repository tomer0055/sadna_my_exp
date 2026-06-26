import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RequireAdmin from './RequireAdmin';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('./ForbiddenAccess/ForbiddenAccess', () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  )
}));

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<div>Admin Panel</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenAdminUser_WhenAccessingAdminRoute_ThenRendersAdminPanel', () => {
    (useAuth as any).mockReturnValue({ isAdmin: true, loading: false });

    renderWithRoute();

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('GivenNonAdminUser_WhenAccessingAdminRoute_ThenDisplaysForbiddenAccess', () => {
    (useAuth as any).mockReturnValue({ isAdmin: false, loading: false });

    renderWithRoute();

    expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('GivenAuthLoading_WhenAccessingAdminRoute_ThenRendersNothing', () => {
    (useAuth as any).mockReturnValue({ isAdmin: false, loading: true });

    const { container } = renderWithRoute();

    expect(container.innerHTML).toBe('');
  });
});

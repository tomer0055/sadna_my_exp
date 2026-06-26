import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../../components/navigation/Sidebar/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../../components/navigation/TopNavbar/TopNavbar', () => ({
  default: () => <div data-testid="topnavbar">TopNavbar</div>
}));

import MainLayout from './MainLayout';

describe('MainLayout', () => {
  it('GivenLoadingState_WhenRendered_ThenDisplaysLoadingScreen', () => {
    mockUseAuth.mockReturnValue({ loading: true });

    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading platform...')).toBeInTheDocument();
    expect(screen.getByText(/Preparing your ticket session/)).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topnavbar')).not.toBeInTheDocument();
  });

  it('GivenLoadedState_WhenRendered_ThenDisplaysLayoutWithNavigation', () => {
    mockUseAuth.mockReturnValue({ loading: false });

    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topnavbar')).toBeInTheDocument();
    expect(screen.queryByText('Loading platform...')).not.toBeInTheDocument();
  });
});

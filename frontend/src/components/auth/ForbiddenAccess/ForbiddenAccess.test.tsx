import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import ForbiddenAccess from './ForbiddenAccess';

function renderComponent(props = {}) {
  return render(
    <MemoryRouter>
      <ForbiddenAccess {...props} />
    </MemoryRouter>
  );
}

describe('ForbiddenAccess', () => {
  // Default props
  it('GivenNoProps_WhenRendered_ThenDisplaysDefaultContent', () => {
    renderComponent();

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Access Forbidden')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(screen.getByText('Authorized user')).toBeInTheDocument();
  });

  // Custom props
  it('GivenCustomProps_WhenRendered_ThenDisplaysCustomContent', () => {
    renderComponent({
      title: 'Admin Only',
      message: 'You need admin rights.',
      requiredRole: 'System Administrator'
    });

    expect(screen.getByText('Admin Only')).toBeInTheDocument();
    expect(screen.getByText('You need admin rights.')).toBeInTheDocument();
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
  });

  // Navigation links
  it('GivenComponent_WhenRendered_ThenDisplaysNavigationLinks', () => {
    renderComponent();

    const dashboardLink = screen.getByText('Back to Dashboard');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');

    const eventsLink = screen.getByText('Browse Events');
    expect(eventsLink).toBeInTheDocument();
    expect(eventsLink.closest('a')).toHaveAttribute('href', '/events');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  it('GivenForgotPasswordPage_WhenRendered_ThenDisplaysResetMessage', () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    expect(screen.getByText('Reset Access Key')).toBeInTheDocument();
    expect(screen.getByText(/Contact your system administrator/)).toBeInTheDocument();
  });

  it('GivenForgotPasswordPage_WhenRendered_ThenDisplaysReturnToLoginLink', () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    const link = screen.getByText('Return to Gate');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });
});

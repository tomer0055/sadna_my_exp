import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

import ForgotPasswordPage from './ForgotPasswordPage';

describe('ForgotPasswordPage – static content', () => {
  it('GivenPageRendered_WhenViewed_ThenShowsResetInstructions', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Reset Access Key')).toBeInTheDocument();
    expect(screen.getByText(/Contact your system administrator/i)).toBeInTheDocument();
  });

  it('GivenPageRendered_WhenViewed_ThenShowsReturnToLoginLink', () => {
    render(<ForgotPasswordPage />);
    const link = screen.getByText('Return to Gate');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });
});

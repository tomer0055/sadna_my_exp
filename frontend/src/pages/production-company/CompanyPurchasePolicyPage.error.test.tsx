import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ companyId: '1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn(),
  setCompanyPolicyDTO: vi.fn(),
}));

import CompanyPurchasePolicyPage from './CompanyPurchasePolicyPage';
import * as policyApi from '../../api/purchasePoliciesApi';

describe('CompanyPurchasePolicyPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GivenFetchFails_WhenPageLoads_ThenStillShowsFormWithNoPolicy', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockRejectedValue(new Error('Server error'));
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText(/No company purchase policy set yet/)).toBeInTheDocument());
    expect(screen.getByText('SAVE POLICY')).toBeInTheDocument();
  });

  it('GivenNullPolicy_WhenPageLoads_ThenShowsNoPolicyMessage', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue(null);
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText(/No company purchase policy set yet/)).toBeInTheDocument());
  });

  it('GivenExistingPolicy_WhenPageLoads_ThenShowsActivePolicyBanner', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue({
      minAge: 18, maxAge: null, minTickets: 1, maxTickets: 5,
      isAgeOr: false, isQuantityOr: false, isAgeAndQuantityOr: false,
    });
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText('Active Policy')).toBeInTheDocument());
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('GivenSaveFails_WhenFormSubmitted_ThenShowsErrorBanner', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue(null);
    (policyApi.setCompanyPolicyDTO as any).mockRejectedValue(new Error('Validation failed'));
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText('SAVE POLICY')).toBeInTheDocument());
    fireEvent.submit(screen.getByText('SAVE POLICY').closest('form')!);
    await waitFor(() => expect(screen.getByText('Validation failed')).toBeInTheDocument());
  });

  it('GivenSaveSucceeds_WhenFormSubmitted_ThenShowsSuccessToast', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue(null);
    (policyApi.setCompanyPolicyDTO as any).mockResolvedValue({});
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText('SAVE POLICY')).toBeInTheDocument());
    fireEvent.submit(screen.getByText('SAVE POLICY').closest('form')!);
    await waitFor(() => expect(screen.getByText('Company purchase policy saved!')).toBeInTheDocument());
  });

  it('GivenNonErrorThrown_WhenSaveFails_ThenShowsFallbackMessage', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue(null);
    (policyApi.setCompanyPolicyDTO as any).mockRejectedValue('string error');
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText('SAVE POLICY')).toBeInTheDocument());
    fireEvent.submit(screen.getByText('SAVE POLICY').closest('form')!);
    await waitFor(() => expect(screen.getByText('Failed to save policy')).toBeInTheDocument());
  });

  it('GivenPageRendered_WhenBackClicked_ThenNavigatesToCompany', async () => {
    (policyApi.getCompanyPolicyDTO as any).mockResolvedValue(null);
    render(<CompanyPurchasePolicyPage />);
    await waitFor(() => expect(screen.getByText('SAVE POLICY')).toBeInTheDocument());
    fireEvent.click(screen.getByText('BACK TO COMPANY'));
    expect(mockNavigate).toHaveBeenCalledWith('/company/1');
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import CompanyPurchasePolicyPage from './CompanyPurchasePolicyPage';
import { getCompanyPolicyDTO, setCompanyPolicyDTO } from '../../api/purchasePoliciesApi';

vi.mock('../../api/purchasePoliciesApi', () => ({
  getCompanyPolicyDTO: vi.fn(),
  setCompanyPolicyDTO: vi.fn()
}));

const mockExistingPolicy = {
  minTickets: 1,
  maxTickets: 10,
  minAge: null,
  maxAge: null,
  isQuantityOr: false,
  isAgeOr: false,
  isAgeAndQuantityOr: false
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/company/5/purchase-policy']}>
      <Routes>
        <Route path="/company/:companyId/purchase-policy" element={<CompanyPurchasePolicyPage />} />
        <Route path="/company/:companyId" element={<div>Company Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CompanyPurchasePolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenShowsLoadingSpinner', () => {
    (getCompanyPolicyDTO as any).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('COMPANY PURCHASE POLICY')).toBeInTheDocument();
    expect(screen.getByText('Applies to all events of this company')).toBeInTheDocument();
  });

  // No existing policy
  it('GivenNoPolicyExists_WhenPageLoads_ThenDisplaysNoPolicyBanner', async () => {
    (getCompanyPolicyDTO as any).mockRejectedValue(new Error('not found'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No company purchase policy set yet. Define one below.')).toBeInTheDocument();
    });
    expect(screen.getByText('Set Policy')).toBeInTheDocument();
  });

  // Existing policy
  it('GivenPolicyExists_WhenPageLoads_ThenDisplaysActivePolicyBanner', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(mockExistingPolicy);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Active Policy')).toBeInTheDocument();
    });
    expect(screen.getByText('Replace Policy')).toBeInTheDocument();
  });

  // Page heading
  it('GivenPolicyPage_WhenRendered_ThenDisplaysHeading', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('COMPANY PURCHASE POLICY')).toBeInTheDocument();
    });
  });

  // Save policy button
  it('GivenPolicyForm_WhenRendered_ThenDisplaysSaveButton', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SAVE POLICY')).toBeInTheDocument();
    });
  });

  // Save policy calls API
  it('GivenValidPolicy_WhenSaveClicked_ThenCallsSetCompanyPolicyApi', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);
    (setCompanyPolicyDTO as any).mockResolvedValue({});

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SAVE POLICY')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SAVE POLICY'));

    await waitFor(() => {
      expect(setCompanyPolicyDTO).toHaveBeenCalledWith(5, expect.any(Object));
    });
  });

  // Save success shows toast
  it('GivenSaveSuccess_WhenPolicySaved_ThenDisplaysSuccessToast', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);
    (setCompanyPolicyDTO as any).mockResolvedValue({});

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SAVE POLICY')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SAVE POLICY'));

    await waitFor(() => {
      expect(screen.getByText('Company purchase policy saved!')).toBeInTheDocument();
    });
  });

  // Save failure shows error
  it('GivenSaveFails_WhenPolicySaveAttempted_ThenDisplaysError', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);
    (setCompanyPolicyDTO as any).mockRejectedValue(new Error('Server error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SAVE POLICY')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SAVE POLICY'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  // BACK TO COMPANY button
  it('GivenPolicyPage_WhenRendered_ThenShowsBackButton', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/BACK TO COMPANY/)).toBeInTheDocument();
    });
  });

  // Policy builder step labels
  it('GivenPolicyForm_WhenRendered_ThenShowsPolicyBuilderSteps', async () => {
    (getCompanyPolicyDTO as any).mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Set Policy Values/)).toBeInTheDocument();
    });
  });
});

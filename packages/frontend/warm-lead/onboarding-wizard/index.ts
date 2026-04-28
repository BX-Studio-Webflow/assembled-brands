import type { AxiosError } from 'axios';
import ApiService from 'shared/services/ApiService';

import { setCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryElement } from '$utils/selectors';

type WarmLeadPayload = {
  deal_id: number;
  legal_name: string;
  incorporation_state: string;
  net_revenue_last_12_months: string;
  working_with_team_member: boolean;
  team_member_email?: string;
};

const initWarmLeadOnboardingPage = async () => {
  const form = document.querySelector('[dev-target="onboarding-form"]');
  if (!form || !(form instanceof HTMLFormElement)) {
    console.error('Warm-lead onboarding form not found: [dev-target="onboarding-form"]');
    return;
  }

  // deal_id comes from the invite link: ?deal_id=123
  const dealIdParam = new URLSearchParams(window.location.search).get('deal_id');
  const dealId = dealIdParam ? parseInt(dealIdParam, 10) : null;

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLInputElement>('[dev-target="back-button"]', form);
  const legalName = queryElement<HTMLInputElement>('[dev-target="legal-name-input"]', form);
  const companyHq = queryElement<HTMLSelectElement>('select[dev-target="company-hq"]', form);
  const netRevenue = queryElement<HTMLInputElement>('[dev-target="company-net-revenue"]', form);
  const memberRadios = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name="working-with-member"]')
  );
  const memberSelect = queryElement<HTMLSelectElement>('select[dev-target="which-member"]', form);
  const memberFieldWrapper = memberSelect?.closest('.input-onboarding_wrapper');

  if (
    !submitButton ||
    !backButton ||
    !legalName ||
    !companyHq ||
    !netRevenue ||
    memberRadios.length === 0 ||
    !memberSelect
  ) {
    console.error('Required onboarding controls not found');
    return;
  }

  if (!dealId || Number.isNaN(dealId)) {
    submitButton.classList.add('is-error');
    submitButton.value = 'Invalid invite link — deal ID missing';
    submitButton.disabled = true;
    return;
  }

  form.querySelector('[dev-target="step-2"]')?.classList.add('hide');
  form.querySelector('[dev-target="step-3"]')?.classList.add('hide');

  const toggleMemberField = () => {
    const checked = form.querySelector<HTMLInputElement>(
      'input[name="working-with-member"]:checked'
    );
    if (!memberFieldWrapper) return;
    memberFieldWrapper.classList.toggle('hide', checked?.value !== 'yes');
  };

  memberRadios.forEach((radio) => radio.addEventListener('change', toggleMemberField));
  toggleMemberField();

  backButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigateToPath('/login');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const submitter = (event as SubmitEvent).submitter as HTMLInputElement | null;
    if (submitter?.getAttribute('dev-target') === 'back-button') {
      navigateToPath('/login');
      return;
    }

    await handleSubmit();
  });

  const handleSubmit = async () => {
    const resetErrors = () => {
      legalName.classList.remove('is-error');
      companyHq.classList.remove('is-error');
      netRevenue.classList.remove('is-error');
      memberRadios.forEach((r) => r.classList.remove('is-error'));
      memberSelect.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'NEXT';
    };

    legalName.addEventListener('input', resetErrors, { once: true });
    companyHq.addEventListener('change', resetErrors, { once: true });
    netRevenue.addEventListener('input', resetErrors, { once: true });
    memberRadios.forEach((r) => r.addEventListener('change', resetErrors, { once: true }));
    memberSelect.addEventListener('change', resetErrors, { once: true });

    const workingWith = form.querySelector<HTMLInputElement>(
      'input[name="working-with-member"]:checked'
    );

    if (!legalName.value.trim()) {
      legalName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Legal name is required';
      return;
    }

    if (!companyHq.value) {
      companyHq.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'State is required';
      return;
    }

    if (netRevenue.value === '' || Number.isNaN(Number(netRevenue.value))) {
      netRevenue.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Net revenue is required';
      return;
    }

    if (!workingWith) {
      memberRadios.forEach((r) => r.classList.add('is-error'));
      submitButton.classList.add('is-error');
      submitButton.value = 'Please answer this question';
      return;
    }

    const isWorkingWithMember = workingWith.value === 'yes';

    if (isWorkingWithMember && !memberSelect.value) {
      memberSelect.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Choose a team member';
      return;
    }

    const payload: WarmLeadPayload = {
      deal_id: dealId,
      legal_name: legalName.value.trim(),
      incorporation_state: companyHq.value,
      net_revenue_last_12_months: netRevenue.value,
      working_with_team_member: isWorkingWithMember,
      ...(isWorkingWithMember ? { team_member_email: memberSelect.value } : {}),
    };

    type WarmLeadResponse = {
      token: string;
      user: Record<string, unknown>;
      teams: { team_id: number }[];
    };

    try {
      const response = await ApiService.fetchDataWithAxios<WarmLeadResponse>({
        url: '/onboarding-wizard/warm-lead',
        method: 'post',
        data: payload,
      });

      setCookie('accessToken', response.token, 10);
      localStorage.setItem('user', JSON.stringify(response.user));

      const team = response.teams?.[0];
      if (team) {
        localStorage.setItem('x-team-id', team.team_id.toString());
      }

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved!';
      setTimeout(() => {
        navigateToPath('/warm/finance-docs-financial-report');
      }, 400);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  };
};

window.Webflow ||= [];
window.Webflow.push(async () => {
  try {
    await initWarmLeadOnboardingPage();
  } catch (error) {
    console.error(error);
  }
});

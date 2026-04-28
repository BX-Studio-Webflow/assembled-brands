import type { AxiosError } from 'axios';
import ApiService from 'shared/services/ApiService';
import { apiGetOnboardingProgress } from 'shared/services/OnboardingService';

import { getCookie, setCookie } from '$utils/auth';
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

  const isLoggedIn = getCookie('accessToken');

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

  // First-time invite flow requires deal_id. Returning logged-in users can continue
  // from saved progress even if URL no longer has query params.
  if (!isLoggedIn && (!dealId || Number.isNaN(dealId))) {
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

  const loadWarmLeadProgress = async () => {
    // Warm lead can arrive unauthenticated from invite link; prefill only after
    // first save/login when accessToken exists.
    if (!getCookie('accessToken')) {
      console.error('No access token found, skipping warm-lead progress load');
      return;
    }
    try {
      const result = await apiGetOnboardingProgress();
      const step1 = result?.progress?.step1 as
        | {
            legal_name?: string | null;
            employee_count?: string | null;
            website?: string | null;
            incorporation_state?: string | null;
            net_revenue_last_12_months?: string | null;
            working_with_team_member?: boolean;
            team_member_email?: string | null;
          }
        | undefined;
      const progressData = result?.progress?.progress_data as
        | {
            legal_name?: string | null;
            incorporation_state?: string | null;
            net_revenue_last_12_months?: string | null;
            working_with_team_member?: boolean;
            team_member_email?: string | null;
          }
        | undefined;
      if (!step1 && !progressData) return;

      const legalNameValue = step1?.legal_name ?? progressData?.legal_name ?? null;
      const incorporationStateValue =
        step1?.incorporation_state ?? progressData?.incorporation_state ?? null;
      const netRevenueValue =
        step1?.net_revenue_last_12_months ?? progressData?.net_revenue_last_12_months ?? null;
      const workingWithTeamMemberValue =
        step1?.working_with_team_member ?? progressData?.working_with_team_member ?? false;
      const teamMemberEmailValue =
        step1?.team_member_email ?? progressData?.team_member_email ?? null;

      if (legalNameValue) legalName.value = legalNameValue;
      if (incorporationStateValue) companyHq.value = incorporationStateValue;
      if (netRevenueValue) {
        netRevenue.value = netRevenueValue;
      }

      if (workingWithTeamMemberValue) {
        const yes = memberRadios.find((r) => r.value === 'yes');
        if (yes) yes.checked = true;
        if (teamMemberEmailValue) memberSelect.value = teamMemberEmailValue;
      } else {
        const no = memberRadios.find((r) => r.value === 'no');
        if (no) no.checked = true;
      }
      toggleMemberField();
    } catch (error) {
      console.error('Failed to preload warm-lead onboarding progress:', error);
    }
  };

  await loadWarmLeadProgress();

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

    const commonPayload = {
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
      if (isLoggedIn) {
        await ApiService.fetchDataWithAxios({
          url: '/onboarding-wizard/warm-lead/me',
          method: 'post',
          data: commonPayload,
        });
      } else {
        const payload: WarmLeadPayload = {
          deal_id: dealId as number,
          ...commonPayload,
        };
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

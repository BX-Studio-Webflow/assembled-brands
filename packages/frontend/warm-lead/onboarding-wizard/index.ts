import type { AxiosError } from 'axios';
import ApiService from 'shared/services/ApiService';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { fetchProgressData } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

/** Warm-lead onboarding fields — align with API when backend is ready */
type WarmLeadOnboardingPayload = Record<string, unknown>;

const initWarmLeadOnboardingPage = async () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="onboarding-form"]');
  if (!form || !(form instanceof HTMLFormElement)) {
    console.error('Warm-lead onboarding form not found: [dev-target="onboarding-form"]');
    return;
  }

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

  form.querySelector('[dev-target="step-2"]')?.classList.add('hide');
  form.querySelector('[dev-target="step-3"]')?.classList.add('hide');

  const toggleMemberField = () => {
    const checked = form.querySelector<HTMLInputElement>(
      'input[name="working-with-member"]:checked'
    );
    if (!memberFieldWrapper) return;
    if (checked?.value === 'yes') {
      memberFieldWrapper.classList.remove('hide');
    } else {
      memberFieldWrapper.classList.add('hide');
    }
  };

  memberRadios.forEach((radio) => radio.addEventListener('change', toggleMemberField));
  toggleMemberField();

  try {
    const result = await fetchProgressData();
    const progress = result?.onboardingProgress?.progress;
    if (progress?.step1?.legal_name) {
      legalName.value = progress.step1.legal_name;
    }
  } catch {
    // non-blocking
  }

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

    if (workingWith.value === 'yes' && !memberSelect.value) {
      memberSelect.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Choose a team member';
      return;
    }

    const payload: WarmLeadOnboardingPayload = {
      legal_name: legalName.value.trim(),
      incorporation_state: companyHq.value,
      net_revenue_last_12_months: netRevenue.value,
      working_with_team_member: workingWith.value,
      team_member_slug: workingWith.value === 'yes' ? memberSelect.value : null,
    };

    try {
      await ApiService.fetchDataWithAxios({
        url: '/onboarding-wizard/step1',
        method: 'post',
        data: payload,
      });
      submitButton.classList.add('is-success');
      submitButton.value = 'Saved!';
      setTimeout(() => {
        navigateToPath('/finance-company-profile');
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

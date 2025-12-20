import { apiGetFinancialProgress } from 'shared/services/FinancialWizardService';

import { queryElement } from './selectors';

export const isValidEmail = (email: string) => {
  if (!email) {
    return false;
  }
  //check if email is valid regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }
  return true;
};

export const progressFinancialWizardPercentage = async () => {
  try {
    //get progress percentage
    const response = await apiGetFinancialProgress();

    const percentage = response?.percentage || 0;
    const progressFill = queryElement<HTMLDivElement>('[dev-target="progress-percentage-fill"]');
    const progressLabel = queryElement<HTMLDivElement>('[dev-target="progress-percentage-label"]');
    if (!progressFill || !progressLabel) {
      console.error(
        'Ensure [dev-target="progress-percentage-fill"] and [dev-target="progress-percentage-label"] are present.'
      );
      return;
    }
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Progress ${percentage}%`;
  } catch (error) {
    console.error('Failed to load financial wizard progress:', error);
  }
};

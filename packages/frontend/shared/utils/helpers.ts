import { apiGetFinancialProgress } from 'shared/services/FinancialWizardService';

import { logoutUser } from './auth';
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
    const logout = queryElement<HTMLButtonElement>('[dev-target="logout"]');
    if (!progressFill || !progressLabel || !logout) {
      console.error(
        'Ensure [dev-target="progress-percentage-fill"], [dev-target="progress-percentage-label"], and [dev-target="logout"] are present.'
      );
      return;
    }
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Progress ${percentage}%`;
    logout.addEventListener('click', () => {
      logoutUser();
    });
  } catch (error) {
    console.error('Failed to load financial wizard progress:', error);
  }
};

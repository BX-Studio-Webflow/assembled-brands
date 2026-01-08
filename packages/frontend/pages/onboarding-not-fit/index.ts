import { navigateToPath } from '$utils/config';

const initOnboardingNotFitPage = () => {
  const homeCTA = document.querySelector('[dev-target="home-cta"]');
  if (!homeCTA) {
    console.error('Home CTA button not found');
    return;
  }

  homeCTA.addEventListener('click', async () => {
    navigateToPath('/onboarding-wizard?step=3');
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initOnboardingNotFitPage();
  } catch (error) {
    console.error(error);
  }
});

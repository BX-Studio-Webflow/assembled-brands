import type {
  CompleteApplicationResponse,
  OnboardingProgressApiResponse,
  OnboardingResetResponse,
  OnboardingStep1Body,
  OnboardingStep1Response,
  OnboardingStep2Body,
  OnboardingStep2Response,
  OnboardingStep3Body,
  OnboardingStep3Response,
  UpdateStepBody,
  UpdateStepResponse,
} from '../types/onboarding';
import ApiService from './ApiService';

export const apiSaveOnboardingStep1 = (data: OnboardingStep1Body) => {
  return ApiService.fetchDataWithAxios<OnboardingStep1Response>({
    url: '/onboarding-wizard/step1',
    method: 'post',
    data,
  });
};

export const apiSaveOnboardingStep2 = (data: OnboardingStep2Body) => {
  return ApiService.fetchDataWithAxios<OnboardingStep2Response>({
    url: '/onboarding-wizard/step2',
    method: 'post',
    data,
  });
};

export const apiSaveOnboardingStep3 = (data: OnboardingStep3Body) => {
  return ApiService.fetchDataWithAxios<OnboardingStep3Response>({
    url: '/onboarding-wizard/step3',
    method: 'post',
    data,
  });
};

export const apiGetOnboardingProgress = () => {
  return ApiService.fetchDataWithAxios<OnboardingProgressApiResponse>({
    url: '/onboarding-wizard/progress',
    method: 'get',
  });
};

export const apiUpdateOnboardingStep = (data: UpdateStepBody) => {
  return ApiService.fetchDataWithAxios<UpdateStepResponse>({
    url: '/onboarding-wizard/step',
    method: 'post',
    data,
  });
};

export const apiCompleteOnboardingApplication = () => {
  return ApiService.fetchDataWithAxios<CompleteApplicationResponse>({
    url: '/onboarding-wizard/complete',
    method: 'post',
  });
};

export const apiResetOnboarding = () => {
  return ApiService.fetchDataWithAxios<OnboardingResetResponse>({
    url: '/onboarding/reset',
    method: 'post',
  });
};

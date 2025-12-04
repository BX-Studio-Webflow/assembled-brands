import ApiService from './ApiService'
import type {
    OnboardingStep1Body,
    OnboardingStep1Response,
    OnboardingStep2Body,
    OnboardingStep2Response,
    OnboardingStep3Body,
    OnboardingStep3Response,
    OnboardingProgressApiResponse,
    OnboardingResetResponse,
} from '../types/onboarding'

export const apiSaveOnboardingStep1 = (data: OnboardingStep1Body) => {
    return ApiService.fetchDataWithAxios<OnboardingStep1Response>({
        url: '/onboarding/step1',
        method: 'post',
        data,
    })
}

export const apiSaveOnboardingStep2 = (data: OnboardingStep2Body) => {
    return ApiService.fetchDataWithAxios<OnboardingStep2Response>({
        url: '/onboarding/step2',
        method: 'post',
        data,
    })
}

export const apiSaveOnboardingStep3 = (data: OnboardingStep3Body) => {
    return ApiService.fetchDataWithAxios<OnboardingStep3Response>({
        url: '/onboarding/step3',
        method: 'post',
        data,
    })
}

export const apiGetOnboardingProgress = () => {
    return ApiService.fetchDataWithAxios<OnboardingProgressApiResponse>({
        url: '/onboarding/progress',
        method: 'get',
    })
}

export const apiResetOnboarding = () => {
    return ApiService.fetchDataWithAxios<OnboardingResetResponse>({
        url: '/onboarding/reset',
        method: 'post',
    })
}


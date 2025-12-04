import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'
import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
    BusinessDetails,
    UploadProfileImageBody,
    ResetPasswordInAppBody,
    InitiateStripeConnectResponse,
    GoogleInitiateResponse,
    GoogleContinueResponse,
    UpdateUserProfileBody,
    UpdateUserProfileResponse,
    DashboardResponse,
    SaveOauthStateBody,
    SaveOauthStateResponse,
    UpdateSettingsNotificationBody,
} from '@/@types/auth'
import { UploadBusinessLogoRequest } from '@/@types/business'

export async function apiSignIn(data: SignInCredential) {
    return ApiService.fetchDataWithAxios<SignInResponse>({
        url: endpointConfig.signIn,
        method: 'post',
        data,
    })
}

export async function apiSignUp(data: SignUpCredential) {
    return ApiService.fetchDataWithAxios<SignUpResponse>({
        url: endpointConfig.signUp,
        method: 'post',
        data,
    })
}

export async function apiSignOut() {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signOut,
        method: 'post',
    })
}

export async function apiForgotPassword<T>(data: ForgotPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.forgotPassword,
        method: 'post',
        data,
    })
}

export async function apiResetPassword<T>(data: ResetPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.resetPassword,
        method: 'post',
        data,
    })
}

export async function apiUpdateSettingsNotification<T>(
    data: UpdateSettingsNotificationBody,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.updateSettingsNotification,
        method: 'put',
        data,
    })
}

export async function apiSaveBusinessDetails(data: BusinessDetails) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.saveBusinessDetails,
        method: 'post',
        data,
    })
}

export async function apiGetUserMe<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.saveBusinessDetails,
        method: 'get',
    })
}

export async function apiUploadProfileImage<T>(data: UploadProfileImageBody) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/user/upload-profile-image',
        method: 'post',
        data,
    })
}

export async function apiUploadBusinessProfileImage<T>(
    data: UploadBusinessLogoRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/business/logo',
        method: 'post',
        data,
    })
}

export async function apiUpdatePasswordInApp<T>(data: ResetPasswordInAppBody) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/user/reset-password-in-app',
        method: 'post',
        data,
    })
}

export async function apiGetStripeSubscriptions<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/subscription',
        method: 'get',
    })
}

export async function apiInitateStripeConnect() {
    return ApiService.fetchDataWithAxios<InitiateStripeConnectResponse>({
        url: '/stripe/connect/oauth',
        method: 'get',
    })
}

export async function apiGoogleInitiate() {
    return ApiService.fetchDataWithAxios<GoogleInitiateResponse>({
        url: '/user/auth/google',
        method: 'get',
    })
}

export async function apiGoogleContinue(code: string) {
    return ApiService.fetchDataWithAxios<GoogleContinueResponse>({
        url: `/user/auth/google/callback?code=${code}`,
        method: 'get',
    })
}

export async function apiUpdateUserProfile(data: UpdateUserProfileBody) {
    return ApiService.fetchDataWithAxios<UpdateUserProfileResponse>({
        url: '/user/details',
        method: 'put',
        data,
    })
}

export async function apiGetDashboard() {
    return ApiService.fetchDataWithAxios<DashboardResponse>({
        url: `/user/dashboard`,
        method: 'get',
    })
}

export async function apiSaveStripeOauthState(data: SaveOauthStateBody) {
    return ApiService.fetchDataWithAxios<SaveOauthStateResponse>({
        url: `/stripe/connect/oauth/callback?code=${data.code}&state=${data.state}`,
        method: 'get',
        data,
    })
}

export async function apiGetLandingPage() {
    return ApiService.fetchDataWithAxios<string>({
        url: '/proxy/landing',
        method: 'get',
    })
}

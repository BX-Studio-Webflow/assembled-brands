import type {
  BusinessDetails,
  ClaimYourAccountBody,
  ClaimYourAccountResponse,
  ColdLeadRegisterBody,
  ColdLeadRegisterResponse,
  DashboardResponse,
  ForgotPassword,
  InitiateStripeConnectResponse,
  ResetPassword,
  ResetPasswordInAppBody,
  SaveOauthStateBody,
  SaveOauthStateResponse,
  SendVerificationCodeBody,
  SendVerificationCodeResponse,
  SignInCredential,
  SignInResponse,
  StartAccountRecoveryBody,
  StartAccountRecoveryResponse,
  UpdateSettingsNotificationBody,
  UpdateUserProfileBody,
  UpdateUserProfileResponse,
  UploadProfileImageBody,
  VerifyRegistrationBody,
  VerifyRegistrationResponse,
} from '../types/auth';
import type { UploadBusinessLogoRequest } from '../types/business';
import ApiService from './ApiService';

export async function apiSignIn(data: SignInCredential) {
  return ApiService.fetchDataWithAxios<SignInResponse>({
    url: '/user/login',
    method: 'post',
    data,
  });
}

export async function apiSignOut() {
  return ApiService.fetchDataWithAxios({
    url: '/auth/sign-out',
    method: 'post',
  });
}

export async function apiForgotPassword<T>(data: ForgotPassword) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/user/request-reset-password',
    method: 'post',
    data,
  });
}

export async function apiResetPassword<T>(data: ResetPassword) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/user/reset-password',
    method: 'post',
    data,
  });
}

export async function apiUpdateSettingsNotification<T>(data: UpdateSettingsNotificationBody) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/auth/update-settings-notification',
    method: 'put',
    data,
  });
}

export async function apiSaveBusinessDetails(data: BusinessDetails) {
  return ApiService.fetchDataWithAxios({
    url: '/business/my',
    method: 'post',
    data,
  });
}

export async function apiGetUserMe<T>() {
  return ApiService.fetchDataWithAxios<T>({
    url: '/user/me',
    method: 'get',
  });
}

export async function apiUploadProfileImage<T>(data: UploadProfileImageBody) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/user/upload-profile-image',
    method: 'post',
    data,
  });
}

export async function apiUploadBusinessProfileImage<T>(data: UploadBusinessLogoRequest) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/business/logo',
    method: 'post',
    data,
  });
}

export async function apiUpdatePasswordInApp<T>(data: ResetPasswordInAppBody) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/user/reset-password-in-app',
    method: 'post',
    data,
  });
}

export async function apiGetStripeSubscriptions<T>() {
  return ApiService.fetchDataWithAxios<T>({
    url: '/subscription',
    method: 'get',
  });
}

export async function apiInitateStripeConnect() {
  return ApiService.fetchDataWithAxios<InitiateStripeConnectResponse>({
    url: '/stripe/connect/oauth',
    method: 'get',
  });
}

export async function apiUpdateUserProfile(data: UpdateUserProfileBody) {
  return ApiService.fetchDataWithAxios<UpdateUserProfileResponse>({
    url: '/user/details',
    method: 'put',
    data,
  });
}

export async function apiGetDashboard() {
  return ApiService.fetchDataWithAxios<DashboardResponse>({
    url: `/user/dashboard`,
    method: 'get',
  });
}

export async function apiSaveStripeOauthState(data: SaveOauthStateBody) {
  return ApiService.fetchDataWithAxios<SaveOauthStateResponse>({
    url: `/stripe/connect/oauth/callback?code=${data.code}&state=${data.state}`,
    method: 'get',
    data,
  });
}

export async function apiGetLandingPage() {
  return ApiService.fetchDataWithAxios<string>({
    url: '/proxy/landing',
    method: 'get',
  });
}

export async function apiColdLeadRegister(data: ColdLeadRegisterBody) {
  return ApiService.fetchDataWithAxios<ColdLeadRegisterResponse>({
    url: '/user/cold-lead-register',
    method: 'post',
    data,
  });
}

export async function apiVerifyRegistration(data: VerifyRegistrationBody) {
  return ApiService.fetchDataWithAxios<VerifyRegistrationResponse>({
    url: '/user/verify-registration',
    method: 'post',
    data,
  });
}

export async function apiHotLeadRegister(data: ClaimYourAccountBody) {
  return ApiService.fetchDataWithAxios<ClaimYourAccountResponse>({
    url: '/user/claim-your-account',
    method: 'post',
    data,
  });
}

export async function apiSendVerificationCode(data: SendVerificationCodeBody) {
  return ApiService.fetchDataWithAxios<SendVerificationCodeResponse>({
    url: '/user/send-verification-code',
    method: 'post',
    data,
  });
}

export async function apiStartAccountRecovery(data: StartAccountRecoveryBody) {
  return ApiService.fetchDataWithAxios<StartAccountRecoveryResponse>({
    url: '/user/start-account-recovery',
    method: 'post',
    data,
  });
}

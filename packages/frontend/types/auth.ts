export type SignInCredential = {
  email: string;
  password: string;
};

export type SignUpCredential = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dial_code: string;
};

export type ForgotPassword = {
  email: string;
};

export type ResetPassword = {
  password: string;
  token: number;
  email: string;
};

export type UpdateSettingsNotificationBody = {
  is_follow_up_emails_enabled: boolean;
  is_post_event_emails_enabled: boolean;
  follow_up_template: string;
  post_event_template: string;
  follow_up_who_gets_it: Array<
    'new_lead' | 'call_back' | 'registered_for_event' | 'attended_event'
  >;
  post_event_who_gets_it: Array<
    'new_lead' | 'call_back' | 'registered_for_event' | 'attended_event'
  >;
};

export type User = {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  is_verified: boolean;
  role: string;
  phone: string;
  dial_code: string;
  profile_picture: string;
  authority: string[];
  bio: string | null;
  is_banned: boolean;
  is_deleted: boolean;
  stripe_connect_id: string | null;
  subscription_status: 'active' | 'inactive' | 'expired' | null;
  auth_provider: 'email';
};

export type Token = {
  accessToken: string;
};

export type SignInResponse = {
  data: {
    token: string;
    user: User;
  };
};

export type SignUpResponse = {
  data: {
    token: string;
    user: User;
  };
};

export type BusinessDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  logoFileName: string;
};
export type AuthResponse = {
  status: 'success' | 'failed';
  message: string;
};

export type BusinessDetailsResponse = {
  message: string;
  business: {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logo_asset_id: number;
    user_id: number;
    updated_at: string;
    created_at: string;
    logo: string;
    teamDetails: {
      id: number;
      team_id: number;
      user_id: number;
      role: string;
      created_at: string;
      updated_at: string;
      team: {
        id: number;
        name: string;
        created_at: string;
        updated_at: string;
      };
      user: {
        email: string;
        name: string;
      };
    };
  };
};

export type AuthResult = Promise<AuthResponse>;
export type BusinessDetailsResult = Promise<BusinessDetailsResponse>;

export type OauthSignInCallbackPayload = {
  onSignIn: (token: Token, user?: User) => void;
  redirect: () => void;
};

export type UploadProfileImageBody = {
  imageBase64: string;
  fileName: string;
};

export type ResetPasswordInAppBody = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type InitiateStripeConnectResponse = {
  url: string;
};

export type UpdateUserProfileBody = {
  first_name: string;
  last_name: string;
  email: string;
  dial_code: string;
  phone: string;
};

export type UpdateUserProfileResponse = {
  data: {
    success: boolean;
    message: string;
    user: {
      id: number;
      email: string;
      name: string;
      createdAt: string;
      is_verified: boolean;
      role: string;
      phone: string;
      profile_picture: string;
      bio: string | null;
      is_banned: boolean;
      is_deleted: boolean;
      stripe_connect_id: string;
      subscription_status: 'active' | 'inactive' | 'expired';
      auth_provider: 'email';
    };
  };
};

export type DashboardResponse = {
  profile: {
    id: number;
    name: string;
    email: string;
    role: string;
    profile_picture: string;
    is_verified: boolean;
    is_banned: boolean;
    is_deleted: boolean;
    business: {
      id: number;
      name: string;
      address: string;
      phone: string;
      dial_code: string;
      email: string;
      description: string | null;
      logo_asset_id: number;
      user_id: number;
      updated_at: string;
      created_at: string;
    } | null;
    stripe_connect_status: 'pending' | 'active' | 'rejected' | 'restricted';
    subscription_status:
      | 'trialing'
      | 'active'
      | 'past_due'
      | 'canceled'
      | 'incomplete'
      | 'incomplete_expired'
      | 'paused'
      | 'unpaid';
    trial_ends_at: string | null;
  };
  content: {
    total_events: number;
    total_podcasts: number;
    total_courses: number;
    total_leads: number;
    total_contacts: number;
  };
  revenue: {
    total_revenue: string;
    revenue_last_30_days: string;
    active_memberships: number;
    successful_payments: number;
    failed_payments: number;
    recent_successful_payments: Array<{
      id: number;
      contact_id: number;
      lead_id: number;
      event_id: number;
      membership_id: number;
      beneficiary_id: number;
      stripe_customer_id: string;
      checkout_session_id: string;
      amount: string;
      currency: string;
      status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
      payment_type: 'one_off' | 'subscription';
      metadata: {
        dates: number[];
        eventName: string;
        sessionId: string;
        membershipName: string;
      };
      created_at: string;
      updated_at: string;
    }>;
    recent_failed_payments: Array<{
      id: number;
      contact_id: number;
      lead_id: number;
      event_id: number;
      membership_id: number;
      beneficiary_id: number;
      stripe_customer_id: string;
      checkout_session_id: string;
      amount: string;
      currency: string;
      status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
      payment_type: 'one_off' | 'subscription';
      metadata: {
        dates: number[];
        eventName: string;
        sessionId: string;
        membershipName: string;
      };
      created_at: string;
      updated_at: string;
    }>;
  };
  engagement: {
    active_bookings: number;
    new_bookings_last_30_days: number;
    pending_callbacks: number;
    team_members: number;
    pending_invitations: number;
    new_leads_last_30_days: number;
    new_contacts_last_30_days: number;
  };
  content_status: {
    events: {
      draft: number;
      published: number;
      suspended: number;
      cancelled: number;
    };
    podcasts: {
      draft: number;
      published: number;
      archived: number;
    };
    courses: {
      draft: number;
      published: number;
      archived: number;
    };
  };
  events: {
    events_flat: Array<{
      event_id: number;
      event_name: string;
      event_type: string;
      status: string;
      created_at: string;
      registrations: number;
      attendees: number;
      non_attendees: number;
      fallthrough_rate: number;
      earnings: number;
      upcoming_dates: {
        id: number;
        date: string;
        lead_count: number;
        membership_name: string;
      }[];
      dateItem: {
        id: number;
        date: string;
        lead_count: number;
        membership_name: string;
      };
      membership_name: string[];
    }>;
    totals: {
      total_registrations: number;
      total_attendees: number;
      total_non_attendees: number;
      total_earnings: number;
      overall_fallthrough_rate: number;
    };
  };
  event_counts: {
    upcoming: number;
    total: number;
    cancelled: number;
  };
};
export type SaveOauthStateBody = {
  code: string;
  state: string;
};

export type SaveOauthStateResponse = {
  success: boolean;
  accountId: string;
};

export type ColdLeadRegisterBody = {
  work_email: string;
};

export type ColdLeadRegisterResponse = {
  success: boolean;
  message: string;
};

export type VerifyRegistrationBody = {
  token: number;
  id: number;
  password: string;
};

export type VerifyRegistrationResponse = {
  token: string;
  user: User;
};

export type ClaimYourAccountBody = {
  work_email: string;
  first_name: string;
  last_name: string;
  password: string;
  loan_urgency: 'yesterday' | 'this-month' | '3-months' | 'this-year';
};

export type ClaimYourAccountResponse = {
  token: string;
  user: User;
};

export type SendVerificationCodeBody = {
  email: string;
};

export type SendVerificationCodeResponse = {
  success: boolean;
  message: string;
};

export type StartAccountRecoveryBody = {
  email: string;
};

export type StartAccountRecoveryResponse = {
  success: boolean;
  message: string;
};

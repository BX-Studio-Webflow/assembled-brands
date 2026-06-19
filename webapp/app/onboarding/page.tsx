import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BrandHeader from "@/components/BrandHeader";
import { getOnboardingProgress } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import type { OnboardingFormValues, OnboardingStep1, SubmitMode } from "@/lib/types";

import OnboardingForm from "./OnboardingForm";
import styles from "./onboarding.module.css";

const EMPTY_VALUES: OnboardingFormValues = {
  legalName: "",
  incorporationState: "",
  netRevenue: "",
  workingWithTeamMember: null,
  teamMemberEmail: "",
};

// The backend splits saved data across `step1` (legal_name only) and the full
// `progress_data` record. Merge per-field, preferring step1, then progress_data
// — same fallback the original warm-lead bundle used.
function mapProgress(
  step1: OnboardingStep1 | null | undefined,
  data: OnboardingStep1 | null | undefined
): OnboardingFormValues {
  if (!step1 && !data) return EMPTY_VALUES;
  const working = step1?.working_with_team_member ?? data?.working_with_team_member;
  return {
    legalName: step1?.legal_name ?? data?.legal_name ?? "",
    incorporationState: step1?.incorporation_state ?? data?.incorporation_state ?? "",
    netRevenue: step1?.net_revenue_last_12_months ?? data?.net_revenue_last_12_months ?? "",
    workingWithTeamMember: typeof working === "boolean" ? working : null,
    teamMemberEmail: step1?.team_member_email ?? data?.team_member_email ?? "",
  };
}

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;

  // No session — send the user to the /start gate to enter their deal ID.
  if (!token) redirect("/start");

  const mode: SubmitMode = "authenticated";

  // Fetch saved progress on the server so the form renders fully populated
  // before first paint (this is what removes the post-load pop-in).
  let initialValues = EMPTY_VALUES;
  try {
    const progress = await getOnboardingProgress(token);
    initialValues = mapProgress(
      progress?.progress?.step1,
      progress?.progress?.progress_data
    );
  } catch {
    initialValues = EMPTY_VALUES;
  }

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <OnboardingForm
          token={token}
          dealId={null}
          mode={mode}
          initialValues={initialValues}
          invalidInvite={false}
        />
      </main>
    </div>
  );
}

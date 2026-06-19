import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import {
  getDocumentSectionStatuses,
  type DocumentNavKey,
  type SectionStatus,
} from "@/lib/documentSections";
import { getFinancialProgress } from "@/lib/financeApi";
import { getTeamInvitations } from "@/lib/teamApi";
import type { TeamInvitation } from "@/lib/teamTypes";

import InviteTeamMembers from "./InviteTeamMembers";

export const dynamic = "force-dynamic";

export default async function InviteTeamMembersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;

  if (!token) {
    redirect("/onboarding");
  }

  // Fetch invitations + sidebar context on the server so the page renders fully
  // populated — no pop-in. Both calls are best-effort: a fresh host with no
  // invitations (or a transient error) renders the empty invite form.
  let invitations: TeamInvitation[] = [];
  try {
    const result = await getTeamInvitations(token);
    if (Array.isArray(result)) invitations = result;
  } catch {
    invitations = [];
  }

  let percentage = 10;
  let companyName = "Your application";
  let sectionStatuses: Record<DocumentNavKey, SectionStatus> | undefined;
  try {
    const progress = await getFinancialProgress(token);
    percentage = progress?.percentage ?? percentage;
    companyName =
      progress?.company_profile?.legal_name ||
      progress?.company_profile?.name ||
      progress?.business?.legal_name ||
      progress?.business?.name ||
      companyName;
    sectionStatuses = getDocumentSectionStatuses(progress);
  } catch {
    // keep defaults
  }

  return (
    <AppShell
      activeKey="invite-team-members"
      percentage={percentage}
      companyName={companyName}
      contactEmail="Document Upload Center"
      sectionStatuses={sectionStatuses}
    >
      <InviteTeamMembers initialInvitations={invitations} />
    </AppShell>
  );
}

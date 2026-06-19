import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { withBasePath, ACCESS_TOKEN_COOKIE } from "@/lib/config";
import {
  DOCUMENT_NAV_ORDER,
  DOCUMENT_PAGES,
  getDocumentSectionStatuses,
} from "@/lib/documentSections";
import { getFinancialProgress } from "@/lib/financeApi";
import type { FinancialProgressResponse } from "@/lib/financeTypes";

import styles from "./applications.module.css";

export const dynamic = "force-dynamic";

type Status = "complete" | "progress" | "empty";

function sectionStatus(
  key: (typeof DOCUMENT_NAV_ORDER)[number],
  progress: FinancialProgressResponse | null,
): { status: Status; uploaded: number; required: number } {
  const config = DOCUMENT_PAGES[key];
  const bucket = progress?.[config.progressBucket] ?? [];
  const profile = progress?.company_profile ?? progress?.business ?? null;

  // Count only sections that are actually required given current answers.
  const requiredSections = config.sections.filter((s) => {
    if (!s.required) return false;
    if (!s.conditionalOn) return true;
    if (s.conditionalOn.questionId === "raised_external_equity") {
      return profile?.raised_external_equity === s.conditionalOn.equals;
    }
    return true;
  });

  const uploaded = requiredSections.filter((s) =>
    bucket.some((d) => d.document_type === s.docType),
  ).length;
  const required = requiredSections.length;

  let status: Status = "empty";
  if (required > 0 && uploaded >= required) status = "complete";
  else if (uploaded > 0) status = "progress";
  return { status, uploaded, required };
}

const BADGE_LABEL: Record<Status, string> = {
  complete: "Complete",
  progress: "In progress",
  empty: "Not started",
};

const BADGE_CLASS: Record<Status, string> = {
  complete: styles.badgeComplete,
  progress: styles.badgeProgress,
  empty: styles.badgeEmpty,
};

export default async function MyApplicationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) redirect("/onboarding");

  let progress: FinancialProgressResponse | null = null;
  try {
    progress = await getFinancialProgress(token);
  } catch {
    progress = null;
  }

  const profile = progress?.company_profile ?? progress?.business ?? null;
  const companyName = profile?.legal_name || profile?.name || "Your application";
  const pct = Math.max(0, Math.min(100, Math.round(progress?.percentage ?? 0)));
  // Shared status source so badges match the sidebar dots (handles submitted +
  // optional-only sections consistently).
  const statuses = getDocumentSectionStatuses(progress);

  return (
    <AppShell
      activeKey="my-applications"
      percentage={pct}
      companyName={companyName}
      contactEmail="My Applications"
      sectionStatuses={getDocumentSectionStatuses(progress)}
    >
      <div className={styles.page}>
        <header className={styles.titleCard}>
          <h1 className={styles.title}>My Applications</h1>
          <p className={styles.subtitle}>{companyName}</p>
          <div className={styles.progressRow}>
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${pct}%` }} />
            </span>
            <span className={styles.progressLabel}>{pct}% complete</span>
          </div>
        </header>

        <ul className={styles.list}>
          {DOCUMENT_NAV_ORDER.map((key) => {
            const config = DOCUMENT_PAGES[key];
            const { uploaded, required } = sectionStatus(key, progress);
            const status = statuses[key];
            return (
              <li key={key}>
                <a className={styles.row} href={withBasePath(config.route)}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{config.navLabel}</p>
                    <p className={styles.rowMeta}>
                      {required > 0
                        ? `${uploaded} of ${required} required document${required === 1 ? "" : "s"} uploaded`
                        : "Optional documents"}
                    </p>
                  </div>
                  <span className={`${styles.badge} ${BADGE_CLASS[status]}`}>
                    {BADGE_LABEL[status]}
                  </span>
                  <svg
                    className={styles.chevron}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m9 6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}

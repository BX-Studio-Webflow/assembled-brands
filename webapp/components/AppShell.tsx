import { withBasePath } from "@/lib/config";
import {
  DOCUMENT_NAV_ORDER,
  DOCUMENT_PAGES,
  type DocumentNavKey,
  type SectionStatus,
} from "@/lib/documentSections";

import SidebarProfile from "./SidebarProfile";
import styles from "./AppShell.module.css";

// Support opens an email; Invite is now an in-app page under the /app mount.
const SUPPORT_HREF = "mailto:support@assembledbrands.com";

// Business Info group — Company Profile maps to the onboarding form (which
// collects the company profile / financial overview).
const BUSINESS_INFO: { key: string; label: string; href: string }[] = [
  { key: "company-profile", label: "Company Profile", href: "/onboarding" },
];

const DOCUMENT_SECTIONS = DOCUMENT_NAV_ORDER.map((key) => ({
  key,
  label: DOCUMENT_PAGES[key].navLabel,
  href: DOCUMENT_PAGES[key].route,
}));

type Props = {
  activeKey: string;
  percentage: number;
  companyName: string;
  contactEmail: string;
  sectionStatuses?: Record<DocumentNavKey, SectionStatus>;
  children: React.ReactNode;
};

const STATUS_LABEL: Record<SectionStatus, string> = {
  complete: "Complete",
  progress: "In progress",
  empty: "Needs documents",
};

function statusDotClass(status: SectionStatus): string {
  if (status === "complete") return styles.statusDotComplete;
  if (status === "progress") return styles.statusDotProgress;
  return styles.statusDotEmpty;
}

export default function AppShell({
  activeKey,
  percentage,
  companyName,
  contactEmail,
  sectionStatuses,
  children,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <a className={styles.logoLink} href={withBasePath("/onboarding")} aria-label="Assembled Brands">
            {/* Plain <img>: next/image would re-prepend basePath and 404. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              src={withBasePath("/brand/assembled-brands-logo-dark.svg")}
              alt="Assembled Brands"
            />
          </a>

          <nav className={styles.nav} aria-label="Application">
            <div className={styles.navGroup}>
              <div className={styles.navGroupHeader}>
                <HomeIcon />
                <span>Business Info</span>
              </div>
              <ul className={styles.subNav}>
                {BUSINESS_INFO.map((item) => {
                  const isActive = item.key === activeKey;
                  const className = `${styles.subNavItem} ${isActive ? styles.subNavActive : ""}`;
                  return (
                    <li key={item.key}>
                      <a
                        className={className}
                        href={withBasePath(item.href)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.navGroup}>
              <div className={styles.navGroupHeader}>
                <StackIcon />
                <span>Document Upload Center</span>
              </div>
              <ul className={styles.subNav}>
                {DOCUMENT_SECTIONS.map((item) => {
                  const isActive = item.key === activeKey;
                  const className = `${styles.subNavItem} ${isActive ? styles.subNavActive : ""}`;
                  const status = sectionStatuses?.[item.key];
                  return (
                    <li key={item.key}>
                      <a
                        className={className}
                        href={withBasePath(item.href)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {status && (
                          <span
                            className={`${styles.statusDot} ${statusDotClass(status)}`}
                            title={STATUS_LABEL[status]}
                            aria-label={STATUS_LABEL[status]}
                          />
                        )}
                        <span className={styles.subNavLabel}>{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <a className={styles.navGroupLink} href={SUPPORT_HREF}>
              <DocIcon />
              <span>Support</span>
            </a>
            <a
              className={`${styles.navGroupLink} ${
                activeKey === "invite-team-members" ? styles.navGroupLinkActive : ""
              }`}
              href={withBasePath("/invite-team-members")}
              aria-current={activeKey === "invite-team-members" ? "page" : undefined}
            >
              <InviteIcon />
              <span>Invite Team Members</span>
            </a>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.progress}>
            <span className={styles.progressLabel}>Progress {pct}%</span>
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${pct}%` }} />
            </span>
          </div>

          <SidebarProfile companyName={companyName} contactEmail={contactEmail} />
        </div>
      </aside>

      <main className={styles.content}>{children}</main>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20h14V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


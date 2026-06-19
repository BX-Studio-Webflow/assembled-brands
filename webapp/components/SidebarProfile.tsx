"use client";

import { useEffect, useRef, useState } from "react";

import { TEAM_ID_STORAGE_KEY, withBasePath } from "@/lib/config";

import styles from "./AppShell.module.css";

type Props = {
  companyName: string;
  contactEmail: string;
};

export default function SidebarProfile({ companyName, contactEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(withBasePath("/api/logout"), { method: "POST" });
    } catch {
      // Still clear client state and redirect even if the request fails.
    }
    try {
      localStorage.removeItem(TEAM_ID_STORAGE_KEY);
      localStorage.removeItem("user");
    } catch {
      // localStorage may be unavailable; non-fatal.
    }
    window.location.href = withBasePath("/onboarding");
  };

  return (
    <div className={styles.profile} ref={ref}>
      <span className={styles.avatar} aria-hidden="true">
        {companyName.trim().charAt(0).toUpperCase() || "A"}
      </span>
      <span className={styles.profileText}>
        <span className={styles.profileName}>{companyName}</span>
        <span className={styles.profileEmail}>{contactEmail}</span>
      </span>

      <button
        type="button"
        className={styles.kebab}
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? "Logging out\u2026" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

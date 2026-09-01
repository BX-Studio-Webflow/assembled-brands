"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/config";
import styles from "./AppShell.module.css";

type Props = {
  // True once every required section is done (progress at 100%).
  canSubmit: boolean;
  // True once the application has already been submitted.
  isComplete: boolean;
};

// Lives in the sidebar: stays greyed out until the applicant reaches 100%, then
// lights up. Submitting marks the application complete and routes to the
// confirmation page. Once submitted it shows a settled "Submitted" state.
export default function SubmitApplicationButton({ canSubmit, isComplete }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (isComplete) {
    return (
      <div className={styles.submitWrap}>
        <span className={`${styles.submitButton} ${styles.submitButtonDone}`} aria-disabled="true">
          <CheckIcon />
          Submitted
        </span>
      </div>
    );
  }

  const onSubmit = async () => {
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/financial-complete"), { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setStatus("error");
        setMessage(data?.message || "We couldn't submit your application. Please try again.");
        return;
      }
      router.push(withBasePath("/thank-you"));
    } catch {
      setStatus("error");
      setMessage("We couldn't reach the server. Please try again.");
    }
  };

  return (
    <div className={styles.submitWrap}>
      <button
        type="button"
        className={`${styles.submitButton} ${canSubmit ? styles.submitButtonReady : ""}`}
        onClick={onSubmit}
        disabled={!canSubmit || status === "submitting"}
        title={canSubmit ? undefined : "Complete every section to submit your application"}
      >
        {status === "submitting" ? "Submitting\u2026" : "Submit application"}
      </button>
      {!canSubmit && status !== "error" && (
        <span className={styles.submitHint}>Finish every section to submit</span>
      )}
      {status === "error" && message && (
        <span className={styles.submitError} role="alert">
          {message}
        </span>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

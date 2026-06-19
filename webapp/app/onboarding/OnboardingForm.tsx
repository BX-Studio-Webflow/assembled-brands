"use client";

import { TEAM_ID_STORAGE_KEY, withBasePath } from "@/lib/config";
import { TEAM_MEMBERS } from "@/lib/teamMembers";
import type { OnboardingFormValues, SubmitMode } from "@/lib/types";
import { US_STATES } from "@/lib/usStates";
import { useState } from "react";

import styles from "./onboarding.module.css";

type Props = {
  token: string | null;
  dealId: number | null;
  mode: SubmitMode;
  initialValues: OnboardingFormValues;
  invalidInvite: boolean;
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export default function OnboardingForm({
  token,
  dealId,
  mode,
  initialValues,
  invalidInvite,
}: Props) {
  const [values, setValues] = useState<OnboardingFormValues>(initialValues);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const update = <K extends keyof OnboardingFormValues>(
    key: K,
    value: OnboardingFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: false }));
    if (status.kind === "error") setStatus({ kind: "idle" });
  };

  const workingWithMember = values.workingWithTeamMember === true;

  // Include a saved team-member email even if it isn't in the placeholder
  // roster, so returning prospects see their prior selection prefilled.
  const teamMemberOptions =
    values.teamMemberEmail &&
    !TEAM_MEMBERS.some((member) => member.value === values.teamMemberEmail)
      ? [...TEAM_MEMBERS, { value: values.teamMemberEmail, label: values.teamMemberEmail }]
      : TEAM_MEMBERS;

  const validate = (): string | null => {
    const errors: Record<string, boolean> = {};
    if (!values.legalName.trim()) errors.legalName = true;
    if (!values.incorporationState) errors.incorporationState = true;
    if (values.netRevenue === "" || Number.isNaN(Number(values.netRevenue)))
      errors.netRevenue = true;
    if (values.workingWithTeamMember === null) errors.workingWithTeamMember = true;
    if (values.workingWithTeamMember === true && !values.teamMemberEmail)
      errors.teamMemberEmail = true;

    setFieldErrors(errors);

    if (errors.legalName) return "Legal name is required.";
    if (errors.incorporationState) return "Please select your HQ state.";
    if (errors.netRevenue) return "Enter your last-12-months net revenue.";
    if (errors.workingWithTeamMember) return "Please answer this question.";
    if (errors.teamMemberEmail) return "Choose the team member you're working with.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalidInvite) return;

    const validationError = validate();
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return;
    }

    setStatus({ kind: "saving" });

    try {
      const response = await fetch(withBasePath("/api/onboarding"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode, dealId, values }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; teamId?: number | null; message?: string }
        | null;

      if (!response.ok || !data?.ok) {
        setStatus({
          kind: "error",
          message: data?.message || "There was a problem saving your information.",
        });
        return;
      }

      if (typeof data.teamId === "number") {
        try {
          localStorage.setItem(TEAM_ID_STORAGE_KEY, String(data.teamId));
        } catch {
          // localStorage may be unavailable; non-fatal.
        }
      }

      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: "We couldn't reach the server. Please try again.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Application</p>
        <h1 className={styles.heading}>You&apos;re all set</h1>
        <p className={styles.lead}>
          Your company details are saved. Next, you&apos;ll upload your financial
          documents so our underwriting team can review your application.
        </p>
        <div className={styles.actions}>
          <a
            className={styles.primaryButton}
            href={withBasePath("/documents/financial-reports")}
          >
            Continue to documents
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <p className={styles.eyebrow}>Application</p>
      <h1 className={styles.heading}>Tell us about your company</h1>
      <p className={styles.lead}>
        A few quick details to get your application started.
      </p>

      {invalidInvite && (
        <p className={styles.formError} role="alert">
          This invite link is missing its deal ID. Please reopen the link from your
          email.
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.fieldset} disabled={invalidInvite || status.kind === "saving"}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="legalName">
              Company legal name
            </label>
            <input
              id="legalName"
              className={`${styles.input} ${fieldErrors.legalName ? styles.inputError : ""}`}
              type="text"
              value={values.legalName}
              onChange={(e) => update("legalName", e.target.value)}
              placeholder="Acme Foods, Inc."
              autoComplete="organization"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="incorporationState">
              HQ state
            </label>
            <select
              id="incorporationState"
              className={`${styles.input} ${styles.select} ${
                fieldErrors.incorporationState ? styles.inputError : ""
              }`}
              value={values.incorporationState}
              onChange={(e) => update("incorporationState", e.target.value)}
            >
              <option value="" disabled>
                Select a state
              </option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="netRevenue">
              Net revenue (last 12 months)
            </label>
            <input
              id="netRevenue"
              className={`${styles.input} ${fieldErrors.netRevenue ? styles.inputError : ""}`}
              type="number"
              inputMode="numeric"
              min="0"
              value={values.netRevenue}
              onChange={(e) => update("netRevenue", e.target.value)}
              placeholder="10000000"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              Are you working with an Assembled Brands team member?
            </span>
            <div
              className={`${styles.radioRow} ${
                fieldErrors.workingWithTeamMember ? styles.radioRowError : ""
              }`}
            >
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="working-with-member"
                  checked={values.workingWithTeamMember === true}
                  onChange={() => update("workingWithTeamMember", true)}
                />
                <span>Yes</span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="working-with-member"
                  checked={values.workingWithTeamMember === false}
                  onChange={() => {
                    update("workingWithTeamMember", false);
                    update("teamMemberEmail", "");
                  }}
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {workingWithMember && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="teamMemberEmail">
                Which team member?
              </label>
              <select
                id="teamMemberEmail"
                className={`${styles.input} ${styles.select} ${
                  fieldErrors.teamMemberEmail ? styles.inputError : ""
                }`}
                value={values.teamMemberEmail}
                onChange={(e) => update("teamMemberEmail", e.target.value)}
              >
                <option value="" disabled>
                  Select a team member
                </option>
                {teamMemberOptions.map((member) => (
                  <option key={member.value} value={member.value}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>

        {status.kind === "error" && (
          <p className={styles.formError} role="alert">
            {status.message}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={invalidInvite || status.kind === "saving"}
          >
            {status.kind === "saving" ? "Saving…" : "Next"}
          </button>
        </div>
      </form>
    </section>
  );
}

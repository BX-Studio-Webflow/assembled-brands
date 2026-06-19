"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withBasePath } from "@/lib/config";
import type { InvitationStatus, TeamInvitation } from "@/lib/teamTypes";

import styles from "./inviteTeamMembers.module.css";

type Props = {
  initialInvitations: TeamInvitation[];
};

type MemberDraft = {
  name: string;
  email: string;
  role: string;
  message: string;
};

type MemberErrors = Partial<Record<"name" | "email" | "role", string>>;

const blankMember = (): MemberDraft => ({ name: "", email: "", role: "", message: "" });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteResponse = {
  ok?: boolean;
  message?: string;
  results?: { email: string; ok: boolean; message?: string }[];
};

export default function InviteTeamMembers({ initialInvitations }: Props) {
  const router = useRouter();
  const hasInvitations = initialInvitations.length > 0;

  const [mode, setMode] = useState<"list" | "form">(hasInvitations ? "list" : "form");
  const [members, setMembers] = useState<MemberDraft[]>([blankMember()]);
  const [memberErrors, setMemberErrors] = useState<MemberErrors[]>([{}]);
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const updateMember = (index: number, field: keyof MemberDraft, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
    if (field !== "message") {
      setMemberErrors((prev) =>
        prev.map((e, i) => (i === index ? { ...e, [field]: undefined } : e)),
      );
    }
    setFormError(null);
  };

  const addMember = () => {
    setMembers((prev) => [...prev, blankMember()]);
    setMemberErrors((prev) => [...prev, {}]);
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setMemberErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const openForm = () => {
    setMembers([blankMember()]);
    setMemberErrors([{}]);
    setFormError(null);
    setMode("form");
  };

  const validate = (): boolean => {
    const errors = members.map<MemberErrors>((m) => {
      const e: MemberErrors = {};
      if (!m.name.trim()) e.name = "Required";
      if (!m.email.trim()) e.email = "Required";
      else if (!EMAIL_RE.test(m.email.trim())) e.email = "Enter a valid email";
      if (!m.role.trim()) e.role = "Required";
      return e;
    });
    setMemberErrors(errors);
    return errors.every((e) => !e.name && !e.email && !e.role);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!validate()) return;

    setStatus("sending");
    try {
      const res = await fetch(withBasePath("/api/team/invite"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.map((m) => ({
            name: m.name.trim(),
            email: m.email.trim(),
            role: m.role.trim(),
            message: m.message.trim(),
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as InviteResponse | null;

      if (!res.ok && res.status !== 207) {
        setFormError(data?.message ?? "We couldn't send those invitations. Please try again.");
        setStatus("idle");
        return;
      }

      if (data?.results && data.results.some((r) => !r.ok)) {
        const failed = data.results.filter((r) => !r.ok);
        setFormError(
          `Couldn't invite ${failed.map((f) => f.email).join(", ")}: ${
            failed[0]?.message ?? "please check the details and try again."
          }`,
        );
        setStatus("idle");
        return;
      }

      // Success: reset and show the updated list (re-fetched on the server).
      setMembers([blankMember()]);
      setMemberErrors([{}]);
      setStatus("idle");
      setMode("list");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  const sending = status === "sending";

  return (
    <div className={styles.page}>
      <div className={styles.titleCard}>
        <h1 className={styles.title}>Invite Team Members</h1>
      </div>

      <div className={styles.card}>
        {mode === "list" ? (
          <InvitationsTable invitations={initialInvitations} onAddAnother={openForm} />
        ) : (
          <>
            <div className={styles.members}>
              {members.map((member, index) => (
                <fieldset key={index} className={styles.member} disabled={sending}>
                  {members.length > 1 && (
                    <div className={styles.memberHead}>
                      <span className={styles.memberLabel}>Member {index + 1}</span>
                      <button
                        type="button"
                        className={styles.removeMember}
                        onClick={() => removeMember(index)}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className={styles.row}>
                    <Field
                      label="Full name"
                      value={member.name}
                      error={memberErrors[index]?.name}
                      onChange={(v) => updateMember(index, "name", v)}
                      autoComplete="name"
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={member.email}
                      error={memberErrors[index]?.email}
                      onChange={(v) => updateMember(index, "email", v)}
                      autoComplete="email"
                    />
                  </div>

                  <Field
                    label="Role"
                    value={member.role}
                    error={memberErrors[index]?.role}
                    onChange={(v) => updateMember(index, "role", v)}
                    placeholder="e.g. CFO, Controller"
                  />

                  <div className={styles.field}>
                    <label className={styles.label}>Invite Message (optional)</label>
                    <textarea
                      className={styles.textarea}
                      value={member.message}
                      rows={2}
                      onChange={(e) => updateMember(index, "message", e.target.value)}
                    />
                  </div>
                </fieldset>
              ))}
            </div>

            {formError && <p className={styles.formError}>{formError}</p>}

            <div className={styles.actions}>
              <button type="button" className={styles.addLink} onClick={addMember} disabled={sending}>
                + Add another member
              </button>
              <button
                type="button"
                className={styles.sendButton}
                onClick={handleSubmit}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InvitationsTable({
  invitations,
  onAddAnother,
}: {
  invitations: TeamInvitation[];
  onAddAnother: () => void;
}) {
  return (
    <>
      <div className={styles.tableWrap}>
        <div className={`${styles.tableRow} ${styles.tableHead}`}>
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span className={styles.statusCol}>Status</span>
        </div>
        {invitations.map((inv) => (
          <div key={inv.id} className={styles.tableRow}>
            <span className={styles.cellName}>{inv.invitee_name || "—"}</span>
            <span className={styles.cellMuted}>{inv.invitee_email}</span>
            <span className={styles.cellMuted}>{inv.user_defined_role || "—"}</span>
            <span className={styles.statusCol}>
              <StatusPill status={inv.status ?? "pending"} />
            </span>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.addLink} onClick={onAddAnother}>
          + Add another member
        </button>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: InvitationStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`${styles.pill} ${styles[`pill_${status}`]}`}>{label}</span>;
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

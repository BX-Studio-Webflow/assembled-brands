"use client";

import { useState } from "react";

import { TEAM_ID_STORAGE_KEY, withBasePath } from "@/lib/config";

import styles from "./login.module.css";

type State =
  | { kind: "idle" }
  | { kind: "signingIn" }
  | { kind: "sendingLink" }
  | { kind: "sent"; email: string }
  | { kind: "notFound"; email: string }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_EMAIL = "hello@assembledbrands.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState({ kind: "error", message: "Please enter a valid email address." });
      return;
    }
    if (!password.trim()) {
      setState({ kind: "error", message: "Please enter your temporary password." });
      return;
    }

    setState({ kind: "signingIn" });
    try {
      const res = await fetch(withBasePath("/api/login-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; teamId?: number | null; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setState({
          kind: "error",
          message: data?.message || "Invalid email or temporary password.",
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

      window.location.href = withBasePath("/onboarding");
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Please try again." });
    }
  }

  async function sendMagicLink() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState({ kind: "error", message: "Please enter a valid email address first." });
      return;
    }

    setState({ kind: "sendingLink" });
    try {
      const res = await fetch(withBasePath("/api/login-link"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!res.ok) {
        setState({
          kind: "error",
          message: data?.message || "Something went wrong on our end. Please try again in a moment.",
        });
        return;
      }

      // 200 with ok:false => no account/application matches that email.
      setState(data?.ok ? { kind: "sent", email: trimmed } : { kind: "notFound", email: trimmed });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Please try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Assembled Brands</p>
        <h1 className={styles.heading}>Check your inbox</h1>
        <p className={styles.subhead}>
          We&apos;ve sent a one-time sign-in link to <strong>{state.email}</strong>. Open it and
          you&apos;ll land right back in your application.
        </p>
        <p className={styles.subhead}>
          The link expires after a while for your security. Don&apos;t see it? Check your spam folder, or{" "}
          <button type="button" className={styles.linkButton} onClick={() => setState({ kind: "idle" })}>
            use a different email
          </button>
          .
        </p>
      </section>
    );
  }

  if (state.kind === "notFound") {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Assembled Brands</p>
        <h1 className={styles.heading}>We couldn&apos;t find your account</h1>
        <p className={styles.subhead}>
          We don&apos;t have an application linked to <strong>{state.email}</strong>. Double-check the
          address you applied with — it may have been a different one.
        </p>
        <p className={styles.subhead}>
          Still stuck? Reach out to{" "}
          <a className={styles.link} href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          and we&apos;ll help you get back in.
        </p>
        <button
          type="button"
          className={styles.button}
          onClick={() => setState({ kind: "idle" })}
        >
          Try another email
        </button>
      </section>
    );
  }

  const signingIn = state.kind === "signingIn";
  const sendingLink = state.kind === "sendingLink";
  const busy = signingIn || sendingLink;

  return (
    <section className={styles.card}>
      <p className={styles.eyebrow}>Assembled Brands</p>
      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.subhead}>
        Enter your email and the temporary password from your application invitation to continue.
      </p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state.kind === "error") setState({ kind: "idle" });
            }}
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            Temporary password
          </label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (state.kind === "error") setState({ kind: "idle" });
            }}
            disabled={busy}
          />
        </div>
        {state.kind === "error" ? <p className={styles.error}>{state.message}</p> : null}
        <button className={styles.button} type="submit" disabled={busy}>
          {signingIn ? "Signing in…" : "Sign in"}
        </button>
        <p className={styles.subhead}>
          Need a fresh sign-in link?{" "}
          <button
            type="button"
            className={styles.linkButton}
            onClick={sendMagicLink}
            disabled={busy}
          >
            {sendingLink ? "Sending…" : "Email me a link"}
          </button>
          .
        </p>
      </form>
    </section>
  );
}

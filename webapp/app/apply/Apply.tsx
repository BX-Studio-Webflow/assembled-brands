"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TEAM_ID_STORAGE_KEY, withBasePath } from "@/lib/config";

import styles from "./apply.module.css";

type Props = { token: string | null };

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string };

export default function Apply({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>(
    token ? { kind: "idle" } : { kind: "error", message: "This link is missing its token." },
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!password.trim()) {
      setState({ kind: "error", message: "Enter the temporary password from your application invitation." });
      return;
    }

    setState({ kind: "working" });
    try {
      const res = await fetch(withBasePath("/api/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; teamId?: number | null; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setState({
          kind: "error",
          message: data?.message || "This link is invalid or has expired.",
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

      router.replace(withBasePath("/onboarding"));
    } catch {
      setState({
        kind: "error",
        message: "We couldn't reach the server. Please try again.",
      });
    }
  }

  if (!token) {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Assembled Brands</p>
        <h1 className={styles.heading}>We couldn&apos;t open your application</h1>
        <p className={styles.subhead}>
          {state.kind === "error" ? state.message : "This link is missing its token."}
        </p>
        <a className={styles.button} href={withBasePath("/login")}>
          Return to sign in
        </a>
      </section>
    );
  }

  if (state.kind === "working") {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Assembled Brands</p>
        <h1 className={styles.heading}>Opening your application…</h1>
        <p className={styles.subhead}>
          Hang tight while we verify your temporary password and open your workspace.
        </p>
        <span className={styles.spinner} aria-hidden="true" />
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <p className={styles.eyebrow}>Assembled Brands</p>
      <h1 className={styles.heading}>Enter your temporary password</h1>
      <p className={styles.subhead}>
        Use the temporary password included with your application invitation.
      </p>
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="temporary-password">
            Temporary password
          </label>
          <input
            id="temporary-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (state.kind === "error") setState({ kind: "idle" });
            }}
          />
        </div>
        {state.kind === "error" ? <p className={styles.error}>{state.message}</p> : null}
        <button className={styles.button} type="submit">
          Open application
        </button>
        <p className={styles.subhead}>
          Returning without your original link?{" "}
          <a className={styles.link} href={withBasePath("/login")}>
            Sign in with email and temporary password
          </a>
          .
        </p>
      </form>
    </section>
  );
}

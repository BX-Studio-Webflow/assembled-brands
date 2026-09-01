"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TEAM_ID_STORAGE_KEY, withBasePath } from "@/lib/config";

import styles from "./signin.module.css";

type Props = { token: string | null };

type State =
  | { kind: "working" }
  | { kind: "error"; message: string };

export default function Signin({ token }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>(
    token ? { kind: "working" } : { kind: "error", message: "This sign-in link is missing its token." },
  );
  // Guard against double-invoke in React strict mode / re-renders.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch(withBasePath("/api/signin"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; teamId?: number | null; message?: string }
          | null;

        if (!res.ok || !data?.ok) {
          setState({
            kind: "error",
            message: data?.message || "This sign-in link is invalid or has expired.",
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
    })();
  }, [token, router]);

  if (state.kind === "error") {
    return (
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Assembled Brands</p>
        <h1 className={styles.heading}>We couldn&apos;t sign you in</h1>
        <p className={styles.subhead}>{state.message}</p>
        <a className={styles.button} href={withBasePath("/login")}>
          Email me a new sign-in link
        </a>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-live="polite">
      <p className={styles.eyebrow}>Assembled Brands</p>
      <h1 className={styles.heading}>Signing you in…</h1>
      <p className={styles.subhead}>
        Hang tight while we open your application. You&apos;ll be dropped straight back into your
        workspace — no password needed.
      </p>
      <span className={styles.spinner} aria-hidden="true" />
    </section>
  );
}

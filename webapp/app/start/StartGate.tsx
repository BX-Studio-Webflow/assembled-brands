"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withBasePath } from "@/lib/config";

import styles from "./start.module.css";

export default function StartGate() {
  const router = useRouter();
  const [dealId, setDealId] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: dealId.trim(), password }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setStatus("error");
        setError(data?.message || "Could not start the application. Please try again.");
        return;
      }
      router.push(withBasePath("/onboarding"));
    } catch {
      setStatus("error");
      setError("We couldn't reach the server. Please try again.");
    }
  };

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <p className={styles.eyebrow}>Assembled Brands</p>
      <h1 className={styles.heading}>Secure Application Portal</h1>
      <p className={styles.subhead}>
        Enter your deal ID and access password to begin or resume your application.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>Deal ID</span>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 61244791103"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Access password</span>
        <input
          className={styles.input}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        className={styles.button}
        type="submit"
        disabled={status === "submitting" || !dealId.trim() || !password}
      >
        {status === "submitting" ? "Starting\u2026" : "Continue"}
      </button>
    </form>
  );
}

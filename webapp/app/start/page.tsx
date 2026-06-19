import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BrandHeader from "@/components/BrandHeader";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

import StartGate from "./StartGate";
import styles from "./start.module.css";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  // Already signed in — skip the gate.
  if (token) redirect("/onboarding");

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <StartGate />
      </main>
    </div>
  );
}

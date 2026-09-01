import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BrandHeader from "@/components/BrandHeader";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

import Login from "./Login";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  // Already signed in — skip the form and go straight to the application.
  if (token) redirect("/onboarding");

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <Login />
      </main>
    </div>
  );
}

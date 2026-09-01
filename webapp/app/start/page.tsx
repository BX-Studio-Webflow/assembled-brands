import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BrandHeader from "@/components/BrandHeader";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";

import styles from "./start.module.css";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  // Already signed in — go straight to the application.
  if (token) redirect("/onboarding");

  // No credentials here: applicants and teammates enter via secure links.
  // A stray visit should explain the portal and point new applicants to Webflow.
  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Application Portal</p>
          <h1 className={styles.heading}>Welcome to Assembled Brands</h1>
          <p className={styles.subhead}>
            This portal is where invited applicants complete their company profile and
            upload diligence documents.
          </p>
          <p className={styles.subhead}>
            To access an existing application, sign in with the email and temporary
            password included with your application invitation.
          </p>
          <a className={styles.button} href="/login">
            Return to application
          </a>
          <p className={styles.note}>
            Starting a new application? Reach us at{" "}
            <a href="mailto:sales@assembledbrands.com" className={styles.link}>
              sales@assembledbrands.com
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}

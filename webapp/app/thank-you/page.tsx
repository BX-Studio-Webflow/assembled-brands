import BrandHeader from "@/components/BrandHeader";
import { withBasePath } from "@/lib/config";

import styles from "./thankYou.module.css";

export const dynamic = "force-dynamic";

export default function ThankYouPage() {
  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <span className={styles.badge} aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#73a428" />
              <path
                d="m7 12.5 3.2 3.2L17 9"
                stroke="#fffbf5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className={styles.title}>Thank you — your application is submitted</h1>
          <p className={styles.body}>
            We&rsquo;ve received your documents. Our underwriting team will review your application
            and reach out with next steps. You can return any time to add or update documents.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href={withBasePath("/documents/financial-reports")}>
              Review my documents
            </a>
            <a className={styles.secondary} href="mailto:sales@assembledbrands.com">
              Contact our team
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

import BrandHeader from "@/components/BrandHeader";

import AcceptInvite from "./AcceptInvite";
import styles from "./acceptInvite.module.css";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <AcceptInvite token={token ?? null} />
      </main>
    </div>
  );
}

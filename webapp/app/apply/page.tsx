import BrandHeader from "@/components/BrandHeader";

import Apply from "./Apply";
import styles from "./apply.module.css";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <Apply token={token ?? null} />
      </main>
    </div>
  );
}

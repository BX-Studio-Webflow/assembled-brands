import BrandHeader from "@/components/BrandHeader";

import Signin from "./Signin";
import styles from "./signin.module.css";

export const dynamic = "force-dynamic";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <Signin token={token ?? null} />
      </main>
    </div>
  );
}

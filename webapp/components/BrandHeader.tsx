import { withBasePath } from "@/lib/config";

import styles from "./BrandHeader.module.css";

export default function BrandHeader() {
  return (
    <header className={styles.header}>
      {/* Public asset needs the mount-path prefix to load under Webflow Cloud. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withBasePath("/brand/assembled-brands-logo.svg")}
        alt="Assembled Brands"
        className={styles.logo}
      />
    </header>
  );
}

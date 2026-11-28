import type { Metadata } from "next";
import Link from "next/link";
import { hardwareCatalog } from "@/lib/hardware-catalog";
import { Comparison } from "./comparison";
import styles from "./lab.module.css";

export const metadata: Metadata = {
  title: "FrankX Workstation Lab",
  description: "Compare exact hardware configurations, delivered prices and evidence for local AI workloads.",
  alternates: { canonical: "https://starlight.technology/workstation-lab" },
  robots: { index: false, follow: true },
};

export default async function WorkstationLab({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const market = (await searchParams).market === "DE" ? "DE" : "NL";
  const { catalog, status } = await hardwareCatalog(market);
  return (
    <section className={styles.lab} aria-label="Workstation Lab">
      <header className={styles.intro}>
        <p className={styles.kicker}>Starlight Technology × FrankX</p>
        <h1>Workstation Lab</h1>
        <p>Compare exact configurations for local AI and creative work. Check the source, delivered cost and upgrade constraints before you buy.</p>
      </header>
      <nav className={styles.markets} aria-label="Merchant market">
        <Link href="/workstation-lab?market=NL" aria-current={market === "NL" ? "page" : undefined}>Netherlands</Link>
        <Link href="/workstation-lab?market=DE" aria-current={market === "DE" ? "page" : undefined}>Germany</Link>
      </nav>
      {status === "research" && <p className={styles.notice}>Manufacturer specifications preview. Current offers are pending intake.</p>}
      {status === "unavailable" && <p className={styles.notice}>The catalog is temporarily unavailable.</p>}
      {catalog.length > 0 && <Comparison key={market} catalog={catalog} />}
      {status === "canonical" && catalog.length === 0 && <p className={styles.notice}>No reviewed configurations are available yet.</p>}
      <footer className={styles.disclosure}>
        <strong>Editorial independence.</strong> Affiliate links are labeled and may earn us a commission.
        Commission never changes rankings. Verify checkout terms and invoice details with the seller.
        {" "}<Link href="/disclosure">Affiliate disclosure</Link>
      </footer>
    </section>
  );
}

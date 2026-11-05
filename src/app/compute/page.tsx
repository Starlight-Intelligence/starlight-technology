import type { Metadata } from "next";
import styles from "@/components/compute/compute.module.css";
import { BrandCards, CapacityTable, CompanyTable, EvidencePanel, ExpansionNotes, PriceLadder } from "@/components/compute/compute-sections";
import { StackPlanner } from "@/components/compute/stack-planner";
import { researchDate } from "@/lib/compute";

export const metadata: Metadata = {
  title: "Local AI compute atlas",
  description: "Mini PCs and unified-memory machines for local AI and agent fleets: dated prices, who builds each one, and what each can run.",
  alternates: { canonical: "/compute" },
  robots: { index: false, follow: false }
};

export default function ComputePage() {
  return (
    <div className={`shell ${styles.page}`}>
      <header className={styles.hero}>
        <p className="eyebrow">Compute atlas</p>
        <h1 className={styles.title}>What a 128 GB local AI machine costs today, and who builds it.</h1>
        <p className={styles.lede}>
          Dated prices for 64 GB and larger mini PCs, the memory each workload needs, and the parts and platforms behind GMKtec, Minisforum, Framework and others. Prices link to the page they were read from; every claim and edge in the data lists its sources and evidence level.
        </p>
        <ul className={styles.status}>
          <li><span className={styles.dot} /> Research only, {researchDate}</li>
          <li>Buyer region assumed NL/EU</li>
          <li>Not yet linked from the site</li>
        </ul>
      </header>

      <section className={styles.block} aria-labelledby="ladder">
        <div className={styles.blockHead}>
          <h2 id="ladder">Memory price ladder</h2>
          <p>Machines with 64 GB or more, grouped by memory size and cheapest first within each group. A bar is the cheapest EUR price read from a page. Tax status is stated where the page states it.</p>
        </div>
        <PriceLadder />
      </section>

      <section className={styles.block} aria-labelledby="planner">
        <div className={styles.blockHead}>
          <h2 id="planner">Stack planner</h2>
          <p>Set the workload for one node and get a low-to-high memory estimate, which standard class it fits, and whether it needs splitting across two machines. Every number carries its basis; none of it is a benchmark.</p>
        </div>
        <StackPlanner />
      </section>

      <section className={styles.block} aria-labelledby="capacity">
        <div className={styles.blockHead}>
          <h2 id="capacity">What fits in which memory class</h2>
          <p>Model memory competes with the operating system and agent sessions on the same box. Speed is a separate question: in the independent tests in the data, 70B dense models ran at about 4-5 tokens/s on 256 GB/s class memory (one secondary report says 8-12).</p>
        </div>
        <CapacityTable />
      </section>

      <section className={styles.block} aria-labelledby="builders">
        <div className={styles.blockHead}>
          <h2 id="builders">How each brand builds and sells</h2>
          <p>Dots show evidence: filled green is documented, amber is inferred, hollow is rumor; inferred and rumor chips also say so in words.</p>
        </div>
        <BrandCards />
      </section>

      <section className={styles.block} aria-labelledby="company">
        <div className={styles.blockHead}>
          <h2 id="company">Who you are buying from</h2>
          <p>Legal entity, VAT number, return and warranty terms and review sentiment, as documented, because terms you cannot enforce change what a machine costs.</p>
        </div>
        <CompanyTable />
      </section>

      <section className={styles.block} aria-labelledby="growth">
        <div className={styles.blockHead}>
          <h2 id="growth">Growing past one box</h2>
          <p>What the evidence says about clusters, external GPUs and scaling up. Figures from blogs and forums are secondary; none was measured here.</p>
        </div>
        <ExpansionNotes />
      </section>

      <section className={styles.block} aria-labelledby="evidence">
        <div className={styles.blockHead}>
          <h2 id="evidence">Evidence behind the page</h2>
          <p>The records are validated before they build: a price needs a date, a merchant and a memory size that matches the machine.</p>
        </div>
        <EvidencePanel />
      </section>
    </div>
  );
}

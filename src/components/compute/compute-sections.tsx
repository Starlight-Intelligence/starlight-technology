import styles from "./compute.module.css";
import { brandSilicon, brandSupply, brands, capacityClasses, capacityTable, companies, expansionFindings, ladderGroups, stats, type EdgeEvidence } from "@/lib/compute";

const eur = (n: number) => `€${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export function PriceLadder() {
  const groups = ladderGroups(64);
  const max = Math.max(...groups.map((g) => g.high));
  return (
    <>
      {groups.map((g) => (
        <section className={styles.group} key={g.memoryGb} aria-labelledby={`class-${g.memoryGb}`}>
          <h3 className={styles.groupHead} id={`class-${g.memoryGb}`}>
            {g.label}
            <span>{g.low === g.high ? eur(g.low) : `${eur(g.low)} to ${eur(g.high)}`}{g.rangeIsPageRead ? "" : " (reported)"}</span>
          </h3>
          <ol className={styles.ladder}>
            {g.rows.map((r) => (
              <li className={styles.rung} key={r.id}>
                <div className={styles.rungText}>
                  <p className={styles.rungName}>
                    {r.name}
                    {r.evidence === "reported" && <span className={`${styles.tag} ${styles.tagReported}`}>reported</span>}
                    {r.sale && <span className={styles.tag}>sale</span>}
                    {r.boardOnly && <span className={styles.tag}>board only</span>}
                  </p>
                  <span className={styles.rungMeta}>
                    {r.bandwidth ? `${r.bandwidth} GB/s` : "bandwidth not verified"} · {eur(r.eurPerGb)} per GB
                    {r.speed ? ` · ${r.speed}` : ""}
                  </span>
                </div>
                <div className={styles.trackCell}>
                  <div className={styles.track} aria-hidden="true">
                    <span className={`${styles.fill} ${r.evidence === "reported" ? styles.fillReported : ""}`} style={{ width: `${Math.max(6, (r.amountEur / max) * 100)}%` }} />
                  </div>
                </div>
                <div className={styles.price}>
                  <strong>{eur(r.amountEur)}</strong>
                  <small>
                    {r.tax} ·{" "}
                    {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.source}</a> : r.source}
                  </small>
                  <small className={styles.date}>{r.verifiedOn}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className={styles.legend}>
        <span><i className={`${styles.swatch}`} /> Read from a merchant or manufacturer page on the date shown</span>
        <span><i className={`${styles.swatch} ${styles.swatchReported}`} /> Reported by a third party, not read from a merchant page</span>
      </p>
    </>
  );
}
export function CapacityTable() {
  const rows = capacityTable();
  return (
    <div className={styles.tableWrap} role="region" aria-label="Workload fit by memory class, scrolls sideways on small screens" tabIndex={0}>
      <table className={styles.table}>
        <caption>Capacity only. Bandwidth, software support and thermals decide the speed. Sizes are model weights plus KV cache; headroom for the OS and 10 agent sessions is an estimate (see workloads.json).</caption>
        <thead>
          <tr>
            <th scope="col">Workload</th>
            {capacityClasses.map((gb) => <th scope="col" key={gb}>{gb} GB</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ workload, cells }) => (
            <tr key={workload.id}>
              <th scope="row">
                {workload.name}
                {workload.measured && <small>Measured: {workload.measured}</small>}
              </th>
              {cells.map((ok, i) => (
                <td key={capacityClasses[i]} className={ok ? styles.yes : styles.no}>
                  <span aria-hidden="true">{ok ? "✓" : "–"}</span>
                  <span className={styles.srOnly}>{ok ? "fits" : "does not fit"}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const chipClass = (e: EdgeEvidence) => (e === "documented" ? styles.chip : e === "inferred" ? `${styles.chip} ${styles.chipInferred}` : `${styles.chip} ${styles.chipRumor}`);

export function BrandCards() {
  const shown = brands.filter((b) => !["silicon-vendor"].includes(b.kind) || b.id === "nvidia" || b.id === "amd");
  return (
    <div className={styles.brands}>
      {shown.map((b) => {
        const parts = brandSupply(b.id);
        const si = brandSilicon(b.id);
        return (
          <article className={styles.brand} key={b.id}>
            <div className={styles.brandHead}>
              <h3>{b.name}</h3>
              <span className={styles.brandKind}>{b.kind.replaceAll("-", " ")}</span>
            </div>
            <p>{b.approach}</p>
            {si.length > 0 && (
              <>
                <p className={styles.label}>Silicon</p>
                <ul className={styles.chips}>{si.map((s) => <li className={styles.chip} key={s}><i />{s}</li>)}</ul>
              </>
            )}
            {parts.length > 0 && (
              <>
                <p className={styles.label}>Documented supply</p>
                <ul className={styles.chips}>
                  {parts.map((p) => <li className={chipClass(p.evidence)} key={`${p.supplier}-${p.part}`} title={p.note}><i />{p.part}: {p.supplier}{p.evidence !== "documented" && <em className={styles.chipNote}>{p.evidence}</em>}</li>)}
                </ul>
              </>
            )}
            {b.techChoices.length > 0 && (
              <>
                <p className={styles.label}>Engineering choices</p>
                <ul className={styles.brandList}>{b.techChoices.slice(0, 3).map((t) => <li key={t.topic}>{t.choice}</li>)}</ul>
              </>
            )}
            {b.weaknesses.length > 0 && (
              <>
                <p className={styles.label}>Weak points</p>
                <ul className={styles.brandList}>{b.weaknesses.slice(0, 2).map((w) => <li key={w}>{w}</li>)}</ul>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id;
const clip = (s: string | undefined, n: number) => {
  const t = (s ?? "not recorded").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export function CompanyTable() {
  return (
    <div className={styles.tableWrap} role="region" aria-label="Who stands behind each machine, scrolls sideways on small screens" tabIndex={0}>
      <table className={`${styles.table} ${styles.wideTable}`}>
        <caption>Facts read from each company&apos;s own pages and from Trustpilot on 2026-10-05. A missing entry means it was not found, not that it does not exist.</caption>
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">EU legal entity</th>
            <th scope="col">Return and warranty as written</th>
            <th scope="col">Trustpilot</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.brandId}>
              <th scope="row">{brandName(c.brandId)}<small>{c.euLegalEntity === true ? `EU entity, VAT ${c.euVatId.value}` : c.euLegalEntity === false ? "operator outside the EU" : "EU entity not established"}</small></th>
              <td className={styles.left}>{clip(c.euPresence.euStoreEntity, 150)}</td>
              <td className={styles.left}>{clip(c.euPresence.returnAndWarrantyAsWritten, 230)}</td>
              <td className={styles.left}>{c.trustpilot.reviewCount != null ? `${c.trustpilot.score ?? "score withheld"} from ${c.trustpilot.reviewCount}` : "not read"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExpansionNotes() {
  return (
    <ul className={styles.notesList}>
      {expansionFindings.map((f) => <li key={f}>{f}</li>)}
    </ul>
  );
}

export function EvidencePanel() {
  return (
    <>
      <dl className={styles.evidence}>
        <div><dt>Sources</dt><dd>{stats.sources}</dd></div>
        <div><dt>Claims</dt><dd>{stats.claims}</dd></div>
        <div><dt>Machines</dt><dd>{stats.machines}</dd></div>
        <div><dt>Graph edges</dt><dd>{stats.edges}</dd></div>
        <div><dt>Open gaps</dt><dd>{stats.gaps}<small> of {stats.gapsTotal}</small></dd></div>
      </dl>
      <p className={styles.notes}>
        Agents can read the same graph at <a href="/api/compute/graph">/api/compute/graph</a>. Each ladder price links to the page it was read from, with the date. Claims and graph edges list their source IDs in the data files. No affiliate links are used on this page, and Amazon prices are not stored. Machines were not tested hands-on.
      </p>
    </>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";
import { compareCost, costPerCompletedTask, offerCost, sellerRisk, type Configuration } from "@/lib/hardware";
import { registerWebTools, type ModelContext } from "@/lib/webmcp.mjs";
import styles from "./lab.module.css";

function money(value: number | null, currency = "EUR") {
  return value === null ? "Pending evidence" : new Intl.NumberFormat("en-NL", { style: "currency", currency }).format(value / 100);
}

export function Comparison({ catalog }: { catalog: Configuration[] }) {
  const reference = catalog.find((entry) => entry.offers.length || entry.references?.length) ?? catalog[0];
  const build = catalog.find((entry) => entry.category === "build");
  const [left, setLeft] = useState(reference.id);
  const [right, setRight] = useState(build?.id ?? catalog.find((entry) => entry.product !== reference.product)?.id ?? reference.id);
  const [recover, setRecover] = useState(false);
  const selected = [left, right].map((id) => catalog.find((entry) => id === entry.id)!);
  const share = recover ? 1 : 0;
  const snapshot = useRef({ selected, share });
  useEffect(() => {
    snapshot.current = { selected, share };
  }, [selected, share]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    const registration = registerWebTools(context, [{
      name: "starlight_read_workstation_comparison",
      title: "Read the current workstation comparison",
      description: "Read the visible exact configurations and sourced cost estimates for the selected market.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
          throw new Error("This action accepts an empty object.");
        }
        return snapshot.current.selected.map((configuration) => ({
          configuration, cost: compareCost(configuration, catalog, snapshot.current.share),
        }));
      },
    }]);
    return registration.stop;
  }, [catalog]);

  return <>
    <div className={styles.controls}>
      {([["Configuration A", left, setLeft], ["Configuration B", right, setRight]] as const).map(([label, id, update]) =>
        <label key={label}>{label}
          <select value={id} onChange={(event) => update(event.target.value)}>
            {catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.brand} {entry.product} · {entry.label}</option>)}
          </select>
        </label>
      )}
      <label className={styles.check}><input type="checkbox" checked={recover} onChange={(event) => setRecover(event.target.checked)} /> Model full recovery of evidenced invoice VAT</label>
    </div>
    <section className={styles.comparison} aria-label="Comparison results" aria-live="polite">
      {selected.map((entry, i) => {
        const cost = compareCost(entry, catalog, share);
        return <article className={styles.card} key={i}>
          <p className={styles.kicker}>{entry.category === "build" ? "Parts build" : entry.category}</p>
          <h2>{entry.brand} {entry.product}</h2>
          <p className={styles.variant}>{entry.label}</p>
          <dl className={styles.specs}>
            <dt>Processor</dt><dd>{entry.specs.processor ?? "Pending evidence"}</dd>
            <dt>Graphics</dt><dd>{entry.specs.gpu ?? "Pending evidence"}</dd>
            <dt>Memory</dt><dd>{entry.specs.ramGb ? entry.specs.ramGb + " GB" : "Pending evidence"}{entry.specs.memory ? " · " + entry.specs.memory : ""}</dd>
            <dt>Storage</dt><dd>{entry.specs.storageGb ? entry.specs.storageGb + " GB" : "Pending evidence"}</dd>
            <dt>Delivered gross</dt><dd>{money(cost.gross)}</dd>
            {recover && <><dt>Estimated net</dt><dd>{money(cost.net)}</dd></>}
          </dl>
          {cost.reason && <p className={styles.muted}>{cost.reason}</p>}
          <p><a href={entry.sourceUrl}>Configuration source</a> <time dateTime={entry.observedAt}>{entry.observedAt.slice(0, 10)}</time></p>
          {entry.components.length > 0 && <details><summary>Bill of materials and fit checks</summary><ul>
            {entry.components.map((part) => <li key={part.slot + part.id}>{part.slot} · {part.quantity} × {catalog.find((item) => item.id === part.id)?.label ?? part.id}</li>)}
            {entry.compatibility.map((check) => <li key={check.candidateId + check.dimension}><a href={check.url}>{check.dimension}</a> · {check.outcome} · {check.rationale}</li>)}
          </ul></details>}
          <details><summary>Offers and price history · {entry.offers.length}</summary>
            {entry.offers.length ? <ul>{entry.offers.map((offer) => {
              const risk = sellerRisk(offer.risk);
              const offerPrice = offerCost(offer, share);
              return <li key={offer.id}>
                <a href={offer.url}>{offer.seller}</a> · {offer.condition} · {offer.availability.replace("_", " ")} · {money(offer.itemMinor, offer.currency)}
                {" · delivered "}{money(offerPrice.gross, offer.currency)}
                {" · "}<time dateTime={offer.observedAt}>{offer.observedAt.slice(0, 10)}</time>
                {offer.grade && <p>Grade {offer.grade}{offer.warrantyMonths !== null && offer.warrantyMonths !== undefined ? " · " + offer.warrantyMonths + " months of warranty" : ""}</p>}
                <p>Seller risk {risk.minimum}–{risk.maximum}/100 · {risk.coverage}% evidence coverage</p>
                {offer.affiliateUrl && <a href={offer.affiliateUrl} rel="sponsored noreferrer">Shop via affiliate link</a>}
                {offer.history?.length ? <ul>{offer.history.map((point) => <li key={point.observedAt}><a href={point.url}>{point.observedAt.slice(0, 10)}</a> · {money(point.itemMinor, point.currency)}</li>)}</ul> : null}
              </li>;
            })}</ul> : <p>Current offers are pending verification.</p>}
          </details>
          {!!entry.references?.length && <details><summary>Recorded merchant prices · {entry.references.length}</summary>
            <p>Historical item prices. Check the merchant for current availability, delivery charges and invoice terms.</p>
            <ul>{entry.references.map((quote) => <li key={quote.id}>
              <a href={quote.url}>{quote.condition} · {money(quote.itemMinor)}</a> · <time dateTime={quote.observedAt}>{quote.observedAt}</time>
            </li>)}</ul>
          </details>}
          <details><summary>Upgrade paths and benchmarks</summary>
            <ul>
              {entry.upgrades.length ? entry.upgrades.map((upgrade) => <li key={upgrade.targetId}><a href={upgrade.url}>{upgrade.action}</a></li>) : <li>Upgrade evidence is pending.</li>}
              {entry.benchmarks.length ? entry.benchmarks.map((run, index) => <li key={index}>
                <a href={run.url}>{run.workload} v{run.version}</a> · {run.basis} · {run.completed}/{run.attempted} tasks completed · {money(costPerCompletedTask(run), run.currency)} per completed task
              </li>) : <li>Benchmark runs are pending.</li>}
            </ul>
          </details>
          {!!entry.sold?.length && <details><summary>Verified sold comparables</summary><ul>{entry.sold.map((sale, index) =>
            <li key={index}><a href={sale.url}>{sale.soldAt.slice(0, 10)}</a> · {sale.grade} · {money(sale.realizedMinor, sale.currency)}</li>)}</ul></details>}
        </article>;
      })}
    </section>
  </>;
}

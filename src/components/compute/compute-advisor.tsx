"use client";

import { useState } from "react";
import { compareCompute, ownershipScenario, parseDecisionInput, workloads, type DecisionInput } from "@/lib/compute-advisor";
import styles from "./advisor.module.css";

const labels = {
  "verify-and-buy": "Verify the final quote",
  "pilot-cloud": "Pilot the workload in cloud",
  hold: "Hold the purchase",
  "documented-capacity": "Capacity fits on paper",
  conditional: "Validate runtime fit",
  fails: "Outside workload constraints",
  within: "Within cash ceiling",
  above: "Above cash ceiling",
  "listed-price-above": "Listed price above ceiling",
  unverified: "Delivered cost open"
};

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NL", { style: "currency", currency }).format(minor / 100);
}

export function ComputeAdvisor({ asOf }: { asOf: string }) {
  const [input, setInput] = useState<DecisionInput>({ budgetEur: 4500, workload: "code-assist", monthlyGpuHours: 40 });
  const [error, setError] = useState(false);
  const result = compareCompute(input, asOf);
  const action = result.action;
  const target = result.rows.find((row) => row.id === action.variantId);
  const rate = result.rows.find((row) => row.path === "cloud" && row.fit === "documented-capacity")
    ?.observations.find((offer) => offer.freshness === "recent-observation" && offer.currency === "USD");
  return <>
    <section className={styles.console} aria-label="Compute decision">
      <form className={styles.fields} onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next = parseDecisionInput({
          budgetEur: Number(form.get("budget")),
          workload: form.get("workload"),
          monthlyGpuHours: Number(form.get("hours"))
        });
        setError(!next);
        if (next) setInput(next);
      }}>
        <label>Workload <select name="workload" defaultValue={input.workload}>
          {Object.entries(workloads).map(([id, workload]) => <option key={id} value={id}>{workload.label}</option>)}
        </select></label>
        <label>Cash ceiling (€) <input type="number" name="budget" required min="0" max="100000" step=".01" defaultValue={input.budgetEur} /></label>
        <label>GPU hours / month <input type="number" name="hours" required min="0" max="744" defaultValue={input.monthlyGpuHours} /></label>
        <button className="button button-primary" type="submit">Compare compute</button>
        {error && <p role="alert">Check the budget and monthly GPU hours.</p>}
      </form>
      <div className={styles.outcome} aria-live="polite">
        <p className="eyebrow">Recommended next step</p>
        <h2>{labels[action.kind]}</h2>
        {target && <strong>{target.name}</strong>}
        <p>{action.reason}</p>
        <small>{result.workload.label} · {result.workload.memoryGb} GB working-set assumption · {money(input.budgetEur * 100, "EUR")} cash ceiling</small>
      </div>
    </section>
    <section className={styles.choices} aria-labelledby="compute-options">
      <div className={styles.heading}>
        <h2 id="compute-options">Compare the options</h2>
        <small>NL buyer · Evidence {result.revision}</small>
      </div>
      {result.rows.map((row) => <article className={styles.row} key={row.id}>
        <div><h3>{row.name}</h3><p>{row.sku}</p><p>{row.configuration}</p></div>
        <div><strong>{labels[row.fit]}</strong><p>{row.constraint}</p></div>
        <div>
          {row.observations.map((offer) => <div className={styles.offer} key={offer.id}>
            <strong>{money(offer.amountMinor, offer.currency)}{offer.unit === "hour" ? " / hour" : ""}</strong>
            {offer.scenarioAmountMinor !== null && <p>{money(offer.scenarioAmountMinor, offer.currency)} / month for GPU time</p>}
            <p>{offer.evidence === "buyer-quote" ? "Buyer quote" : offer.evidence === "ambiguous-lead" ? "Verify exact variant" : "Source-listed"} · {offer.seller ?? "Seller unverified"} · {offer.market}</p>
            <p>{offer.availability === "out-of-stock" ? "Out of stock" : offer.availability === "backorder" ? "Order lead time" : offer.availability === "in-stock" ? "In stock" : "Stock unverified"} · {offer.shipsToNl === true ? "NL shipping indicated" : "Delivery unconfirmed"}</p>
            <p>{offer.freshness === "stale" ? "Stale · " : ""}{offer.observedOn ?? "Undated"} · {offer.basis === "unknown" ? "Tax unconfirmed" : offer.basis}</p>
          </div>)}
          {row.observations.length === 0 && <p>No current exact-variant price captured.</p>}
          <details><summary>Inspect evidence</summary>
            <p>{row.path === "cloud" ? "Cloud total needs regional pricing and extras." : labels[row.budget as keyof typeof labels]}</p>
            {row.observations.map((offer) => <p key={offer.id}>{offer.note}</p>)}
            <ul>{row.sources.map((source) => <li key={source.id}><a href={source.url}>{new URL(source.url).hostname.replace(/^www\./, "")} · {source.id}</a></li>)}</ul>
          </details>
        </div>
      </article>)}
      {rate && <OwnershipEstimate hourlyUsd={rate.amountMinor / 100} monthlyHours={input.monthlyGpuHours} />}
      <p className={styles.disclosure}>Research comparison. Links here carry no affiliate attribution. Capacity checks use documented specifications and workload assumptions.</p>
    </section>
  </>;
}

function OwnershipEstimate({ hourlyUsd, monthlyHours }: { hourlyUsd: number; monthlyHours: number }) {
  const [quote, setQuote] = useState("");
  const [fx, setFx] = useState("");
  const [localExtras, setLocalExtras] = useState("0");
  const [cloudExtras, setCloudExtras] = useState("0");
  const scenario = quote && fx ? ownershipScenario({ purchaseEur: Number(quote), eurPerUsd: Number(fx),
    resaleEur: 0, averageKw: 0, powerEurKwh: 0, localHours: monthlyHours * 24, otherLocalEur: Number(localExtras),
    cloudRateUsd: hourlyUsd, cloudHours: monthlyHours * 24, otherCloudEur: Number(cloudExtras), acceptedTasks: 0 }) : null;
  return <details className={styles.estimate}>
    <summary>Compare 24-month ownership costs</summary>
    <p>Enter a delivered quote and an exchange rate. Both options use {monthlyHours} hours per month. Add local power, fees and repairs or cloud storage, transfer and taxes to the relevant field.</p>
    <div className={styles.estimates}>
      <label>Local delivered quote (€)<input type="number" min="0" step=".01" value={quote} onChange={(event) => setQuote(event.target.value)} /></label>
      <label>Euro per US dollar<input type="number" min=".01" step=".01" value={fx} onChange={(event) => setFx(event.target.value)} /></label>
      <label>Local extras over 24 months (€)<input type="number" min="0" step=".01" value={localExtras} onChange={(event) => setLocalExtras(event.target.value)} /></label>
      <label>Cloud extras over 24 months (€)<input type="number" min="0" step=".01" value={cloudExtras} onChange={(event) => setCloudExtras(event.target.value)} /></label>
    </div>
    <p aria-live="polite">{scenario ?
      `Local ${money(scenario.localEur * 100, "EUR")} · Cloud ${money(scenario.cloudEur * 100, "EUR")}. Assumes equal runtime and zero resale value.` :
      "Enter the quoted total and exchange rate to calculate."}</p>
  </details>;
}

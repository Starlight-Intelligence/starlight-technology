"use client";

import { useId, useMemo, useState } from "react";
import styles from "./compute.module.css";
import { gpuJobIds, localModelWorkloads, planStack, scenarioPresets, workloadModel, type ScenarioInput } from "@/lib/compute-planner";

const eur = (n: number) => `€${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const gb = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)} GB`;

const toScenarioInput = (sc: ScenarioInput): ScenarioInput => ({ ...sc, gpuJobs: [...sc.gpuJobs] });

export function StackPlanner() {
  const [input, setInput] = useState<ScenarioInput>(() => toScenarioInput(scenarioPresets[0]));
  const plan = useMemo(() => planStack(input), [input]);
  const fieldId = useId();

  const setField = <K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const toggleGpuJob = (id: string) =>
    setInput((prev) => ({ ...prev, gpuJobs: prev.gpuJobs.includes(id) ? prev.gpuJobs.filter((j) => j !== id) : [...prev.gpuJobs, id] }));

  const numberField = (label: string, key: keyof ScenarioInput, min = 0, max = 200) => (
    <label className={styles.plannerField}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={input[key] as number}
        onChange={(e) => setField(key, Math.max(min, Math.min(max, Number(e.target.value) || 0)) as ScenarioInput[typeof key])}
      />
    </label>
  );

  return (
    <div className={styles.planner}>
      <div className={styles.presetRow} role="group" aria-label="Load a preset scenario">
        {scenarioPresets.map((sc) => (
          <button
            key={sc.id}
            type="button"
            className={`${styles.presetButton} ${input.id === sc.id ? styles.presetButtonActive : ""}`}
            onClick={() => setInput(toScenarioInput(sc))}
            aria-pressed={input.id === sc.id}
          >
            {sc.name}
          </button>
        ))}
      </div>

      <div className={styles.plannerGrid}>
        {numberField("Agent sessions", "agentSessions", 0, 100)}
        {numberField("Headless browsers", "headlessBrowsers", 0, 50)}
        {numberField("Linux desktop containers", "linuxDesktops", 0, 50)}
        {numberField("Windows virtual machines", "windowsVms", 0, 10)}
        {numberField("Concurrent builds", "concurrentBuilds", 0, 10)}
        {numberField("RAG chunks (millions)", "ragMillionChunks", 0, 20)}
        {numberField("Odoo users", "odooUsers", 0, 200)}

        <label className={styles.plannerField}>
          <span>Langfuse</span>
          <select value={input.langfuse} onChange={(e) => setField("langfuse", e.target.value as ScenarioInput["langfuse"])}>
            <option value="none">Off</option>
            <option value="same-node">On, same node</option>
          </select>
        </label>

        <label className={styles.plannerField}>
          <span>Local model</span>
          <select value={input.localModel ?? ""} onChange={(e) => setField("localModel", e.target.value || null)}>
            <option value="">None</option>
            {localModelWorkloads.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>

        <label className={styles.plannerCheck}>
          <input type="checkbox" checked={input.litellm} onChange={(e) => setField("litellm", e.target.checked)} />
          <span>Model gateway (LiteLLM)</span>
        </label>
        <label className={styles.plannerCheck}>
          <input type="checkbox" checked={input.monitoring} onChange={(e) => setField("monitoring", e.target.checked)} />
          <span>Monitoring agent</span>
        </label>
      </div>

      <fieldset className={styles.plannerFieldset}>
        <legend>GPU jobs (queued, one at a time; sized by the largest)</legend>
        <div className={styles.checkboxGrid}>
          {gpuJobIds.map((id) => (
            <label className={styles.plannerCheck} key={`${fieldId}-${id}`}>
              <input type="checkbox" checked={input.gpuJobs.includes(id)} onChange={() => toggleGpuJob(id)} />
              <span>{workloadModel.vramJobs[id]?.name ?? id}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.plannerResults}>
        <div className={styles.resultCard}>
          <p className={styles.label}>One node, low to high</p>
          <p className={styles.resultBig}>{gb(plan.oneNode.low)} – {gb(plan.oneNode.high)}</p>
          <p className={styles.resultSub}>
            {plan.oneNode.smallestClassGb ? `Smallest standard class that fits: ${plan.oneNode.smallestClassGb} GB` : "Beyond the 192 GB class in the data."}
          </p>
        </div>

        {plan.split && (
          <div className={styles.resultCard}>
            <p className={styles.label}>Two-node split</p>
            <p className={styles.resultSub}>
              Agent node: {gb(plan.split.nodeA.low)} – {gb(plan.split.nodeA.high)}{plan.split.nodeA.classGb ? ` (fits ${plan.split.nodeA.classGb} GB)` : ""}
              {plan.split.nodeA.cheapest ? `, cheapest ${plan.split.nodeA.cheapest.model} at ${eur(plan.split.nodeA.cheapest.amount)} (${plan.split.nodeA.cheapest.tax})` : ""}
            </p>
            <p className={styles.resultSub}>
              Model node: {gb(plan.split.nodeB.low)} – {gb(plan.split.nodeB.high)}{plan.split.nodeB.classGb ? ` (fits ${plan.split.nodeB.classGb} GB)` : ""}
              {plan.split.nodeB.cheapest ? `, cheapest ${plan.split.nodeB.cheapest.model} at ${eur(plan.split.nodeB.cheapest.amount)} (${plan.split.nodeB.cheapest.tax})` : " — no machine in the data clears the 256 GB/s bandwidth this needs"}
            </p>
          </div>
        )}

        {plan.gpu.tier && (
          <div className={styles.resultCard}>
            <p className={styles.label}>Separate GPU node</p>
            <p className={styles.resultBig}>{gb(plan.gpu.vramRequired)} VRAM</p>
            <p className={styles.resultSub}>{plan.gpu.tier}</p>
          </div>
        )}
      </div>

      <div className={styles.tableWrap} role="region" aria-label="Memory class fit, scrolls sideways on small screens" tabIndex={0}>
        <table className={styles.table}>
          <caption>A class fits at the low estimate only when every number in the range is below it; that is a risk, not a plan.</caption>
          <thead>
            <tr>
              <th scope="col">Memory class</th>
              <th scope="col">Fits at low</th>
              <th scope="col">Fits at high</th>
              <th scope="col">Cheapest machine in the data</th>
            </tr>
          </thead>
          <tbody>
            {plan.fits.map((f) => (
              <tr key={f.classGb}>
                <th scope="row">{f.classGb} GB</th>
                <td className={f.fitsLow ? styles.yes : styles.no}>{f.fitsLow ? "✓" : "–"}</td>
                <td className={f.fitsHigh ? styles.yes : styles.no}>{f.fitsHigh ? "✓" : "–"}</td>
                <td className={styles.left}>{f.cheapest ? `${f.cheapest.model} — ${eur(f.cheapest.amount)} (${f.cheapest.tax})` : "none priced in the data"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableWrap} role="region" aria-label="Line-by-line memory, scrolls sideways on small screens" tabIndex={0}>
        <table className={styles.table}>
          <caption>Every line carries the basis it was built on: documented (cited source), derived (regression from the profile), estimate (an assumption) or measured (read on the profiled laptop).</caption>
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col">Count</th>
              <th scope="col">Low</th>
              <th scope="col">High</th>
              <th scope="col">Basis</th>
            </tr>
          </thead>
          <tbody>
            {plan.lines.map((l) => (
              <tr key={l.item}>
                <th scope="row">{l.item}</th>
                <td>{l.count}</td>
                <td>{gb(l.low)}</td>
                <td>{gb(l.high)}</td>
                <td className={styles.left}>{l.basis}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">OS, services and free-RAM floor</th>
              <td>1</td>
              <td>{gb(plan.osAndServices + plan.floorGb)}</td>
              <td>{gb(plan.osAndServices + plan.floorGb)}</td>
              <td className={styles.left}>measured plus policy</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className={styles.notes}>
        Estimates come from one profile of a laptop and must be replaced by the node&apos;s own measurements. {workloadModel.note}
      </p>
    </div>
  );
}

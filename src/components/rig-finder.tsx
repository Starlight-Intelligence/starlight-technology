"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createFinderTools } from "@/lib/finder-webmcp";
import { registerWebTools, type ModelContext } from "@/lib/webmcp.mjs";
import { recommendBuild, type FinderInput } from "@/lib/decision-model";

export function RigFinder() {
  const [input, setInput] = useState<FinderInput>({ workload: "local-ai", budget: "3000", priority: "balance" });
  const currentInput = useRef(input);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    const registration = registerWebTools(context, createFinderTools(
      () => currentInput.current,
      (next) => flushSync(() => { currentInput.current = next; setInput(next); }),
    ), { onError: () => console.warn("System finder browser tools are unavailable.") });
    return registration.stop;
  }, []);
  const result = useMemo(() => recommendBuild(input), [input]);
  const update = <K extends keyof FinderInput>(key: K, value: FinderInput[K]) => {
    const next = { ...currentInput.current, [key]: value };
    currentInput.current = next;
    setInput(next);
  };

  return <section className="finder" aria-labelledby="finder-title">
    <div className="finder-head"><span>01 / DECISION STARTER</span><span>Rules-based · no generated prices</span></div>
    <h2 id="finder-title">Find the first system direction</h2>
    <div className="finder-grid">
      <label>Primary workload<select value={input.workload} onChange={(event) => update("workload", event.target.value as FinderInput["workload"])}><option value="local-ai">Local AI + creation</option><option value="studio">Music / studio</option><option value="travel">Travel / capture</option></select></label>
      <label>Planning budget<select value={input.budget} onChange={(event) => update("budget", event.target.value as FinderInput["budget"])}><option value="1500">Around €1,500</option><option value="3000">Around €3,000</option><option value="7000">Around €7,000</option></select></label>
      <label>Hard priority<select value={input.priority} onChange={(event) => update("priority", event.target.value as FinderInput["priority"])}><option value="balance">Balanced system</option><option value="performance">Maximum local capability</option><option value="mobility">Mobility</option></select></label>
    </div>
    <div className="finder-result" aria-live="polite"><p className="eyebrow">Starting direction</p><h3>{result.title}</h3><p>{result.summary}</p><div className="constraint"><span>DECISIVE CONSTRAINT</span><strong>{result.constraint}</strong></div><Link className="button button-primary" href={result.href}>Inspect the blueprint →</Link></div>
    <p className="finder-note">Conservative routing model, not a product recommendation. Current offers and compatibility still require verification.</p>
  </section>;
}

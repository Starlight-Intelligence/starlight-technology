import { headlinePrice } from "./lib.mjs";

export const NODE_CLASSES = [32, 64, 96, 128, 192];
const r1 = (n) => Math.round(n * 10) / 10;

// Memory demand of one scenario, in GB, as a low and a high estimate.
export function planScenario(sc, model, workloads, machines, research = {}) {
  const lines = [];
  const add = (group, item, count, unit, extra = {}) => {
    if (!count) return;
    lines.push({ group, item, count, low: r1(count * unit.low), high: r1(count * unit.high), basis: unit.basis, note: unit.note ?? "", ...extra });
  };
  const m = model.ram;
  add("agents", "Agent sessions", sc.agentSessions, m.agentSession);
  add("agents", "Headless browsers", sc.headlessBrowsers, m.headlessBrowser);
  add("agents", "Linux desktop containers", sc.linuxDesktops, m.linuxDesktopContainer);
  add("agents", "Windows virtual machines", sc.windowsVms, m.windowsVm);
  add("agents", "Concurrent builds", sc.concurrentBuilds, m.buildBurst);
  add("agents", "Model gateway", sc.litellm ? 1 : 0, m.litellmProxy);
  add("agents", "Monitoring", sc.monitoring ? 1 : 0, m.monitoring);
  if (sc.langfuse === "same-node") add("agents", "Langfuse stack", 1, m.langfuseStack);
  if (sc.odooUsers) {
    const o = model.odoo;
    const workers = Math.ceil(sc.odooUsers / o.usersPerWorker);
    const perWorker = (1 - o.heavyShare) * o.ramPerLightWorkerGb + o.heavyShare * o.ramPerHeavyWorkerGb;
    lines.push({ group: "agents", item: `Odoo for ${sc.odooUsers} users (${workers} workers, plus Postgres)`, count: workers, low: r1(workers * perWorker + o.postgresRamGb.low), high: r1(workers * perWorker + o.postgresRamGb.high), basis: "documented workers, estimated Postgres", note: o.note, sourceIds: o.sourceIds });
  }
  add("model", "RAG vectors (millions of chunks)", sc.ragMillionChunks, m.ragPerMillionChunks);
  let modelGb = 0;
  let modelName = null;
  if (sc.localModel) {
    const w = workloads.find((x) => x.id === sc.localModel);
    modelGb = w.modelGb;
    modelName = w.name;
    lines.push({ group: "model", item: `Local model: ${w.name}`, count: 1, low: modelGb, high: modelGb, basis: w.basis, note: "Weights plus KV cache allowance (workloads.json)." });
  }
  const sum = (group, key) => r1(lines.filter((l) => l.group === group).reduce((a, l) => a + l[key], 0));
  const os = m.osAndServices.low;
  const floor = model.freeFloorGb.value;
  const part = (groups) => ({
    low: r1(groups.reduce((a, g) => a + sum(g, "low"), 0) + os + floor),
    high: r1(groups.reduce((a, g) => a + sum(g, "high"), 0) + os + floor)
  });
  const one = part(["agents", "model"]);
  const nodeA = part(["agents"]);
  const nodeB = part(["model"]);

  const smallest = (gb) => NODE_CLASSES.find((c) => c >= gb) ?? null;
  // minBw: only machines with at least this memory bandwidth (GB/s); 256 marks the Strix Halo class needed for a model node.
  const cheapest = (cls, minBw = 0) => {
    let best = null;
    for (const mc of machines) {
      if (mc.kind !== "system" || mc.memory.gb !== cls) continue;
      if (minBw && !(mc.memory.bandwidthGBs >= minBw)) continue;
      const p = headlinePrice(mc);
      if (p && (!best || p.amount < best.amount)) best = { machineId: mc.id, model: mc.model, amount: p.amount, tax: p.includesTax === true ? "incl. VAT" : p.includesTax === false ? "ex tax" : "tax not stated" };
    }
    return best;
  };
  const MODEL_BW = 256;
  const fits = NODE_CLASSES.map((c) => ({ classGb: c, fitsLow: c >= one.low, fitsHigh: c >= one.high, cheapestPageRead: cheapest(c), cheapestModelCapable: cheapest(c, MODEL_BW) }));
  const oneClass = smallest(one.high);
  const split = modelGb || sc.ragMillionChunks ? { nodeA: { ...nodeA, classGb: smallest(nodeA.high) }, nodeB: { ...nodeB, classGb: smallest(nodeB.high) } } : null;
  if (split) { split.nodeA.cheapestPageRead = split.nodeA.classGb ? cheapest(split.nodeA.classGb) : null; split.nodeB.cheapestPageRead = split.nodeB.classGb ? cheapest(split.nodeB.classGb, MODEL_BW) : null; }

  const jobs = (sc.gpuJobs ?? []).map((id) => ({ id, ...model.vramJobs[id] }));
  const vramRequired = jobs.length ? Math.max(...jobs.map((j) => j.gb)) : 0;
  const tier = vramRequired ? model.gpuTiers.find((t) => vramRequired <= t.uptoGb)?.class ?? "beyond one card: rent cloud GPUs or use a multi-GPU workstation" : null;
  const gpuCandidates = vramRequired
    ? (research["gpu-nodes"]?.gpus ?? []).filter((g) => g.vramGb && g.vramGb >= vramRequired).sort((a, b) => a.vramGb - b.vramGb).map((g) => ({ id: g.id, vramGb: g.vramGb, bandwidthGBs: g.memoryBandwidthGBs, tdpWatts: g.tdpWatts, euPriceVerified: (g.prices ?? []).some((p) => p.kind === "page-read") }))
    : [];

  return { id: sc.id, name: sc.name, description: sc.description, lines, osAndServices: os, floorGb: floor, modelName, modelGb, oneNode: { ...one, smallestClassGb: oneClass }, fits, split, gpu: { jobs, vramRequired, tier, candidates: gpuCandidates } };
}

export function planAll(data) {
  return data.scenarios.scenarios.map((sc) => planScenario(sc, data["workload-model"], data.workloads, data.machines, data.research.topics));
}

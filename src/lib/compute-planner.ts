import workloadModelJson from "../../data/compute/workload-model.json";
import workloadsJson from "../../data/compute/workloads.json";
import scenariosJson from "../../data/compute/scenarios.json";
import { machines as allMachines, headlinePrice, taxLabel } from "./compute";

export interface RamUnit { low: number; high: number; basis: string; note?: string; sourceIds?: string[] }

interface OdooModel { usersPerWorker: number; ramPerLightWorkerGb: number; ramPerHeavyWorkerGb: number; heavyShare: number; postgresRamGb: { low: number; high: number; basis: string }; note: string }
interface VramJob { name: string; gb: number; basis: string; note?: string }
interface GpuTier { uptoGb: number; class: string }

interface WorkloadModel {
  asOf: string;
  note: string;
  ram: {
    agentSession: RamUnit;
    headlessBrowser: RamUnit;
    linuxDesktopContainer: RamUnit;
    windowsVm: RamUnit;
    buildBurst: RamUnit;
    osAndServices: RamUnit;
    langfuseStack: RamUnit;
    litellmProxy: RamUnit;
    monitoring: RamUnit;
    ragPerMillionChunks: RamUnit;
  };
  freeFloorGb: { value: number; basis: string; note: string };
  odoo: OdooModel;
  vramJobs: Record<string, VramJob>;
  gpuTiers: GpuTier[];
}

export const workloadModel = workloadModelJson as unknown as WorkloadModel;

export interface LocalModelWorkload { id: string; name: string; modelGb: number; basis: string; measured?: string; note?: string }
export const localModelWorkloads: LocalModelWorkload[] = (
  workloadsJson as { id: string; name: string; kind: string; modelGb?: number; basis?: string; measured?: string; note?: string }[]
)
  .filter((w) => w.kind === "local-llm")
  .map((w) => ({ id: w.id, name: w.name, modelGb: w.modelGb ?? 0, basis: w.basis ?? "estimate", measured: w.measured, note: w.note }));

export const gpuJobIds = Object.keys(workloadModel.vramJobs);

export interface ScenarioInput {
  id: string;
  name: string;
  agentSessions: number;
  headlessBrowsers: number;
  linuxDesktops: number;
  windowsVms: number;
  concurrentBuilds: number;
  langfuse: "none" | "same-node";
  litellm: boolean;
  monitoring: boolean;
  odooUsers: number;
  ragMillionChunks: number;
  localModel: string | null;
  gpuJobs: string[];
}

export const scenarioPresets = (scenariosJson as { scenarios: ScenarioInput[] }).scenarios;

export const NODE_CLASSES = [32, 64, 96, 128, 192] as const;
const MODEL_BANDWIDTH_GBS = 256;
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface PlannerLine { group: "agents" | "model"; item: string; count: number; low: number; high: number; basis: string; note: string }
export interface MachinePick { machineId: string; model: string; amount: number; tax: string }
export interface NodeFit { classGb: number; fitsLow: boolean; fitsHigh: boolean; cheapest: MachinePick | null }
export interface SplitNode { low: number; high: number; classGb: number | null; cheapest: MachinePick | null }

export interface PlanResult {
  lines: PlannerLine[];
  modelName: string | null;
  modelGb: number;
  osAndServices: number;
  floorGb: number;
  oneNode: { low: number; high: number; smallestClassGb: number | null };
  fits: NodeFit[];
  split: { nodeA: SplitNode; nodeB: SplitNode } | null;
  gpu: { jobs: { id: string; name: string; gb: number; basis: string }[]; vramRequired: number; tier: string | null };
}

function cheapestInClass(classGb: number, minBandwidthGBs = 0): MachinePick | null {
  let best: MachinePick | null = null;
  for (const mc of allMachines) {
    if (mc.kind !== "system" || mc.memory.gb !== classGb) continue;
    if (minBandwidthGBs && !(mc.memory.bandwidthGBs != null && mc.memory.bandwidthGBs >= minBandwidthGBs)) continue;
    const price = headlinePrice(mc);
    if (price && (!best || price.amount < best.amount)) {
      best = { machineId: mc.id, model: mc.model, amount: price.amount, tax: taxLabel(price) };
    }
  }
  return best;
}

const smallestClassFor = (gb: number) => NODE_CLASSES.find((c) => c >= gb) ?? null;

export function planStack(input: ScenarioInput): PlanResult {
  const m = workloadModel.ram;
  const lines: PlannerLine[] = [];
  const add = (group: PlannerLine["group"], item: string, count: number, unit: RamUnit) => {
    if (!count) return;
    lines.push({ group, item, count, low: r1(count * unit.low), high: r1(count * unit.high), basis: unit.basis, note: unit.note ?? "" });
  };

  add("agents", "Agent sessions", input.agentSessions, m.agentSession);
  add("agents", "Headless browsers", input.headlessBrowsers, m.headlessBrowser);
  add("agents", "Linux desktop containers", input.linuxDesktops, m.linuxDesktopContainer);
  add("agents", "Windows virtual machines", input.windowsVms, m.windowsVm);
  add("agents", "Concurrent builds", input.concurrentBuilds, m.buildBurst);
  add("agents", "Model gateway", input.litellm ? 1 : 0, m.litellmProxy);
  add("agents", "Monitoring", input.monitoring ? 1 : 0, m.monitoring);
  if (input.langfuse === "same-node") add("agents", "Langfuse stack", 1, m.langfuseStack);
  if (input.odooUsers) {
    const o = workloadModel.odoo;
    const workers = Math.ceil(input.odooUsers / o.usersPerWorker);
    const perWorker = (1 - o.heavyShare) * o.ramPerLightWorkerGb + o.heavyShare * o.ramPerHeavyWorkerGb;
    lines.push({
      group: "agents",
      item: `Odoo for ${input.odooUsers} users (${workers} workers, plus Postgres)`,
      count: workers,
      low: r1(workers * perWorker + o.postgresRamGb.low),
      high: r1(workers * perWorker + o.postgresRamGb.high),
      basis: "documented workers, estimated Postgres",
      note: o.note
    });
  }
  add("model", "RAG vectors (millions of chunks)", input.ragMillionChunks, m.ragPerMillionChunks);

  let modelGb = 0;
  let modelName: string | null = null;
  if (input.localModel) {
    const w = localModelWorkloads.find((x) => x.id === input.localModel);
    if (w) {
      modelGb = w.modelGb;
      modelName = w.name;
      lines.push({ group: "model", item: `Local model: ${w.name}`, count: 1, low: modelGb, high: modelGb, basis: w.basis, note: "Weights plus KV cache allowance (workloads.json)." });
    }
  }

  const sum = (group: PlannerLine["group"], key: "low" | "high") => r1(lines.filter((l) => l.group === group).reduce((a, l) => a + l[key], 0));
  const os = m.osAndServices.low;
  const floor = workloadModel.freeFloorGb.value;
  const part = (groups: PlannerLine["group"][]) => ({
    low: r1(groups.reduce((a, g) => a + sum(g, "low"), 0) + os + floor),
    high: r1(groups.reduce((a, g) => a + sum(g, "high"), 0) + os + floor)
  });
  const one = part(["agents", "model"]);
  const nodeA = part(["agents"]);
  const nodeB = part(["model"]);

  const fits: NodeFit[] = NODE_CLASSES.map((c) => ({ classGb: c, fitsLow: c >= one.low, fitsHigh: c >= one.high, cheapest: cheapestInClass(c) }));

  const needsSplit = modelGb > 0 || input.ragMillionChunks > 0;
  const split = needsSplit
    ? {
        nodeA: { ...nodeA, classGb: smallestClassFor(nodeA.high), cheapest: null as MachinePick | null },
        nodeB: { ...nodeB, classGb: smallestClassFor(nodeB.high), cheapest: null as MachinePick | null }
      }
    : null;
  if (split) {
    split.nodeA.cheapest = split.nodeA.classGb ? cheapestInClass(split.nodeA.classGb) : null;
    split.nodeB.cheapest = split.nodeB.classGb ? cheapestInClass(split.nodeB.classGb, MODEL_BANDWIDTH_GBS) : null;
  }

  const jobs = input.gpuJobs.map((id) => ({ id, name: workloadModel.vramJobs[id]?.name ?? id, gb: workloadModel.vramJobs[id]?.gb ?? 0, basis: workloadModel.vramJobs[id]?.basis ?? "estimate" }));
  const vramRequired = jobs.length ? Math.max(...jobs.map((j) => j.gb)) : 0;
  const tier = vramRequired ? workloadModel.gpuTiers.find((t) => vramRequired <= t.uptoGb)?.class ?? "beyond one card: rent cloud GPUs or use a multi-GPU workstation" : null;

  return {
    lines,
    modelName,
    modelGb,
    osAndServices: os,
    floorGb: floor,
    oneNode: { ...one, smallestClassGb: smallestClassFor(one.high) },
    fits,
    split,
    gpu: { jobs, vramRequired, tier }
  };
}

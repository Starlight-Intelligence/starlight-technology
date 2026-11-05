import machinesJson from "../../data/compute/machines.json";
import brandsJson from "../../data/compute/brands.json";
import workloadsJson from "../../data/compute/workloads.json";
import supplyJson from "../../data/compute/supply.json";
import suppliersJson from "../../data/compute/suppliers.json";
import siliconJson from "../../data/compute/silicon.json";
import sourcesJson from "../../data/compute/sources.json";
import claimsJson from "../../data/compute/claims.json";
import gapsJson from "../../data/compute/gaps.json";
import graphJson from "../../data/compute/graph.json";
import fundamentalsJson from "../../data/compute/fundamentals.json";
import expansionJson from "../../data/compute/expansion.json";

export type PriceEvidence = "page-read" | "listing" | "reported" | "forum" | "derived" | "snippet";
export type EdgeEvidence = "documented" | "inferred" | "rumor";

export interface Price {
  kind: string;
  amount: number;
  currency: string;
  merchant: string;
  region: string;
  variant: string;
  includesTax: boolean | null;
  verifiedOn: string;
  evidence: PriceEvidence;
  sourceId?: string | null;
  merchantHost?: string;
  note?: string;
}

export interface Machine {
  id: string;
  kind: "system" | "board" | "gpu";
  brandId: string;
  model: string;
  siliconId: string | null;
  status: string;
  memory: { gb: number | null; maxGb: number | null; type: string | null; soldered: boolean | null; bandwidthGBs: number | null };
  os: string[];
  prices: Price[];
  llmEvidence: { model: string; quant: string; tokensPerSecond: string; backend: string; source: string }[];
  sourceIds: string[];
}

export interface Workload {
  id: string;
  name: string;
  kind: "always-on" | "local-llm" | "gpu-later";
  minMemoryGb?: number;
  modelGb?: number;
  headroomGb?: number;
  minVramGb?: number;
  measured?: string;
  note: string;
}

export interface TechChoice { topic: string; choice: string; evidence: EdgeEvidence; sourceIds: string[] }
export interface Brand {
  id: string;
  name: string;
  kind: string;
  approach: string;
  platform: string | null;
  ownBoardDesign: boolean | null;
  techChoices: TechChoice[];
  strengths: string[];
  weaknesses: string[];
  euTerms: { note?: string };
}
export interface SupplyEdge { fromType: "machine" | "brand" | "silicon"; fromId: string; supplierId: string; part: string; evidence: EdgeEvidence; note?: string }
export interface Supplier { id: string; name: string; role: string; country: string | null }
export interface Silicon { id: string; name: string; memoryBandwidthGBs: number | null }

export interface Company {
  brandId: string;
  depth: "full" | "thin" | "stub";
  legalEntities: { name: string; country: string }[];
  euLegalEntity: boolean | null;
  euVatId: { value: string | null; status: string };
  euPresence: { warehouses?: string; euStoreEntity?: string; returnAndWarrantyAsWritten?: string };
  trustpilot: { score: number | null; reviewCount: number | null; url: string; observedOn: string };
  businessRisks: string[];
  sourceIds: string[];
}

export const machines = machinesJson as unknown as Machine[];
export const brands = brandsJson as unknown as Brand[];
export const workloads = workloadsJson as unknown as Workload[];
export const supply = supplyJson as unknown as SupplyEdge[];
export const suppliers = suppliersJson as unknown as Supplier[];
export const silicon = siliconJson as unknown as Silicon[];

export const researchDate = "2026-10-05";
export const stats = {
  sources: sourcesJson.length,
  claims: claimsJson.length,
  gaps: gapsJson.filter((g) => g.status === "open").length,
  gapsTotal: gapsJson.length,
  nodes: graphJson.nodeCount,
  edges: graphJson.edgeCount,
  machines: machines.length,
  brands: brands.length
};

const taxRank = (p: Price) => (p.includesTax === true ? 0 : p.includesTax === null ? 1 : 2);

// Tax basis first: VAT-inclusive beats tax-unknown beats ex-tax, so a machine never headlines at its ex-VAT price.
export function headlinePrice(machine: Pick<Machine, "prices">, currency = "EUR"): Price | null {
  const pool = machine.prices.filter((p) => p.evidence === "page-read" && p.currency === currency);
  if (!pool.length) return null;
  const best = Math.min(...pool.map(taxRank));
  return pool.filter((p) => taxRank(p) === best).reduce((a, b) => (b.amount < a.amount ? b : a));
}

export const sourceUrl = (id?: string | null) => (id ? (sourcesJson.find((s) => s.id === id)?.url ?? null) : null);

export function fits(machine: Pick<Machine, "kind" | "memory">, workload: Workload): boolean | null {
  if (machine.kind === "gpu") {
    if (workload.kind === "gpu-later") return machine.memory.gb != null && machine.memory.gb >= (workload.minVramGb ?? Infinity);
    if (workload.kind === "local-llm") return machine.memory.gb != null && machine.memory.gb >= (workload.modelGb ?? Infinity);
    return false;
  }
  if (machine.memory.gb == null) return null;
  if (workload.kind === "gpu-later") return false;
  if (workload.kind === "always-on") return machine.memory.gb >= (workload.minMemoryGb ?? Infinity);
  return machine.memory.gb - (workload.headroomGb ?? 0) >= (workload.modelGb ?? Infinity);
}

export const taxLabel = (p: Price) => (p.includesTax === true ? "incl. VAT" : p.includesTax === false ? "ex tax" : "tax not stated");

export interface LadderRow {
  id: string;
  name: string;
  memoryGb: number;
  amountEur: number;
  evidence: "page-read" | "reported";
  sale: boolean;
  eurPerGb: number;
  bandwidth: number | null;
  tax: string;
  source: string;
  sourceUrl: string | null;
  boardOnly: boolean;
  verifiedOn: string;
  speed: string | null;
}

const shortName = (m: Machine) =>
  m.model
    .replace(/\s*\(.*?\)/g, "")
    .replace(/,?\s*Ryzen AI Max\+?(?: PRO)?\s*\d+,?/gi, "")
    .replace(/Desktop DIY /, "Framework Desktop ")
    .replace(/^Desktop /, "Framework Desktop ")
    .replace(/^Z2 Mini/, "HP Z2 Mini")
    .replace(/\s{2,}/g, " ")
    .trim();

export function ladderRows(minGb = 64): LadderRow[] {
  const rows: LadderRow[] = [];
  for (const m of machines) {
    if (m.kind === "gpu" || m.memory.gb == null || m.memory.gb < minGb) continue;
    const page = headlinePrice(m);
    const reported = m.prices.find((p) => p.evidence === "reported" && p.currency === "EUR");
    const p = page ?? reported;
    if (!p) continue;
    const llm = m.llmEvidence.find((l) => /\d/.test(String(l.tokensPerSecond)) && l.source === "independent");
    rows.push({
      id: m.id,
      name: shortName(m),
      memoryGb: m.memory.gb,
      amountEur: p.amount,
      evidence: page ? "page-read" : "reported",
      sale: p.kind === "promo",
      eurPerGb: Math.round(p.amount / m.memory.gb),
      bandwidth: m.memory.bandwidthGBs,
      tax: taxLabel(p),
      source: p.merchant,
      sourceUrl: sourceUrl(p.sourceId),
      boardOnly: m.kind === "board",
      verifiedOn: p.verifiedOn,
      speed: llm ? `${llm.model} ${llm.tokensPerSecond} t/s` : null
    });
  }
  return rows.sort((a, b) => a.amountEur - b.amountEur);
}

export interface LadderGroup { memoryGb: number; label: string; low: number; high: number; rows: LadderRow[]; rangeIsPageRead: boolean }

export function ladderGroups(minGb = 64): LadderGroup[] {
  const rows = ladderRows(minGb);
  const sizes = [...new Set(rows.map((r) => r.memoryGb))].sort((a, b) => a - b);
  return sizes.map((gb) => {
    const group = rows.filter((r) => r.memoryGb === gb);
    const read = group.filter((r) => r.evidence === "page-read" && !r.boardOnly);
    const span = read.length ? read : group;
    return { memoryGb: gb, label: `${gb} GB class`, low: span[0].amountEur, high: span[span.length - 1].amountEur, rows: group, rangeIsPageRead: read.length > 0 };
  });
}

export const capacityClasses = [32, 64, 96, 128, 192] as const;

export function capacityTable() {
  return workloads
    .filter((w) => w.kind === "always-on" || w.kind === "local-llm")
    .map((w) => ({
      workload: w,
      cells: capacityClasses.map((gb) => fits({ kind: "system", memory: { gb, maxGb: null, type: null, soldered: null, bandwidthGBs: null } }, w) === true)
    }));
}

export function brandSupply(brandId: string) {
  const own = new Set(machines.filter((m) => m.brandId === brandId).map((m) => m.id));
  const names = new Map(suppliers.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: { supplier: string; part: string; evidence: EdgeEvidence; note?: string }[] = [];
  for (const e of supply) {
    const belongs = (e.fromType === "brand" && e.fromId === brandId) || (e.fromType === "machine" && own.has(e.fromId));
    if (!belongs) continue;
    const key = `${e.supplierId}|${e.part}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ supplier: names.get(e.supplierId)?.name ?? e.supplierId, part: e.part, evidence: e.evidence, note: e.note });
  }
  return out;
}

export function brandSilicon(brandId: string) {
  const names = new Map(silicon.map((s) => [s.id, s.name]));
  return [...new Set(machines.filter((m) => m.brandId === brandId && m.siliconId).map((m) => m.siliconId as string))].map((id) => names.get(id) ?? id);
}

export const graph = graphJson;

export const companies = (fundamentalsJson.companies as unknown as Company[]).filter((c) => c.depth !== "stub");

const clipText = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export const expansionFindings = (expansionJson.scaleUpVsScaleOut.findings as string[]).slice(0, 3).map((f) => clipText(f, 280));

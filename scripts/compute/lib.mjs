import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const FILES = ["sources", "silicon", "machines", "brands", "suppliers", "channels", "builds", "partners", "stack", "claims", "gaps", "supply", "workloads", "fundamentals", "reviews", "expansion", "verification", "research", "workload-model", "scenarios"];
export const MODEL_BASIS = ["documented", "measured", "derived", "estimate", "policy"];
export const VERIFY_STATUS = ["verified", "partially-verified", "refuted", "unverifiable"];
export const GAP_STATUS = ["open", "partial", "closed"];
export const UNIT_SOURCE = ["bought", "loaned by maker", "unknown"];
export const OWNER_SEVERITY = ["minor", "major", "dead-on-arrival", "firmware"];
export const PRICE_EVIDENCE = ["page-read", "listing", "reported", "forum", "derived", "snippet"];
export const REVIEW_MACHINE = { "evo-x2-64": "gmktec-evo-x2-64", "evo-x2-128": "gmktec-evo-x2-128", "evo-x3": "gmktec-evo-x3-128", "ms-s1-max-64": "minisforum-ms-s1-max-64", "ms-s1-max-128": "minisforum-ms-s1-max-128", "bosgame-m5": "bosgame-m5", "beelink-gtr9-pro": "beelink-gtr9-pro" };
export const FAMILY_KEYS = ["framework-desktop"];
export const CLAIM_TYPES = ["manufacturer-assertion", "independent-measurement", "community-report", "legal-text", "inference", "market-data"];
export const EDGE_EVIDENCE = ["documented", "inferred", "rumor"];

const hostOf = (url) => {
  try { return new URL(url).host.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
};
export const isRealDate = (s, now = new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? "")) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d <= now;
};
export const FRESH_DAYS = 30;

export function loadData(dir) {
  const data = {};
  for (const f of FILES) data[f] = JSON.parse(readFileSync(join(dir, f + ".json"), "utf8"));
  return data;
}

export const normalizeText = (text) => text.replace(/\r\n/g, "\n");

export function dataHash(dir) {
  const h = createHash("sha256");
  for (const f of FILES) h.update(normalizeText(readFileSync(join(dir, f + ".json"), "utf8")));
  return h.digest("hex").slice(0, 16);
}

const dup = (list, key = "id") => {
  const seen = new Set();
  const out = [];
  for (const x of list) { if (seen.has(x[key])) out.push(x[key]); seen.add(x[key]); }
  return out;
};

export function validate(data, { now = new Date() } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const ids = {
    silicon: new Set(data.silicon.map((x) => x.id)),
    machines: new Set(data.machines.map((x) => x.id)),
    brands: new Set(data.brands.map((x) => x.id)),
    suppliers: new Set(data.suppliers.map((x) => x.id)),
    channels: new Set(data.channels.map((x) => x.id)),
    workloads: new Set(data.workloads.map((x) => x.id))
  };
  for (const [name, list] of Object.entries({ sources: data.sources, silicon: data.silicon, machines: data.machines, brands: data.brands, suppliers: data.suppliers, channels: data.channels, claims: data.claims, workloads: data.workloads })) {
    for (const d of dup(list)) err(`${name}: duplicate id ${d}`);
  }
  const checkSources = (where, list) => {
    for (const id of list ?? []) if (!sourceById.has(id)) err(`${where}: unresolved source ${id}`);
  };

  for (const s of data.sources) {
    if (!/^https?:\/\//.test(s.url)) err(`source ${s.id}: url must be http(s)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.verifiedOn ?? "")) err(`source ${s.id}: verifiedOn must be YYYY-MM-DD`);
    if (!["opened", "snippet"].includes(s.access)) err(`source ${s.id}: access must be opened or snippet`);
  }

  for (const m of data.machines) {
    if (!ids.brands.has(m.brandId)) err(`machine ${m.id}: unknown brand ${m.brandId}`);
    if (m.siliconId && !ids.silicon.has(m.siliconId)) err(`machine ${m.id}: unknown silicon ${m.siliconId}`);
    if (!m.siliconId) warnings.push(`machine ${m.id}: no silicon mapped`);
    const si = data.silicon.find((s) => s.id === m.siliconId);
    if (si && m.memory.bandwidthGBs != null && si.memoryBandwidthGBs != null && m.memory.bandwidthGBs !== si.memoryBandwidthGBs) err(`machine ${m.id}: bandwidth ${m.memory.bandwidthGBs} GB/s disagrees with silicon ${si.id} (${si.memoryBandwidthGBs} GB/s)`);
    if (si && m.memory.gb != null && si.maxMemoryGb != null && m.memory.gb > si.maxMemoryGb) err(`machine ${m.id}: ${m.memory.gb} GB exceeds the ${si.maxMemoryGb} GB maximum of silicon ${si.id}`);
    checkSources(`machine ${m.id}`, m.sourceIds);
    for (const l of m.llmEvidence) checkSources(`machine ${m.id} llm`, l.sourceIds);
    for (const p of m.prices) {
      const w = `machine ${m.id} price ${p.amount} ${p.currency}`;
      if (typeof p.amount !== "number" || p.amount <= 0) err(`${w}: amount must be a positive number`);
      if (!p.currency) err(`${w}: currency missing`);
      if (!isRealDate(p.verifiedOn, now)) err(`${w}: verifiedOn must be a real past or present YYYY-MM-DD date (a price without a date cannot be published)`);
      if (!PRICE_EVIDENCE.includes(p.evidence)) err(`${w}: evidence must be one of ${PRICE_EVIDENCE.join(", ")}`);
      const variantGb = /(\d+)\s?(?:GB|GiB)/i.exec(p.variant ?? "")?.[1];
      if (variantGb && m.memory.gb && Number(variantGb) !== m.memory.gb) err(`${w}: variant "${p.variant}" disagrees with the machine memory (${m.memory.gb} GB)`);
      const priceSource = p.sourceId ? sourceById.get(p.sourceId) : null;
      if (p.sourceId && !priceSource) err(`${w}: unresolved price source ${p.sourceId}`);
      if (/amazon/i.test(p.merchant ?? "") || /amazon/i.test(p.merchantHost ?? "") || /amazon\./i.test(priceSource?.url ?? "")) err(`${w}: Amazon prices are not stored (Associates terms limit how long they may be shown)`);
      if (p.evidence === "page-read" || p.evidence === "listing") {
        if (!p.merchant || !p.region) err(`${w}: page-read price needs merchant and region`);
        if (!p.sourceId || !p.merchantHost) err(`${w}: page-read price needs its own sourceId and merchantHost`);
        else if (priceSource) {
          if (priceSource.access !== "opened") err(`${w}: page-read price cites ${p.sourceId}, which was not opened (access: ${priceSource.access})`);
          if (!hostOf(priceSource.url).endsWith(p.merchantHost.toLowerCase())) err(`${w}: price source host ${hostOf(priceSource.url)} does not match merchantHost ${p.merchantHost}`);
        }
      }
      const age = (now - new Date(p.verifiedOn)) / 86400000;
      if (age > FRESH_DAYS) warnings.push(`${w}: ${Math.floor(age)} days old (over ${FRESH_DAYS})`);
    }
  }

  for (const b of data.brands) {
    checkSources(`brand ${b.id}`, b.sourceIds);
    checkSources(`brand ${b.id} euTerms`, b.euTerms?.sourceIds);
    for (const t of b.techChoices) {
      if (!EDGE_EVIDENCE.includes(t.evidence)) err(`brand ${b.id} techChoice ${t.topic}: bad evidence ${t.evidence}`);
      checkSources(`brand ${b.id} techChoice ${t.topic}`, t.sourceIds);
    }
    for (const c of b.channels) if (!ids.channels.has(c)) err(`brand ${b.id}: unknown channel ${c}`);
    if (b.platform && !["own", "own-or-unidentified", "nvidia-gb10"].includes(b.platform) && !ids.suppliers.has(b.platform)) err(`brand ${b.id}: unknown platform ${b.platform}`);
  }
  for (const s of data.suppliers) checkSources(`supplier ${s.id}`, s.sourceIds);
  for (const c of data.channels) checkSources(`channel ${c.id}`, c.sourceIds);
  for (const e of data.supply) {
    const pool = { machine: ids.machines, brand: ids.brands, silicon: ids.silicon }[e.fromType];
    if (!pool?.has(e.fromId)) err(`supply edge: unknown ${e.fromType} ${e.fromId}`);
    if (!ids.suppliers.has(e.supplierId)) err(`supply edge: unknown supplier ${e.supplierId}`);
    if (!EDGE_EVIDENCE.includes(e.evidence)) err(`supply edge ${e.fromId}->${e.supplierId}: bad evidence`);
    checkSources(`supply edge ${e.fromId}->${e.supplierId}`, e.sourceIds);
  }
  for (const s of data.silicon) checkSources(`silicon ${s.id}`, s.sourceIds);
  for (const w of data.workloads) checkSources(`workload ${w.id}`, w.sourceIds);

  for (const c of data.claims) {
    if (!CLAIM_TYPES.includes(c.type)) err(`claim ${c.id}: bad type ${c.type}`);
    if (!c.sourceIds?.length) err(`claim ${c.id}: no sources`);
    checkSources(`claim ${c.id}`, c.sourceIds);
    if (c.type === "independent-measurement" && c.sourceIds.length && c.sourceIds.every((id) => sourceById.get(id)?.access === "snippet")) {
      err(`claim ${c.id}: independent-measurement rests only on search snippets; downgrade to inference or open the source`);
    }
  }
  // ---- company fundamentals
  const walkSources = (where, v) => {
    if (Array.isArray(v)) return v.forEach((x) => walkSources(where, x));
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "sourceIds" && Array.isArray(x)) checkSources(where, x);
        else if (k === "sourceId" && typeof x === "string") checkSources(where, [x]);
        else walkSources(where, x);
      }
    }
  };
  for (const c of data.fundamentals.companies) {
    const w = `fundamentals ${c.brandId}`;
    if (!ids.brands.has(c.brandId)) err(`${w}: unknown brand`);
    walkSources(w, c);
    if (!["full", "thin", "stub"].includes(c.depth)) err(`${w}: depth must be full, thin or stub`);
    if (c.depth === "full") {
      const opened = c.legalEntities.some((l) => (l.sourceIds ?? []).some((id) => sourceById.get(id)?.access === "opened"));
      if (!opened) err(`${w}: a full profile needs a legal entity backed by an opened source`);
      if (!(c.euPresence?.returnAndWarrantyAsWritten ?? "").trim() || /^GAP/i.test(c.euPresence.returnAndWarrantyAsWritten)) err(`${w}: a full profile needs the return and warranty terms as written`);
    }
    if (c.depth === "thin" && !c.sourceIds.length) err(`${w}: a thin profile still needs sources`);
    if (c.depth === "stub" && !/snippet|not researched|nothing opened/i.test(c.evidenceNotes ?? "")) err(`${w}: a stub must say it is snippet-only or not researched`);
    if (![true, false, null].includes(c.euLegalEntity)) err(`${w}: euLegalEntity must be true, false or null`);
    if (c.euLegalEntity === true) {
      if (!(c.euVatId?.value && c.euVatId.status === "documented")) err(`${w}: an EU legal entity needs a documented VAT ID`);
      const vs = c.euVatId?.sourceIds ?? [];
      if (!vs.length) err(`${w}: the VAT ID needs a source`);
      for (const id of vs) {
        const s = sourceById.get(id);
        if (s && (s.access !== "opened" || !(c.officialHosts ?? []).some((h) => hostOf(s.url).endsWith(h)))) err(`${w}: VAT ID source ${id} must be an opened page on the company's own host`);
      }
    }
    if (c.trustpilot?.score != null || c.trustpilot?.reviewCount != null) {
      if (!isRealDate(c.trustpilot.observedOn, now)) err(`${w}: Trustpilot figures need a real observedOn date`);
      if (!/^https:\/\//.test(c.trustpilot.url ?? "") || hostOf(c.trustpilot.url ?? "") !== "trustpilot.com") err(`${w}: Trustpilot url must be a trustpilot.com page`);
    }
  }

  // ---- reviews and owner reports
  const machineKeys = new Set(data.reviews.reviews.map((r) => r.machineKey));
  const reviewIds = new Set();
  for (const r of data.reviews.reviews) {
    const w = `review ${r.id}`;
    if (reviewIds.has(r.id)) err(`${w}: duplicate id`);
    reviewIds.add(r.id);
    if (r.machineId && !ids.machines.has(r.machineId)) err(`${w}: unknown machine ${r.machineId}`);
    if (FAMILY_KEYS.includes(r.machineKey)) { if (r.machineId) err(`${w}: ${r.machineKey} is a family-level review and must not map to one machine`); }
    else if (REVIEW_MACHINE[r.machineKey] !== r.machineId) err(`${w}: machineKey ${r.machineKey} must map to ${REVIEW_MACHINE[r.machineKey] ?? "a known machine"}, not ${r.machineId}`);
    const outletToken = (r.outlet ?? "").toLowerCase().match(/[a-z0-9]{4,}/)?.[0];
    const rsrc = sourceById.get(r.sourceId);
    if (outletToken && rsrc && !`${rsrc.publisher} ${rsrc.title} ${hostOf(rsrc.url)}`.toLowerCase().includes(outletToken)) err(`${w}: source ${r.sourceId} does not look like the outlet ${r.outlet}`);
    checkSources(w, [r.sourceId]);
    if (!UNIT_SOURCE.includes(r.unitSource)) err(`${w}: unitSource must be one of ${UNIT_SOURCE.join(", ")}`);
    if (r.sponsored && r.independent) err(`${w}: a sponsored review cannot be marked independent`);
    const rs = sourceById.get(r.sourceId);
    const hasNumbers = (r.measured?.tokensPerSecond ?? []).length > 0 || r.measured?.idleWatts != null || r.measured?.loadWatts != null || r.measured?.noiseDbA != null;
    if (rs?.access === "snippet" && hasNumbers) err(`${w}: measurements cannot come from a snippet-only source (${r.sourceId})`);
  }
  for (const o of data.reviews.ownerReports) {
    const w = `owner report ${o.machineKey}`;
    if (!OWNER_SEVERITY.includes(o.severity)) err(`${w}: severity must be one of ${OWNER_SEVERITY.join(", ")}`);
    if (o.sourceId) checkSources(w, [o.sourceId]);
    if (!isRealDate(o.observedOn, now)) err(`${w}: observedOn must be a real date`);
  }
  for (const [k, c] of Object.entries(data.reviews.consensus)) {
    if (!machineKeys.has(k)) warnings.push(`consensus ${k}: no review records for this machine key`);
    checkSources(`consensus ${k}`, c.sourceIds);
    const allowed = new Set([...data.reviews.reviews.filter((r) => r.machineKey === k).map((r) => r.sourceId), ...data.reviews.ownerReports.filter((o) => o.machineKey === k && o.sourceId).map((o) => o.sourceId)]);
    for (const id of c.sourceIds ?? []) if (!allowed.has(id)) err(`consensus ${k}: cites ${id}, which is not a review or owner report of ${k}`);
  }
  walkSources("expansion", data.expansion);
  walkSources("research", data.research);
  const wm = data["workload-model"];
  const checkUnit = (where, u) => {
    if (!MODEL_BASIS.includes(u.basis ?? "")) err(`workload model ${where}: basis must be one of ${MODEL_BASIS.join(", ")}`);
    if (u.low != null && u.high != null && !(u.low <= u.high)) err(`workload model ${where}: low must not exceed high`);
    if (u.basis === "documented") {
      if (!(u.sourceIds ?? []).some((id) => sourceById.get(id)?.access === "opened")) err(`workload model ${where}: a documented constant needs an opened source`);
    }
    checkSources(`workload model ${where}`, u.sourceIds);
  };
  for (const [k, u] of Object.entries(wm.ram)) checkUnit(k, u);
  for (const [k, u] of Object.entries(wm.vramJobs)) checkUnit(k, { ...u, low: u.gb, high: u.gb });
  checkUnit("odoo", wm.odoo);
  const modelIds = new Set(data.workloads.filter((w) => w.kind === "local-llm").map((w) => w.id));
  const scIds = new Set();
  for (const s of data.scenarios.scenarios) {
    if (scIds.has(s.id)) err(`scenario ${s.id}: duplicate id`);
    scIds.add(s.id);
    if (s.localModel && !modelIds.has(s.localModel)) err(`scenario ${s.id}: unknown local model ${s.localModel}`);
    for (const j of s.gpuJobs ?? []) if (!wm.vramJobs[j]) err(`scenario ${s.id}: unknown GPU job ${j}`);
    for (const k of ["agentSessions", "headlessBrowsers", "linuxDesktops", "windowsVms", "concurrentBuilds", "odooUsers", "ragMillionChunks"]) if (!(Number.isFinite(s[k]) && s[k] >= 0)) err(`scenario ${s.id}: ${k} must be a non-negative number`);
    if (!["none", "same-node", "elsewhere"].includes(s.langfuse)) err(`scenario ${s.id}: langfuse must be none, same-node or elsewhere`);
  }
  for (const [name, topic] of Object.entries(data.research.topics ?? {})) if ("sources" in topic) err(`research ${name}: sources belong in sources.json, not inside the topic`);

  // ---- verification log
  const itemIds = new Set();
  for (const i of data.verification.items) {
    const w = `verification ${i.id}`;
    if (itemIds.has(i.id)) err(`${w}: duplicate id`);
    itemIds.add(i.id);
    if (!VERIFY_STATUS.includes(i.status)) err(`${w}: status must be one of ${VERIFY_STATUS.join(", ")}`);
    if (i.status === "unverifiable" && !(i.caveat ?? "").trim()) err(`${w}: unverifiable needs a note saying what was tried`);
    if (i.status === "verified" && !(i.sourceIds ?? []).some((id) => sourceById.get(id)?.access === "opened" && sourceById.get(id)?.primary)) err(`${w}: verified needs an opened primary source`);
    checkSources(w, i.sourceIds);
  }
  for (const p of data.verification.programme) {
    if (!VERIFY_STATUS.includes(p.status)) err(`programme ${p.id}: bad status ${p.status}`);
    for (const x of p.items ?? []) if (!itemIds.has(x)) err(`programme ${p.id}: unknown item ${x}`);
  }
  for (const g of data.gaps) if (!GAP_STATUS.includes(g.status)) err(`gap "${String(g.text).slice(0, 40)}": status must be one of ${GAP_STATUS.join(", ")}`);
  for (const c of data.claims) {
    if (c.type === "legal-text" && !c.sourceIds.some((id) => sourceById.get(id)?.access === "opened" && sourceById.get(id)?.primary)) err(`claim ${c.id}: legal-text needs an opened primary source`);
  }
  return { errors, warnings };
}

// price helpers -------------------------------------------------------------
// Tax basis first: a VAT-inclusive price is preferred over a tax-unknown one, which is
// preferred over an ex-tax one, so one machine never headlines at its ex-VAT price.
const taxRank = (p) => (p.includesTax === true ? 0 : p.includesTax === null ? 1 : 2);
export function headlinePrice(machine, currency = "EUR") {
  const pool = machine.prices.filter((p) => p.evidence === "page-read" && p.currency === currency);
  if (!pool.length) return null;
  const best = Math.min(...pool.map(taxRank));
  return pool.filter((p) => taxRank(p) === best).reduce((a, b) => (b.amount < a.amount ? b : a));
}

export function fits(machine, workload) {
  if (machine.kind === "gpu") {
    if (workload.kind === "gpu-later") return machine.memory.gb != null && machine.memory.gb >= workload.minVramGb;
    if (workload.kind === "local-llm") return machine.memory.gb != null && machine.memory.gb >= workload.modelGb;
    return false;
  }
  if (machine.memory.gb == null) return null;
  if (workload.kind === "gpu-later") return false;
  if (workload.kind === "always-on") return machine.memory.gb >= workload.minMemoryGb;
  if (workload.kind === "local-llm") return machine.memory.gb - workload.headroomGb >= workload.modelGb;
  return false;
}

// graph ---------------------------------------------------------------------
export function buildGraph(data, hash) {
  const nodes = [];
  const edges = [];
  const add = (type, id, label, extra = {}) => nodes.push({ id: `${type}:${id}`, type, label, ...extra });
  for (const b of data.brands) add("brand", b.id, b.name, { kind: b.kind });
  for (const m of data.machines) add("machine", m.id, m.model, { kind: m.kind, memoryGb: m.memory.gb });
  for (const s of data.silicon) add("silicon", s.id, s.name, { bandwidthGBs: s.memoryBandwidthGBs });
  for (const s of data.suppliers) add("supplier", s.id, s.name, { role: s.role });
  for (const c of data.channels) add("channel", c.id, c.name, { channelType: c.type });
  for (const o of ["windows", "linux", "macos"]) add("os", o, o);
  for (const w of data.workloads) add("workload", w.id, w.name, { kind: w.kind });
  const edge = (from, to, rel, evidence, extra = {}) => edges.push({ from, to, rel, evidence, ...extra });
  const brandSilicon = new Map();
  // An edge is only "documented" when its machine or brand record cites a source; otherwise "unsourced".
  const proof = (ids) => ((ids ?? []).length ? "documented" : "unsourced");
  for (const m of data.machines) {
    const ev = proof(m.sourceIds);
    edge(`machine:${m.id}`, `brand:${m.brandId}`, "made-by", ev, { sourceIds: m.sourceIds });
    if (m.siliconId) {
      edge(`machine:${m.id}`, `silicon:${m.siliconId}`, "uses", ev, { sourceIds: m.sourceIds });
      brandSilicon.set(`${m.brandId}|${m.siliconId}`, m.sourceIds);
    }
    for (const os of m.os) edge(`machine:${m.id}`, `os:${os}`, "runs", "inferred", { sourceIds: [] });
    for (const w of data.workloads) {
      const f = fits(m, w);
      if (f) edge(`machine:${m.id}`, `workload:${w.id}`, "fits-capacity", "inferred", { sourceIds: w.sourceIds });
    }
  }
  for (const [key, ids] of brandSilicon) {
    const [b, s] = key.split("|");
    edge(`brand:${b}`, `silicon:${s}`, "ships", proof(ids), { sourceIds: ids });
  }
  for (const b of data.brands) for (const c of b.channels) edge(`brand:${b.id}`, `channel:${c}`, "sold-via", proof(data.channels.find((x) => x.id === c)?.sourceIds), { sourceIds: data.channels.find((x) => x.id === c)?.sourceIds ?? [] });
  for (const e of data.supply) edge(`${e.fromType}:${e.fromId}`, `supplier:${e.supplierId}`, e.part, e.evidence, { note: e.note, sourceIds: e.sourceIds });
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const e of edges) if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) throw new Error(`graph edge endpoint missing: ${e.from} -> ${e.to}`);
  return { schemaVersion: 1, dataHash: hash, nodeCount: nodes.length, edgeCount: edges.length, nodes, edges };
}

// index ---------------------------------------------------------------------
const money = (p) => `${p.currency === "EUR" ? "EUR" : p.currency} ${p.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const taxLabel = (p) => (p.includesTax === true ? "incl. VAT" : p.includesTax === false ? "ex tax" : "tax not stated");

export function renderIndex(data, graph) {
  const L = [];
  const supName = new Map(data.suppliers.map((s) => [s.id, s.name]));
  const silName = new Map(data.silicon.map((s) => [s.id, s]));
  L.push("# Engineering index: mini PCs and local-AI compute");
  L.push("");
  L.push("Generated by `node scripts/compute/build.mjs` from `data/compute/*.json`. Do not edit by hand; edit the records and rerun.");
  L.push(`Data hash \`${graph.dataHash}\`. Research date 2026-10-05. Buyer region assumed NL/EU (OPEN). ${graph.nodeCount} nodes, ${graph.edgeCount} edges.`);
  L.push("");
  L.push("## How to read the evidence tags");
  L.push("");
  L.push("| Tag | Meaning |");
  L.push("|---|---|");
  L.push("| documented | A record cites an opened source that states it (manufacturer page, teardown, review, or a community wiki where named) |");
  L.push("| inferred | Our reasoning from documented facts |");
  L.push("| rumor | Reported, not confirmed by an opened primary source |");
  L.push("| unsourced | A graph edge whose record cites no source |");
  L.push("| page-read price | Read from a merchant, manufacturer or price-comparison listing page whose host matches the named merchant, opened on the date shown; the price record names that page |");
  L.push("| listing price | The lowest price on a comparison site that does not name the selling shop (for example Tweakers Pricewatch); checked like a page-read price but never used as a headline |");
  L.push("| reported / forum / derived / snippet price | Not shown as a headline price: second-hand, forum post, arithmetic, or search-result text |");
  L.push("| community-report claim | A community wiki, forum or aggregate; it is attributed, not treated as an independent measurement |");
  L.push("");
  L.push("## Supply lineage");
  L.push("");
  L.push("Solid arrows are documented. Dashed arrows are inferred or rumor. Brand-level arrows aggregate machine records.");
  L.push("");
  L.push("```mermaid");
  L.push("flowchart LR");
  const mm = (id) => id.replace(/[^a-zA-Z0-9]/g, "_");
  for (const b of data.brands) L.push(`  b_${mm(b.id)}["${b.name}"]`);
  for (const s of data.suppliers) L.push(`  s_${mm(s.id)}(["${s.name}"])`);
  const used = new Set();
  for (const e of graph.edges) {
    if (e.rel === "ships" ) { const [, b] = e.from.split(":"); const [, s] = e.to.split(":"); used.add(s); L.push(`  b_${mm(b)} --> si_${mm(s)}`); }
  }
  for (const s of used) L.push(`  si_${mm(s)}{{"${silName.get(s).name}"}}`);
  const seenEdge = new Set();
  for (const e of data.supply) {
    const brand = e.fromType === "brand" ? e.fromId : e.fromType === "machine" ? data.machines.find((m) => m.id === e.fromId)?.brandId : null;
    const from = e.fromType === "silicon" ? `si_${mm(e.fromId)}` : `b_${mm(brand)}`;
    const arrow = e.evidence === "documented" ? "-->" : "-.->";
    const line = `  ${from} ${arrow}|${e.part}| s_${mm(e.supplierId)}`;
    if (seenEdge.has(line)) continue;
    seenEdge.add(line);
    L.push(line);
  }
  L.push("```");
  L.push("");
  L.push("## Brands: how each one builds and sells");
  for (const b of data.brands) {
    L.push("");
    L.push(`### ${b.name} (${b.kind})`);
    L.push("");
    L.push(b.approach);
    L.push("");
    const platformLabel = { own: "own design", "own-or-unidentified": "own or unidentified (not established)", "nvidia-gb10": "NVIDIA GB10 reference platform" };
    L.push(`- Platform: ${b.platform == null ? "n/a" : platformLabel[b.platform] ?? supName.get(b.platform) ?? b.platform}. Own board design: ${b.ownBoardDesign ?? "not established"}.`);
    for (const t of b.techChoices) L.push(`- ${t.topic}: ${t.choice} [${t.evidence}]`);
    if (b.euTerms?.note) L.push(`- EU terms: ${b.euTerms.note}`);
    if (b.strengths.length) L.push(`- Strengths: ${b.strengths.join("; ")}`);
    if (b.weaknesses.length) L.push(`- Weak points: ${b.weaknesses.join("; ")}`);
    const aff = data.partners.affiliatePrograms.find((a) => a.id === b.affiliate?.programId);
    if (aff) L.push(`- Affiliate: ${aff.network}, ${aff.commission ?? "rate not found"}, cookie ${aff.cookieDays ?? "not found"} [${aff.evidenceStatus}]`);
  }
  L.push("");
  L.push("## Machines with a page-read price");
  L.push("");
  L.push("| Machine | Memory | Bandwidth | Cheapest page-read EUR | EUR per GB | Other reported price (not page-read) | Measured local-LLM (as reported) |");
  L.push("|---|---|---|---|---|---|---|");
  const sold = data.machines.filter((x) => x.kind === "system" || x.kind === "board");
  for (const m of sold) {
    const p = headlinePrice(m);
    const gb = m.memory.gb;
    const mem = gb ? `${gb} GB ${m.memory.type ?? ""}`.trim() : m.memory.maxGb ? `up to ${m.memory.maxGb} GB, ${m.memory.type ?? "SO-DIMM"} (not included)` : "n/v";
    const bw = m.memory.bandwidthGBs ? `${m.memory.bandwidthGBs} GB/s` : "n/v";
    const rep = m.prices.filter((q) => q.evidence !== "page-read").map((q) => `${money(q)} (${q.evidence}: ${q.merchant}${q.includesTax === true ? ", incl. VAT" : ""})`).join("; ") || "none";
    const llm = m.llmEvidence
      .filter((l) => /\d/.test(String(l.tokensPerSecond)))
      .slice(0, 2)
      .map((l) => `${l.model}${l.quant && !/unspecified|not stated/.test(l.quant) ? " " + l.quant : ""} ${l.tokensPerSecond} t/s${l.source === "manufacturer" ? " [mfr]" : ""}`)
      .join("; ") || "none verified";
    const eurGb = p && gb && p.currency === "EUR" ? Math.round(p.amount / gb) : "n/v";
    L.push(`| ${m.model}${m.kind === "board" ? " (board only)" : ""} | ${mem} | ${bw} | ${p ? `${money(p)}${p.kind === "promo" ? " sale" : ""} (${taxLabel(p)}, ${p.merchant}, ${p.verifiedOn})` : "none page-read"} | ${eurGb} | ${rep} | ${llm} |`);
  }
  L.push("");
  L.push("Price notes: `n/v` means not verified. A price on this page is a snapshot from the named merchant on the named date, never a current offer. Amazon prices are not stored. EUR per GB uses the cheapest page-read EUR price for the stated memory size; sale prices are marked. Variant and memory must agree or the record fails validation.");
  L.push("");
  L.push("## Which workloads each machine fits on capacity alone");
  L.push("");
  L.push("Capacity only: bandwidth, software support and thermals are separate (see the speed column above). Rules are in `workloads.json`.");
  L.push("");
  const wl = data.workloads.filter((w) => w.kind === "always-on" || w.kind === "local-llm");
  L.push(`| Machine | ${wl.map((w) => w.id).join(" | ")} |`);
  L.push(`|---|${wl.map(() => "---").join("|")}|`);
  for (const m of sold) {
    L.push(`| ${m.model}${m.kind === "board" ? " (board only)" : ""} | ${wl.map((w) => { const f = fits(m, w); return f === null ? "n/v" : f ? "yes" : "no"; }).join(" | ")} |`);
  }
  L.push("");
  L.push("## Channels");
  L.push("");
  for (const c of data.channels) L.push(`- **${c.name}** (${c.type}, ${c.region}): ${c.note}`);
  L.push("");
  const gapCount = (s) => data.gaps.filter((g) => g.status === s).length;
  L.push("## Companion documents and open gaps");
  L.push("");
  L.push("- [Company fundamentals](COMPANY-FUNDAMENTALS.md): legal entity, EU presence, terms as written, support, incidents");
  L.push("- [Reviews and owner reports](REVIEWS.md)");
  L.push("- [Verification log](VERIFICATION-LOG.md): what was unverified and where it stands now");
  L.push("- [Expansion paths](EXPANSION-PATHS.md): eGPU, clusters, racks, RAG");
  L.push("- [Founder buying guide](FOUNDER-BUYING-GUIDE.md) and [fleet blueprint](FLEET-BLUEPRINT.md)");
  L.push("");
  L.push(`Gaps in \`data/compute/gaps.json\`: ${gapCount("open")} open, ${gapCount("partial")} partly closed, ${gapCount("closed")} closed (${data.gaps.length} total).`);
  L.push("");
  return L.join("\n");
}


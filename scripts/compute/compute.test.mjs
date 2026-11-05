import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData, dataHash, validate, buildGraph, renderIndex, headlinePrice, fits, normalizeText } from "./lib.mjs";
import { EXTRA_DOCS } from "./render-more.mjs";
import { planAll } from "./plan.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "data", "compute");
const fresh = () => structuredClone(loadData(dir));
const machine = (d, id) => d.machines.find((m) => m.id === id);
const firstError = (d, now) => validate(d, now ? { now } : undefined).errors;

test("committed records validate with no errors", () => {
  const { errors } = validate(loadData(dir));
  assert.deepEqual(errors, []);
});

test("generated graph and index match the records", () => {
  const data = loadData(dir);
  const graph = buildGraph(data, dataHash(dir));
  assert.equal(readFileSync(join(dir, "graph.json"), "utf8"), JSON.stringify(graph, null, 2) + "\n");
  assert.equal(readFileSync(join(root, "docs", "compute", "ENGINEERING-INDEX.md"), "utf8"), renderIndex(data, graph));
});

test("every graph edge lands on a real node", () => {
  const data = loadData(dir);
  const graph = buildGraph(data, "t");
  const ids = new Set(graph.nodes.map((n) => n.id));
  assert.ok(graph.edges.length > 100);
  for (const e of graph.edges) assert.ok(ids.has(e.from) && ids.has(e.to), `${e.from} -> ${e.to}`);
});

test("gate: unresolved source id is rejected", () => {
  const d = fresh();
  machine(d, "gmktec-evo-x2-64").sourceIds.push("nope-s99");
  assert.ok(firstError(d).some((e) => e.includes("unresolved source nope-s99")));
});

test("gate: price without a date is rejected", () => {
  const d = fresh();
  delete machine(d, "gmktec-evo-x2-64").prices[0].verifiedOn;
  assert.ok(firstError(d).some((e) => e.includes("real past or present")));
});

test("gate: Amazon prices are never stored", () => {
  const d = fresh();
  machine(d, "gmktec-evo-x2-64").prices.push({ kind: "merchant", amount: 1899, currency: "EUR", merchant: "Amazon.nl", region: "NL", variant: "64GB", includesTax: true, verifiedOn: "2026-10-05", evidence: "page-read" });
  assert.ok(firstError(d).some((e) => e.includes("Amazon prices are not stored")));
});

test("gate: a price for another memory size is rejected", () => {
  const d = fresh();
  machine(d, "gmktec-evo-x2-128").prices.push({ kind: "msrp", amount: 1999.99, currency: "EUR", merchant: "de.gmktec.com", region: "EU", variant: "64GB/1TB", includesTax: null, verifiedOn: "2026-10-05", evidence: "page-read" });
  assert.ok(firstError(d).some((e) => e.includes("disagrees with the machine memory")));
});

test("gate: a snippet relabelled page-read is rejected", () => {
  const d = fresh();
  const m = machine(d, "gmktec-evo-x2-64");
  d.sources.find((s) => s.id === m.prices[0].sourceId).access = "snippet";
  assert.ok(firstError(d).some((e) => e.includes("was not opened")));
});

test("gate: a page-read price needs its own source on the merchant's host", () => {
  const d = fresh();
  const m = machine(d, "gmktec-evo-x2-64");
  delete m.prices[0].sourceId;
  assert.ok(firstError(d).some((e) => e.includes("needs its own sourceId")));
  const d2 = fresh();
  const m2 = machine(d2, "gmktec-evo-x2-64");
  m2.prices[0].sourceId = machine(d2, "minisforum-ms-s1-max-64").prices[0].sourceId;
  assert.ok(firstError(d2).some((e) => e.includes("does not match merchantHost")));
});

test("gate: an Amazon source is rejected even under another merchant name", () => {
  const d = fresh();
  d.sources.push({ id: "t-amazon", title: "listing", publisher: "Amazon", url: "https://www.amazon.nl/dp/B0TEST", verifiedOn: "2026-10-05", primary: false, access: "opened" });
  const p = machine(d, "gmktec-evo-x2-64").prices[0];
  p.merchant = "Marketplace";
  p.sourceId = "t-amazon";
  assert.ok(firstError(d).some((e) => e.includes("Amazon prices are not stored")));
});

test("gate: impossible and future dates are rejected", () => {
  const d = fresh();
  machine(d, "gmktec-evo-x2-64").prices[0].verifiedOn = "2026-13-45";
  assert.ok(firstError(d).some((e) => e.includes("real past or present")));
  const d2 = fresh();
  machine(d2, "gmktec-evo-x2-64").prices[0].verifiedOn = "2027-01-01";
  assert.ok(firstError(d2).some((e) => e.includes("real past or present")));
});

test("gate: GiB variants, bandwidth and capacity must agree with the machine and silicon", () => {
  const d = fresh();
  machine(d, "gmktec-evo-x2-128").prices.push({ kind: "msrp", amount: 1, currency: "EUR", merchant: "x", region: "EU", variant: "64GiB", includesTax: null, verifiedOn: "2026-10-05", evidence: "reported" });
  assert.ok(firstError(d).some((e) => e.includes("disagrees with the machine memory")));
  const d2 = fresh();
  machine(d2, "gmktec-evo-x2-128").memory.bandwidthGBs = 999;
  assert.ok(firstError(d2).some((e) => e.includes("disagrees with silicon")));
  const d3 = fresh();
  machine(d3, "gmktec-evo-x2-128").memory.gb = 256;
  assert.ok(firstError(d3).some((e) => e.includes("exceeds the 128 GB maximum")));
});

test("headline price uses one tax basis: VAT-inclusive beats ex-VAT", () => {
  const d = fresh();
  const hp = machine(d, "hp-z2-mini-g1a-128");
  assert.ok(hp.prices.some((p) => p.includesTax === false));
  assert.equal(headlinePrice(hp).amount, 3890.15);
  assert.equal(headlinePrice(hp).includesTax, true);
});

test("graph edges cite sources or say they are unsourced", () => {
  const data = loadData(dir);
  const graph = buildGraph(data, "t");
  const made = graph.edges.filter((e) => e.rel === "made-by");
  const bosgame = made.find((e) => e.from === "machine:bosgame-m5");
  assert.equal(bosgame.evidence, "unsourced");
  assert.ok(made.filter((e) => e.evidence === "documented").every((e) => e.sourceIds.length > 0));
});
test("gate: a measurement claim cannot rest only on search snippets", () => {
  const d = fresh();
  const snippet = d.sources.find((s) => s.access === "snippet");
  d.claims.push({ id: "t-1", text: "x", type: "independent-measurement", sourceIds: [snippet.id], asOf: "2026-10-05" });
  assert.ok(firstError(d).some((e) => e.includes("rests only on search snippets")));
});

test("gate: duplicate ids and unknown suppliers are rejected", () => {
  const d = fresh();
  d.machines.push(structuredClone(d.machines[0]));
  d.supply.push({ fromType: "brand", fromId: "gmktec", supplierId: "ghost", part: "board", evidence: "documented", sourceIds: [] });
  const errors = firstError(d);
  assert.ok(errors.some((e) => e.includes("duplicate id")));
  assert.ok(errors.some((e) => e.includes("unknown supplier ghost")));
});

test("stale prices warn but do not fail", () => {
  const d = fresh();
  const later = new Date("2026-12-31");
  const { errors, warnings } = validate(d, { now: later });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes("days old")));
});

test("headline price ignores non-page-read evidence", () => {
  const d = fresh();
  assert.equal(headlinePrice(machine(d, "apple-mac-studio-m5max-64")), null);
  assert.equal(headlinePrice(machine(d, "gmktec-evo-x2-128")).amount, 3999);
});

test("capacity rule: 64 GB cannot host a 70B Q4 beside agent sessions, 128 GB can", () => {
  const d = fresh();
  const w70 = d.workloads.find((w) => w.id === "local-dense-70b-q4");
  assert.equal(fits(machine(d, "gmktec-evo-x2-64"), w70), false);
  assert.equal(fits(machine(d, "gmktec-evo-x2-128"), w70), true);
  assert.equal(fits(machine(d, "gmktec-k11-64"), w70), null);
});

test("data hash does not depend on line endings", () => {
  assert.equal(normalizeText("a\r\nb\r\n"), normalizeText("a\nb\n"));
  assert.match(dataHash(dir), /^[0-9a-f]{16}$/);
});

test("generated companion documents match the records", () => {
  const data = loadData(dir);
  const hash = dataHash(dir);
  for (const [name, render] of EXTRA_DOCS) {
    assert.equal(readFileSync(join(root, "docs", "compute", name), "utf8"), render(data, hash), name);
  }
});

test("gate: a snippet-only review cannot carry measurements", () => {
  const d = fresh();
  const r = d.reviews.reviews.find((x) => x.snippetOnly === true) ?? d.reviews.reviews[0];
  d.sources.find((s) => s.id === r.sourceId).access = "snippet";
  r.measured = { noiseDbA: 50, tokensPerSecond: [] };
  assert.ok(firstError(d).some((e) => e.includes("cannot come from a snippet-only source")));
});

test("gate: a sponsored review cannot be marked independent", () => {
  const d = fresh();
  d.reviews.reviews[0].sponsored = true;
  d.reviews.reviews[0].independent = true;
  assert.ok(firstError(d).some((e) => e.includes("sponsored review cannot be marked independent")));
});

test("gate: an EU legal entity needs a documented VAT ID", () => {
  const d = fresh();
  const c = d.fundamentals.companies.find((x) => x.brandId === "gmktec");
  c.euLegalEntity = true;
  assert.ok(firstError(d).some((e) => e.includes("needs a documented VAT ID")));
});

test("gate: Trustpilot figures need a real date and a trustpilot.com page", () => {
  const d = fresh();
  const c = d.fundamentals.companies.find((x) => x.brandId === "framework");
  c.trustpilot.observedOn = "2026-02-30";
  assert.ok(firstError(d).some((e) => e.includes("real observedOn date")));
  const d2 = fresh();
  d2.fundamentals.companies.find((x) => x.brandId === "framework").trustpilot.url = "https://example.com/reviews";
  assert.ok(firstError(d2).some((e) => e.includes("trustpilot.com")));
});

test("gate: verification items need evidence for their status", () => {
  const d = fresh();
  const v = d.verification.items.find((x) => x.status === "verified");
  for (const id of v.sourceIds) d.sources.find((s) => s.id === id).access = "snippet";
  assert.ok(firstError(d).some((e) => e.includes("verified needs an opened primary source")));
  const d2 = fresh();
  d2.verification.items.push({ id: "t99", area: "technical", question: "q", status: "unverifiable", finding: "f", caveat: "", sourceIds: [] });
  assert.ok(firstError(d2).some((e) => e.includes("unverifiable needs a note")));
});

test("gate: legal-text claims need an opened primary source and unknown machines are rejected", () => {
  const d = fresh();
  const c = d.claims.find((x) => x.type === "legal-text");
  for (const id of c.sourceIds) d.sources.find((s) => s.id === id).primary = false;
  assert.ok(firstError(d).some((e) => e.includes("legal-text needs an opened primary source")));
  const d2 = fresh();
  d2.reviews.reviews[0].machineId = "no-such-machine";
  d2.gaps[0].status = "maybe";
  const errors = firstError(d2);
  assert.ok(errors.some((e) => e.includes("unknown machine no-such-machine")));
  assert.ok(errors.some((e) => e.includes("status must be one of open, partial, closed")));
});

test("batch 2 facts are in the records with their evidence", () => {
  const d = loadData(dir);
  assert.deepEqual(d.fundamentals.companies.filter((c) => c.euLegalEntity === true).map((c) => c.brandId), ["framework"]);
  const quote = d.claims.find((c) => c.id === "vl-c05");
  assert.ok(quote.text.includes("deklarieren wir in der Regel einen niedrigeren Warenwert"));
  const tw = machine(d, "gmktec-evo-x2-64").prices.find((p) => p.merchantHost === "tweakers.net");
  assert.equal(tw.amount, 2139);
  assert.equal(tw.evidence, "listing");
  for (const b of d.builds.diy) {
    const sum = Math.round(b.pricedParts.reduce((a, p) => a + p.amount, 0) * 100) / 100;
    assert.equal(b.totalEur, sum);
  }
  assert.equal(d.verification.items.filter((i) => i.area === "legal").length, 10);
});
test("gate: a Trustpilot lookalike host is rejected", () => {
  const d = fresh();
  d.fundamentals.companies.find((x) => x.brandId === "framework").trustpilot.url = "https://trustpilot.com.evil.example/review/frame.work";
  assert.ok(firstError(d).some((e) => e.includes("trustpilot.com")));
});

test("gate: a VAT ID must come from an opened page on the company's own host", () => {
  const d = fresh();
  const c = d.fundamentals.companies.find((x) => x.brandId === "framework");
  const other = d.sources.find((s) => s.access === "opened" && !s.url.includes("frame.work"));
  c.euVatId.sourceIds = [other.id];
  assert.ok(firstError(d).some((e) => e.includes("must be an opened page on the company's own host")));
  const d2 = fresh();
  d2.fundamentals.companies.find((x) => x.brandId === "framework").euVatId.sourceIds = [];
  assert.ok(firstError(d2).some((e) => e.includes("the VAT ID needs a source")));
});

test("gate: verified items need an opened primary source", () => {
  const d = fresh();
  const v = d.verification.items.find((x) => x.status === "verified");
  for (const id of v.sourceIds) d.sources.find((s) => s.id === id).primary = false;
  assert.ok(firstError(d).some((e) => e.includes("verified needs an opened primary source")));
});

test("gate: a review source must look like its outlet", () => {
  const d = fresh();
  const r = d.reviews.reviews.find((x) => x.outlet === "ServeTheHome");
  r.sourceId = d.sources.find((s) => s.publisher === "Notebookcheck" || /notebookcheck/i.test(s.url)).id;
  assert.ok(firstError(d).some((e) => e.includes("does not look like the outlet")));
});

test("gate: review machine keys must map to the right machine and family reviews to none", () => {
  const d = fresh();
  d.reviews.reviews.find((x) => x.machineKey === "evo-x2-64").machineId = "gmktec-evo-x2-128";
  assert.ok(firstError(d).some((e) => e.includes("must map to gmktec-evo-x2-64")));
  const d2 = fresh();
  d2.reviews.reviews.find((x) => x.machineKey === "framework-desktop").machineId = "framework-desktop-395-128";
  assert.ok(firstError(d2).some((e) => e.includes("family-level review")));
});

test("gate: consensus may cite only reviews or owner reports of its own machine", () => {
  const d = fresh();
  d.reviews.consensus["evo-x2-64"].sourceIds.push(d.reviews.reviews.find((x) => x.machineKey === "evo-x2-128").sourceId);
  assert.ok(firstError(d).some((e) => e.includes("is not a review or owner report of evo-x2-64")));
});

test("gate: a full company profile needs an opened legal-entity source and written terms", () => {
  const d = fresh();
  const c = d.fundamentals.companies.find((x) => x.brandId === "framework");
  for (const l of c.legalEntities) for (const id of l.sourceIds ?? []) d.sources.find((s) => s.id === id).access = "snippet";
  assert.ok(firstError(d).some((e) => e.includes("needs a legal entity backed by an opened source")));
  const d2 = fresh();
  d2.fundamentals.companies.find((x) => x.brandId === "framework").euPresence.returnAndWarrantyAsWritten = "";
  assert.ok(firstError(d2).some((e) => e.includes("needs the return and warranty terms as written")));
});

test("comparison-site listings are checked like page-read prices but never headline", () => {
  const d = fresh();
  const m = machine(d, "gmktec-evo-x2-64");
  const tw = m.prices.find((p) => p.merchantHost === "tweakers.net");
  assert.equal(tw.evidence, "listing");
  assert.equal(headlinePrice(m).amount, 1999.99);
  tw.merchantHost = "coolblue.nl";
  assert.ok(firstError(d).some((e) => e.includes("does not match merchantHost")));
});

test("Bosgame is a thin profile, and DIY totals are labelled incomplete estimates", () => {
  const d = loadData(dir);
  assert.equal(d.fundamentals.companies.find((c) => c.brandId === "bosgame").depth, "thin");
  assert.ok(d.builds.diy.every((b) => b.status === "incomplete-estimate" && b.missingParts.includes("shipping")));
});

test("planner: hand-computed totals for the four scenarios", () => {
  const plans = Object.fromEntries(planAll(loadData(dir)).map((p) => [p.id, p]));
  const s1 = plans["s1-agents-one-node"];
  assert.equal(s1.oneNode.low, 49);
  assert.equal(s1.oneNode.high, 59);
  assert.equal(s1.oneNode.smallestClassGb, 64);
  const s2 = plans["s2-businesses-desktops-local-model"];
  assert.equal(s2.oneNode.low, 106.2);
  assert.equal(s2.oneNode.high, 128.2);
  assert.equal(s2.split.nodeA.classGb, 128);
  assert.equal(s2.split.nodeB.classGb, 64);
  assert.deepEqual([s2.split.nodeA.low, s2.split.nodeA.high, s2.split.nodeB.low, s2.split.nodeB.high], [77.2, 97.2, 41, 43]);
  const s3 = plans["s3-plus-erp-and-70b"];
  assert.equal(s3.oneNode.low, 145.6);
  assert.equal(s3.oneNode.high, 176.6);
  assert.equal(s3.oneNode.smallestClassGb, 192);
  const odoo = s3.lines.find((l) => l.item.startsWith("Odoo"));
  assert.equal(odoo.count, 3);
  const s4 = plans["s4-plus-media-and-finetune-gpu"];
  assert.equal(s4.gpu.vramRequired, 26);
  assert.match(s4.gpu.tier, /RTX 5090/);
});

test("planner: a model node only offers machines with 256 GB/s or more", () => {
  const data = loadData(dir);
  const s2 = planAll(data).find((p) => p.id === "s2-businesses-desktops-local-model");
  const pick = data.machines.find((m) => m.id === s2.split.nodeB.cheapestPageRead.machineId);
  assert.ok(pick.memory.bandwidthGBs >= 256);
});

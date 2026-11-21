import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeOffers, readBoundedJson, sha256 } from "../workers/hardware/adapters.mjs";
const fixture = {
  external_id: "fixture-1", variant_id: "fixture", seller_id: "test", market: "NL",
  condition: "refurbished", currency: "EUR", vat_mode: "unknown", availability: "unknown",
  observed_at: "2026-11-21T00:00:00Z", item_minor: 123, url: "https://example.invalid/item?variant=123456",
};
test("only licensed hosts and typed normalized facts enter the pipeline", async () => {
  const [row] = normalizeOffers([{ ...fixture, customer_email: "not-retained" }], ["example.invalid"]);
  assert.equal(row.observed_at, "2026-11-21T00:00:00.000Z");
  assert.equal(row.shipping_minor, null);
  assert.equal(row.customer_email, undefined);
  assert.equal((await sha256(JSON.stringify(row))).length, 64);
  for (const patch of [
    { url: "https://evil.invalid/item" }, { url: "https://example.invalid/item?affiliate=test" },
    { url: "http://example.invalid/item" }, { observed_at: "2026-02-31T00:00:00Z" },
    { item_minor: 4.2 }, { market: "US" }, { vat_mode: "invoice" },
  ]) assert.throws(() => normalizeOffers([{ ...fixture, ...patch }], ["example.invalid"]));
});
test("refuses excessive or non-JSON bodies", async () => {
  assert.deepEqual(await readBoundedJson(Response.json([1]), 8), [1]);
  await assert.rejects(readBoundedJson(Response.json([1, 2, 3, 4, 5]), 8), /size/);
  await assert.rejects(readBoundedJson(new Response("<html/>")), /JSON/);
});

test("research catalog uses unique exact IDs and merchant references point to matched variants", async () => {
  const { readFile } = await import("node:fs/promises");
  const data = async (filename) => JSON.parse(await readFile(new URL("../data/hardware/" + filename, import.meta.url), "utf8"));
  const catalog = await data("catalog.json");
  const byId = new Map(catalog.map((row) => [row.id, row]));
  assert.equal(byId.size, catalog.length);
  assert.ok(catalog.filter((row) => ["desktop", "laptop", "mini"].includes(row.category)
    && row.specs.processor && row.specs.ramGb > 0 && row.specs.storageGb > 0).length >= 50);
  for (const row of catalog) assert.equal(new URL(row.sourceUrl).protocol, "https:");
  const research = await data("offer-review.json");
  const quotes = normalizeOffers(research.map((row) => ({ ...row, observed_at: row.evidenceDate + "T00:00:00Z" })), ["de.gmktec.com", "www.apple.com"]);
  for (const quote of quotes) assert.ok(byId.has(quote.variant_id));
  assert.equal(new Set(quotes.map((quote) => [quote.seller_id, quote.market, quote.external_id].join(":"))).size, quotes.length);
  for (const build of await data("builds.json")) for (const part of build.components) {
    assert.equal(byId.get(build.id)?.category, "build");
    assert.equal(byId.get(part.id)?.category, "component");
    assert.ok(byId.get(build.id).specs.requiredChecks[part.slot].includes(part.dimension));
  }
});

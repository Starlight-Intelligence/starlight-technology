import seed from "../../data/hardware/catalog.json";
import builds from "../../data/hardware/builds.json";
import upgrades from "../../data/hardware/upgrades.json";
import references from "../../data/hardware/offer-review.json";
import type { Configuration, Market } from "./hardware";

export async function hardwareCatalog(market: Market): Promise<{ catalog: Configuration[]; status: "canonical" | "research" | "unavailable" }> {
  const endpoint = process.env.HARDWARE_SUPABASE_URL;
  const key = process.env.HARDWARE_SUPABASE_PUBLISHABLE_KEY;
  if (!endpoint && !key && process.env.VERCEL_ENV !== "production") {
    const localReferences = process.env.VERCEL_ENV ? [] : references;
    const catalog: Configuration[] = seed.map((row) => {
      const parts = builds.find((build) => build.id === row.id)?.components ?? [];
      return {
        ...row, category: row.category as Configuration["category"], offers: [],
        components: parts.map(({ id, slot, quantity }) => ({ id, slot, quantity })),
        compatibility: parts.map(({ id, dimension, rationale, url }) => ({ candidateId: id, dimension, rationale, url, outcome: "pass" })),
        benchmarks: [],
        upgrades: upgrades.filter((upgrade) => upgrade.hostId === row.id).map((upgrade) => ({ ...upgrade, url: row.sourceUrl })),
        references: localReferences.filter((quote) => quote.market === market && quote.variant_id === row.id).map((quote) => ({
          id: quote.external_id, url: quote.url, itemMinor: quote.item_minor, observedAt: quote.evidenceDate, condition: quote.condition,
        })),
      };
    });
    return { catalog, status: "research" };
  }
  if (!endpoint || !key) return { catalog: [], status: "unavailable" };
  try {
    const response = await fetch(new URL("/rest/v1/rpc/hardware_catalog", endpoint), {
      method: "POST", headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ requested_market: market }), cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { catalog: [], status: "unavailable" };
    const catalog: unknown = await response.json();
    if (!Array.isArray(catalog)) return { catalog: [], status: "unavailable" };
    return { catalog, status: "canonical" };
  } catch {
    return { catalog: [], status: "unavailable" };
  }
}

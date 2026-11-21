import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const evidence = JSON.parse(readFileSync(new URL("../../data/compute/decision-evidence.json", import.meta.url), "utf8"));
const quote = (value) => value === null ? "null" : typeof value === "boolean" || typeof value === "number" ?
  String(value) : "'" + String(value).replaceAll("'", "''") + "'";
const values = (row) => "(" + row.map(quote).join(", ") + ")";

const sources = Object.entries(evidence.sources).map(([id, url]) => values([id, url]));
const variants = evidence.variants.filter((row) => row.specConfidence === "documented");
const accepted = new Set(variants.map((row) => row.id));
const observations = evidence.observations.filter((row) => row.evidence !== "buyer-quote" &&
  accepted.has(row.variantId) && row.observedOn && Object.hasOwn(evidence.sources, row.source));
const offerValues = observations.map((row) => values([
  createHash("sha256").update(JSON.stringify(row)).digest("hex"), row.id, row.variantId, row.source, row.seller, row.market, row.shipsToNl, row.shippingMinor, row.currency,
  row.amountMinor, row.basis, row.availability, row.unit, row.observedOn, row.captureAgeDays, row.evidence, row.note
]));
process.stdout.write(`begin;
set local standard_conforming_strings = on;
insert into compute_intelligence.source (id,url) values
${sources.join(",\n")}
on conflict (id) do nothing;
insert into compute_intelligence.variant (id,atlas_id,sku,payload) values
${variants.map((row) => values([row.id, row.atlasId, row.sku, JSON.stringify(row)])).join(",\n")}
on conflict (id) do nothing;
insert into compute_intelligence.observation
(observation_hash,offer_id,variant_id,source_id,seller,market,ships_to_nl,shipping_minor,currency,amount_minor,tax_basis,
 availability,price_unit,read_on,capture_age_days,evidence_status,note) values
${offerValues.join(",\n")}
on conflict do nothing;
commit;
`);

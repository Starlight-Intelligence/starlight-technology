import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (name) => JSON.parse(readFileSync(new URL("../data/hardware/" + name, import.meta.url), "utf8"));
const catalog = read("catalog.json");
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sql = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const json = (value) => sql(JSON.stringify(value)) + "::jsonb";
const source = "'manufacturer-catalog-research'";
const statements = ["begin;", "set local standard_conforming_strings = on;"];
statements.push(`insert into hardware.sources(id,adapter,rights_url,max_age_seconds)
  values (${source}, 'reviewed-manifest', 'https://starlight.technology/methodology', 86400)
  on conflict (id) do nothing;`);
for (const row of catalog) {
  const brandId = sql(slug(row.brand));
  const productId = sql(slug(row.brand + "-" + row.product));
  const hash = createHash("sha256").update(JSON.stringify(row)).digest("hex");
  const observed = sql(row.observedAt + "T00:00:00Z");
  const url = sql(row.sourceUrl);
  const evidence = `(select id from hardware.evidence where source_id=${source} and url=${url}
    and observed_at=${observed} and sha256=${sql(hash)})`;
  statements.push(`insert into hardware.brands values (${brandId},${sql(row.brand)}) on conflict do nothing;
insert into hardware.products values (${productId},${brandId},${sql(row.product)},${sql(row.category)}) on conflict do nothing;
insert into hardware.evidence(source_id,url,observed_at,sha256) values (${source},${url},${observed},${sql(hash)}) on conflict do nothing;
insert into hardware.variants(id,product_id,exact_key,label,specs,evidence_id,reviewed_at)
 values (${sql(row.id)},${productId},${sql(row.id)},${sql(row.label)},${json(row.specs)},${evidence},${observed})
 on conflict do nothing;`);
  if (row.mpn) statements.push(`insert into hardware.identifiers values
 ('mpn',${brandId},${sql(row.mpn.toUpperCase())},${sql(row.id)},${evidence}) on conflict do nothing;`);
}
for (const upgrade of read("upgrades.json")) {
  const [from, to] = [sql(upgrade.hostId), sql(upgrade.targetId)];
  statements.push(`insert into hardware.upgrade_paths
    select ${from},${to},${sql(upgrade.action)},evidence_id from hardware.variants where id=${from}
    on conflict do nothing;`);
}
for (const build of read("builds.json")) {
  for (const part of build.components) {
    const id = sql(build.id);
    const partId = sql(part.id);
    const date = sql(catalog.find((item) => item.id === build.id).observedAt + "T00:00:00Z");
    const url = sql(part.url);
    const hash = sql(createHash("sha256").update(JSON.stringify({ build: build.id, ...part })).digest("hex"));
    const evidence = `(select id from hardware.evidence where source_id=${source} and url=${url}
      and observed_at=${date} and sha256=${hash})`;
    statements.push(`insert into hardware.evidence(source_id,url,observed_at,sha256)
     values (${source},${url},${date},${hash}) on conflict do nothing;
    insert into hardware.components values (${id},${sql(part.slot)},${partId},${part.quantity},${evidence}) on conflict do nothing;
    insert into hardware.compatibility values (${id},${partId},${sql(part.dimension)},'pass',${sql(part.rationale)},${evidence}) on conflict do nothing;`);
  }
}
statements.push("commit;");
process.stdout.write(statements.join("\n") + "\n");

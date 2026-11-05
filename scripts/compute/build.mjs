import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData, dataHash, validate, buildGraph, renderIndex } from "./lib.mjs";
import { EXTRA_DOCS } from "./render-more.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "data", "compute");
const graphPath = join(dir, "graph.json");
const indexPath = join(root, "docs", "compute", "ENGINEERING-INDEX.md");
const check = process.argv.includes("--check");

const data = loadData(dir);
const { errors, warnings } = validate(data);
for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}
const graph = buildGraph(data, dataHash(dir));
const graphText = JSON.stringify(graph, null, 2) + "\n";
const indexText = renderIndex(data, graph);
const extras = EXTRA_DOCS.map(([name, render]) => [join(root, "docs", "compute", name), render(data, graph.dataHash)]);

if (check) {
  const stale = [];
  if (!existsSync(graphPath) || readFileSync(graphPath, "utf8") !== graphText) stale.push("data/compute/graph.json");
  if (!existsSync(indexPath) || readFileSync(indexPath, "utf8") !== indexText) stale.push("docs/compute/ENGINEERING-INDEX.md");
  for (const [p, text] of extras) if (!existsSync(p) || readFileSync(p, "utf8") !== text) stale.push(p.slice(root.length + 1).replaceAll("\\", "/"));
  if (stale.length) {
    console.error(`generated files are stale: ${stale.join(", ")}. Run: node scripts/compute/build.mjs`);
    process.exit(1);
  }
  console.log(`compute data ok: ${graph.nodeCount} nodes, ${graph.edgeCount} edges, ${warnings.length} warnings`);
} else {
  writeFileSync(graphPath, graphText);
  writeFileSync(indexPath, indexText);
  for (const [p, text] of extras) writeFileSync(p, text);
  console.log(`wrote graph.json (${graph.nodeCount} nodes, ${graph.edgeCount} edges), ENGINEERING-INDEX.md and ${extras.length} companion documents; ${warnings.length} warnings`);
}

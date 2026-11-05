import { NextResponse } from "next/server";
import { graph, researchDate } from "@/lib/compute";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    product: "Starlight compute atlas",
    status: "research only, no hands-on testing",
    researchDate,
    regionAssumption: "NL/EU (open)",
    note: "Graph only. Edges carry an evidence tag (documented, inferred, rumor or unsourced) and the source IDs behind them. Prices, claims and sources are in data/compute/ in the repository.",
    graph
  });
}

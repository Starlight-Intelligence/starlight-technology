import { compareCompute, parseDecisionInput } from "@/lib/compute-advisor";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const budget = params.get("budgetEur");
  const hours = params.get("monthlyGpuHours");
  const input = parseDecisionInput({
    budgetEur: budget?.trim() ? Number(budget) : undefined,
    workload: params.get("workload"),
    monthlyGpuHours: hours?.trim() ? Number(hours) : undefined
  });
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  return input ? Response.json(compareCompute(input), { headers }) :
    Response.json({ error: "Invalid comparison input", required: ["budgetEur", "workload", "monthlyGpuHours"] }, { status: 400, headers });
}

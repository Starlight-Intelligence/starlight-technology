# Workstation Lab benchmark protocol v1

The schema reserves three workload versions. Before a measured run, pin the input bundle, grader and runtime by commit or SHA-256, and publish a reproducibility receipt. Keep modeled results, independently reported runs and Lab-measured runs visibly labeled.

| Workload | 30 tasks per replicate | Completion criterion |
|---|---|---|
| Repository maintenance | Frozen repo checkout, fixtures and expected behavior. Fixed agent policy, tools and wall-time budget. | Patch applies, hidden tests pass, protected paths are untouched, and time budget is met. |
| Evidence research | Frozen corpus, required claims, citation anchors and response schema. | Required claims and citations pass the versioned checklist within time. |
| Local inference | Structured and exact-match prompts at 4K, 16K and 32K context. Freeze model, weights, quantization, runtime and tokens. | Exact or schema validation and the workload-specific time limit pass. |

Run three repetitions at concurrency 1 and 4. Split cold and warm runs. Measure AC wall energy from start to finish, including failures and retries. Capture p50/p95 time-to-first-token and end-to-end duration, completion rate, peak VRAM/RAM, thermal throttling and noise where the rig has calibrated instrumentation. Report package power separately from wall energy. Record power limit, driver, OS, BIOS, model digest, memory and storage configuration, ambient temperature, tool trace hash, task budget, route mix and measurement instrument. A repinned model, task suite or grading rule is a different comparison cohort. A zero-completion run produces an unavailable unit cost.

Cost per accepted completion = (wall kWh × electricity tariff + paid model/tool calls + tracked operator time + amortized equipment allocation) ÷ tasks that passed the grader. Report direct variable cost and fully allocated cost separately and attach the assumptions. Allocate capex as (evidenced delivered purchase cost minus modeled residual) divided by planned productive hours, multiplied by device hours consumed by the run. Charge time and usage consumed by failed attempts. Keep income tax and VAT filing outside the benchmark. Compare cloud using measured provider and network/tool costs at the same quality and service level. Keep native currency until an explicit conversion rate and date are applied.

The MVP ships protocols and formula tests. The seed contains no measured runs.

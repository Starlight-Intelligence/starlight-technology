# Hardware Intelligence operating costs and intake

Planning envelope for a 30-day development month. Assumes 100 observations per day, under 64 KB per Queue message, one successful enqueue/read/delete sequence, 2 KB of normalized snapshot per observation, two Workflow steps per refresh, and no new vendor contract. Amounts are incremental estimates before taxes and depend on portfolio-level usage.

| Resource | Volume | Estimated impact |
|---|---:|---|
| Cloudflare Queue | 9,000 standard operations/month before retries | Within the published included quantity on Workers Paid. |
| R2 Standard | 6 MB/month submitted, about 18 MB after 90 days | Within published included storage and operation volumes in isolation. |
| Workers and Workflows | 3,000 observations, about 60 steps at one batch refresh/day, conservative 0.1M CPU-ms | Within paid included capacity in isolation. Published Workers Paid starts at USD 5/month if a separate base plan is required. |
| Supabase | 3,000 price points/month plus indexes and evidence | Existing capacity subject to headroom. Pro published from USD 25/month. An isolated branch or project may add compute and charges. |
| Next.js | Existing Vercel project and preview gates | No independent plan assumed. Costs depend on traffic and current seat/build entitlement. |
| Merchant and benchmark data | Reviewed intake initially | USD 0 licensing assumed until a feed agreement is approved. Bench operator time and equipment excluded. |

A simple base-plan scenario is USD 0 incremental within current account allowances or USD 30/month for separate base Workers Paid and Supabase Pro. Dedicated branching, Vercel, feeds, instrument costs, and account-level overages sit outside this scenario. [Workers and R2 pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/) · [Workflow pricing](https://developers.cloudflare.com/workflows/reference/pricing/) · [Supabase pricing](https://supabase.com/pricing).

Track per-source rows offered, accepted, rejected and DLQ depth, freshness lag, URL or identifier collisions, R2 puts, Postgres rows and storage, monthly Worker CPU/steps, and eligible-offer coverage by country. A failed feed must never convert old observations into current prices. Set retention from actual source grants and use short-lived intake credentials. Keep the retry backlog visible to the existing Starlight review operators.

The launch metric is 50 complete produced hardware configurations and 100 policy-eligible distinct offers within their freshness window. The initial research ledger is inventory and evidence for staging review. Merchant-offer intake requires normalized exact variant plus seller and market, source-rights approval, observed timestamp, current price and reliable availability. Delivered cost and invoice fields are separately disclosed when unknown. Complete same-quality benchmark runs before publishing any measured unit-cost comparison.

The 21 November intake includes 63 manufacturer-backed complete systems, one parts-build model, three component identities and 16 exact storefront price observations. The observations sit in `data/hardware/offer-review.json`. No current offers qualify for the release check because the estate inspection established no applicable feed or publication grant for them and checkout availability is unverified. Request a licensed feed or obtain explicit retailer permission, then resolve each exact SKU and reconcile coverage to 100. Open Icecat can extend SKU evidence under its open content license while the live-price intake needs its own merchant rights. [Open Icecat](https://icecat.com/open-icecat/).

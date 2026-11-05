# Gap-closure attempt, 2026-11-04 — blocked before any fetch

Branch: `agent/cloud/compute-gaps-research`, off `agent/claude/compute-fleet-intel` (head `8f81da5`).
Task: close the eight open items from the issue 36 comment dated 2026-10-06.

## What happened

Every tool capable of reaching a live source was refused by a permission gate this
session could not satisfy: `WebSearch`, `WebFetch`, `mcp__claude_ai_Firecrawl__firecrawl_search`,
`mcp__apify__apify--google-search-scraper`, and `mcp__starlight-research__research_search` all
returned `Claude requested permissions to use <tool>, but you haven't granted it yet.` on the
first call, before any URL was requested and before any domain was contacted. This is a
session-level permission gate, not the `EGRESS_BLOCKED` network failure the issue brief names —
no domain was ever reached to record. A non-interactive run has no one to approve the prompt.

No research was performed. No claim, price, source or verification record was added, edited or
marked closed, because there is nothing behind any of it: fabricating a finding to make the list
look closed would be worse than leaving it open.

## The eight items, status unchanged

1. EU street prices for RTX 5090 and RTX PRO 5000/6000 (Coolblue, Megekko, Azerty) — **open**, not attempted.
2. Marktplaats used prices for 128 GB-class machines — **open**, not attempted (prior session already hit a block here; see gap at `data/compute/gaps.json` area `batch2-prices`).
3. Microsoft/AMD primary source for the Windows "up to 96 GB" GPU-memory claim and the Vulkan ~64 GB issue — **open**, not attempted (`verification.json` items `t01`/`p01` already flag the AMD page as snippet-only).
4. Current TikTok and Meta AI-generated-content policy text — **open**, not attempted.
5. Dutch e-invoicing/record-retention rules and EU RMA/B2B warranty terms per seller — **open**, not attempted.
6. HP Z2 Mini G1a independent reviews — **open**, not attempted.
7. Local lip-sync/avatar/TTS model VRAM and licence requirements — **open**, not attempted.
8. A measured (non-vendor) AI-video retake rate — **open**, not attempted.

`node scripts/compute/build.mjs --check` and `node --test scripts/compute/compute.test.mjs` both
pass on this branch unchanged from `compute-fleet-intel` (95 nodes, 299 edges, 0 warnings; 39/39
tests). Nothing in `data/compute/*.json` was touched, so there is no risk of this note
contradicting the generated docs.

## What the next session needs

Grant (or run interactively so the prompt can be approved) at least one of: `WebSearch`,
`WebFetch`, the Firecrawl connector, or the Apify connector, before attempting these eight items
again. Record real sourceIds per `scripts/compute/lib.mjs`'s validator (opened, dated, host-matched
for any page-read price) rather than reusing this note's placeholders.

# Wave 1: starlight.technology homepage

Author: OpenCode (DeepSeek V4.1 Flash), 2026-11-28
Branch: `agent/opencode/evidence-meters` from `origin/main` (`238de99`)
Surface: homepage, the nine collection cards (builds, comparisons, guides)
Status: preview only. Production promotion needs human approval.

## What changed

Each collection card's footer printed the evidence state as words: "decision model inference",
"source backed", "hands on". It now draws it as a four-rung ladder and prints one word beside it.

| | before | after |
|---|---|---|
| homepage word count | 615 | 613 |
| visual elements | 3 | 12 |
| words per visual | 205 | 51 |
| evidence meters | 0 | 9 |

The rung count is not invented: owned-and-tested 4, hands-on 3, research-backed 2, inferred 1. The
colour is the same status colour the dot in `EvidenceBar` already uses, so a reader learns the code
once. The full label stays in the DOM as `sr-only` text, so nothing is lost to a screen reader.

## Why this shape, and why not glass

This repo's own contract is explicit: the first viewport must show a real decision object or system
artifact, "not generic gradients, node/orbit imagery, fake dashboards, or decorative glass cards".
A glass sheet here would be a contract violation, so the visual added is the product's own trust
signal, drawn. It is the same rule the FrankX pass used in reverse: the material serves the surface,
not the other way round.

## Evidence

- `before/` production at 1440x900 and 390x844; `after/` the identical local build of this branch.
- `after/card-desktop.png` is one card at 2x so the ladder can be inspected.
- Counts taken from the served HTML with tags stripped and `sr-only` text excluded.
- No horizontal overflow at 390; no page errors at either viewport.

## Gates

- `node scripts/verify-toolchain.mjs` → Toolchain compatible
- `eslint .` → exit 0
- `tsc --noEmit` → exit 0
- `vitest run` → 14 files, 82 tests passed
- `node --test scripts/webmcp.test.mjs scripts/hardware-adapters.test.mjs` → 14 passed
- `next build` not run locally: machine PP hold (RAM reserve under the floor). The Vercel build is
  the build.

## Next increment on this surface

The shop cards already carry a schematic. The remaining text-heavy block is the hero proof list
(09 launch analyses, 04 evidence states, NL/EU) and the five-word signal strip; both are candidates
for a single small figure, not for more copy.

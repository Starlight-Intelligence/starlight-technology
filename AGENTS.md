# Starlight Technology Repository Instructions

## Product

Starlight Technology is the buying-intelligence and complete-system design platform for AI-native creators and small teams. The initial campaign is AI Creator Studio.

## Workspace

- Canonical repo: `C:/Users/frank/starlight/repos/starlight-technology`
- Never use `C:/Users/frank/universe`.
- Never recursively search `C:/`, `C:/Users/frank`, home, Desktop, Documents, Downloads, OneDrive, This PC, or Phone/MTP paths. Restrict all searches to this repo or another explicit leaf.
- Before writes, verify Git top-level, origin, and branch.

## Product boundaries

- `frankx.ai/stack` owns Frank's personal “what I use and why” content.
- This repo owns market-wide comparisons, complete builds, evidence records, decision models, and regional offer intelligence.
- Do not duplicate FrankX articles or present research-only conclusions as hands-on testing.
- Do not publish prices without a verification timestamp and merchant-policy-compliant source.

## Engineering

- Next.js App Router, TypeScript strict mode, server-first components.
- Keep product/editorial data typed and source-backed.
- Prefer static generation and ISR; do not call merchant APIs during page requests.
- Do not add databases, paid services, tracking vendors, account systems, or merchant feeds before an explicit product need and cost/privacy decision.
- No secrets in Git. Never inspect or print `.env` values.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before handoff.

## Design

Apply the Starlight design pack and the estate premium asset gate. The first viewport must show a real decision object or system artifact, not generic gradients, node/orbit imagery, fake dashboards, or decorative glass cards. Use clear hierarchy, restrained motion, reduced-motion support, keyboard focus, and intentional mobile composition.

Important visual changes require `design-loop-evidence.json`, desktop/mobile inspection, and a score of at least 26/30.

## GitOps

- Draft-first PRs.
- Group meaningful changes; do not push tiny churn.
- Verify locally before triggering Vercel.
- One deploy path: Vercel native Git integration after project connection.
- Do not merge or promote production without verified gates.

## Media governance

- Apply `$govern-media-fabric` for images, diagrams, videos, covers and article media; read `docs/editorial/MEDIA-HANDOFF.md` before adding a product visual.
- Content references semantic placement keys; production components resolve only approved immutable renditions from `data/media/approved-placements.json`. Do not hardcode provider URLs or put a metadata service in the image request path.
- Store private masters and approved public renditions in the existing Vercel Blob fabric when provisioned, review packages in Drive, approval metadata in the shared control plane, and source policy in Git. Keep unlicensed manufacturer images quarantined.
- Preserve asset/version/rendition IDs, permission, credit, checksum, expiry, alt text and rollback. A source link or affiliate agreement alone does not grant image rights.

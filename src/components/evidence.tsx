import type { EvidenceStatus, SourceRecord } from "@/lib/types";

const labels: Record<EvidenceStatus, string> = {
  "owned-and-tested": "Owned & tested",
  "hands-on": "Hands-on",
  "research-backed": "Source-backed research",
  "inferred": "Decision-model inference"
};

const shortLabels: Record<EvidenceStatus, string> = {
  "owned-and-tested": "Owned",
  "hands-on": "Hands-on",
  "research-backed": "Source-backed",
  "inferred": "Inferred"
};

// How far up the evidence ladder a record has climbed. Owned and tested is the
// top rung; a decision-model inference is the bottom. The meter draws the rung,
// it never invents a fifth one.
const rungs: Record<EvidenceStatus, number> = {
  "inferred": 1,
  "research-backed": 2,
  "hands-on": 3,
  "owned-and-tested": 4
};

export function EvidenceMeter({ status }: { status: EvidenceStatus }) {
  const level = rungs[status];
  return (
    <span className={`evidence-meter status-${status}`} aria-hidden="true">
      <svg viewBox="0 0 46 16" width="46" height="16" focusable="false">
        {[0, 1, 2, 3].map((step) => (
          <rect
            key={step}
            x={step * 12}
            y={12 - (step + 1) * 3}
            width="9"
            height={(step + 1) * 3}
            rx="1"
            className={step < level ? "rung-on" : "rung-off"}
          />
        ))}
      </svg>
    </span>
  );
}

export { labels as evidenceLabels, shortLabels as evidenceShortLabels };

export function EvidenceBar({ status, verified }: { status: EvidenceStatus; verified: string }) {
  return <div className="evidence-bar" aria-label={`Evidence status: ${labels[status]}. Last verified ${verified}.`}><span className={`status-dot status-${status}`} aria-hidden="true" /><strong>{labels[status]}</strong><span>Verified {verified}</span></div>;
}

export function SourceList({ sources }: { sources: SourceRecord[] }) {
  if (!sources.length) return <p className="source-empty">This page is a disclosed decision-model inference and does not claim product testing.</p>;
  return <ol className="source-list">{sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer">{source.title} ↗</a><span>{source.publisher} · verified {source.verifiedOn}{source.primary ? " · primary" : ""}</span></li>)}</ol>;
}

import type { Comparison } from "@/lib/types";

/** A visual reading of the existing comparison record; it introduces no new claims. */
export function DecisionGraphic({ comparison }: { comparison: Comparison }) {
  const [first, second] = comparison.options;
  if (!first || !second || comparison.options.length !== 2) return null;

  return (
    <figure className="decision-graphic" aria-labelledby="decision-graphic-title">
      <div className="decision-graphic-heading">
        <p className="eyebrow">Decision map / 01</p>
        <h2 id="decision-graphic-title">Which constraint decides?</h2>
        <p>Choose the path that solves your recurring work. Check the failure condition before buying.</p>
      </div>
      <div className="decision-graphic-paths">
        {[first, second].map((option, index) => (
          <div className="decision-graphic-path" key={option.name}>
            <span className="decision-graphic-index">0{index + 1} / OPTION {index === 0 ? "A" : "B"}</span>
            <h3>{option.name}</h3>
            <dl>
              <div><dt>Choose when</dt><dd>{option.bestFor}</dd></div>
              <div><dt>Check before purchase</dt><dd>{option.keyConstraint}</dd></div>
              <div><dt>Wrong when</dt><dd>{option.wrongFor}</dd></div>
            </dl>
          </div>
        ))}
      </div>
      <figcaption>Decision guide based on the comparison evidence dated {comparison.lastVerified}; no hands-on performance or current price is implied.</figcaption>
    </figure>
  );
}

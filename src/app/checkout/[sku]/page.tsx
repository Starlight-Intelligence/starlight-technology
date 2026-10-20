import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, paymentUrl } from "@/lib/products";

type Props = { params: Promise<{ sku: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sku } = await params;
  const product = getProduct(sku);
  return {
    title: product ? `Checkout · ${product.name}` : "Checkout",
    robots: { index: false, follow: false },
    alternates: { canonical: `/checkout/${sku}` }
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product || product.billing === "free") notFound();
  const payUrl = paymentUrl(product);
  const isService = product.kind === "service";
  const waitlistBody = [
    `Add me to the waitlist for ${product.name}.`,
    "",
    "Optional, and it shapes what gets built:",
    "What would you expect to pay?",
    "Who are you (role, team size)?",
    "What are you trying to do?"
  ].join("\n");

  return (
    <div className="shell checkout-page">
      <p className="eyebrow">Checkout · {product.kind}</p>
      <h1>{product.name}</h1>
      <div className="checkout-card">
        <div className="checkout-summary">
          <strong>{product.name}</strong>
          <span className="tier-price">{payUrl ? "" : "Planned: "}{product.priceLabel}{product.billing === "month" ? " / mo" : ""}</span>
          <p>{product.summary}</p>
        </div>
        <ul>{product.includes.map((i) => <li key={i}>{i}</li>)}</ul>
        {payUrl ? (
          <a className="button button-primary" href={payUrl}>{isService ? "Continue to commercial checkout" : "Continue to payment"}</a>
        ) : (
          <>
            <p className="checkout-note">
              This isn&apos;t open for purchase yet. Join the waitlist and you&apos;ll hear when it opens.
            </p>
            <a
              className="button button-primary"
              href={`mailto:hello@frankx.ai?subject=${encodeURIComponent(`Waitlist: ${product.name}`)}&body=${encodeURIComponent(waitlistBody)}`}
            >
              Join the waitlist
            </a>
            {isService ? <Link className="button button-secondary" href="/infrastructure/contracts">Review contract architecture</Link> : null}
            <Link className="button button-secondary" href="/pricing">Back to pricing</Link>
          </>
        )}
      </div>
    </div>
  );
}

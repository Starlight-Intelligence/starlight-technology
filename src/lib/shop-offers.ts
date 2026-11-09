import approvedOfferRecords from "../../data/commerce/approved-offers.json";
import type { ShopProduct } from "./shop";

export const COMMERCE_EVIDENCE_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ApprovedAffiliateOffer {
  productSlug: string;
  merchant: string;
  programme: string;
  envKey: string;
  approvedAt: string;
  verifiedAt: string;
  validUntil: string;
  allowedHosts: string[];
  region: string;
}

export interface ShopOffer {
  href: string;
  merchant: string;
  relationship: "affiliate" | "official";
  region: string;
  verifiedAt: string;
}

export function isFreshCommerceEvidence(
  value: string,
  now: Date = new Date(),
  maxAgeDays = COMMERCE_EVIDENCE_MAX_AGE_DAYS
): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isInteger(maxAgeDays) || maxAgeDays < 0) return false;
  const evidence = new Date(timestamp);
  const evidenceDay = Date.UTC(evidence.getUTCFullYear(), evidence.getUTCMonth(), evidence.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const ageDays = (nowDay - evidenceDay) / DAY_MS;
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

export function resolveShopOffer(
  product: ShopProduct,
  approvals: ApprovedAffiliateOffer[] = approvedOfferRecords,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date()
): ShopOffer {
  const fallback: ShopOffer = { href: product.sourceUrl, merchant: product.brand, relationship: "official", region: product.region, verifiedAt: product.verifiedOn };
  // A still-valid programme approval cannot make an outdated product record
  // safe to monetise. Keep the official source until both records are fresh.
  if (!isFreshCommerceEvidence(product.verifiedOn, now)) return fallback;
  const approval = approvals.find((offer) => offer.productSlug === product.slug);
  if (!approval || approval.envKey !== product.affiliateEnvKey || !approval.merchant || !approval.programme || !approval.region) return fallback;
  const timestamps = [approval.approvedAt, approval.verifiedAt, approval.validUntil].map(Date.parse);
  if (timestamps.some((time) => !Number.isFinite(time)) || timestamps[0] > now.getTime() || timestamps[1] > now.getTime() || timestamps[2] <= now.getTime() || !isFreshCommerceEvidence(approval.verifiedAt, now)) return fallback;
  const href = env[approval.envKey];
  if (!href || href !== href.trim()) return fallback;
  try {
    const url = new URL(href);
    // Exact hosts only. Never invent attribution, wrap a redirect, or silently
    // permit a similarly named host. Partner-issued URL bytes stay unchanged.
    if (url.protocol !== "https:" || url.username || url.password || url.port || !approval.allowedHosts.includes(url.hostname)) return fallback;
    return { href, merchant: approval.merchant, relationship: "affiliate", region: approval.region, verifiedAt: approval.verifiedAt };
  } catch { return fallback; }
}


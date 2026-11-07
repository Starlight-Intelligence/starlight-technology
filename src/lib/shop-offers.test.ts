import { describe, expect, it } from "vitest";
import { shopProducts } from "./shop";
import { isFreshCommerceEvidence, resolveShopOffer, type ApprovedAffiliateOffer } from "./shop-offers";

const product = shopProducts[2];
const now = new Date("2026-10-07T20:00:00Z");
const approval: ApprovedAffiliateOffer = { productSlug: product.slug, merchant: "Approved merchant", programme: "Approved programme", envKey: product.affiliateEnvKey, approvedAt: "2026-10-01T00:00:00Z", verifiedAt: "2026-10-07T00:00:00Z", validUntil: "2026-11-01T00:00:00Z", allowedHosts: ["store.minisforum.com"], region: "NL" };
const url = "https://store.minisforum.com/products/approved-sku?partner=issued%2Fvalue&order=1";

describe("hardware affiliate activation boundary", () => {
  it("keeps an env URL noncommercial until approval exists", () => {
    expect(resolveShopOffer(product, [], { [product.affiliateEnvKey]: url }, now)).toMatchObject({ relationship: "official", href: product.sourceUrl });
  });
  it("preserves the exact partner URL and declares commission after approval", () => {
    expect(resolveShopOffer(product, [approval], { [product.affiliateEnvKey]: url }, now)).toMatchObject({ relationship: "affiliate", href: url, merchant: approval.merchant, region: "NL" });
  });
  it.each(["http://store.minisforum.com/item", "https://store.minisforum.com.evil.example/item", "https://evil.example/store.minisforum.com", "javascript:alert(1)", "https://user:pass@store.minisforum.com/item", "https://store.minisforum.com:8443/item", "not-a-url", " https://store.minisforum.com/item"])("rejects unsafe or unapproved destination %s", (href) => {
    expect(resolveShopOffer(product, [approval], { [product.affiliateEnvKey]: href }, now).relationship).toBe("official");
  });
  it("fails closed at expiry, including the exact expiry instant", () => {
    expect(resolveShopOffer(product, [{ ...approval, validUntil: now.toISOString() }], { [product.affiliateEnvKey]: url }, now).relationship).toBe("official");
  });
  it.each([{ verifiedAt: "invalid" }, { approvedAt: "invalid" }, { validUntil: "invalid" }, { approvedAt: "2027-01-01" }, { verifiedAt: "2027-01-01" }, { programme: "" }, { region: "" }, { envKey: "WRONG_KEY" }])("rejects incomplete or future approval %j", (change) => {
    expect(resolveShopOffer(product, [{ ...approval, ...change }], { [product.affiliateEnvKey]: url }, now).relationship).toBe("official");
  });
  it("falls back when an approved destination has no configured URL", () => {
    expect(resolveShopOffer(product, [approval], {}, now).relationship).toBe("official");
  });
  it("accepts evidence on day 30 and rejects it on day 31", () => {
    expect(isFreshCommerceEvidence("2026-09-07", now)).toBe(true);
    expect(isFreshCommerceEvidence("2026-09-06", now)).toBe(false);
  });
  it("rejects future and invalid evidence dates", () => {
    expect(isFreshCommerceEvidence("2026-10-08", now)).toBe(false);
    expect(isFreshCommerceEvidence("not-a-date", now)).toBe(false);
  });
  it("keeps an approved offer official when the product source is stale", () => {
    expect(resolveShopOffer({ ...product, verifiedOn: "2026-09-06" }, [approval], { [product.affiliateEnvKey]: url }, now).relationship).toBe("official");
  });
  it("keeps an approved offer official when the programme verification is stale", () => {
    expect(resolveShopOffer(product, [{ ...approval, verifiedAt: "2026-09-06" }], { [product.affiliateEnvKey]: url }, now).relationship).toBe("official");
  });
});

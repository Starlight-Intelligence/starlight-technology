import { describe, expect, it, vi, afterEach } from "vitest";
import { getProduct, checkoutHref, ProductSku } from "./products";

describe("getProduct", () => {
  it("should return a product for a valid id", () => {
    const product = getProduct("tech-free");
    expect(product).toBeDefined();
    expect(product?.id).toBe("tech-free");

    const product2 = getProduct("tech-studio");
    expect(product2).toBeDefined();
    expect(product2?.id).toBe("tech-studio");
  });

  it("should return undefined for a non-existent id", () => {
    const product = getProduct("non-existent-id");
    expect(product).toBeUndefined();
  });

  it("should handle empty inputs and boundaries", () => {
    expect(getProduct("")).toBeUndefined();
    // @ts-expect-error testing null input
    expect(getProduct(null)).toBeUndefined();
    // @ts-expect-error testing undefined input
    expect(getProduct(undefined)).toBeUndefined();
  });
});

describe("checkoutHref", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should return productPath if billing is free", () => {
    const sku: ProductSku = {
      id: "free-sku",
      name: "Free Sku",
      kind: "saas",
      billing: "free",
      priceLabel: "0",
      summary: "summary",
      includes: [],
      cta: "cta",
      productPath: "/free-path"
    };

    expect(checkoutHref(sku)).toBe("/free-path");
  });

  it("should use checkoutEnvKey from process.env if present and valid (starts with http)", () => {
    process.env.NEXT_PUBLIC_POLAR_TECH_STUDIO_URL = "https://example.com/checkout";

    const sku: ProductSku = {
      id: "tech-studio",
      name: "Tech Studio",
      kind: "saas",
      billing: "month",
      priceLabel: "29",
      summary: "summary",
      includes: [],
      cta: "cta",
      checkoutEnvKey: "NEXT_PUBLIC_POLAR_TECH_STUDIO_URL",
      productPath: "/app"
    };

    expect(checkoutHref(sku)).toBe("https://example.com/checkout");
  });

  it("should fallback to default path if checkoutEnvKey url does not start with http", () => {
    process.env.NEXT_PUBLIC_POLAR_TECH_STUDIO_URL = "invalid-url";

    const sku: ProductSku = {
      id: "tech-studio",
      name: "Tech Studio",
      kind: "saas",
      billing: "month",
      priceLabel: "29",
      summary: "summary",
      includes: [],
      cta: "cta",
      checkoutEnvKey: "NEXT_PUBLIC_POLAR_TECH_STUDIO_URL",
      productPath: "/app"
    };

    expect(checkoutHref(sku)).toBe(`/checkout/${sku.id}`);
  });

  it("should fallback to default path if checkoutEnvKey is missing from process.env", () => {
    delete process.env.NEXT_PUBLIC_POLAR_TECH_STUDIO_URL;

    const sku: ProductSku = {
      id: "tech-studio",
      name: "Tech Studio",
      kind: "saas",
      billing: "month",
      priceLabel: "29",
      summary: "summary",
      includes: [],
      cta: "cta",
      checkoutEnvKey: "NEXT_PUBLIC_POLAR_TECH_STUDIO_URL",
      productPath: "/app"
    };

    expect(checkoutHref(sku)).toBe(`/checkout/${sku.id}`);
  });

  it("should fallback to default path if product has no checkoutEnvKey", () => {
    const sku: ProductSku = {
      id: "no-env-key",
      name: "No Env Key",
      kind: "saas",
      billing: "month",
      priceLabel: "10",
      summary: "summary",
      includes: [],
      cta: "cta",
      productPath: "/path"
    };

    expect(checkoutHref(sku)).toBe(`/checkout/${sku.id}`);
  });
});

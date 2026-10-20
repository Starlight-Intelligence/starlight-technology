export type ProductKind = "saas" | "digital" | "service";
export type Billing = "free" | "month" | "once";

export interface ProductSku {
  id: string;
  name: string;
  kind: ProductKind;
  billing: Billing;
  priceLabel: string;
  summary: string;
  includes: string[];
  cta: string;
  featured?: boolean;
  checkoutEnvKey?: string;
  // Waitlist-first (starlight AGENTS.md §5c): payment opens only for a SKU with a release-gate PASS receipt.
  gatePassed?: boolean;
  productPath: string;
}

export const saasTiers: ProductSku[] = [
  {
    id: "tech-free",
    name: "Library",
    kind: "saas",
    billing: "free",
    priceLabel: "€0",
    summary: "Open builds, comparisons, and guides with explicit evidence states.",
    includes: ["Public build library", "Comparison verdicts", "Methodology standard", "No account wall"],
    cta: "Browse free library",
    productPath: "/builds"
  },
  {
    id: "tech-studio",
    name: "Studio Member",
    kind: "saas",
    billing: "month",
    priceLabel: "€29",
    summary: "Membership for creators who buy hardware and systems quarterly.",
    includes: [
      "Full decision models + worksheets",
      "Regional offer intelligence (NL/EU start)",
      "Blueprint generator history",
      "New analyses monthly",
      "Member-only stack alerts"
    ],
    cta: "Subscribe Studio",
    featured: true,
    checkoutEnvKey: "NEXT_PUBLIC_POLAR_TECH_STUDIO_URL",
    productPath: "/app"
  },
  {
    id: "tech-ops",
    name: "Studio Ops",
    kind: "saas",
    billing: "month",
    priceLabel: "€99",
    summary: "For small teams standardizing creator / AI workstation purchases.",
    includes: [
      "Everything in Studio Member",
      "Up to 5 seats",
      "Shared shortlist workspace",
      "Purchase policy templates",
      "Quarterly stack review call"
    ],
    cta: "Subscribe Ops",
    checkoutEnvKey: "NEXT_PUBLIC_POLAR_TECH_OPS_URL",
    productPath: "/app"
  }
];

export const digitalProducts: ProductSku[] = [
  {
    id: "creator-blueprint",
    name: "Creator System Blueprint",
    kind: "digital",
    billing: "once",
    priceLabel: "€190",
    summary: "Human-reviewed complete-system blueprint for one studio objective.",
    includes: ["Workload map", "Budget allocation", "Wrong-purchase conditions", "Next purchase order"],
    cta: "Buy blueprint",
    checkoutEnvKey: "NEXT_PUBLIC_POLAR_BLUEPRINT_URL",
    productPath: "/blueprint"
  },
  {
    id: "stack-audit",
    name: "Studio stack audit",
    kind: "digital",
    billing: "once",
    priceLabel: "€890",
    summary: "Remote audit of an existing creator/AI stack with upgrade sequence.",
    includes: ["Bottleneck analysis", "Evidence gap report", "Upgrade sequence", "Regional offer notes"],
    cta: "Buy audit",
    checkoutEnvKey: "NEXT_PUBLIC_POLAR_STACK_AUDIT_URL",
    productPath: "/offers"
  }
];

export const serviceProducts: ProductSku[] = [
  {
    id: "infrastructure-blueprint",
    name: "Infrastructure Partnership Blueprint",
    kind: "service",
    billing: "once",
    priceLabel: "€6,500 ex VAT",
    summary: "Fixed-scope underwriting and operating architecture for a joint AI infrastructure partnership.",
    includes: [
      "Party, asset, workload and IT graph",
      "Three viable deal structures",
      "Contract and specialist issue matrix",
      "Sources-and-uses and downside model",
      "Procurement and integration sequence",
      "90-day pilot mandate and acceptance gates"
    ],
    cta: "Commission blueprint",
    checkoutEnvKey: "NEXT_PUBLIC_POLAR_INFRASTRUCTURE_BLUEPRINT_URL",
    productPath: "/infrastructure"
  }
];

export const allProducts = [...saasTiers, ...digitalProducts, ...serviceProducts];
export function getProduct(id: string) { return allProducts.find((p) => p.id === id); }
export function checkoutHref(sku: ProductSku): string {
  if (sku.billing === "free") return sku.productPath;
  return paymentUrl(sku) ?? `/checkout/${sku.id}`;
}

export function paymentUrl(sku: ProductSku): string | undefined {
  if (!sku.gatePassed || !sku.checkoutEnvKey) return undefined;
  const url = process.env[sku.checkoutEnvKey];
  return url?.startsWith("http") ? url : undefined;
}

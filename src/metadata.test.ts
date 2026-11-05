import { test, expect } from "vitest";
import { builds, comparisons, guides } from "./lib/content";
import { shopProducts } from "./lib/shop";

import { metadata as homeMeta } from "./app/page";
import { metadata as guidesMeta } from "./app/guides/page";
import { metadata as compareMeta } from "./app/compare/page";
import { metadata as blueprintMeta } from "./app/blueprint/page";
import { metadata as aboutMeta } from "./app/about/page";
import { metadata as buildsMeta } from "./app/builds/page";
import { metadata as offersMeta } from "./app/offers/page";
import { metadata as methodologyMeta } from "./app/methodology/page";
import { metadata as privacyMeta } from "./app/privacy/page";
import { metadata as disclosureMeta } from "./app/disclosure/page";
import { metadata as shopMeta } from "./app/shop/page";
import { metadata as gamingGalaxyMeta } from "./app/gaming-galaxy/page";
import { metadata as partnersMeta } from "./app/partners/page";
import { metadata as pricingMeta } from "./app/pricing/page";
import { metadata as infraMeta } from "./app/infrastructure/page";
import { metadata as composeMeta } from "./app/infrastructure/compose/page";
import { metadata as contractsMeta } from "./app/infrastructure/contracts/page";
import { metadata as operatorMeta } from "./app/infrastructure/operator/page";
import { metadata as systemMeta } from "./app/infrastructure/system/page";
import { metadata as workspaceMeta } from "./app/infrastructure/workspace/page";

import { generateMetadata as generateGuideMeta } from "./app/guides/[slug]/page";
import { generateMetadata as generateCompareMeta } from "./app/compare/[slug]/page";
import { generateMetadata as generateBuildMeta } from "./app/builds/[slug]/page";
import { generateMetadata as generateShopMeta } from "./app/shop/[slug]/page";

test("all public routes have unique metadata", async () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const canonicals = new Set<string>();
  const ogUrls = new Set<string>();

  const track = (meta: import("next").Metadata, route: string, expectedUrl: string) => {
    // Next.js static title might be an object like { default: '...', template: '...' }
    let titleStr = "";
    if (meta?.title && typeof meta.title === 'object') { titleStr = ('default' in meta.title ? meta.title.default : ('absolute' in meta.title ? meta.title.absolute : '')) as string; }
    else titleStr = meta?.title as string || "";

    const descStr = meta?.description as string || "";
    const canonicalStr = meta?.alternates?.canonical as string || "";

    // OpenGraph properties
    const ogTitle = meta?.openGraph?.title as string || "";
    const ogDesc = meta?.openGraph?.description as string || "";
    const ogUrl = meta?.openGraph?.url as string || "";

    expect(titleStr, `Missing title for ${route}`).toBeTruthy();
    expect(descStr, `Missing description for ${route}`).toBeTruthy();
    expect(canonicalStr, `Missing canonical for ${route}`).toBeTruthy();
    expect(ogTitle, `Missing ogTitle for ${route}`).toBeTruthy();
    expect(ogDesc, `Missing ogDesc for ${route}`).toBeTruthy();
    expect(ogUrl, `Missing ogUrl for ${route}`).toBeTruthy();

    expect(canonicalStr, `Canonical mismatch for ${route}`).toBe(expectedUrl);
    expect(ogUrl, `OG URL mismatch for ${route}`).toBe(expectedUrl);

    if (titles.has(titleStr)) throw new Error(`Duplicate title: ${titleStr} at ${route}`);
    if (descriptions.has(descStr)) throw new Error(`Duplicate description: ${descStr} at ${route}`);
    if (canonicals.has(canonicalStr)) throw new Error(`Duplicate canonical: ${canonicalStr} at ${route}`);
    if (ogUrls.has(ogUrl)) throw new Error(`Duplicate ogUrl: ${ogUrl} at ${route}`);

    titles.add(titleStr);
    descriptions.add(descStr);
    canonicals.add(canonicalStr);
    ogUrls.add(ogUrl);
  };

  const pages = [
    { meta: homeMeta, route: "/", expectedUrl: "/" },
    { meta: guidesMeta, route: "/guides", expectedUrl: "/guides" },
    { meta: compareMeta, route: "/compare", expectedUrl: "/compare" },
    { meta: blueprintMeta, route: "/blueprint", expectedUrl: "/blueprint" },
    { meta: aboutMeta, route: "/about", expectedUrl: "/about" },
    { meta: buildsMeta, route: "/builds", expectedUrl: "/builds" },
    { meta: offersMeta, route: "/offers", expectedUrl: "/offers" },
    { meta: methodologyMeta, route: "/methodology", expectedUrl: "/methodology" },
    { meta: privacyMeta, route: "/privacy", expectedUrl: "/privacy" },
    { meta: disclosureMeta, route: "/disclosure", expectedUrl: "/disclosure" },
    { meta: shopMeta, route: "/shop", expectedUrl: "/shop" },
    { meta: gamingGalaxyMeta, route: "/gaming-galaxy", expectedUrl: "/gaming-galaxy" },
    { meta: partnersMeta, route: "/partners", expectedUrl: "/partners" },
    { meta: pricingMeta, route: "/pricing", expectedUrl: "/pricing" },
    { meta: infraMeta, route: "/infrastructure", expectedUrl: "/infrastructure" },
    { meta: composeMeta, route: "/infrastructure/compose", expectedUrl: "/infrastructure/compose" },
    { meta: contractsMeta, route: "/infrastructure/contracts", expectedUrl: "/infrastructure/contracts" },
    { meta: operatorMeta, route: "/infrastructure/operator", expectedUrl: "/infrastructure/operator" },
    { meta: systemMeta, route: "/infrastructure/system", expectedUrl: "/infrastructure/system" },
    { meta: workspaceMeta, route: "/infrastructure/workspace", expectedUrl: "/infrastructure/workspace" },
  ];

  for (const page of pages) {
    track(page.meta, page.route, page.expectedUrl);
  }

  // Dynamic routes
  for (const guide of guides) {
    const meta = await generateGuideMeta({ params: Promise.resolve({ slug: guide.slug }) });
    track(meta, `/guides/${guide.slug}`, `/guides/${guide.slug}`);
  }
  for (const comp of comparisons) {
    const meta = await generateCompareMeta({ params: Promise.resolve({ slug: comp.slug }) });
    track(meta, `/compare/${comp.slug}`, `/compare/${comp.slug}`);
  }
  for (const build of builds) {
    const meta = await generateBuildMeta({ params: Promise.resolve({ slug: build.slug }) });
    track(meta, `/builds/${build.slug}`, `/builds/${build.slug}`);
  }
  for (const product of shopProducts) {
    const meta = await generateShopMeta({ params: Promise.resolve({ slug: product.slug }) });
    track(meta, `/shop/${product.slug}`, `/shop/${product.slug}`);
  }
});

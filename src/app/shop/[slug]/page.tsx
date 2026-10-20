import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HardwareDiagram } from "@/components/hardware-diagram";
import { getShopProduct } from "@/lib/shop";
import { getShopPhoto } from "@/lib/shop-photos";
import { shopAlternatives, shopConfigs } from "@/lib/shop-configs";
import { resolveShopOffer } from "@/lib/shop-offers";
import styles from "@/components/shop.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) return {};
  const photo = getShopPhoto(slug);
  const shareable = photo && !photo.variantNote ? photo : undefined;
  return { title: `${product.brand} ${product.name} — Buying decision`, description: product.summary, alternates: { canonical: `/shop/${slug}` }, openGraph: { title: `${product.brand} ${product.name}`, description: product.summary, url: `/shop/${slug}`, ...(shareable ? { images: [{ url: shareable.src, width: shareable.width, height: shareable.height, alt: shareable.alt }] } : {}) } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) notFound();
  const offer = resolveShopOffer(product);
  const photo = getShopPhoto(slug);
  const config = shopConfigs[slug];
  const alternatives = (shopAlternatives[slug] ?? []).flatMap((alt) => { const item = getShopProduct(alt.slug); return item ? [{ item, tradeoff: alt.tradeoff }] : []; });
  const affiliate = offer.relationship === "affiliate";
  const schema = { "@context": "https://schema.org", "@type": "Product", name: `${product.brand} ${product.name}`, description: product.summary, brand: { "@type": "Brand", name: product.brand }, url: `https://starlight.technology/shop/${slug}`, ...(photo && !photo.variantNote ? { image: `https://starlight.technology${photo.src}` } : {}) };
  return <article className={`${styles.shop} shell`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/shop">Studio Shop</Link><span>/</span><span>{product.category}</span></nav>
    <header className={styles.productHead}>
      <div><p className="eyebrow">{product.brand} / {product.category}</p><h1>{product.name}</h1></div>
      <div><p className={styles.lede}>{product.summary}</p><p className={styles.evidence}>Manufacturer source checked {product.verifiedOn} · buying fit is editorial inference, no hands-on benchmark</p></div>
    </header>

    <section className={styles.stage} data-photo={photo ? "true" : "false"} aria-label={`${product.name} and the buying decision`}>
      <div className={styles.stageMedia}>
        {photo
          ? <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} preload sizes="(max-width: 900px) calc(100vw - 40px), min(calc(100vw - 264px), 1016px)" style={{ objectPosition: photo.objectPosition }} />
          : <HardwareDiagram shape={product.shape} />}
      </div>

      <aside className={`${styles.decisionPanel} ${photo ? "liquid-surface" : ""}`} aria-labelledby="decision-heading">
        <p className="eyebrow">The decision</p>
        <h2 id="decision-heading">{product.role}</h2>
        {photo?.variantNote && <p className={styles.panelNote}>{photo.variantNote}</p>}
        {config?.select && <p className={styles.panelSelect}><span>Before you buy</span>{config.select}</p>}
        <a className="button button-primary button-lit" href={offer.href} target="_blank" rel={affiliate ? "sponsored noopener" : "noopener"}>{affiliate ? `View at ${offer.merchant} ↗` : `${offer.merchant} official page ↗`}</a>
        <p className={styles.panelDisclosure}>{affiliate ? "Affiliate link: we may earn a commission. Price and stock are confirmed on the merchant site." : "Manufacturer link, no commission. Price and stock are confirmed there."} <Link href="/disclosure">How we earn →</Link></p>
        {config?.pick && <p className={styles.panelPick}>{config.pick}</p>}
        {config && <dl className={styles.panelConfig} aria-label={`Manufacturer-listed configuration, checked ${config.checkedOn}`}>{config.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {config && <p className={styles.panelSource}>Manufacturer listing, checked {config.checkedOn}</p>}
        <dl className={styles.panelRecord}>
          <div><dt>Destination</dt><dd>{new URL(offer.href).hostname}</dd></div>
          <div><dt>Relationship</dt><dd>{affiliate ? "Approved affiliate link" : "Ordinary source link"}</dd></div>
          <div><dt>Region</dt><dd>{offer.region}</dd></div>
          <div><dt>Link record</dt><dd>{offer.verifiedAt.slice(0, 10)}</dd></div>
        </dl>
      </aside>

      {/* Credits follow the panel in the DOM so keyboard order matches the stacked mobile layout. */}
      <p className={styles.stageCredit}>
        {photo
          ? <>{photo.pictured} Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener">“{photo.title}”</a> by {photo.author}, <a href={photo.licenseUrl} target="_blank" rel="noopener license">{photo.license}</a>, via Wikimedia Commons. {photo.changes}</>
          : "Original category schematic. No licensed photograph of this exact model yet, so we show no product image rather than a lookalike."}
      </p>
    </section>

    {alternatives.length > 0 && <section className={styles.alternatives} aria-labelledby="alternatives-heading">
      <div className={styles.alternativesHead}><p className="eyebrow">Real alternatives</p><h2 id="alternatives-heading">Other ways to solve the same problem</h2></div>
      <ul>{alternatives.map(({ item, tradeoff }) => {
        const candidate = getShopPhoto(item.slug);
        const altPhoto = candidate && !candidate.variantNote ? candidate : undefined;
        return <li key={item.slug}><Link href={`/shop/${item.slug}`} className={styles.alternative}>
          <span className={styles.altMedia} data-photo={altPhoto ? "true" : "false"}>{altPhoto ? <Image src={altPhoto.src} alt="" width={altPhoto.width} height={altPhoto.height} sizes="(max-width: 620px) 30vw, 160px" style={{ objectPosition: altPhoto.objectPosition }} /> : <HardwareDiagram shape={item.shape} />}</span>
          <span className={styles.altBody}><span className={styles.brand}>{item.brand}</span><strong>{item.name}</strong><span>{tradeoff}</span></span>
        </Link></li>;
      })}</ul>
    </section>}

    <div className={styles.purchaseLayout}>
      <section className={styles.fitPanel}><p className="eyebrow">Fit and failure</p><h2>Where it earns its place, and where it does not.</h2><div><div><h3>Choose when</h3><p>{product.fit}</p></div><div><h3>Avoid when</h3><p>{product.avoid}</p></div></div></section>
      <section className={styles.detailSection}><p className="eyebrow">Before checkout</p><h2>Verify the whole system.</h2><ol>{product.checks.map((check) => <li key={check}>{check}</li>)}</ol><h3>Complete-system cost</h3><p>{product.systemCost}</p><h3>Runtime boundary</h3><p>{product.runtime}</p></section>
    </div>
    <section className={styles.detailSources}><div><p className="eyebrow">Evidence</p><h2>Read the manufacturer source.</h2><p>Manufacturer documentation establishes product identity and advertised capabilities. It does not establish independent performance, current stock or Starlight ownership.</p></div><a href={product.sourceUrl} target="_blank" rel="noopener">{product.brand} · official product page ↗</a></section>
    <section className={styles.bottomCallout}><div><p className="eyebrow">Place it in the system</p><h2>Make the next purchase<br />serve the whole studio.</h2></div><Link className="button button-primary" href={product.buildPath}>Explore the decision library →</Link></section>
  </article>;
}

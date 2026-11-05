import type { Metadata } from "next";
import Link from "next/link";
import { ShopExplorer } from "@/components/shop-explorer";
import { HardwareDiagram } from "@/components/hardware-diagram";
import { shopProducts } from "@/lib/shop";
import { resolveShopOffer } from "@/lib/shop-offers";
import styles from "@/components/shop.module.css";

// Render link approvals at request time so expired offers fall back to official
// destinations. There are no merchant API calls in this request path.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio Shop — AI compute, storage and creator hardware",
  description: "Build your AI-native studio with a curated equipment library, clear buying constraints and transparent merchant links.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "The tools behind your next creation.", description: "AI compute, storage, controls and audio. Choose around the work.", url: "/shop" }
};

export default function ShopPage() {
  const offers = Object.fromEntries(shopProducts.map((product) => [product.slug, resolveShopOffer(product)]));
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", name: "Starlight Studio Shop", itemListElement: shopProducts.map((product, index) => ({ "@type": "ListItem", position: index + 1, name: `${product.brand} ${product.name}`, url: `https://starlight.technology/shop/${product.slug}` })) };
  return <div className={`${styles.shop} shell`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, "\\u003c") }} />
    <section className={styles.hero}><div><p className="eyebrow">Starlight Technology / Studio Shop</p><h1>The tools behind<br />your next <em>creation.</em></h1><p className={styles.lede}>Local intelligence. A working studio. Your own infrastructure. Choose the equipment around the work you want to do.</p><div className={styles.heroActions}><a className="button button-primary" href="#catalog">Explore the equipment ↓</a><Link className="button button-quiet" href="/builds">Plan a complete system</Link><Link className="button button-quiet" href="/gaming-galaxy">Enter Gaming Galaxy</Link></div><p className={styles.disclosure}>Buy at the linked merchant. Affiliate links, when active, are labelled beside the link. <Link href="/disclosure">How we earn →</Link></p></div>
      <aside className={styles.systemBoard} aria-label="Local AI system planning object"><div className={styles.boardHead}><span>STUDIO / 001</span><span>LOCAL AI DESK</span></div><div className={styles.boardDiagram}><HardwareDiagram shape="workstation" /></div><p className={styles.diagramCaption}>Compute category schematic · not a product image</p><div className={styles.boardTitle}><h2>A system starts<br />with a constraint.</h2><span>01—03</span></div><ol><li><span>01 / COMPUTE</span><Link href="/shop/minisforum-ms-s1-max">Validate your runtime ↗</Link></li><li><span>02 / STORAGE</span><Link href="/shop/samsung-990-pro-2tb">Keep active work close ↗</Link></li><li><span>03 / RECOVERY</span><Link href="/shop/ugreen-dxp4800-plus">Plan a separate backup ↗</Link></li></ol><p className={styles.boardNote}>Planning sequence. A compatible, benchmarked configuration comes before checkout.</p></aside>
    </section>
    <ShopExplorer products={shopProducts} offers={offers} />
    <section className={styles.bottomCallout}><div><p className="eyebrow">The complete picture</p><h2>Your workstation is<br />part of a bigger system.</h2><p>Choose the host, tools, storage and recovery together. Our public build library gives the purchase a purpose.</p></div><Link className="button button-primary" href="/builds">Explore complete builds →</Link></section>
    <div className={styles.shopFootnote}><p>Product identities and manufacturer pages checked 7 October 2026. Buying fit and constraints are Starlight editorial inference. No independent performance testing is claimed.</p><p>Prices, stock, delivery, warranty and final configuration are confirmed by the merchant. <Link href="/partners">Our partner approach →</Link></p></div>
  </div>;
}

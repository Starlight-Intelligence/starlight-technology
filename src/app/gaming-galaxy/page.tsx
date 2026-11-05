import type { Metadata } from "next";
import Link from "next/link";
import { HardwareDiagram } from "@/components/hardware-diagram";
import { shopProducts } from "@/lib/shop";
import { resolveShopOffer } from "@/lib/shop-offers";
import styles from "@/components/shop.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gaming Galaxy — gaming, streaming and creator setup intelligence",
  description:
    "A curated Starlight Technology pilot for gaming, streaming and creator gear: performance, controls, capture and fast storage chosen around the complete setup.",
  alternates: { canonical: "/gaming-galaxy" },
  openGraph: {
    title: "Gaming Galaxy — build the whole setup, not the hype.",
    description:
      "Evidence-led gaming, streaming and creator gear from the Starlight Technology shop.",
    url: "/gaming-galaxy",
  },
};

const galaxySlugs = [
  "nvidia-rtx-5090",
  "elgato-stream-deck-plus",
  "rode-podmic-usb",
  "samsung-990-pro-2tb",
] as const;

export default function GamingGalaxyPage() {
  const products = galaxySlugs
    .map((slug) => shopProducts.find((product) => product.slug === slug))
    .filter((product): product is (typeof shopProducts)[number] => Boolean(product));

  const offers = Object.fromEntries(
    products.map((product) => [product.slug, resolveShopOffer(product)]),
  );

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Gaming Galaxy by Starlight Technology",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${product.brand} ${product.name}`,
      url: `https://starlight.technology/shop/${product.slug}`,
    })),
  };

  return (
    <div className={`${styles.shop} shell`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemList).replace(/</g, "\\u003c"),
        }}
      />

      <section className={styles.hero}>
        <div>
          <p className="eyebrow">Starlight Technology / Gaming Galaxy · pilot</p>
          <h1>
            Build the whole
            <br />
            <em>gaming galaxy.</em>
          </h1>
          <p className={styles.lede}>
            Performance, controls, capture and storage for people who game, stream
            and create on the same desk. The setup is the product; individual
            components earn their place by serving it.
          </p>
          <div className={styles.heroActions}>
            <a className="button button-primary" href="#galaxy-kit">
              Explore the pilot ↓
            </a>
            <Link className="button button-quiet" href="/shop">
              Open the full Studio Shop
            </Link>
          </div>
          <p className={styles.disclosure}>
            This is a curated campaign inside Starlight Technology, not a separate
            store or reseller claim. Affiliate links, when active, are labelled at
            the destination. <Link href="/disclosure">How we earn →</Link>
          </p>
        </div>

        <aside className={styles.systemBoard} aria-label="Gaming Galaxy setup model">
          <div className={styles.boardHead}>
            <span>GALAXY / 001</span>
            <span>PLAY · CREATE · STREAM</span>
          </div>
          <div className={styles.boardDiagram}>
            <HardwareDiagram shape="gpu" />
          </div>
          <p className={styles.diagramCaption}>
            Performance category schematic · not a product image
          </p>
          <div className={styles.boardTitle}>
            <h2>
              One desk.
              <br />
              Three jobs.
            </h2>
            <span>01—03</span>
          </div>
          <ol>
            <li>
              <span>01 / PERFORMANCE</span>
              <Link href="/shop/nvidia-rtx-5090">Validate the workload ↗</Link>
            </li>
            <li>
              <span>02 / CONTROL</span>
              <Link href="/shop/elgato-stream-deck-plus">Map repeated actions ↗</Link>
            </li>
            <li>
              <span>03 / VOICE</span>
              <Link href="/shop/rode-podmic-usb">Build the capture chain ↗</Link>
            </li>
          </ol>
          <p className={styles.boardNote}>
            Pilot collection. No bundle checkout, live stock or performance ranking
            is claimed.
          </p>
        </aside>
      </section>

      <section
        className={styles.catalog}
        aria-labelledby="galaxy-kit-heading"
        id="galaxy-kit"
      >
        <div className={styles.sectionHead}>
          <div>
            <p className="eyebrow">Gaming Galaxy / first orbit</p>
            <h2 id="galaxy-kit-heading">Four components. Four different jobs.</h2>
          </div>
          <span>Source-backed research · merchant facts stay with the merchant</span>
        </div>

        <div className={styles.productGrid}>
          {products.map((product) => {
            const offer = offers[product.slug];
            return (
              <article className={styles.productCard} key={product.slug}>
                <div className={styles.cardTop}>
                  <span>{product.category}</span>
                  <span>{product.role}</span>
                </div>
                <Link
                  href={`/shop/${product.slug}`}
                  className={styles.diagram}
                  aria-label={`Category schematic · read the buying decision for ${product.name}`}
                >
                  <HardwareDiagram shape={product.shape} />
                  <span>Category schematic · not a product image</span>
                </Link>
                <div className={styles.cardBody}>
                  <p className={styles.brand}>{product.brand}</p>
                  <h3>
                    <Link href={`/shop/${product.slug}`}>{product.name}</Link>
                  </h3>
                  <p>{product.summary}</p>
                  <div className={styles.fit}>
                    <span>EARNS ITS PLACE WHEN</span>
                    <p>{product.fit}</p>
                  </div>
                </div>
                <div className={styles.cardFoot}>
                  <Link href={`/shop/${product.slug}`}>Inspect the decision →</Link>
                  <a
                    href={offer.href}
                    rel={
                      offer.relationship === "affiliate"
                        ? "sponsored noopener"
                        : "noopener"
                    }
                    target="_blank"
                  >
                    {offer.relationship === "affiliate"
                      ? "See merchant ↗"
                      : "Official site ↗"}
                  </a>
                  <small>
                    {offer.relationship === "affiliate"
                      ? `Affiliate link · we may earn a commission · ${offer.merchant}`
                      : `Manufacturer link · no commission · ${offer.merchant}`}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.bottomCallout}>
        <div>
          <p className="eyebrow">Beyond the first orbit</p>
          <h2>
            Add products only
            <br />
            when the setup needs them.
          </h2>
          <p>
            Monitors, controllers, lighting, keyboards, headsets and room systems
            belong here after evidence, source and partner rights are ready—not
            because a giant catalog looks impressive.
          </p>
        </div>
        <Link className="button button-primary" href="/shop">
          Explore the full equipment library →
        </Link>
      </section>

      <div className={styles.shopFootnote}>
        <p>
          Gaming Galaxy is a Starlight Technology merchandising pilot. Product
          identities use the same source-backed records as the Studio Shop.
        </p>
        <p>
          Prices, stock, delivery, warranty and final configuration remain merchant
          facts. Physical Starlight checkout is a later gated stage.{" "}
          <Link href="/partners">Partner approach →</Link>
        </p>
      </div>
    </div>
  );
}

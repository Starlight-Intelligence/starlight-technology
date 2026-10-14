"use client";

import { useState } from "react";
import Link from "next/link";
import { filterShopProducts, shopCategories, studioKits, type ShopProduct } from "@/lib/shop";
import type { ShopOffer } from "@/lib/shop-offers";
import { HardwareDiagram } from "./hardware-diagram";
import styles from "./shop.module.css";

export function ShopExplorer({ products, offers }: { products: ShopProduct[]; offers: Record<string, ShopOffer> }) {
  const [category, setCategory] = useState<(typeof shopCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [kitId, setKitId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const kit = studioKits.find((item) => item.id === kitId);
  const kitProducts = kit ? products.filter((product) => (kit.slugs as readonly string[]).includes(product.slug)) : products;
  const visible = filterShopProducts(kitProducts, category, query);
  const compared = products.filter((product) => selected.includes(product.slug));

  function chooseKit(id: string) { setKitId(id === kitId ? null : id); setCategory("All"); setQuery(""); }
  function toggle(slug: string) { setSelected((current) => current.includes(slug) ? current.filter((id) => id !== slug) : current.length < 3 ? [...current, slug] : current); }
  function reset() { setCategory("All"); setQuery(""); setKitId(null); }

  return <>
    <section className={styles.kits} aria-labelledby="kits-heading">
      <div className={styles.sectionHead}><div><p className="eyebrow">Start with the work</p><h2 id="kits-heading">Choose your studio.</h2></div><span>Planning shortlists · buy separately</span></div>
      <div className={styles.kitGrid}>{studioKits.map((item, index) => <button key={item.id} className={`${styles.kit} ${kitId === item.id ? styles.activeKit : ""}`} aria-pressed={kitId === item.id} onClick={() => chooseKit(item.id)}><span className={styles.index}>0{index + 1}</span><strong>{item.name}</strong><span>{item.objective}</span><span className={styles.kitArrow} aria-hidden="true">↗</span></button>)}</div>
      {kit && <div className={styles.kitNote} role="status"><strong>{kit.name}</strong><p>{kit.constraint}</p><button onClick={reset}>Show all hardware →</button></div>}
    </section>

    <section className={styles.catalog} aria-labelledby="catalog-heading" id="catalog">
      <div className={styles.sectionHead}><div><p className="eyebrow">The equipment library</p><h2 id="catalog-heading">A place for every component.</h2></div><span>Source-backed research · no hands-on claim</span></div>
      <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filter hardware category">{shopCategories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className={styles.search}><span className="sr-only">Search hardware by brand, product or runtime</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your next component" /></label></div>
      <div className={styles.resultLine}><p role="status">{visible.length} of {products.length} components{kit ? ` · ${kit.name}` : ""}</p>{selected.length > 0 ? <a href="#comparison">Compare selected ({selected.length}) ↓</a> : <span>Compare up to 3 components</span>}</div>
      <div className={styles.productGrid}>{visible.map((product) => {
        const offer = offers[product.slug];
        const isSelected = selected.includes(product.slug);
        return <article className={styles.productCard} key={product.slug}>
          <div className={styles.cardTop}><span>{product.category}</span><button aria-pressed={isSelected} disabled={!isSelected && selected.length >= 3} aria-label={`${isSelected ? "Remove" : "Add"} ${product.name} ${isSelected ? "from" : "to"} comparison`} onClick={() => toggle(product.slug)}>{isSelected ? "✓ Selected" : "+ Compare"}</button></div>
          <Link href={`/shop/${product.slug}`} className={styles.diagram} aria-label={`Category schematic · not a product image. Read the buying decision for ${product.name}`}><HardwareDiagram shape={product.shape} /><span>Category schematic · not a product image</span></Link>
          <div className={styles.cardBody}><p className={styles.brand}>{product.brand}</p><h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3><p>{product.summary}</p><div className={styles.fit}><span>CHOOSE WHEN</span><p>{product.fit}</p></div></div>
          <div className={styles.cardFoot}><Link href={`/shop/${product.slug}`}>Inspect the decision →</Link><a href={offer.href} rel={offer.relationship === "affiliate" ? "sponsored noopener" : "noopener"} target="_blank">{offer.relationship === "affiliate" ? "See merchant ↗" : "Official site ↗"}</a><small>{offer.relationship === "affiliate" ? `Affiliate link · we may earn a commission · ${offer.merchant}` : `Manufacturer link · no commission · ${offer.merchant}`}</small></div>
        </article>;
      })}</div>
      {visible.length === 0 && <div className={styles.empty}><h3>No components match this view.</h3><p>Clear the filters to return to the equipment library.</p><button className="button button-primary" onClick={reset}>Reset filters</button></div>}
    </section>

    {compared.length > 0 && <section className={styles.comparison} id="comparison" aria-labelledby="comparison-heading"><div className={styles.sectionHead}><div><p className="eyebrow">Your decision board</p><h2 id="comparison-heading">Compare the constraints.</h2></div><button onClick={() => setSelected([])}>Clear comparison</button></div><p className={styles.compareNote}>Components serve different roles. This board compares fit and complete-system obligations; it makes no speed ranking.</p><div className={styles.tableWrap}><table><caption className="sr-only">Hardware fit, runtime and purchase constraints</caption><thead><tr><th scope="col">Decision</th>{compared.map((product) => <th scope="col" key={product.slug}><Link href={`/shop/${product.slug}`}>{product.brand}<br />{product.name}</Link><button aria-label={`Remove ${product.name} from comparison`} onClick={() => toggle(product.slug)}>Remove</button></th>)}</tr></thead><tbody>{([['Role', 'role'], ['Choose when', 'fit'], ['Avoid when', 'avoid'], ['Runtime', 'runtime'], ['Complete cost', 'systemCost']] as const).map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{compared.map((product) => <td key={product.slug}>{product[key]}</td>)}</tr>)}</tbody></table></div></section>}
  </>;
}

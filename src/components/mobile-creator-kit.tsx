"use client";

import { useState } from "react";
import Link from "next/link";
import type { mobileKitOffers } from "@/lib/mobile-kit";
import type { ShopOffer } from "@/lib/shop-offers";
import styles from "./mobile-creator-kit.module.css";

function MerchantLink({ offer, label }: { offer: ShopOffer; label: string }) {
  const paid = offer.relationship === "affiliate";
  return <div className={styles.purchase}>
    <a href={offer.href} rel={paid ? "sponsored" : undefined}>{label} at {offer.merchant} ↗</a>
    <small>{paid ? "Affiliate link · Starlight may earn a commission" : "Direct link · no commission"}</small>
  </div>;
}

export function MobileCreatorKit({ offers }: { offers: ReturnType<typeof mobileKitOffers> }) {
  const [phone, setPhone] = useState("usb");
  const [trip, setTrip] = useState("eu");
  const [sound, setSound] = useState("interview");
  return <div className={styles.planner}>
    <div className={styles.controls}>
      <label>Phone<select value={phone} onChange={e => setPhone(e.target.value)}>
        <option value="usb">I have a USB-C iPhone</option><option value="lightning">I have a Lightning iPhone</option>
        <option value="buy">I need an iPhone</option></select></label>
      <label>Audio<select value={sound} onChange={e => setSound(e.target.value)}>
        <option value="interview">Two-person interview</option><option value="own">I have my audio covered</option></select></label>
      <label>Mobile data<select value={trip} onChange={e => setTrip(e.target.value)}>
        <option value="eu">EU trip with a Dutch plan</option><option value="us">Travelling to the US</option>
        <option value="own">I have data covered</option></select></label>
    </div>
    <div aria-live="polite" aria-atomic="false" className={styles.results}>
      <article><p className="eyebrow">Camera</p><h3>{phone === "buy" ? "iPhone 17 · 256 GB" : "Keep your iPhone"}</h3>
        <p>{phone === "buy" ? "Compare the black 256 GB model. Check the final configuration, delivery and returns with the retailer." : "Record a short take and check free storage before the shoot. Use the phone you already carry."}</p>
        {phone === "buy" && <MerchantLink offer={offers.phone} label="View iPhone" />}</article>
      <article><p className="eyebrow">Sound</p><h3>{sound === "own" ? "Pack your microphone" : "RØDE Wireless Micro"}</h3>
        <p>{sound === "own" ? "Connect your microphone and play back a recording from both speakers before you leave." :
          phone === "lightning" ? "Choose the Lightning receiver on the manufacturer’s page. The kit includes two clip-on transmitters." :
          "Choose the USB-C receiver for your iPhone. Clip one transmitter to each speaker and record a level check."}</p>
        {sound !== "own" && <MerchantLink offer={phone === "lightning" ? offers.lightningMic : offers.usbMic} label="View microphone" />}</article>
      <article><p className="eyebrow">Connectivity</p><h3>{trip === "us" ? "US travel eSIM" : trip === "eu" ? "Check included roaming" : "Use your existing data"}</h3>
        <p>{trip === "us" ? "Check your home plan first. For extra data, confirm your iPhone supports eSIM and is unlocked, then compare allowance, validity and hotspot terms." :
          trip === "eu" ? "Check your Dutch provider’s EU allowance and fair-use limit before buying extra data." :
          "Check hotspot access and your remaining allowance before uploading footage."}</p>
        {trip === "us" && <MerchantLink offer={offers.usData} label="Compare US plans" />}
        {trip === "eu" && <a href="https://digital-strategy.ec.europa.eu/en/policies/roaming">EU roaming guidance ↗</a>}
        {trip === "us" && <a href="https://support.apple.com/en-ie/118227">Check iPhone eSIM setup ↗</a>}</article>
    </div>
    <p className={styles.note}>Each seller confirms pricing and availability at checkout. <Link href="/disclosure">How Starlight earns →</Link></p>
  </div>;
}

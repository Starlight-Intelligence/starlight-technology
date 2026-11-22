import type { Metadata } from "next";
import { MobileCreatorKit } from "@/components/mobile-creator-kit";
import { mobileKitOffers } from "@/lib/mobile-kit";
import styles from "@/components/mobile-creator-kit.module.css";

export const dynamic = "force-dynamic";
const title = "Mobile creator kit for iPhone";
const description = "Choose an interview microphone and travel data around the iPhone and mobile plan you already own.";
const url = "/shop/mobile-creator-kit";
export const metadata: Metadata = { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };

export default function MobileKitPage() {
  return <section className={`shell ${styles.section}`}>
    <p className="eyebrow">Studio Shop / Field recording</p><h1>Mobile creator kit</h1>
    <p className={styles.intro}>{description}</p>
    <MobileCreatorKit offers={mobileKitOffers()} />
  </section>;
}

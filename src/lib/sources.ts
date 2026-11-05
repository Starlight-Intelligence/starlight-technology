import type { SourceRecord } from "./types";

const sources: SourceRecord[] = [
  { id: "nvidia-rtx-5090", title: "GeForce RTX 5090", publisher: "NVIDIA", url: "https://www.nvidia.com/nl-nl/geforce/graphics-cards/50-series/rtx-5090/", verifiedOn: "2026-07-19", primary: true },
  { id: "nvidia-rtx-5080", title: "GeForce RTX 5080", publisher: "NVIDIA", url: "https://www.nvidia.com/nl-nl/geforce/graphics-cards/50-series/rtx-5080/", verifiedOn: "2026-07-19", primary: true },
  { id: "google-review-guidance", title: "Write high quality reviews", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews", verifiedOn: "2026-07-19", primary: true },
  { id: "google-spam-policies", title: "Spam policies for Google web search", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/essentials/spam-policies#thin-affiliation", verifiedOn: "2026-07-19", primary: true },
  { id: "bol-affiliate", title: "bol Affiliate Program", publisher: "bol", url: "https://affiliate.bol.com/nl/", verifiedOn: "2026-07-19", primary: true },
  { id: "amazon-partnernet", title: "Amazon PartnerNet Netherlands", publisher: "Amazon", url: "https://partnernet.amazon.nl/", verifiedOn: "2026-07-19", primary: true },
  { id: "thomann-affiliate", title: "How to become a Thomann affiliate", publisher: "Thomann", url: "https://www.thomann.nl/faq_question_hoe_wordt_ik_een_thomann_affiliate.html", verifiedOn: "2026-07-19", primary: true }
];

export function getSources(ids: string[]) {
  return ids.map((id) => {
    const source = sources.find((entry) => entry.id === id);
    if (!source) throw new Error(`Missing source: ${id}`);
    return source;
  });
}

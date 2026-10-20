export interface ShopPhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  pictured: string;
  variantNote?: string;
  changes: string;
  author: string;
  license: "CC BY 4.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";
  licenseUrl: string;
  sourceUrl: string;
  objectPosition: string;
}

const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/";
const CC_BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0/";
const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0/";

// Wikimedia Commons photographs, resized to 1600 px and re-encoded; nothing else
// is altered except the RTX 5090 PNG, whose transparent background is flattened
// onto the page ink. Provenance sidecars sit beside each file in public/.
// A product without a licensed photograph of the exact model keeps its schematic.
export const shopPhotos: Record<string, ShopPhoto> = {
  "nvidia-dgx-spark": {
    src: "/images/products/nvidia-dgx-spark.jpg", width: 1600, height: 988,
    alt: "NVIDIA DGX Spark on a wooden desk, seen from above at an angle, showing the metal-foam front panel.",
    title: "Nvidia DGX Spark oblique view dllu",
    pictured: "NVIDIA DGX Spark, photographed May 2026.",
    changes: "Resized from 1920 px to 1600 px and re-encoded; no other edits.",
    author: "Daniel Lu", license: "CC BY-SA 4.0", licenseUrl: CC_BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nvidia_DGX_Spark_oblique_view_dllu.jpg",
    objectPosition: "40% 55%"
  },
  "nvidia-rtx-5090": {
    src: "/images/products/nvidia-rtx-5090.jpg", width: 1600, height: 1098,
    alt: "A Palit GeForce RTX 5090 GameRock graphics card with three fans, viewed from the fan side.",
    title: "Palit GeForce RTX 5090 Gamerock 20250530 HOF4166 RAW-Export",
    pictured: "Palit GeForce RTX 5090 GameRock, one partner board. Founders Edition and other boards differ in length, slot width and cooling.",
    changes: "Resized to 1600 px; transparent background filled with the page colour (#0b0f0d); re-encoded as JPEG.",
    variantNote: "Palit partner board pictured. Founders Edition and other boards differ in size and cooling.",
    author: "PantheraLeo1359531", license: "CC BY 4.0", licenseUrl: CC_BY_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Palit_GeForce_RTX_5090_Gamerock_20250530_HOF4166_RAW-Export.png",
    objectPosition: "45% 50%"
  },
  "apple-mac-studio": {
    src: "/images/products/apple-mac-studio.jpg", width: 1600, height: 1067,
    alt: "A silver Apple Mac Studio on a white surface, front ports facing the camera.",
    title: "Mac Studio (2022) front",
    pictured: "A 2022 Mac Studio. Chip, memory and storage cannot be identified from a photograph.",
    changes: "Resized from 1920 px to 1600 px and re-encoded; no other edits.",
    variantNote: "2022 model pictured. Chip and memory are not visible in a photo.",
    author: "Yasu", license: "CC BY-SA 3.0", licenseUrl: CC_BY_SA_3,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mac_Studio_(2022)_front.jpg",
    objectPosition: "50% 62%"
  },
  "samsung-990-pro-2tb": {
    src: "/images/products/samsung-990-pro-2tb.jpg", width: 1600, height: 1076,
    alt: "A Samsung 990 PRO M.2 NVMe SSD resting in its retail tray.",
    title: "SAMSUNG M.2 NVMe SSD 990 PRO 4TB",
    pictured: "The 4 TB capacity of the same 990 PRO line. The 2 TB drive carries a different label.",
    changes: "Resized from 1920 px to 1600 px and re-encoded; no other edits.",
    variantNote: "4 TB model pictured. This page covers the 2 TB drive.",
    author: "Dinkun Chen", license: "CC BY-SA 4.0", licenseUrl: CC_BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SAMSUNG_M.2_NVMe_SSD_990_PRO_4TB.jpg",
    objectPosition: "40% 50%"
  },
  "elgato-stream-deck-plus": {
    src: "/images/products/elgato-stream-deck-plus.jpg", width: 1600, height: 1521,
    alt: "An Elgato Stream Deck + on a desk with eight lit keys, a touch strip showing audio levels and four dials.",
    title: "Elgato Stream Deck +",
    pictured: "Elgato Stream Deck +, photographed November 2024.",
    changes: "Resized from 1920 px to 1600 px and re-encoded; no other edits.",
    author: "TaurusEmerald", license: "CC BY-SA 4.0", licenseUrl: CC_BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Elgato_Stream_Deck_%2B.jpg",
    objectPosition: "45% 40%"
  }
};

export function getShopPhoto(slug: string): ShopPhoto | undefined {
  return shopPhotos[slug];
}

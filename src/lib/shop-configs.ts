export interface ShopConfig {
  checkedOn: string;
  pick?: string;
  select?: string;
  rows: [label: string, value: string][];
}

// Copied from each product's manufacturer page (product.sourceUrl) on checkedOn.
// Advertised figures only: no benchmark, price or stock claim.
export const shopConfigs: Record<string, ShopConfig> = {
  "nvidia-dgx-spark": { checkedOn: "2026-10-20", select: "On NVIDIA's page, choose the 128 GB model. 64 GB units are sold only by OEM partners.", rows: [["Chip", "GB10 Grace Blackwell, 20-core Arm CPU"], ["Memory", "128 GB LPDDR5x unified, NVIDIA's own model; 64 GB only through OEM partners"], ["Storage", "Up to 4 TB NVMe, self-encrypting"], ["Network", "10 GbE + ConnectX-7 200 Gbps"]] },
  "nvidia-rtx-5090": { checkedOn: "2026-10-20", rows: [["Memory", "32 GB GDDR7"], ["CUDA cores", "21,760"], ["Power", "575 W card; 1000 W system PSU"], ["Founders Edition", "304 mm long; partner boards vary"]] },
  "minisforum-ms-s1-max": { checkedOn: "2026-10-20", rows: [["Chip", "AMD Ryzen AI Max+ 395"], ["Memory", "64 GB LPDDR5x-8000 unified, soldered"], ["Storage", "2 TB SSD"], ["Network", "Dual 10 GbE, Wi-Fi 7, USB4 v2"]] },
  "apple-mac-studio": { checkedOn: "2026-10-20", select: "On Apple's page, choose M5 Max, 40-core GPU, 64 GB, 1 TB.", pick: "Our pick of Apple's three standard configurations", rows: [["Chip", "M5 Max, 18-core CPU, 40-core GPU"], ["Memory", "64 GB unified; cannot be upgraded later"], ["Storage", "1 TB SSD"], ["Range", "Apple also lists 36–512 GB memory, up to 16 TB, and M5 Ultra"]] },
  "ugreen-dxp4800-plus": { checkedOn: "2026-10-20", rows: [["CPU", "Intel Pentium Gold 8505"], ["Memory", "8 GB DDR5, expandable to 64 GB"], ["Network", "1 × 10 GbE + 1 × 2.5 GbE"], ["Storage", "4 bays + 2 M.2 NVMe; 144 TB raw maximum"]] },
  "samsung-990-pro-2tb": { checkedOn: "2026-10-20", rows: [["Interface", "PCIe 4.0 x4, NVMe 2.0, M.2 2280"], ["Sequential", "Up to 7,450 MB/s read, 6,900 write"], ["Warranty", "5 years or 1,200 TBW"]] },
  "elgato-stream-deck-plus": { checkedOn: "2026-10-20", rows: [["Controls", "8 LCD keys, 4 push dials"], ["Touch panel", "108 × 14 mm LCD strip"], ["Connection", "USB-C, USB 3.0 port recommended"]] },
  "rode-podmic-usb": { checkedOn: "2026-10-20", rows: [["Capsule", "Dynamic"], ["Outputs", "XLR and USB-C"], ["Processing", "On-board APHEX DSP, headphone out"]] }
};

export interface ShopAlternative { slug: string; tradeoff: string; }

// Editorial pairings by buying decision, not by category.
export const shopAlternatives: Record<string, ShopAlternative[]> = {
  "nvidia-dgx-spark": [
    { slug: "minisforum-ms-s1-max", tradeoff: "One x86 desktop for Windows or Linux apps, with 64 GB fixed memory instead of a separate NVIDIA node." },
    { slug: "nvidia-rtx-5090", tradeoff: "CUDA inside a PC you already own: 32 GB on one card, but it needs a 1000 W system." },
    { slug: "apple-mac-studio", tradeoff: "A macOS creative desktop, configurable up to 512 GB unified memory, without the NVIDIA software stack." }
  ],
  "nvidia-rtx-5090": [
    { slug: "nvidia-dgx-spark", tradeoff: "A separate NVIDIA node with 128 GB unified memory, instead of rebuilding your PC around a 575 W card." },
    { slug: "minisforum-ms-s1-max", tradeoff: "A complete compact system where the GPU shares 64 GB of memory, with no tower or PSU upgrade." },
    { slug: "apple-mac-studio", tradeoff: "Leave CUDA behind for a macOS desktop with large unified memory." }
  ],
  "minisforum-ms-s1-max": [
    { slug: "apple-mac-studio", tradeoff: "Choose macOS and memory beyond 64 GB, at the cost of Windows-only applications." },
    { slug: "nvidia-dgx-spark", tradeoff: "A dedicated NVIDIA Linux node for models, kept separate from your creative desktop." },
    { slug: "nvidia-rtx-5090", tradeoff: "Upgrade an existing tower with 32 GB of CUDA memory instead of buying a new box." }
  ],
  "apple-mac-studio": [
    { slug: "minisforum-ms-s1-max", tradeoff: "Windows or Linux in a compact x86 box, with 64 GB memory that cannot be upgraded." },
    { slug: "nvidia-dgx-spark", tradeoff: "Replace macOS with an NVIDIA Linux desktop when your models matter more than Mac-only applications." },
    { slug: "nvidia-rtx-5090", tradeoff: "If you already run a Windows tower, add CUDA there instead of switching platforms." }
  ],
  "ugreen-dxp4800-plus": [
    { slug: "samsung-990-pro-2tb", tradeoff: "Fast scratch storage inside one workstation instead of shared, redundant storage on the network." }
  ],
  "samsung-990-pro-2tb": [
    { slug: "ugreen-dxp4800-plus", tradeoff: "Shared storage with drive redundancy for the whole studio, at network speed rather than PCIe speed." }
  ]
};

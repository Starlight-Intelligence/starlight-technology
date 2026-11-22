import { resolveShopOffer } from "./shop-offers";

const products = {
  phone: {
    slug: "apple-iphone-17-256gb-black-nl", brand: "Coolblue NL", region: "Netherlands",
    sourceUrl: "https://www.coolblue.nl/en/product/968961/apple-iphone-17-256gb-black.html",
    affiliateEnvKey: "STARLIGHT_AFFILIATE_IPHONE_17_NL_URL"
  },
  usbMic: {
    slug: "rode-wireless-micro-black-usb-c-nl", brand: "Coolblue NL", region: "Netherlands",
    sourceUrl: "https://www.coolblue.nl/en/product/956682/rode-wireless-micro-black-usb-c.html",
    affiliateEnvKey: "STARLIGHT_AFFILIATE_RODE_MICRO_USB_C_URL"
  },
  lightningMic: {
    slug: "rode-wireless-micro-lightning", brand: "RØDE", region: "Select your region",
    sourceUrl: "https://rode.com/en/products/wireless-micro",
    affiliateEnvKey: "STARLIGHT_AFFILIATE_RODE_MICRO_LIGHTNING_URL"
  },
  usData: {
    slug: "airalo-united-states-esim", brand: "Airalo", region: "United States",
    sourceUrl: "https://www.airalo.com/united-states-esim",
    affiliateEnvKey: "STARLIGHT_AFFILIATE_AIRALO_US_URL"
  }
};

export function mobileKitOffers() {
  const resolve = (item: (typeof products)[keyof typeof products]) =>
    resolveShopOffer({ ...item, verifiedOn: "2026-11-22" });
  return {
    phone: resolve(products.phone), usbMic: resolve(products.usbMic),
    lightningMic: resolve(products.lightningMic), usData: resolve(products.usData)
  };
}

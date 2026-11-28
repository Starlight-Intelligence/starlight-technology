// The normalized feed intentionally excludes HTML, personal data and affiliate URLs.
const fields = {
  external_id: /^[\w:.+/-]{1,160}$/, variant_id: /^[a-z0-9-]{1,120}$/,
  seller_id: /^[a-z0-9-]{1,100}$/, market: /^(NL|DE)$/,
  condition: /^(new|refurbished|used)$/, currency: /^(EUR|USD|GBP)$/,
  vat_mode: /^(invoice|margin|private|unknown)$/,
  availability: /^(in_stock|backorder|unavailable|unknown)$/,
  observed_at: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/,
};

export function httpsUrl(value, hosts) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      (hosts && !hosts.includes(url.hostname))) throw new Error("URL is outside source policy");
  return url;
}

export function normalizeOffers(input, offerHosts) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new Error("Expected 1–100 offers");
  return input.map((row) => {
    const result = {};
    for (const [field, rule] of Object.entries(fields)) {
      if (typeof row?.[field] !== "string" || !rule.test(row[field])) throw new Error("Invalid " + field);
      result[field] = row[field];
    }
    const timestamp = new Date(result.observed_at);
    if (!Number.isFinite(+timestamp) || timestamp.toISOString().slice(0, 19) !== result.observed_at.slice(0, 19)) {
      throw new Error("Invalid observation time");
    }
    result.observed_at = timestamp.toISOString();
    for (const field of ["item_minor", "shipping_minor", "vat_minor"]) {
      const value = row[field];
      if (value == null && field !== "item_minor") { result[field] = null; continue; }
      if (!Number.isInteger(value) || value < 0 || value > 100000000) throw new Error("Invalid " + field);
      result[field] = value;
    }
    if ((result.vat_mode === "invoice") !== (result.vat_minor !== null) ||
        (result.vat_minor !== null && (result.shipping_minor === null ||
          result.vat_minor > result.item_minor + result.shipping_minor))) throw new Error("Inconsistent VAT evidence");
    if (typeof row.url !== "string" || row.url.length > 1024) throw new Error("Invalid offer URL");
    const url = httpsUrl(row.url, offerHosts);
    if (url.hash || (url.search && !/^\?variant=\d{6,20}$/.test(url.search))) throw new Error("Use a canonical product or variant URL");
    result.url = url.href;
    return result;
  });
}

export async function readBoundedJson(response, limit = 140_000) {
  if (!response.body || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Error("Expected JSON input");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > limit) throw new Error("Input exceeds size limit");
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function loadLicensedFeed(policy) {
  const endpoint = httpsUrl(policy.endpoint, policy.feedHosts);
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Feed HTTP " + response.status);
  return normalizeOffers(await readBoundedJson(response), policy.offerHosts);
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

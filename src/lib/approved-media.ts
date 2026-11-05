import approvedPlacements from "../../data/media/approved-placements.json";

export type ApprovedRendition = {
  asset_id: string;
  version_id: string;
  rendition_id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  checksum: string;
  mime_type: "image/avif" | "image/webp" | "image/jpeg" | "image/png";
  rights_receipt_id: string;
  approval_receipt_id: string;
  approved_at: string;
  rights_expires_at?: string;
  channels: string[];
};

export function resolveApprovedMedia(
  placement: string,
  manifest: Record<string, unknown> = approvedPlacements,
  now = new Date(),
): ApprovedRendition | null {
  const record = manifest[placement];
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const r = record as Partial<ApprovedRendition>;
  if (
    !/^ast_[a-zA-Z0-9_-]+$/.test(r.asset_id ?? "") ||
    !/^ver_[a-zA-Z0-9_-]+$/.test(r.version_id ?? "") ||
    !/^rnd_[a-zA-Z0-9_-]+$/.test(r.rendition_id ?? "") ||
    !/^sha256:[a-f0-9]{64}$/.test(r.checksum ?? "") ||
    !["image/avif", "image/webp", "image/jpeg", "image/png"].includes(r.mime_type ?? "") ||
    !r.rights_receipt_id?.trim() || !r.approval_receipt_id?.trim() ||
    !Number.isSafeInteger(r.width) || !Number.isSafeInteger(r.height) ||
    (r.width ?? 0) < 1 || (r.height ?? 0) < 1 ||
    !r.alt?.trim() || !r.caption?.trim() || !r.credit?.trim() ||
    !r.channels?.includes("starlight.technology") ||
    !r.approved_at || !Number.isFinite(Date.parse(r.approved_at)) ||
    Date.parse(r.approved_at) > now.getTime() ||
    (r.rights_expires_at !== undefined &&
      (!Number.isFinite(Date.parse(r.rights_expires_at)) || Date.parse(r.rights_expires_at) <= now.getTime()))
  ) return null;
  try {
    const url = new URL(r.url ?? "");
    if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) return null;
  } catch { return null; }
  return r as ApprovedRendition;
}

import { describe, expect, it } from "vitest";
import { resolveApprovedMedia } from "./approved-media";

const valid = {
  asset_id: "ast_demo", version_id: "ver_01", rendition_id: "rnd_web",
  url: "https://sample.public.blob.vercel-storage.com/starlight/ast_demo/ver_01/web/hash.webp",
  width: 1200, height: 800, alt: "Example device on a desk", caption: "Example capture.",
  credit: "Photo: owner", checksum: `sha256:${"a".repeat(64)}`,
  mime_type: "image/webp", rights_receipt_id: "rights_demo", approval_receipt_id: "approval_demo",
  approved_at: "2026-09-20T00:00:00Z", rights_expires_at: "2026-10-20T00:00:00Z",
  channels: ["starlight.technology"],
};
const now = new Date("2026-09-24T00:00:00Z");

describe("approved media resolver", () => {
  it("withholds unknown placements", () => expect(resolveApprovedMedia("missing", {}, now)).toBeNull());
  it("accepts only a complete approved immutable rendition", () => {
    expect(resolveApprovedMedia("comparison.hero", { "comparison.hero": valid }, now)).toEqual(valid);
  });
  it("withholds expired rights, mismatched channels and hotlinks", () => {
    expect(resolveApprovedMedia("x", { x: { ...valid, rights_expires_at: "2026-09-22T00:00:00Z" } }, now)).toBeNull();
    expect(resolveApprovedMedia("x", { x: { ...valid, channels: ["frankx.ai"] } }, now)).toBeNull();
    expect(resolveApprovedMedia("x", { x: { ...valid, url: "https://publisher.example/image.jpg" } }, now)).toBeNull();
  });
  it("withholds incomplete approvals", () => {
    expect(resolveApprovedMedia("x", { x: { ...valid, checksum: "" } }, now)).toBeNull();
    expect(resolveApprovedMedia("x", { x: { ...valid, credit: "" } }, now)).toBeNull();
    expect(resolveApprovedMedia("x", { x: { ...valid, rights_receipt_id: "" } }, now)).toBeNull();
  });
});

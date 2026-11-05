import Image from "next/image";
import { resolveApprovedMedia } from "@/lib/approved-media";

/** Empty or expired approval means no image is rendered. */
export function ApprovedMediaFigure({ placement }: { placement: string }) {
  const media = resolveApprovedMedia(placement);
  if (!media) return null;
  return (
    <figure className="approved-media-figure">
      <Image src={media.url} width={media.width} height={media.height} alt={media.alt} sizes="(max-width: 900px) 100vw, 900px" />
      <figcaption><span>{media.caption}</span><span>{media.credit}</span></figcaption>
    </figure>
  );
}

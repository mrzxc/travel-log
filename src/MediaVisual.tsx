import { useEffect, useState } from "react";
import { Image } from "lucide-react";
import type { Media } from "./model";
export const mediaUrl = (m: Media, thumb = false) => {
  const url = window.desktop?.url(m.id, thumb, m.sourceId);
  // Asset IDs survive folder remapping. A changed path must also invalidate
  // Chromium's image/video cache for that ID.
  return url?.startsWith("travel:")
    ? `${url}${url.includes("?") ? "&" : "?"}revision=${encodeURIComponent(m.path)}`
    : url || m.path;
};
export function Thumb({
  media,
  className = "",
}: {
  media?: Media;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [media?.id, media?.path]);
  return media && !media.missing && !broken ? (
    <img
      className={className}
      src={mediaUrl(media, true)}
      onError={() => setBroken(true)}
      draggable={false}
    />
  ) : (
    <div className={"empty-thumb " + className}>
      <Image size={25} />
      <span>{media?.missing ? "文件缺失" : "无素材"}</span>
    </div>
  );
}

import { PictureNote } from "./PictureNote";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Minus,
  Plus,
  LocateFixed,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type { Media } from "./model";
import { mediaUrl } from "./MediaVisual";
export const DEFAULT_MEDIA_SCALE = 0.8;
export type MediaView = { x: number; y: number; scale: number };
export function zoomMediaView(
  view: MediaView,
  factor: number,
  anchor = { x: 0, y: 0 },
): MediaView {
  const scale = Math.max(0.5, Math.min(5, view.scale * factor)),
    ratio = scale / view.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  };
}
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export function PresentationMedia({
  item,
  videoRef,
  controls,
  onError,
  hasMiniMap = false,
}: {
  item: Media;
  videoRef: RefObject<HTMLVideoElement | null>;
  controls: boolean;
  onError: () => void;
  hasMiniMap?: boolean;
}) {
  const [view, setView] = useState<MediaView>({
    x: 0,
    y: 0,
    scale: DEFAULT_MEDIA_SCALE,
  });
  const host = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const quarterTurn = item.type === "image" && Math.abs(rotation % 180) === 90;
  const drag = useRef<{ x: number; y: number; view: MediaView } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [player, setPlayer] = useState({
    paused: true,
    muted: false,
    time: 0,
    duration: 0,
  });
  const scrub = useRef<{ time: number; resume: boolean } | null>(null);
  function finishScrub() {
    const current = scrub.current;
    scrub.current = null;
    const video = videoRef.current;
    if (current && video) {
      video.currentTime = current.time;
      if (current.resume) void video.play().catch(() => {});
    }
  }
  function constrain(next: MediaView) {
    const el = host.current,
      media = el?.querySelector("img,video");
    if (!el || !media) return next;
    const naturalWidth =
      media instanceof HTMLVideoElement
        ? media.videoWidth
        : (media as HTMLImageElement).naturalWidth;
    const naturalHeight =
      media instanceof HTMLVideoElement
        ? media.videoHeight
        : (media as HTMLImageElement).naturalHeight;
    const rotated =
      item.type === "image" && Math.abs(rotationRef.current % 180) === 90;
    const width = rotated ? naturalHeight : naturalWidth;
    const height = rotated ? naturalWidth : naturalHeight;
    const fit =
      width && height
        ? Math.min(el.clientWidth / width, el.clientHeight / height)
        : 1;
    const limitX = Math.max(
      0,
      ((width || el.clientWidth) * fit * next.scale - el.clientWidth) / 2,
    );
    const limitY = Math.max(
      0,
      ((height || el.clientHeight) * fit * next.scale - el.clientHeight) / 2,
    );
    return {
      ...next,
      x: Math.max(-limitX, Math.min(limitX, next.x)),
      y: Math.max(-limitY, Math.min(limitY, next.y)),
    };
  }
  function zoom(factor: number, anchor = { x: 0, y: 0 }) {
    setView((current) => constrain(zoomMediaView(current, factor, anchor)));
  }
  function rotate(direction: number) {
    drag.current = null;
    rotationRef.current += direction * 90;
    setRotation(rotationRef.current);
    setView((current) => constrain({ ...current, x: 0, y: 0 }));
  }
  useEffect(() => {
    const el = host.current!;
    const wheel = (event: WheelEvent) => {
      if ((event.target as Element).closest("[data-media-tool]")) return;
      event.preventDefault();
      event.stopPropagation();
      if (drag.current || !event.deltaY) return;
      const rect = el.getBoundingClientRect();
      zoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.002), {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    const observer = new ResizeObserver(() =>
      setView((current) => constrain(current)),
    );
    observer.observe(el);
    return () => {
      el.removeEventListener("wheel", wheel);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (item.type !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    const sync = () =>
      setPlayer({
        paused: video.paused,
        muted: video.muted,
        time: scrub.current?.time ?? (video.currentTime || 0),
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    const events = [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "seeking",
      "seeked",
      "play",
      "pause",
      "ended",
      "volumechange",
    ];
    events.forEach((name) => video.addEventListener(name, sync));
    sync();
    return () =>
      events.forEach((name) => video.removeEventListener(name, sync));
  }, [item.id, item.type, videoRef]);
  const transform = {
    transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
  };
  return (
    <div
      className={
        "slide media-zoom-stage" +
        (hasMiniMap ? " has-map-miniature" : "") +
        (view.scale > 1 ? " is-zoomed" : "")
      }
      data-media-scale={view.scale}
      data-media-rotation={rotation}
      data-media-pan-x={view.x}
      data-media-pan-y={view.y}
      ref={host}
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          viewRef.current.scale <= 1 ||
          (event.target as Element).closest("[data-media-tool]")
        )
          return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          view: viewRef.current,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (current)
          setView(
            constrain({
              ...current.view,
              x: current.view.x + event.clientX - current.x,
              y: current.view.y + event.clientY - current.y,
            }),
          );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {item.type === "image" ? (
        <img
          src={mediaUrl(item)}
          onError={onError}
          onLoad={(event) => {
            setView((current) => constrain(current));
            if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
              event.currentTarget.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 220,
                easing: "ease-out",
              });
          }}
          draggable={false}
          style={{
            transform: `${transform.transform} rotate(${rotation}deg)`,
            width: quarterTurn ? host.current?.clientHeight : undefined,
            height: quarterTurn ? host.current?.clientWidth : undefined,
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={mediaUrl(item)}
          poster={mediaUrl(item, true)}
          controls={false}
          onError={onError}
          onLoadedMetadata={() => setView((current) => constrain(current))}
          preload="auto"
          style={transform}
        />
      )}
      {item.type === "image" && item.note?.trim() && (
        <PictureNote text={item.note} />
      )}
      <div className="media-zoom-tools" data-media-tool>
        {item.type === "image" && (
          <>
            <button
              title="向左旋转 90°"
              aria-label="向左旋转 90°"
              onClick={() => rotate(-1)}
            >
              <RotateCcw size={17} />
            </button>
            <button
              title="向右旋转 90°"
              aria-label="向右旋转 90°"
              onClick={() => rotate(1)}
            >
              <RotateCw size={17} />
            </button>
          </>
        )}
        <button
          title="缩小素材"
          aria-label="缩小素材"
          disabled={view.scale <= 0.5}
          onClick={() => zoom(1 / 1.25)}
        >
          <Minus size={17} />
        </button>
        <span aria-label="素材缩放比例">{Math.round(view.scale * 100)}%</span>
        <button
          title="放大素材"
          aria-label="放大素材"
          disabled={view.scale >= 5}
          onClick={() => zoom(1.25)}
        >
          <Plus size={17} />
        </button>
        <button
          title="恢复素材比例"
          aria-label="恢复素材比例"
          onClick={() => {
            drag.current = null;
            setView({ x: 0, y: 0, scale: DEFAULT_MEDIA_SCALE });
          }}
        >
          <LocateFixed size={17} />
        </button>
        <small>滚轮缩放 · 放大后拖动查看</small>
      </div>
      {item.type === "video" && (
        <div
          className="zoomed-video-controls"
          data-media-tool
          data-controls-visible={controls}
        >
          <button
            aria-label={player.paused ? "播放视频" : "暂停视频"}
            onClick={() => {
              const video = videoRef.current;
              if (video)
                video.paused
                  ? void video.play().catch(() => {})
                  : video.pause();
            }}
          >
            {player.paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <span>{clock(player.time)}</span>
          <input
            aria-label="视频播放进度"
            type="range"
            min="0"
            max={player.duration || 1}
            step="0.1"
            value={Math.min(player.time, player.duration || 1)}
            disabled={!player.duration}
            onPointerDown={(event) => {
              if (event.button !== 0 || !videoRef.current) return;
              const video = videoRef.current;
              scrub.current = {
                time: video.currentTime,
                resume: !video.paused,
              };
              video.pause();
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={finishScrub}
            onPointerCancel={finishScrub}
            onLostPointerCapture={finishScrub}
            onChange={(event) => {
              const time = Number(event.target.value);
              if (scrub.current) scrub.current.time = time;
              setPlayer((current) => ({ ...current, time }));
              if (videoRef.current) videoRef.current.currentTime = time;
            }}
          />
          <span>{clock(player.duration)}</span>
          <button
            aria-label={player.muted ? "取消静音" : "静音"}
            onClick={() => {
              if (videoRef.current)
                videoRef.current.muted = !videoRef.current.muted;
            }}
          >
            {player.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      )}
    </div>
  );
}

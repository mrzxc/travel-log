import { useEffect, useLayoutEffect, useRef } from "react";
export interface AlbumOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function captureAlbum(
  element: Element | null | undefined,
): AlbumOrigin | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x / innerWidth,
    y: rect.y / innerHeight,
    width: rect.width / innerWidth,
    height: rect.height / innerHeight,
  };
}
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function originTransform(origin: AlbumOrigin) {
  const scale = Math.max(0.025, Math.max(origin.width, origin.height));
  return `translate(${(origin.x + origin.width / 2 - 0.5) * innerWidth}px,${(origin.y + origin.height / 2 - 0.5) * innerHeight}px) scale(${scale})`;
}
export function usePresentationTransitions(placeId: string, mode: string) {
  const stageRef = useRef<HTMLDivElement>(null),
    pending = useRef<AlbumOrigin | null>(null),
    opening = useRef<Animation | null>(null);
  const ghosts = useRef(new Set<HTMLElement>());
  function clearGhosts() {
    for (const ghost of ghosts.current) ghost.remove();
    ghosts.current.clear();
  }
  function openFrom(origin: AlbumOrigin | null) {
    opening.current?.cancel();
    clearGhosts();
    pending.current = origin;
  }
  function closeTo(origin: AlbumOrigin | null) {
    opening.current?.cancel();
    pending.current = null;
    clearGhosts();
    const stage = stageRef.current;
    if (!stage || !origin || reduced()) return;
    const media = stage.querySelector<HTMLImageElement | HTMLVideoElement>(
      ".slide > img,.slide > video",
    );
    const sheet = stage.querySelector<HTMLElement>(
      ".presentation-map:not(.mini-map) .map-sheet",
    );
    let content: HTMLElement | null = null;
    if (media instanceof HTMLVideoElement) {
      if (media.readyState >= 2 && media.videoWidth && media.videoHeight) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = media.videoWidth;
          canvas.height = media.videoHeight;
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(media, 0, 0);
            canvas.style.cssText = "width:100%;height:100%;object-fit:contain;";
            canvas.style.transform = media.style.transform;
            content = canvas;
          }
        } catch {
          /* Snapshot failure must not block navigation. */
        }
      }
      if (!content && media.poster) {
        const image = document.createElement("img");
        image.src = media.poster;
        image.style.cssText = "width:100%;height:100%;object-fit:contain;";
        image.style.transform = media.style.transform;
        content = image;
      }
    } else if (media) content = media.cloneNode(true) as HTMLElement;
    else if (sheet) content = sheet.cloneNode(true) as HTMLElement;
    if (!content) return;
    if (media instanceof HTMLImageElement) {
      content.style.width = "100%";
      content.style.height = "100%";
      content.style.objectFit = "contain";
    }
    const ghost = document.createElement("div");
    ghost.className = "presentation-exit-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.append(content);
    stage.parentElement?.append(ghost);
    ghosts.current.add(ghost);
    const animation = ghost.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: originTransform(origin), opacity: 0 },
      ],
      { duration: 280, easing: "cubic-bezier(.4,0,.2,1)" },
    );
    const remove = () => {
      ghost.remove();
      ghosts.current.delete(ghost);
    };
    animation.finished.then(remove, remove);
  }
  useLayoutEffect(() => {
    const stage = stageRef.current,
      origin = pending.current;
    pending.current = null;
    if (!stage || !origin || reduced()) return;
    const animation = stage.animate(
      [
        { transform: originTransform(origin), opacity: 0.15 },
        { transform: "translate(0,0) scale(1)", opacity: 1 },
      ],
      { duration: 300, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
    opening.current = animation;
    stage.dataset.transition = "open";
    const done = () => {
      if (opening.current === animation) {
        delete stage.dataset.transition;
        opening.current = null;
      }
    };
    animation.finished.then(done, done);
  }, [placeId, mode]);
  useEffect(
    () => () => {
      opening.current?.cancel();
      clearGhosts();
    },
    [],
  );
  return { stageRef, openFrom, closeTo };
}

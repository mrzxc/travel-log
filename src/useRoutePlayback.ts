import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { MapRoute } from "./model";

export interface RoutePlaybackSnapshot {
  step: number;
  progress: number;
}
export type RoutePlaybackMemory = Record<string, RoutePlaybackSnapshot>;
interface PlaybackState extends RoutePlaybackSnapshot {
  playing: boolean;
}
export function useRoutePlayback(
  routes: MapRoute[],
  editing: boolean,
  session?: {
    memory: MutableRefObject<RoutePlaybackMemory>;
    placeId: string;
    active: boolean;
  },
) {
  const memory = session?.memory,
    placeId = session?.placeId,
    active = session?.active ?? true;
  const [state, setState] = useState<PlaybackState>(() => {
    const saved = memory && placeId ? memory.current[placeId] : undefined;
    return {
      step: editing ? routes.length : Math.min(routes.length, saved?.step ?? 0),
      progress: saved?.progress ?? 1,
      playing: false,
    };
  });
  const current = useRef(state),
    activeRef = useRef(active);
  activeRef.current = active;
  const remember = useCallback(
    (value: RoutePlaybackSnapshot) => {
      if (!editing && memory && placeId)
        memory.current[placeId] = {
          step: value.step,
          progress: value.progress,
        };
    },
    [editing, memory, placeId],
  );
  const commit = useCallback(
    (value: PlaybackState) => {
      current.current = value;
      remember(value);
      setState(value);
    },
    [remember],
  );
  useEffect(() => {
    remember(current.current);
    return () => remember(current.current);
  }, [remember]);
  useEffect(() => {
    if (editing) commit({ step: routes.length, progress: 1, playing: false });
  }, [editing, routes.length, commit]);
  useEffect(() => {
    if (!editing && !active && current.current.playing)
      commit({ ...current.current, playing: false });
  }, [active, editing, commit]);
  useEffect(() => {
    if (editing || !active || !state.playing || state.step === 0) return;
    let frame = 0;
    const step = state.step,
      initial = current.current.progress,
      start = performance.now();
    const duration = Math.max(0.2, routes[step - 1]?.duration || 2) * 1000;
    const tick = (now: number) => {
      if (
        !activeRef.current ||
        !current.current.playing ||
        current.current.step !== step
      )
        return;
      const progress = Math.min(1, initial + (now - start) / duration);
      commit({ step, progress, playing: progress < 1 });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [editing, active, state.step, state.playing, routes, commit]);
  const next = useCallback(() => {
    if (editing || !activeRef.current) return;
    const now = current.current;
    if (now.progress < 1)
      commit({
        ...now,
        progress: now.playing ? 1 : now.progress,
        playing: !now.playing,
      });
    else if (now.step < routes.length)
      commit({ step: now.step + 1, progress: 0, playing: true });
  }, [editing, routes.length, commit]);
  const previous = useCallback(() => {
    const step = Math.max(0, current.current.step - 1);
    commit({ step, progress: step ? 0 : 1, playing: step > 0 });
  }, [commit]);
  const reset = useCallback(
    () => commit({ step: 0, progress: 1, playing: false }),
    [commit],
  );
  useEffect(() => {
    if (editing || !active || !routes.length) return;
    const key = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'input,select,textarea,[contenteditable="true"]',
        ) ||
        !document.querySelector(".presentation-map:not(.mini-map)")
      )
        return;
      if (event.code === "Space" || event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [editing, active, routes.length, next, previous]);
  return {
    step: state.step,
    progress: state.progress,
    paused: !state.playing && state.progress < 1,
    next,
    previous,
    reset,
  };
}

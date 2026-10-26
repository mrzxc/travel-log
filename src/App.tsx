import {
  usePresentationTransitions,
  captureAlbum,
  type AlbumOrigin,
} from "./usePresentationTransitions";
import { PresentationMedia } from "./PresentationMedia";
import { ProjectTransferDialog } from "./ProjectTransferDialog";
import type { ImportDraft } from "./projectTransfer";
import { createPortal } from "react-dom";
import type { RoutePlaybackMemory } from "./useRoutePlayback";
import { moveRoutePoint, translateRoute } from "./routeEditing";
import { closestCurveParameter } from "./routeGeometry";
import { MapPlaceTools } from "./MapEditorTools";
import { RouteLayer, RouteControls, useRoutePlayback } from "./MapRoutes";
import type { MapRoute, RoutePoint, Transport } from "./model";
import { Thumb, mediaUrl } from "./MediaVisual";
import {
  MediaDragProvider,
  TreeRow,
  DragTrash,
  MediaBoard,
  SelectionBar,
  MediaDetail,
} from "./MediaWorkspace";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Map,
  MapPin,
  Plus,
  FolderOpen,
  Download,
  Image,
  Video,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  GripVertical,
  Trash2,
  Upload,
  Expand,
  LocateFixed,
  Check,
  Folder,
  Search,
  Link,
  X,
  Compass,
  Layers,
  MoreHorizontal,
  Minus,
  PanelLeftClose,
  FileWarning,
} from "lucide-react";
import {
  available,
  placeNamesShown,
  cover,
  createProject,
  descendants,
  flatten,
  hasMap,
  canPresent,
  filterPresentationMedia,
  canEnterPlace,
  setCover,
  moveMediaBatch,
  removeMediaBatch,
  reorderMedia,
  removePlace,
  uid,
  visiblePins,
  type Project,
  type Media,
  type Place,
  type Pin,
} from "./model";
const api = window.desktop;
function Stack({
  media,
  count,
  label,
  onClick,
  disabled = false,
}: {
  media?: Media;
  count: number;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="stack-button"
      onClick={onClick}
      title={label}
      disabled={disabled}
    >
      <div className="photo-stack">
        {Array.from({ length: Math.max(0, Math.min(5, count) - 1) }, (_, i) => (
          <span
            key={i}
            className="paper"
            style={{
              transform: `translate(${(i + 1) * 3}px,${-(i + 1) * 3}px) rotate(${(i + 1) * 2}deg)`,
            }}
          />
        ))}
        <div className="stack-cover">
          <Thumb media={media} />
          {media?.type === "video" && <Play className="video-mark" size={16} />}
        </div>
      </div>
      {label && (
        <span className="stack-label">
          {label}
          <small>{count} 份素材</small>
        </span>
      )}
    </button>
  );
}
function Sortable({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children(
        <button
          className="drag-handle"
          {...attributes}
          {...listeners}
          title="拖动排序"
        >
          <GripVertical size={15} />
        </button>,
      )}
    </div>
  );
}
function SortArea({
  ids,
  onSort,
  children,
}: {
  ids: string[];
  onSort: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function end(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id)
      onSort(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={end}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
const EMPTY_ROUTES: MapRoute[] = [];
type View = { x: number; y: number; scale: number };
function MapCanvas({
  project,
  nodeId,
  editing = false,
  onPin,
  onMove,
  onDelete,
  views,
  onRoutes,
  onShowPlaceNames,
  expanded = false,
  onExpand,
  onCloseEditor,
  placeTools,
  toolbarHost,
  playbackMemory,
  playbackActive = true,
}: {
  playbackMemory?: React.MutableRefObject<RoutePlaybackMemory>;
  playbackActive?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onCloseEditor?: () => void;
  placeTools?: React.ReactNode;
  toolbarHost?: HTMLElement | null;
  onRoutes?: (routes: MapRoute[]) => void;
  onShowPlaceNames?: (show: boolean) => void;
  project: Project;
  nodeId: string;
  editing?: boolean;
  onPin?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onDelete?: (id: string) => void;
  views: React.MutableRefObject<Record<string, View>>;
}) {
  const [transport, setTransport] = useState<Transport>("plane");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const n = project.nodes[nodeId];
  const routes = n.routes || EMPTY_ROUTES;
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedRouteId && !routes.some((r) => r.id === selectedRouteId))
      setSelectedRouteId(null);
  }, [routes, selectedRouteId]);
  useEffect(() => setSelectedRouteId(null), [nodeId]);
  const [draft, setDraft] = useState<RoutePoint[] | null>(null);
  const [localShow, setLocalShow] = useState(placeNamesShown(n));
  const showPlaceNames = editing ? placeNamesShown(n) : localShow;
  const playback = useRoutePlayback(
    routes,
    editing,
    playbackMemory
      ? { memory: playbackMemory, placeId: nodeId, active: playbackActive }
      : undefined,
  );
  const [view, setView] = useState<View>(
    views.current[nodeId] || { x: 0, y: 0, scale: 1 },
  );
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [container, setContainer] = useState({ w: 1, h: 1 });
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    view: View;
    id?: string;
    startX?: number;
    startY?: number;
    moved: boolean;
    bend?: { routeId: string; index: number; control: RoutePoint; t: number };
    routeEdit?: { snapshot: MapRoute; pointIndex?: number };
  } | null>(null);
  useEffect(() => {
    setView(views.current[nodeId] || { x: 0, y: 0, scale: 1 });
  }, [nodeId, views]);
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(([e]) =>
      setContainer({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    views.current[nodeId] = view;
  }, [view, nodeId, views]);
  useEffect(() => {
    const el = host.current!;
    const wheel = (event: WheelEvent) => {
      if ((event.target as Element).closest("[data-map-tool]")) {
        let target = event.target as HTMLElement | null;
        while (target && target !== el) {
          const style = getComputedStyle(target);
          if (
            /(auto|scroll)/.test(style.overflowY) &&
            target.scrollHeight > target.clientHeight &&
            ((event.deltaY > 0 &&
              target.scrollTop + target.clientHeight <
                target.scrollHeight - 1) ||
              (event.deltaY < 0 && target.scrollTop > 0))
          ) {
            event.preventDefault();
            event.stopPropagation();
            target.scrollTop +=
              event.deltaY *
              (event.deltaMode === 1
                ? 16
                : event.deltaMode === 2
                  ? target.clientHeight
                  : 1);
            return;
          }
          target = target.parentElement;
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!event.deltaY || gesture.current) return;
      const rect = el.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      };
      zoom(
        Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.002),
        anchor,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const el = host.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const workspace = el.closest<HTMLElement>(".workspace");
    const previousOverflow = workspace?.style.overflow;
    if (workspace) workspace.style.overflow = "hidden";
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.focus({ preventScroll: true });
    return () => {
      if (workspace) workspace.style.overflow = previousOverflow || "";
      document.body.style.overflow = bodyOverflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [expanded]);
  const fit = Math.min(container.w / size.w, container.h / size.h);
  const w = size.w * fit,
    h = size.h * fit;
  const pins = !draft ? (editing ? n.pins : visiblePins(project, nodeId)) : [];
  function down(e: React.PointerEvent, id?: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (editing) setSelectedRouteId(null);
    if (draft) {
      const rect = host
        .current!.querySelector(".map-sheet")!
        .getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width,
        y = (e.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) setDraft([...draft, { x, y }]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      view,
      id,
      startX: n.pins.find((p) => p.nodeId === id)?.x,
      startY: n.pins.find((p) => p.nodeId === id)?.y,
      moved: false,
    };
  }
  function startBend(
    event: React.PointerEvent<SVGPathElement>,
    routeId: string,
    index: number,
  ) {
    if (event.button !== 0 || !editing || !onRoutes || draft) return;
    event.preventDefault();
    event.stopPropagation();
    host.current?.focus({ preventScroll: true });
    if (selectedRouteId !== routeId) {
      setSelectedRouteId(routeId);
      gesture.current = null;
      return;
    }
    const route = routes.find((r) => r.id === routeId)!;
    const a = route.points[index],
      b = route.points[index + 1];
    const rect = host
      .current!.querySelector(".map-sheet")!
      .getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      view,
      moved: false,
      bend: {
        routeId,
        index,
        control: route.controls?.[index] || {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        },
        t: closestCurveParameter(route, index, point, w, h),
      },
    };
  }
  function startRouteEdit(
    event: React.PointerEvent<SVGElement>,
    routeId: string,
    pointIndex?: number,
  ) {
    if (event.button !== 0 || !editing || !onRoutes || draft) return;
    event.preventDefault();
    event.stopPropagation();
    host.current?.focus({ preventScroll: true });
    if (selectedRouteId !== routeId) {
      setSelectedRouteId(routeId);
      return;
    }
    const snapshot = routes.find((r) => r.id === routeId);
    if (!snapshot) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      view,
      moved: false,
      routeEdit: { snapshot, pointIndex },
    };
  }
  function changeDraft(next: RoutePoint[] | null) {
    if (next) setSelectedRouteId(null);
    setDraft(next);
  }
  function move(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
    if (g.routeEdit) {
      if (!g.moved) return;
      const { snapshot, pointIndex } = g.routeEdit;
      const delta = { x: dx / (w * g.view.scale), y: dy / (h * g.view.scale) };
      const changed =
        pointIndex === undefined
          ? translateRoute(snapshot, delta.x, delta.y)
          : moveRoutePoint(
              snapshot,
              pointIndex,
              {
                x: snapshot.points[pointIndex].x + delta.x,
                y: snapshot.points[pointIndex].y + delta.y,
              },
              w,
              h,
            );
      onRoutes?.(routes.map((r) => (r.id === snapshot.id ? changed : r)));
    } else if (g.bend) {
      if (!g.moved) return;
      const { routeId, index, control, t } = g.bend;
      const weight = 2 * t * (1 - t);
      const next = {
        x: control.x + dx / (w * g.view.scale * weight),
        y: control.y + dy / (h * g.view.scale * weight),
      };
      onRoutes?.(
        routes.map((r) => {
          if (r.id !== routeId) return r;
          const controls = Array.from(
            { length: r.points.length - 1 },
            (_, i) => r.controls?.[i] || null,
          );
          controls[index] = next;
          return { ...r, controls };
        }),
      );
    } else if (g.id) {
      if (editing)
        onMove?.(
          g.id,
          Math.max(0, Math.min(1, g.startX! + dx / (w * view.scale))),
          Math.max(0, Math.min(1, g.startY! + dy / (h * view.scale))),
        );
    } else setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
  }
  function up() {
    const g = gesture.current;
    if (g?.id && !g.moved && !editing && canEnterPlace(project, g.id))
      onPin?.(g.id);
    gesture.current = null;
  }
  function zoom(factor: number, anchor = { x: 0, y: 0 }) {
    setView((v) => {
      const scale = Math.max(0.5, Math.min(6, v.scale * factor));
      const ratio = scale / v.scale;
      return {
        scale,
        x: anchor.x - (anchor.x - v.x) * ratio,
        y: anchor.y - (anchor.y - v.y) * ratio,
      };
    });
  }
  const inlineControls = (
    <RouteControls
      compact={editing && !!toolbarHost}
      transport={transport}
      setTransport={setTransport}
      routes={routes}
      onChange={onRoutes}
      draft={draft}
      setDraft={changeDraft}
      showPlaceNames={showPlaceNames}
      onShow={expanded ? undefined : editing ? onShowPlaceNames : setLocalShow}
      playback={playback}
      selectedRouteId={selectedRouteId}
      onSelect={setSelectedRouteId}
    />
  );
  return (
    <div
      data-map-node={nodeId}
      data-playback-step={playback.step}
      data-playback-progress={playback.progress}
      data-playback-paused={playback.paused || undefined}
      className={
        "map-canvas" +
        (expanded ? " expanded-map-editor" : "") +
        (draft ? " drawing-route" : "")
      }
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? `${n.name} · 地图编辑` : undefined}
      tabIndex={editing || expanded ? -1 : undefined}
      onKeyDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('.route-sort-handle[aria-pressed="true"]') &&
          ["Delete", "Backspace", "Escape"].includes(e.key)
        )
          return;
        if (
          editing &&
          selectedRouteId &&
          !draft &&
          (e.key === "Delete" || e.key === "Backspace") &&
          !target.closest('input,textarea,select,[contenteditable="true"]')
        ) {
          e.preventDefault();
          e.stopPropagation();
          onRoutes?.(routes.filter((r) => r.id !== selectedRouteId));
          setSelectedRouteId(null);
          gesture.current = null;
          return;
        }
        if (!expanded) {
          if (editing && e.key === "Escape") {
            (document.activeElement as HTMLElement | null)?.blur();
            setSelectedRouteId(null);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          (document.activeElement as HTMLElement | null)?.blur();
          onCloseEditor?.();
        }
        if (e.key === "Tab") {
          const items = Array.from(
            host.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
            ),
          ).filter((el) => el.getClientRects().length);
          const first = items[0],
            last = items[items.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === host.current)
          ) {
            e.preventDefault();
            last?.focus();
          } else if (
            !e.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === host.current)
          ) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
      ref={host}
      onPointerDown={(e) => down(e)}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => (gesture.current = null)}
    >
      <div
        className="map-sheet"
        style={{
          width: w,
          height: h,
          transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
        }}
      >
        <img
          className="map-image"
          src={n.map ? mediaUrl(n.map) : ""}
          onLoad={(e) =>
            setSize({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          draggable={false}
        />
        <RouteLayer
          routes={routes}
          draft={draft}
          w={w}
          h={h}
          step={editing ? routes.length : playback.step}
          progress={editing ? 1 : playback.progress}
          onBendStart={editing ? startBend : undefined}
          selectedRouteId={selectedRouteId}
          onPointStart={startRouteEdit}
          onRouteMoveStart={startRouteEdit}
          scale={view.scale}
        />
        {pins.map((pin) => {
          const place = project.nodes[pin.nodeId];
          if (!place) return null;
          const enterable = canEnterPlace(project, pin.nodeId);
          return (
            <div
              className={
                "map-pin" + (!editing && !enterable ? " static-marker" : "")
              }
              aria-disabled={!editing && !enterable}
              title={
                !editing && !enterable
                  ? `${place.name} · 仅展示封面，暂无可进入内容`
                  : place.name
              }
              data-pin-node={pin.nodeId}
              key={pin.nodeId}
              style={{
                left: `${pin.x * 100}%`,
                top: `${pin.y * 100}%`,
                transform: `translate(-50%,-100%) scale(${1 / view.scale})`,
              }}
              onPointerDown={(e) => {
                if (!editing && !enterable) {
                  e.stopPropagation();
                  return;
                }
                down(e, pin.nodeId);
              }}
            >
              <Stack
                media={cover(project, pin.nodeId)}
                count={available(project, pin.nodeId).length}
                disabled={!editing && !enterable}
              />
              <span
                className={"pin-name" + (!showPlaceNames ? " name-hidden" : "")}
                aria-hidden={!showPlaceNames}
              >
                {place.name}
              </span>
              <i />
              {editing && (
                <button
                  className="pin-delete"
                  title="移除标点"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onDelete?.(pin.nodeId)}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {expanded ? (
        <>
          <header
            className="map-editor-header"
            data-map-tool
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div>
              <Map size={20} />
              <div>
                <strong>{n.name}</strong>
                <small>地图编辑 · 更改自动保存</small>
              </div>
            </div>
            <button className="secondary" onClick={onCloseEditor}>
              <Check size={16} />
              完成编辑 <kbd>Esc</kbd>
            </button>
          </header>
          <aside
            className={
              "map-editor-panel left-panel" + (!leftOpen ? " is-collapsed" : "")
            }
            data-map-tool
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="panel-heading"
              aria-expanded={leftOpen}
              aria-controls="map-places-panel"
              onClick={() => setLeftOpen(!leftOpen)}
            >
              <MapPin size={17} />
              <span>地点与标点</span>
              {leftOpen ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {leftOpen && (
              <div id="map-places-panel" className="panel-body">
                <label className="map-visibility">
                  <input
                    type="checkbox"
                    checked={showPlaceNames}
                    onChange={(e) => onShowPlaceNames?.(e.target.checked)}
                  />
                  显示地点名称
                </label>
                {placeTools}
              </div>
            )}
          </aside>
          <aside
            className={
              "map-editor-panel right-panel" +
              (!rightOpen ? " is-collapsed" : "")
            }
            data-map-tool
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="panel-heading"
              aria-expanded={rightOpen}
              aria-controls="map-routes-panel"
              onClick={() => setRightOpen(!rightOpen)}
            >
              <Layers size={17} />
              <span>路线与动画</span>
              {rightOpen ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
            {rightOpen && (
              <div id="map-routes-panel" className="panel-body">
                <p className="panel-intro">
                  每条路线是一个演示步骤，可调整交通工具、时长和先后顺序。
                </p>
                <RouteControls
                  transport={transport}
                  setTransport={setTransport}
                  routes={routes}
                  onChange={onRoutes}
                  draft={draft}
                  setDraft={changeDraft}
                  showPlaceNames={showPlaceNames}
                  onShow={
                    expanded
                      ? undefined
                      : editing
                        ? onShowPlaceNames
                        : setLocalShow
                  }
                  playback={playback}
                  selectedRouteId={selectedRouteId}
                  onSelect={setSelectedRouteId}
                />
              </div>
            )}
          </aside>
        </>
      ) : (
        <>
          {editing && toolbarHost
            ? createPortal(inlineControls, toolbarHost)
            : inlineControls}
          {editing && (
            <button
              className="map-expand-launch secondary"
              data-map-tool
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onExpand}
            >
              <Expand size={16} />
              放大编辑
            </button>
          )}
        </>
      )}
      <div
        className="map-tools"
        data-map-tool
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button title="放大" onClick={() => zoom(1.25)}>
          <Plus size={18} />
        </button>
        <button title="缩小" onClick={() => zoom(0.8)}>
          <Minus size={18} />
        </button>
        <span className="map-scale">{Math.round(view.scale * 100)}%</span>
        <button
          title="完整显示地图"
          onClick={() => setView({ x: 0, y: 0, scale: 1 })}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <span className="map-hint">
        {draft
          ? "点击添加路线点 · 滚轮缩放 · 完成路线后可拖动平移"
          : "滚轮缩放 · 拖动平移" +
            (editing ? " · 拖动封面定位 · 点击选择路线后拖动编辑" : "")}
      </span>
    </div>
  );
}
export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"media" | "map">("media");
  const [status, setStatus] = useState("本地存储");
  const [busy, setBusy] = useState(false);
  const [transferProgress, setTransferProgress] = useState("");
  const [transfer, setTransfer] = useState<{
    mode: "paths" | "export" | "import";
    project: Project;
    draft?: ImportDraft;
  } | null>(null);
  useEffect(() => api?.onTransferProgress?.(setTransferProgress), []);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [onlyPresentable, setOnlyPresentable] = useState(() => {
    try {
      return localStorage.getItem("travel-atlas.only-presentable") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "travel-atlas.only-presentable",
        String(onlyPresentable),
      );
    } catch {
      /* Filtering still works if local storage is unavailable. */
    }
  }, [onlyPresentable]);
  useEffect(() => {
    if (!project) return;
    const current = project.nodes[selected] || project.nodes[project.rootId];
    const visible = new Set(
      filterPresentationMedia(current.media, onlyPresentable).map((m) => m.id),
    );
    setSelectedMedia((ids) =>
      ids.some((id) => !visible.has(id))
        ? ids.filter((id) => visible.has(id))
        : ids,
    );
  }, [project, selected, onlyPresentable]);
  function changePresentationFilter(value: boolean) {
    setOnlyPresentable(value);
    setSelectedMedia([]);
  }
  const [modal, setModal] = useState<{
    title: string;
    value: string;
    submit: (value: string) => void;
  } | null>(null);
  const [coverPicker, setCoverPicker] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapToolbar, setMapToolbar] = useState<HTMLDivElement | null>(null);
  const [present, setPresent] = useState(false);
  const [preview, setPreview] = useState<Media | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [path, setPath] = useState("");
  const views = useRef<Record<string, View>>({});
  const latest = useRef(project);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  latest.current = project;
  useEffect(() => {
    setMapExpanded(false);
    setSelectedMedia([]);
    setSelectionMode(false);
    setPreview(null);
    setCoverPicker(false);
  }, [selected, project?.id]);
  async function save(p: Project) {
    if (!api) return;
    try {
      setStatus("正在保存…");
      const file = await api.save(p);
      setPath(file);
      setStatus("所有更改已保存");
    } catch (e) {
      setStatus("保存失败");
      setNotice(String(e));
      throw e;
    }
  }
  async function flush() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (latest.current) await save(latest.current);
  }
  useEffect(() => {
    if (!project) return;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save(project).catch(() => {});
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project]);
  useEffect(() => {
    const clear = api?.onOpen((data) => {
      generation.current++;
      setProject(data.project);
      setMapExpanded(false);
      setSelected(data.project.rootId);
      setPath(data.path);
      setPresent(false);
      views.current = {};
    });
    const desktop = api as typeof api & { onFlush?: (fn: () => void) => void };
    desktop?.onFlush?.(() => {
      void flush().catch(() => {});
    });
    return clear;
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (transfer) return;
        void flush().catch(() => {});
      }
      if (
        e.key.toLowerCase() === "a" &&
        !e.defaultPrevented &&
        !e.repeat &&
        !e.isComposing &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey &&
        project &&
        tab === "media" &&
        !present &&
        !preview &&
        !modal &&
        !transfer &&
        !coverPicker &&
        !mapExpanded &&
        !busy &&
        !(
          e.target instanceof Element &&
          e.target.closest(
            'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
          )
        ) &&
        !document.querySelector(".media-drag-preview")
      ) {
        e.preventDefault();
        setSelectionMode(true);
      }
      if (e.key === "Escape" && !e.defaultPrevented) {
        if (transfer) return;
        // Let the drag sensor cancel a drag before exiting selection mode.
        if (document.querySelector(".media-drag-preview")) return;
        if (preview) setPreview(null);
        else if (selectionMode) {
          setSelectionMode(false);
          setSelectedMedia([]);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  function update(fn: (p: Project) => void) {
    setProject((p) => {
      if (!p) return p;
      const next = structuredClone(p);
      fn(next);
      return next;
    });
  }
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function newProject() {
    await work(async () => {
      if (project) await flush();
      const file = api ? await api.newProject() : "浏览器预览（不保存）";
      if (!file) return;
      generation.current++;
      const p = createProject("未命名的旅行");
      setProject(p);
      setSelected(p.rootId);
      setPath(file);
      views.current = {};
    });
  }
  async function openProject() {
    await work(async () => {
      if (project) await flush();
      const data = await api?.open();
      if (data) {
        generation.current++;
        setProject(data.project);
        setMapExpanded(false);
        setSelected(data.project.rootId);
        setPath(data.path);
        views.current = {};
      }
    });
  }
  function adoptImported(data: { project: Project; path: string }) {
    generation.current++;
    latest.current = data.project;
    setProject(data.project);
    setSelected(data.project.rootId);
    setPath(data.path);
    setTab("media");
    setPreview(null);
    setPresent(false);
    setMapExpanded(false);
    setTransfer(null);
    views.current = {};
    setNotice("项目已导入，原项目保持不变");
  }
  async function importProject() {
    if (!api) return;
    setTransferProgress("正在准备导入项目…");
    await work(async () => {
      if (project) await flush();
      const draft = await api.prepareProjectImport();
      if (draft) setTransfer({ mode: "import", project: draft.project, draft });
    });
  }
  async function configureProject(mode: "paths" | "export") {
    if (!project || !api) return;
    await work(async () => {
      await flush();
      setTransfer({ mode, project: structuredClone(project) });
    });
  }
  async function importFiles(paths?: string[]) {
    if (!project || !api) return;
    const target = selected,
      p = project,
      gen = generation.current;
    await work(async () => {
      const files = paths || (await api.pick());
      if (!files.length) return;
      const result = await api.import(files, p);
      if (gen !== generation.current) return;
      update((next) => {
        if (next.nodes[target]) next.nodes[target].media.push(...result.items);
      });
      setNotice(
        `已导入 ${result.items.length} 份素材${result.duplicates ? `，跳过 ${result.duplicates} 个重复文件` : ""}${result.unsupported ? `，${result.unsupported} 个文件不支持或无法读取` : ""}`,
      );
    });
  }
  function rename() {
    if (!project) return;
    const n = project.nodes[selected];
    setModal({
      title: "重命名地点",
      value: n.name,
      submit: (value) =>
        update((p) => {
          p.nodes[selected].name = value;
          if (selected === p.rootId) p.name = value;
        }),
    });
  }
  function addPlace() {
    setModal({
      title: "添加子地点",
      value: "",
      submit: (name) =>
        update((p) => {
          const id = uid();
          p.nodes[id] = {
            id,
            name,
            parentId: selected,
            children: [],
            media: [],
            map: null,
            pins: [],
          };
          p.nodes[selected].children.push(id);
        }),
    });
  }
  function deleteMedia(ids: string[]) {
    update((p) => removeMediaBatch(p, selected, ids));
    setSelectedMedia((current) => current.filter((id) => !ids.includes(id)));
    if (preview && ids.includes(preview.id)) setPreview(null);
    setNotice("已移除 " + ids.length + " 份素材引用，原文件保留");
  }
  function participation(ids: string[], value: boolean) {
    update((p) => {
      for (const m of p.nodes[selected].media)
        if (ids.includes(m.id)) m.includeInPresentation = value;
    });
  }
  function tree(id: string, depth = 0): React.ReactNode {
    const n = project!.nodes[id];
    if (
      query &&
      !n.name.includes(query) &&
      !descendants(project!, id).some((c) =>
        project!.nodes[c].name.includes(query),
      )
    )
      return null;
    const collapsed = !!n.collapsed && !query;
    return (
      <div key={id}>
        <TreeRow
          place={n}
          depth={depth}
          root={id === project!.rootId}
          active={selected === id}
          count={flatten(project!, id).length}
          collapsed={collapsed}
          onSelect={() => {
            setSelected(id);
          }}
          onToggle={() =>
            update((p) => {
              p.nodes[id].collapsed = !p.nodes[id].collapsed;
            })
          }
          onHoverExpand={() =>
            update((p) => {
              p.nodes[id].collapsed = false;
            })
          }
        />
        {!collapsed && n.children.map((c) => tree(c, depth + 1))}
      </div>
    );
  }
  const transferDialog = transfer && (
    <ProjectTransferDialog
      mode={transfer.mode}
      project={transfer.project}
      draft={transfer.draft}
      onClose={() => setTransfer(null)}
      onApply={async (next) => {
        latest.current = next;
        setProject(next);
        await save(next);
        setNotice("文件路径已更新");
      }}
      onImported={adoptImported}
      onExported={(file) => {
        setTransfer(null);
        setNotice(`项目已导出：${file}`);
      }}
    />
  );
  if (!project)
    return (
      <div className="welcome">
        <div className="welcome-orbit o1" />
        <div className="welcome-orbit o2" />
        <div className="welcome-brand">
          <Compass size={30} />
          <span>
            旅行图志 <small>TRAVEL ATLAS</small>
          </span>
        </div>
        <div className="welcome-content">
          <span className="eyebrow">YOUR JOURNEYS, BEAUTIFULLY TOLD</span>
          <h1>
            让每一段旅行，
            <br />
            都有迹可循。
          </h1>
          <p>
            整理沿途的影像，在地图上重走旅程。
            <br />
            用你自己的节奏，讲述所见所闻。
          </p>
          <div className="welcome-actions">
            <button className="primary" disabled={busy} onClick={newProject}>
              <Plus size={18} />
              新建旅行项目
            </button>
            <button
              className="secondary"
              disabled={busy || !api}
              onClick={openProject}
            >
              <FolderOpen size={18} />
              打开项目
            </button>
            <button
              className="secondary"
              disabled={busy || !api}
              onClick={importProject}
            >
              <Upload size={18} />
              导入项目
            </button>
          </div>
          <div className="local-note">
            <Check size={14} />
            本地保存 · 原文件保持原位 · 离线演示
          </div>
          {!api && (
            <p className="browser-note">
              当前是界面预览。请使用桌面应用导入和保存本地素材。
            </p>
          )}
        </div>
        <div className="welcome-card">
          <MapPin size={28} />
          <span>下一站，值得被记录。</span>
          <small>从一张地图开始你的故事</small>
        </div>
        {notice && <div className="toast">{notice}</div>}
        {busy && (
          <div className="busy-indicator">
            <span />
            {transferProgress || "正在处理本地文件…"}
          </div>
        )}
        {transferDialog}
      </div>
    );
  const node = project.nodes[selected] || project.nodes[project.rootId];
  const placeTools = (
    <MapPlaceTools
      key={node.id}
      project={project}
      nodeId={node.id}
      onAdd={(id) =>
        update((p) => {
          p.nodes[node.id].pins.push({ nodeId: id, x: 0.5, y: 0.5 });
        })
      }
      onDelete={(id) =>
        update((p) => {
          p.nodes[node.id].pins = p.nodes[node.id].pins.filter(
            (pin) => pin.nodeId !== id,
          );
        })
      }
    />
  );
  const coverSettings = (
    <section className="cover-section">
      <div>
        <h3>地点封面</h3>
        <p>用于上级地图标点 · 默认取整个地点子树的第一份可用素材</p>
      </div>
      <div className="cover-choice">
        <Thumb media={cover(project, node.id)} />
        <button
          className="secondary"
          disabled={!flatten(project, node.id).some((m) => !m.missing)}
          onClick={() => setCoverPicker(true)}
        >
          选择封面
        </button>
        <button
          className="secondary"
          disabled={busy || !api}
          onClick={() =>
            work(async () => {
              const placeId = node.id,
                gen = generation.current;
              const asset = await api!.cover();
              if (asset && gen === generation.current)
                update((p) => {
                  if (p.nodes[placeId]) setCover(p, placeId, asset);
                });
            })
          }
        >
          <Upload size={14} />
          导入独立封面
        </button>
        {(node.coverAsset || node.coverId) && (
          <button
            className="text-button"
            onClick={() =>
              update((p) => {
                delete p.nodes[node.id].coverId;
                delete p.nodes[node.id].coverAsset;
              })
            }
          >
            恢复默认
          </button>
        )}
      </div>
    </section>
  );
  const visibleMedia = filterPresentationMedia(node.media, onlyPresentable);
  const presentationCount = filterPresentationMedia(node.media, true).length;
  const visibleIds = new Set(visibleMedia.map((m) => m.id));
  const visibleSelectedMedia = selectedMedia.filter((id) => visibleIds.has(id));
  const detailIndex = visibleMedia.findIndex(
    (media) => media.id === preview?.id,
  );
  const children = node.children;
  const all = flatten(project, node.id);
  const totalPresentationCount = filterPresentationMedia(all, true).length;
  const detail = preview
    ? Object.values(project.nodes)
        .flatMap((n) => n.media)
        .find((m) => m.id === preview.id)
    : undefined;
  const detailOwner = detail
    ? Object.values(project.nodes).find((n) =>
        n.media.some((m) => m.id === detail.id),
      )
    : undefined;
  const crumb: Place[] = [];
  let cursor: Place | undefined = node;
  while (cursor) {
    crumb.unshift(cursor);
    cursor = cursor.parentId ? project.nodes[cursor.parentId] : undefined;
  }
  return (
    <MediaDragProvider
      key={project.id}
      scopeId={`${node.id}:${onlyPresentable ? "presentable" : "all"}`}
      items={visibleMedia}
      selectedIds={visibleSelectedMedia}
      selectionMode={selectionMode}
      onMove={(ids, target) => {
        if (target === node.id) return;
        update((p) => moveMediaBatch(p, node.id, ids, target));
        setSelectedMedia([]);
        setNotice("已移动 " + ids.length + " 份素材");
      }}
      onDelete={deleteMedia}
      onSort={(ids, target, after) =>
        update((p) => {
          p.nodes[node.id].media = reorderMedia(
            p.nodes[node.id].media,
            ids,
            target,
            after,
          );
        })
      }
    >
      <div
        className="app-shell"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            if (!busy && !transfer)
              void importFiles(api?.dropped(Array.from(e.dataTransfer.files)));
          }
        }}
      >
        <aside className="sidebar">
          <div className="brand">
            <Compass size={27} />
            <div>
              旅行图志<small>TRAVEL ATLAS</small>
            </div>
          </div>
          <div className="project-switch">
            <div className="project-icon">
              <Map size={20} />
            </div>
            <div>
              <strong>{project.name}</strong>
              <small>旅行项目</small>
            </div>
            <button title="打开项目" disabled={busy} onClick={openProject}>
              <FolderOpen size={16} />
            </button>
          </div>
          <div className="side-label">
            地点目录
            <button title="添加子地点" disabled={busy} onClick={addPlace}>
              <Plus size={16} />
            </button>
          </div>
          <label className="search">
            <Search size={14} />
            <input
              placeholder="搜索地点"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <nav>{tree(project.rootId)}</nav>
          <DragTrash />
          <div className="sidebar-bottom">
            <button disabled={busy || !api} onClick={importProject}>
              <Upload size={16} />
              导入项目
            </button>
            <button
              disabled={busy || !api}
              onClick={() => void configureProject("export")}
            >
              <Download size={16} />
              导出项目
            </button>
            <button
              disabled={busy || !api}
              onClick={() => void configureProject("paths")}
            >
              <FolderOpen size={16} />
              配置文件路径
            </button>
            <button disabled={busy} onClick={newProject}>
              <Plus size={16} />
              新建旅行
            </button>
            <button
              disabled={busy || !api}
              onClick={() =>
                work(async () => {
                  setProject(await api!.check(project));
                  setNotice("文件状态已更新");
                })
              }
            >
              <Link size={16} />
              检查文件路径
            </button>
            <div className="storage-note">
              <span />
              仅在本机保存
            </div>
          </div>
        </aside>
        <main>
          <header className="topbar">
            <div className="breadcrumbs">
              {crumb.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && <ChevronRight size={13} />}
                  <button onClick={() => setSelected(c.id)}>{c.name}</button>
                </span>
              ))}
            </div>
            <div className="top-actions">
              <span
                className={
                  "save-status " + (status === "保存失败" ? "error" : "")
                }
              >
                <span />
                {status}
              </span>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  work(async () => {
                    await flush();
                    if (api) {
                      const checked = await api.check(project);
                      setProject(checked);
                      await save(checked);
                    }
                    setPresent(true);
                    await api?.fullscreen(true);
                  })
                }
              >
                <Play size={15} fill="currentColor" />
                开始演示
              </button>
            </div>
          </header>
          <div className="workspace" key={node.id}>
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR TRAVEL COLLECTION</span>
                <h1 onDoubleClick={rename}>
                  {node.name}
                  <button
                    className="heading-menu"
                    title="重命名"
                    onClick={rename}
                  >
                    <MoreHorizontal size={22} />
                  </button>
                </h1>
                <p>
                  {children.length} 个子地点<span>·</span>
                  {node.media.length} 份直属素材<span>·</span>共 {all.length}{" "}
                  份旅行记忆（{totalPresentationCount} 份参加演示）
                </p>
              </div>
              <button className="secondary" disabled={busy} onClick={addPlace}>
                <Plus size={16} />
                添加子地点
              </button>
            </div>
            <div className="tabs">
              <button
                className={tab === "media" ? "selected" : ""}
                onClick={() => setTab("media")}
              >
                <Layers size={16} />
                素材与地点 <small>{node.media.length}</small>
              </button>
              <button
                className={tab === "map" ? "selected" : ""}
                onClick={() => setTab("map")}
              >
                <Map size={16} />
                地图与标点{node.map && <i />}
              </button>
            </div>
            {tab === "media" ? (
              <>
                <div className="media-filter-toolbar">
                  <label className="presentation-filter">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="仅显示参加演示"
                      checked={onlyPresentable}
                      onChange={(event) =>
                        changePresentationFilter(event.target.checked)
                      }
                    />
                    <span>仅显示参加演示</span>
                  </label>
                  <small>
                    所有层级生效 · 参加演示 {presentationCount} 份 · 显示{" "}
                    {visibleMedia.length} / {node.media.length} 份直属素材
                  </small>
                </div>
                <section className="section">
                  <div className="section-heading">
                    <div>
                      <h2>直属素材</h2>
                      <p>先展示这里的素材，再按顺序展开子地点</p>
                    </div>
                    <div className="actions">
                      <button
                        className={
                          "secondary selection-toggle " +
                          (selectionMode ? "enabled" : "")
                        }
                        role="switch"
                        aria-label="选择"
                        aria-checked={selectionMode}
                        aria-keyshortcuts={selectionMode ? "Escape" : "A"}
                        title={
                          selectionMode ? "退出选择（Esc）" : "开启选择（A）"
                        }
                        onClick={() => {
                          setSelectionMode(!selectionMode);
                          setSelectedMedia([]);
                        }}
                      >
                        <Check size={15} />
                        {selectionMode ? "退出选择" : "选择"}
                      </button>
                      <button
                        className="text-button"
                        disabled={busy || !node.media.length}
                        onClick={() =>
                          update((p) => {
                            p.nodes[node.id].media.sort(
                              (a, b) =>
                                a.time - b.time || a.name.localeCompare(b.name),
                            );
                          })
                        }
                      >
                        按拍摄时间排序
                      </button>
                      <button
                        className="secondary"
                        disabled={busy || !api}
                        onClick={() =>
                          work(async () => {
                            const files = await api!.pick(true);
                            if (files.length) {
                              setBusy(false);
                              await importFiles(files);
                            }
                          })
                        }
                      >
                        <FolderOpen size={15} />
                        导入文件夹
                      </button>
                      <button
                        className="primary"
                        disabled={busy || !api}
                        onClick={() => importFiles()}
                      >
                        <Upload size={15} />
                        {busy ? "正在处理…" : "导入素材"}
                      </button>
                    </div>
                  </div>
                  {selectionMode && (
                    <SelectionBar
                      items={visibleMedia}
                      ids={visibleSelectedMedia}
                      onSelect={setSelectedMedia}
                      onDelete={() => deleteMedia(visibleSelectedMedia)}
                      onParticipation={(value) =>
                        participation(visibleSelectedMedia, value)
                      }
                    />
                  )}
                  {visibleMedia.length ? (
                    <MediaBoard
                      node={node}
                      items={visibleMedia}
                      selectedIds={visibleSelectedMedia}
                      selectionMode={selectionMode}
                      onClick={(m) => {
                        if (selectionMode)
                          setSelectedMedia((current) =>
                            current.includes(m.id)
                              ? current.filter((id) => id !== m.id)
                              : [...current, m.id],
                          );
                        else setPreview(m);
                      }}
                    />
                  ) : onlyPresentable && node.media.length > 0 ? (
                    <div className="filter-empty">
                      <Layers size={26} />
                      <h3>当前没有可参加演示的素材</h3>
                      <p>已隐藏不参加演示或文件缺失的素材。</p>
                      <button
                        className="secondary"
                        onClick={() => changePresentationFilter(false)}
                      >
                        显示全部素材
                      </button>
                    </div>
                  ) : (
                    <div className="import-empty">
                      <div className="empty-icon">
                        <Image size={27} />
                      </div>
                      <h3>把沿途的风景，放在这里</h3>
                      <p>拖入图片、视频或整个文件夹，也可以多选导入</p>
                      <small>只记录文件路径，不复制或移动原文件</small>
                      <button
                        className="secondary"
                        disabled={busy || !api}
                        onClick={() => importFiles()}
                      >
                        <Plus size={15} />
                        选择素材
                      </button>
                    </div>
                  )}
                </section>
                <section className="section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        子地点 <span>{children.length}</span>
                      </h2>
                      <p>拖动调整顺序，也决定连续预览时的播放顺序</p>
                    </div>
                    <button className="text-button" onClick={addPlace}>
                      <Plus size={15} />
                      添加地点
                    </button>
                  </div>
                  {children.length ? (
                    <SortArea
                      ids={children}
                      onSort={(a, b) =>
                        update((p) => {
                          p.nodes[node.id].children = arrayMove(
                            p.nodes[node.id].children,
                            a,
                            b,
                          );
                        })
                      }
                    >
                      <div className="place-grid">
                        {children.map((id) => (
                          <Sortable key={id} id={id}>
                            {(handle) => (
                              <article className="place-card">
                                <button
                                  className="place-image"
                                  onClick={() => setSelected(id)}
                                >
                                  <Thumb media={cover(project, id)} />
                                  <span className="place-type">
                                    {hasMap(project, id) ? (
                                      <Map size={14} />
                                    ) : (
                                      <Image size={14} />
                                    )}
                                  </span>
                                </button>
                                <div className="place-caption">
                                  {handle}
                                  <button onClick={() => setSelected(id)}>
                                    <strong>{project.nodes[id].name}</strong>
                                    <small>
                                      {
                                        filterPresentationMedia(
                                          flatten(project, id),
                                          onlyPresentable,
                                        ).length
                                      }{" "}
                                      份素材 ·{" "}
                                      {project.nodes[id].children.length}{" "}
                                      个子地点
                                    </small>
                                  </button>
                                  <ChevronRight size={15} />
                                </div>
                              </article>
                            )}
                          </Sortable>
                        ))}
                      </div>
                    </SortArea>
                  ) : (
                    <button className="add-place-empty" onClick={addPlace}>
                      <Plus size={22} />
                      <span>
                        添加下一站
                        <small>国家、城市、景点，或任何你想记录的地方</small>
                      </span>
                    </button>
                  )}
                </section>
              </>
            ) : (
              <section className="section map-section">
                <div className="section-heading">
                  <div>
                    <h2>地点地图</h2>
                    <p>添加后代地点标点，拖动封面调整位置</p>
                  </div>
                  <div className="actions">
                    {node.map && (
                      <button
                        className="text-button danger"
                        onClick={() =>
                          update((p) => {
                            p.nodes[node.id].map = null;
                          })
                        }
                      >
                        移除地图
                      </button>
                    )}
                    <button
                      className="secondary"
                      disabled={busy || !api}
                      onClick={() =>
                        work(async () => {
                          const m = await api!.map();
                          if (m)
                            update((p) => {
                              p.nodes[node.id].map = m;
                            });
                        })
                      }
                    >
                      <Upload size={15} />
                      {node.map ? "更换地图" : "上传地图"}
                    </button>
                  </div>
                </div>
                <div className="map-settings-top">{coverSettings}</div>
                {hasMap(project, node.id) ? (
                  <>
                    {!mapExpanded && (
                      <div className="map-pin-settings">{placeTools}</div>
                    )}
                    {!mapExpanded && (
                      <div className="map-inline-tools" ref={setMapToolbar} />
                    )}
                    <div className="map-editor">
                      <MapCanvas
                        key={`${project.id}:${generation.current}:${node.id}:${node.map!.id}`}
                        project={project}
                        nodeId={node.id}
                        editing
                        expanded={mapExpanded}
                        onExpand={() => setMapExpanded(true)}
                        onCloseEditor={() => setMapExpanded(false)}
                        placeTools={placeTools}
                        toolbarHost={mapToolbar}
                        onRoutes={(routes) =>
                          update((p) => {
                            p.nodes[node.id].routes = routes;
                          })
                        }
                        onShowPlaceNames={(show) =>
                          update((p) => {
                            p.nodes[node.id].showPlaceNames = show;
                            delete p.nodes[node.id].showPlaces;
                          })
                        }
                        views={views}
                        onMove={(id, x, y) =>
                          update((p) => {
                            const pin = p.nodes[node.id].pins.find(
                              (v) => v.nodeId === id,
                            )!;
                            pin.x = x;
                            pin.y = y;
                          })
                        }
                        onDelete={(id) =>
                          update((p) => {
                            p.nodes[node.id].pins = p.nodes[
                              node.id
                            ].pins.filter((v) => v.nodeId !== id);
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="import-empty">
                    <div className="empty-icon">
                      <Map size={30} />
                    </div>
                    <h3>
                      {node.map?.missing
                        ? "地图文件已失效"
                        : "用一张地图，串起沿途故事"}
                    </h3>
                    <p>
                      {node.map?.missing
                        ? "重新选择地图文件即可恢复展示"
                        : "上传任意地图图片，然后把地点放到地图上"}
                    </p>
                    <small>没有地图时，将连续展示当前地点及全部后代素材</small>
                  </div>
                )}
              </section>
            )}
            {tab === "media" && coverSettings}
            {node.id !== project.rootId && (
              <button
                className="delete-place text-button danger"
                onClick={() =>
                  setModal({
                    title: `删除“${node.name}”及其子地点？输入地点名称确认`,
                    value: "",
                    submit: (value) => {
                      if (value !== node.name) {
                        setNotice("名称不匹配，未删除");
                        return;
                      }
                      const parent = node.parentId!;
                      update((p) => removePlace(p, node.id));
                      setSelected(parent);
                    },
                  })
                }
              >
                <Trash2 size={14} />
                删除此地点及其分类引用
              </button>
            )}
          </div>
          <footer>
            <span>
              <FolderOpen size={12} />
              {path}
            </span>
            <span>原始素材保持原位</span>
          </footer>
        </main>
        {modal && (
          <div className="modal-backdrop">
            <form
              className="dialog"
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.value.trim()) {
                  modal.submit(modal.value.trim());
                  setModal(null);
                }
              }}
            >
              <h2>{modal.title}</h2>
              <input
                autoFocus
                value={modal.value}
                onChange={(e) => setModal({ ...modal, value: e.target.value })}
                placeholder="输入地点名称"
              />
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(null)}
                >
                  取消
                </button>
                <button className="primary" type="submit">
                  确定
                </button>
              </div>
            </form>
          </div>
        )}
        {coverPicker && (
          <div className="modal-backdrop">
            <div className="dialog cover-dialog">
              <div className="section-heading">
                <h2>选择地点封面</h2>
                <button onClick={() => setCoverPicker(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="cover-grid">
                {flatten(project, node.id)
                  .filter((m) => !m.missing)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        update((p) => {
                          setCover(p, node.id, m);
                        });
                        setCoverPicker(false);
                      }}
                    >
                      <Thumb media={m} />
                      <span>{m.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
        {detail && detailOwner && (
          <MediaDetail
            media={detail}
            project={project}
            ownerId={detailOwner.id}
            busy={busy}
            position={detailIndex >= 0 ? detailIndex + 1 : 0}
            total={visibleMedia.length}
            onPrevious={
              detailIndex > 0
                ? () => setPreview(visibleMedia[detailIndex - 1])
                : undefined
            }
            onNext={
              detailIndex >= 0 && detailIndex < visibleMedia.length - 1
                ? () => setPreview(visibleMedia[detailIndex + 1])
                : undefined
            }
            onClose={() => setPreview(null)}
            onDelete={() => deleteMedia([detail.id])}
            onNoteChange={(note) =>
              update((p) => {
                const media = p.nodes[detailOwner.id].media.find(
                  (m) => m.id === detail.id,
                );
                if (media) {
                  if (note) media.note = note;
                  else delete media.note;
                }
              })
            }
            onParticipation={(value) => participation([detail.id], value)}
            onCover={() => {
              update((p) => setCover(p, detailOwner.id, detail));
              setNotice("已设为地点封面");
            }}
            onMove={(target) => {
              update((p) =>
                moveMediaBatch(p, detailOwner.id, [detail.id], target),
              );
              setPreview(null);
              setNotice("素材已移动");
            }}
            onRelink={() =>
              work(async () => {
                const next = await api?.relink(detail, project);
                if (next)
                  update((p) => {
                    const existing = p.nodes[detailOwner.id].media.find(
                      (m) => m.id === detail.id,
                    );
                    if (existing)
                      Object.assign(existing, next, {
                        includeInPresentation: existing.includeInPresentation,
                        note: existing.note,
                      });
                  });
              })
            }
          />
        )}
        {transferDialog}
        {notice && (
          <div className="toast">
            <span>{notice}</span>
            <button title="关闭" onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {busy && (
          <div className="busy-indicator">
            <span />
            正在处理本地文件，请稍候…
          </div>
        )}
        {present && (
          <Presentation
            project={project}
            initial={node.id}
            views={views}
            onExit={() => {
              setPresent(false);
              void api?.fullscreen(false);
            }}
          />
        )}
      </div>
    </MediaDragProvider>
  );
}
function ancestry(p: Project, id: string, root: string) {
  const names = [];
  let n = p.nodes[id];
  while (n && n.id !== root) {
    names.unshift(n.name);
    n = p.nodes[n.parentId!];
  }
  return names.join(" / ");
}
function Presentation({
  project,
  initial,
  onExit,
  views,
}: {
  project: Project;
  initial: string;
  onExit: () => void;
  views: React.MutableRefObject<Record<string, View>>;
}) {
  const [route, setRoute] = useState([initial]);
  const playbackMemory = useRef<RoutePlaybackMemory>({});
  const id = route[route.length - 1],
    n = project.nodes[id],
    map = hasMap(project, id);
  const [mode, setMode] = useState<"map" | "media">(map ? "map" : "media");
  const transitions = usePresentationTransitions(id, mode);
  const albumOrigins = useRef<(AlbumOrigin | null)[]>([]);
  const ownOrigins = useRef<Record<string, AlbumOrigin | null>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [controls, setControls] = useState(true);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = map ? n.media : flatten(project, id);
  const items = base.filter((m) => canPresent(m) && !failed.has(m.id));
  const index = Math.min(positions[id] || 0, Math.max(0, items.length - 1));
  const item = items[index];
  function enter(target: string) {
    video.current?.pause();
    const origin = captureAlbum(
      transitions.stageRef.current?.querySelector(
        `[data-map-node="${window.CSS.escape(id)}"] [data-pin-node="${window.CSS.escape(target)}"] .stack-cover`,
      ),
    );
    albumOrigins.current.push(origin);
    transitions.openFrom(origin);
    setRoute((r) => [...r, target]);
    setMode(hasMap(project, target) ? "map" : "media");
  }
  function back(to = route.length - 2) {
    video.current?.pause();
    if (to < 0) {
      onExit();
      return;
    }
    transitions.closeTo(albumOrigins.current[to] || null);
    albumOrigins.current = albumOrigins.current.slice(0, to);
    setRoute((r) => r.slice(0, to + 1));
    setMode("map");
  }
  function returnToMap() {
    video.current?.pause();
    transitions.closeTo(ownOrigins.current[id] || null);
    setMode("map");
  }
  function openOwnMedia() {
    const origin = captureAlbum(
      transitions.stageRef.current?.querySelector(".corner-stack .stack-cover"),
    );
    ownOrigins.current[id] = origin;
    transitions.openFrom(origin);
    setMode("media");
  }
  function finish() {
    if (map) {
      returnToMap();
    } else back();
  }
  function next() {
    if (index < items.length - 1) {
      video.current?.pause();
      setPositions((v) => ({ ...v, [id]: index + 1 }));
    } else finish();
  }
  function previous() {
    if (index > 0) {
      video.current?.pause();
      setPositions((v) => ({ ...v, [id]: index - 1 }));
    }
  }
  function wake() {
    setControls(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setControls(false), 2500);
  }
  useEffect(() => {
    wake();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
      if (
        mode === "media" &&
        !(e.target as HTMLElement)?.closest(
          'input,select,textarea,[contenteditable="true"]',
        )
      ) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          previous();
        }
        if (
          e.code === "Space" &&
          item?.type === "video" &&
          !(e.target as HTMLElement)?.closest("[data-media-tool] button")
        ) {
          e.preventDefault();
          const v = video.current;
          if (v) v.paused ? void v.play().catch(() => {}) : v.pause();
        }
      }
      wake();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function fail() {
    if (item) setFailed((s) => new Set([...s, item.id]));
  }
  const own = n.media.filter((m) => canPresent(m) && !failed.has(m.id));
  return (
    <div
      className={"presentation " + (controls ? "controls-visible" : "")}
      onMouseMove={wake}
      onPointerDown={wake}
    >
      <header className="presentation-header">
        <div className="presentation-crumb">
          {route.map((r, i) => (
            <span key={r}>
              {i > 0 && <ChevronRight size={14} />}
              <button
                onClick={() => {
                  if (i < route.length - 1) back(i);
                  else if (map && mode === "media") returnToMap();
                }}
              >
                {project.nodes[r].name}
              </button>
            </span>
          ))}
        </div>
        <button className="exit-presentation" onClick={onExit}>
          <X size={16} />
          退出演示 <kbd>Esc</kbd>
        </button>
      </header>
      <div className="presentation-stage" ref={transitions.stageRef}>
        {map && (
          <div
            className={
              "presentation-map " + (mode === "media" ? "mini-map" : "")
            }
            onClick={() => {
              if (mode === "media") {
                returnToMap();
              }
            }}
          >
            {mode === "media" && (
              <div className="mini-map-shield">
                <Map size={18} />
                <span>返回地图</span>
              </div>
            )}
            <MapCanvas
              key={id}
              project={project}
              nodeId={id}
              views={views}
              playbackMemory={playbackMemory}
              playbackActive={mode === "map"}
              onPin={mode === "map" ? enter : undefined}
            />
          </div>
        )}
        {mode === "media" &&
          (item ? (
            <PresentationMedia
              key={item.id}
              item={item}
              videoRef={video}
              hasMiniMap={map}
              controls={controls}
              onError={fail}
            />
          ) : (
            <div className="slide">
              <div className="slide-empty">
                <FileWarning size={44} />
                <h2>暂无可播放素材</h2>
                <p>素材可能缺失或当前格式不支持预览</p>
                <button className="secondary" onClick={finish}>
                  {map
                    ? "返回地图"
                    : route.length > 1
                      ? "返回上一级地图"
                      : "结束演示"}
                </button>
              </div>
            </div>
          ))}
        {mode === "map" && own.length > 0 && (
          <div className="corner-stack">
            <Stack
              media={
                n.coverAsset && !n.coverAsset.missing
                  ? n.coverAsset
                  : own.find((m) => m.id === n.coverId) || own[0]
              }
              count={own.length}
              label="查看本地点素材"
              onClick={openOwnMedia}
            />
          </div>
        )}
      </div>
      {mode === "media" && items.length > 0 && (
        <div className="slide-controls">
          <button
            className="slide-prev"
            disabled={index === 0}
            onClick={previous}
          >
            <ChevronLeft size={19} />
            上一张
          </button>
          <div className="slide-counter">
            <span>{String(index + 1).padStart(2, "0")}</span> /{" "}
            {String(items.length).padStart(2, "0")}
          </div>
          {index < items.length - 1 ? (
            <button className="slide-next" onClick={next}>
              下一张
              <ChevronRight size={19} />
            </button>
          ) : (
            <button className="slide-next finish" onClick={finish}>
              {map
                ? "返回地图"
                : route.length > 1
                  ? "返回上一级地图"
                  : "结束演示"}
              <ArrowLeft size={17} />
            </button>
          )}
        </div>
      )}
      <div className="presentation-brand">
        <Compass size={16} />
        旅行图志
      </div>
    </div>
  );
}

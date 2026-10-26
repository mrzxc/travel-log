import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Compass,
  Folder,
  GripVertical,
  Image,
  Link,
  MapPin,
  Play,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  type Media,
  type Place,
  type Project,
  flatten,
  pathKey,
} from "./model";
import { Thumb, mediaUrl } from "./MediaVisual";

const DragState = createContext<{
  ids: string[];
  suppressClick: React.MutableRefObject<boolean>;
}>({ ids: [], suppressClick: { current: false } });
const collision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCenter(args);
  const hits = pointerWithin(args);
  const destination = hits.find(
    (h) => String(h.id).startsWith("place:") || h.id === "trash",
  );
  if (destination) return [destination];
  const mediaHits = hits.filter(
    (h) =>
      args.droppableContainers.find((c) => c.id === h.id)?.data.current
        ?.type === "media",
  );
  if (mediaHits.length) return mediaHits;
  if (hits.some((h) => h.id === "media-grid"))
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "media",
      ),
    });
  return [];
};
export function MediaDragProvider({
  scopeId,
  items,
  selectedIds,
  selectionMode,
  onMove,
  onDelete,
  onSort,
  children,
}: {
  scopeId: string;
  items: Media[];
  selectedIds: string[];
  selectionMode: boolean;
  onMove: (ids: string[], target: string) => void;
  onDelete: (ids: string[]) => void;
  onSort: (ids: string[], target: string, after: boolean) => void;
  children: ReactNode;
}) {
  const [dragIds, setDragIds] = useState<string[]>([]);
  const dragScope = useRef(scopeId);
  const suppressClick = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
    setDragIds([]);
    suppressClick.current = false;
  }, [scopeId]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function reset() {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    setDragIds([]);
    releaseTimer.current = setTimeout(() => {
      suppressClick.current = false;
    }, 100);
  }
  function end(event: DragEndEvent) {
    if (dragScope.current !== scopeId) {
      reset();
      return;
    }
    const target = String(event.over?.id || "");
    const ids = dragIds.length ? dragIds : [String(event.active.id)];
    if (target === "trash") onDelete(ids);
    else if (target.startsWith("place:")) onMove(ids, target.slice(6));
    else if (event.over?.data.current?.type === "media") {
      // Match rectSortingStrategy's preview: the active item takes the target's
      // original index, regardless of which half of the card the pointer hits.
      const after =
        items.findIndex((m) => m.id === String(event.active.id)) <
        items.findIndex((m) => m.id === target);
      onSort(ids, target, after);
    }
    reset();
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(event) => {
        dragScope.current = scopeId;
        const id = String(event.active.id);
        suppressClick.current = true;
        setDragIds(
          items
            .filter((m) =>
              selectionMode && selectedIds.includes(id)
                ? selectedIds.includes(m.id)
                : m.id === id,
            )
            .map((m) => m.id),
        );
      }}
      onDragCancel={reset}
      onDragEnd={end}
    >
      <DragState.Provider value={{ ids: dragIds, suppressClick }}>
        {children}
        <DragOverlay dropAnimation={null}>
          {dragIds.length > 0 && (
            <div className="media-drag-preview">
              <Thumb media={items.find((m) => m.id === dragIds[0])} />
              <strong>{dragIds.length} 份素材</strong>
              <small>拖到地点移动 · 拖到垃圾桶移除</small>
            </div>
          )}
        </DragOverlay>
      </DragState.Provider>
    </DndContext>
  );
}
export function TreeRow({
  place,
  depth,
  root,
  active,
  count,
  collapsed,
  onSelect,
  onToggle,
  onHoverExpand,
}: {
  place: Place;
  depth: number;
  root: boolean;
  active: boolean;
  count: number;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onHoverExpand: () => void;
}) {
  const { ids } = useContext(DragState);
  const { setNodeRef, isOver } = useDroppable({
    id: "place:" + place.id,
    data: { type: "place" },
    disabled: !ids.length,
  });
  useEffect(() => {
    if (!isOver || !collapsed || !place.children.length) return;
    const t = setTimeout(onHoverExpand, 650);
    return () => clearTimeout(t);
  }, [isOver, collapsed, place.children.length, onHoverExpand]);
  return (
    <div
      ref={setNodeRef}
      className={"tree-row " + (isOver ? "drop-over" : "")}
      data-place-id={place.id}
      style={{ paddingLeft: 6 + depth * 18 }}
    >
      <button
        className="tree-toggle"
        title={collapsed ? "展开地点" : "折叠地点"}
        aria-label={(collapsed ? "展开" : "折叠") + place.name}
        aria-expanded={!collapsed}
        disabled={!place.children.length}
        onClick={onToggle}
      >
        {place.children.length > 0 && (
          <ChevronRight
            size={13}
            style={{ transform: collapsed ? "" : "rotate(90deg)" }}
          />
        )}
      </button>
      <button
        className={"tree-item " + (active ? "active" : "")}
        onClick={onSelect}
      >
        {root ? (
          <Compass size={17} />
        ) : place.children.length ? (
          <Folder size={16} />
        ) : (
          <MapPin size={15} />
        )}
        <span>{place.name}</span>
        <small>{count}</small>
      </button>
    </div>
  );
}
export function DragTrash() {
  const { ids } = useContext(DragState);
  const { setNodeRef, isOver } = useDroppable({
    id: "trash",
    data: { type: "trash" },
    disabled: !ids.length,
  });
  return ids.length ? (
    <div
      ref={setNodeRef}
      className={"drag-trash " + (isOver ? "drop-over" : "")}
      data-testid="drag-trash"
    >
      <Trash2 size={27} />
      <strong>移除 {ids.length} 份素材</strong>
      <small>松开移除引用，原文件保留</small>
    </div>
  ) : null;
}
function MediaTile({
  item,
  index,
  selected,
  selectionMode,
  isCover,
  onClick,
}: {
  item: Media;
  index: number;
  selected: boolean;
  selectionMode: boolean;
  isCover: boolean;
  onClick: () => void;
}) {
  const { ids, suppressClick } = useContext(DragState);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, data: { type: "media" } });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: ids.includes(item.id) ? 0.35 : 1,
      }}
      className="media-sortable"
      data-media-id={item.id}
    >
      <article
        className={
          "media-card " +
          (selected ? "is-selected " : "") +
          (item.missing ? "missing" : "")
        }
      >
        <button
          className="media-image"
          {...attributes}
          {...listeners}
          onClick={() => {
            if (!suppressClick.current) onClick();
          }}
          aria-label={(selectionMode ? "选择素材 " : "预览素材 ") + item.name}
          aria-pressed={selectionMode ? selected : undefined}
        >
          <Thumb media={item} />
          <span className="media-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          {selectionMode && (
            <span className={"selection-check " + (selected ? "checked" : "")}>
              {selected && <Check size={13} />}
            </span>
          )}
          {item.type === "video" && (
            <span className="type-badge">
              <Play size={11} fill="currentColor" />
              视频
            </span>
          )}
          {isCover && <span className="cover-badge">封面</span>}
          {item.includeInPresentation === false && (
            <span className="excluded-badge">
              <EyeOff size={11} />
              不参加演示
            </span>
          )}
        </button>
        <div className="media-caption">
          <button
            className="drag-handle"
            {...attributes}
            {...listeners}
            title="拖动素材"
            aria-label={"拖动 " + item.name}
          >
            <GripVertical size={15} />
          </button>
          <div>
            <strong title={item.path}>{item.name}</strong>
            <small>
              {item.missing
                ? "文件缺失"
                : new Date(item.time).toLocaleString("zh-CN")}
            </small>
          </div>
        </div>
      </article>
    </div>
  );
}
export function MediaBoard({
  node,
  items = node.media,
  selectedIds,
  selectionMode,
  onClick,
}: {
  node: Place;
  items?: Media[];
  selectedIds: string[];
  selectionMode: boolean;
  onClick: (m: Media) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: "media-grid",
    data: { type: "grid" },
  });
  return (
    <SortableContext
      items={items.map((m) => m.id)}
      strategy={rectSortingStrategy}
    >
      <div ref={setNodeRef} className="media-grid">
        {items.map((m, i) => (
          <MediaTile
            key={m.id}
            item={m}
            index={i}
            selected={selectedIds.includes(m.id)}
            selectionMode={selectionMode}
            isCover={
              node.coverAsset
                ? pathKey(node.coverAsset.path) === pathKey(m.path)
                : node.coverId === m.id
            }
            onClick={() => onClick(m)}
          />
        ))}
      </div>
    </SortableContext>
  );
}
export function SelectionBar({
  items,
  ids,
  onSelect,
  onDelete,
  onParticipation,
}: {
  items: Media[];
  ids: string[];
  onSelect: (ids: string[]) => void;
  onDelete: () => void;
  onParticipation: (value: boolean) => void;
}) {
  return (
    <div className="selection-bar">
      <label>
        <input
          type="checkbox"
          checked={items.length > 0 && ids.length === items.length}
          ref={(el) => {
            if (el)
              el.indeterminate = ids.length > 0 && ids.length < items.length;
          }}
          onChange={(e) =>
            onSelect(e.target.checked ? items.map((m) => m.id) : [])
          }
        />
        全选
      </label>
      <span>
        已选择 <strong>{ids.length}</strong> 份
      </span>
      <div className="actions">
        <button
          className="secondary"
          disabled={!ids.length}
          onClick={() => onParticipation(false)}
        >
          <EyeOff size={14} />
          不参加演示
        </button>
        <button
          className="secondary"
          disabled={!ids.length}
          onClick={() => onParticipation(true)}
        >
          <Eye size={14} />
          恢复参加演示
        </button>
        <button
          className="secondary danger"
          disabled={!ids.length}
          onClick={onDelete}
        >
          <Trash2 size={14} />
          删除
        </button>
      </div>
    </div>
  );
}
export function MediaDetail({
  media,
  project,
  ownerId,
  busy,
  onClose,
  onDelete,
  onCover,
  onMove,
  onParticipation,
  onRelink,
  onNoteChange,
  position,
  total,
  onPrevious,
  onNext,
}: {
  media: Media;
  project: Project;
  ownerId: string;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
  onCover: () => void;
  onMove: (id: string) => void;
  onParticipation: (value: boolean) => void;
  onRelink: () => void;
  onNoteChange: (note: string) => void;
  position: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    dialog.current?.focus();
  }, []);
  useEffect(() => setFailed(false), [media.id, media.path]);
  function placeLabel(id: string) {
    const names = [];
    let n = project.nodes[id];
    while (n) {
      names.unshift(n.name);
      n = project.nodes[n.parentId!];
    }
    return names.join(" / ");
  }
  return (
    <div className="modal-backdrop media-detail-backdrop" onClick={onClose}>
      <section
        className="media-detail"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="素材详情"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (
            busy ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            (event.target as HTMLElement).closest(
              'input,textarea,select,video,[contenteditable="true"]',
            )
          )
            return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            (event.key === "ArrowLeft" ? onPrevious : onNext)?.();
          }
        }}
      >
        <div className="detail-preview">
          {media.missing || failed ? (
            <div className="detail-missing">
              <Image size={46} />
              <h3>{media.missing ? "文件缺失" : "当前格式无法预览"}</h3>
              <p>仍可在右侧管理这份素材</p>
            </div>
          ) : media.type === "video" ? (
            <video
              key={media.id}
              src={mediaUrl(media)}
              controls
              onError={() => setFailed(true)}
            />
          ) : (
            <img
              key={media.id}
              src={mediaUrl(media)}
              onError={() => setFailed(true)}
            />
          )}
          <button
            className="detail-nav detail-nav-previous"
            aria-label="上一个素材"
            title="上一个素材（←）"
            disabled={busy || !onPrevious}
            onClick={onPrevious}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            className="detail-nav detail-nav-next"
            aria-label="下一个素材"
            title="下一个素材（→）"
            disabled={busy || !onNext}
            onClick={onNext}
          >
            <ChevronRight size={26} />
          </button>
          {position > 0 && (
            <span
              className="detail-position"
              aria-label="素材位置"
              aria-live="polite"
            >
              {position} / {total}
            </span>
          )}
        </div>
        <aside className="detail-sidebar">
          <header>
            <h2>素材详情</h2>
            <button onClick={onClose} title="关闭素材详情">
              <X size={19} />
            </button>
          </header>
          <h3>{media.name}</h3>
          <label className="participation-setting">
            <span>
              <Eye size={17} />
              是否参加演示
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="参加演示"
              checked={media.includeInPresentation !== false}
              onChange={(e) => onParticipation(e.target.checked)}
            />
          </label>
          <p className="detail-help">自动保存 · 关闭后保留素材，演示时跳过。</p>
          <dl>
            <dt>所属地点</dt>
            <dd>{placeLabel(ownerId)}</dd>
            <dt>拍摄 / 排序时间</dt>
            <dd>{new Date(media.time).toLocaleString("zh-CN")}</dd>
            <dt>文件位置</dt>
            <dd className="file-path">{media.path}</dd>
          </dl>
          {media.type === "image" && (
            <label className="media-note-editor">
              <span>
                图片备注 <small>自动保存 · 演示时显示</small>
              </span>
              <textarea
                aria-label="图片备注"
                rows={4}
                value={media.note || ""}
                placeholder="记录这张照片的故事…"
                onChange={(event) => onNoteChange(event.target.value)}
              />
            </label>
          )}
          <button
            className="secondary detail-action"
            disabled={busy || !!media.missing}
            onClick={onCover}
          >
            <Image size={15} />
            设为地点封面
          </button>
          <label className="detail-move">
            <span>移动到</span>
            <select
              aria-label="移动到其他地点"
              value=""
              disabled={busy}
              onChange={(e) => onMove(e.target.value)}
            >
              <option value="">选择目标地点…</option>
              {Object.values(project.nodes)
                .filter((n) => n.id !== ownerId)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {placeLabel(n.id)}
                  </option>
                ))}
            </select>
          </label>
          {media.missing && (
            <button
              className="secondary detail-action"
              disabled={busy || !window.desktop}
              onClick={onRelink}
            >
              <Link size={15} />
              重新定位文件
            </button>
          )}
          <div className="detail-delete">
            <button
              className="secondary danger detail-action"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={15} />
              删除素材
            </button>
            <p>只移除项目引用，原始文件保留。</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

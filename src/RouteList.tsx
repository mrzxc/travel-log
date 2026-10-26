import { RouteDurationInput } from "./RouteDurationInput";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { MapRoute, Transport } from "./model";
const transports = {
  plane: "飞机",
  car: "小轿车",
  bus: "大巴",
  train: "高铁",
  jeep: "吉普车",
};
type Props = {
  routes: MapRoute[];
  onChange: (routes: MapRoute[]) => void;
  selectedRouteId?: string | null;
  onSelect: (id: string) => void;
};
function RouteCard({
  route: r,
  index: i,
  routes,
  onChange,
  selectedRouteId,
  onSelect,
}: Props & { route: MapRoute; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: r.id });
  const selected = selectedRouteId === r.id;
  return (
    <div
      ref={setNodeRef}
      data-route-card={r.id}
      className={
        "route-card" +
        (selected ? " is-selected" : "") +
        (isDragging ? " is-dragging" : "")
      }
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      onPointerDownCapture={() => onSelect(r.id)}
      onFocusCapture={() => onSelect(r.id)}
      onClick={() => onSelect(r.id)}
    >
      <div className="route-card-heading">
        <button
          className="route-sort-handle"
          title="拖动排序"
          aria-label={`拖动第${i + 1}步路线排序`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
        <button
          className="route-card-select"
          aria-label={`选择第${i + 1}步路线`}
          aria-pressed={selected}
          onClick={() => onSelect(r.id)}
        >
          第 {i + 1} 步 <span>{selected ? "已选中" : "点击选择"}</span>
        </button>
      </div>
      <select
        aria-label={`第${i + 1}步交通工具`}
        value={r.transport}
        onChange={(e) =>
          onChange(
            routes.map((v) =>
              v.id === r.id
                ? { ...v, transport: e.target.value as Transport }
                : v,
            ),
          )
        }
      >
        {Object.entries(transports).map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
      <RouteDurationInput
        label={`第${i + 1}步时长`}
        value={r.duration}
        onCommit={(duration) =>
          onChange(
            routes.map((route) =>
              route.id === r.id ? { ...route, duration } : route,
            ),
          )
        }
      />
      <span>秒</span>
      <button
        title="上移步骤"
        disabled={i === 0}
        onClick={() => onChange(arrayMove(routes, i, i - 1))}
      >
        ↑
      </button>
      <button
        title="下移步骤"
        disabled={i === routes.length - 1}
        onClick={() => onChange(arrayMove(routes, i, i + 1))}
      >
        ↓
      </button>
      <button
        title="删除路线"
        onClick={() => onChange(routes.filter((v) => v.id !== r.id))}
      >
        ×
      </button>
      {r.controls?.some(Boolean) && (
        <button
          className="route-straighten"
          title="恢复直线"
          onClick={() =>
            onChange(
              routes.map((v) =>
                v.id === r.id ? { ...v, controls: undefined } : v,
              ),
            )
          }
        >
          恢复直线
        </button>
      )}
    </div>
  );
}
export function RouteList(props: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [dragging, setDragging] = useState(false);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[({ transform }) => ({ ...transform, x: 0 })]}
      onDragStart={(event) => {
        setDragging(true);
        props.onSelect(String(event.active.id));
      }}
      onDragCancel={() => setDragging(false)}
      onDragEnd={(event) => {
        setDragging(false);
        const from = props.routes.findIndex((r) => r.id === event.active.id),
          to = props.routes.findIndex((r) => r.id === event.over?.id);
        if (from >= 0 && to >= 0 && from !== to)
          props.onChange(arrayMove(props.routes, from, to));
      }}
    >
      <SortableContext
        items={props.routes.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="route-list"
          aria-label="路线步骤"
          onKeyDownCapture={(event) => {
            if (
              dragging &&
              (event.key === "Delete" || event.key === "Backspace")
            )
              event.stopPropagation();
          }}
        >
          {props.routes.map((r, i) => (
            <RouteCard key={r.id} route={r} index={i} {...props} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

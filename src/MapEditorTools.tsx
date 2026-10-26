import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { descendants, visiblePins, type Project } from "./model";

export function MapPlaceTools({
  project,
  nodeId,
  onAdd,
  onDelete,
}: {
  project: Project;
  nodeId: string;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [target, setTarget] = useState("");
  const node = project.nodes[nodeId];
  const available = descendants(project, nodeId).filter(
    (id) => !node.pins.some((pin) => pin.nodeId === id),
  );
  return (
    <div className="map-place-tools" data-map-tool>
      <div className="pin-toolbar">
        <MapPin size={17} />
        <select
          aria-label="要标记的地点"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">选择要标记的后代地点</option>
          {available.map((id) => {
            const names = [];
            let current: string | null = id;
            while (current && current !== nodeId) {
              names.unshift(project.nodes[current].name);
              current = project.nodes[current].parentId;
            }
            return (
              <option key={id} value={id}>
                {names.join(" / ")}
              </option>
            );
          })}
        </select>
        <button
          className="primary"
          disabled={!available.includes(target)}
          onClick={() => {
            onAdd(target);
            setTarget("");
          }}
        >
          <Plus size={14} />
          添加标点
        </button>
        <small>
          {node.pins.length} 个已配置 · 演示显示{" "}
          {visiblePins(project, nodeId).length} 个
        </small>
      </div>
      <div className="editor-place-list">
        {node.pins.map((pin) => (
          <div key={pin.nodeId}>
            <MapPin size={14} />
            <span>{project.nodes[pin.nodeId]?.name || "未知地点"}</span>
            <button
              title={`移除标点：${project.nodes[pin.nodeId]?.name || "未知地点"}`}
              onClick={() => onDelete(pin.nodeId)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className="help-line">
        拖动地图上的封面调整位置。同一分支在演示时只展示最上层已标记地点。
      </p>
    </div>
  );
}

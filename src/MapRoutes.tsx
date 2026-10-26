import { RouteList } from "./RouteList";
import { routeGeometry, routeFrame, segmentPath } from "./routeGeometry";
import { useMemo } from "react";
import { useRoutePlayback } from "./useRoutePlayback";
export { useRoutePlayback } from "./useRoutePlayback";
import { Plane, Car, Bus, TrainFront } from "lucide-react";
import { uid, type MapRoute, type RoutePoint, type Transport } from "./model";
export const transports = {
  plane: "飞机",
  car: "小轿车",
  bus: "大巴",
  train: "高铁",
  jeep: "吉普车",
};
function Jeep({ size = 23 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 16V9h4l2-5h8l3 6v6M7 9h13M10 4v5M15 4v5M3 13h17M20 12h2v6h-2M7 16h9" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="M4 6h2" />
    </svg>
  );
}
const icons = {
  plane: Plane,
  car: Car,
  bus: Bus,
  train: TrainFront,
  jeep: Jeep,
};
export function routePosition(
  points: RoutePoint[],
  progress: number,
  w: number,
  h: number,
  controls?: MapRoute["controls"],
) {
  const frame = routeFrame(routeGeometry(points, w, h, controls), progress);
  return { ...frame, before: points.slice(0, frame.segment + 1) };
}
export function RouteLayer({
  routes,
  draft,
  w,
  h,
  step,
  progress,
  onBendStart,
  onPointStart,
  onRouteMoveStart,
  selectedRouteId,
  scale = 1,
}: {
  routes: MapRoute[];
  draft: RoutePoint[] | null;
  w: number;
  h: number;
  step: number;
  progress: number;
  scale?: number;
  selectedRouteId?: string | null;
  onPointStart?: (
    event: React.PointerEvent<SVGCircleElement>,
    routeId: string,
    index: number,
  ) => void;
  onRouteMoveStart?: (
    event: React.PointerEvent<SVGGElement>,
    routeId: string,
  ) => void;
  onBendStart?: (
    event: React.PointerEvent<SVGPathElement>,
    routeId: string,
    segment: number,
  ) => void;
}) {
  const geometries = useMemo(
    () => routes.map((r) => routeGeometry(r.points, w, h, r.controls)),
    [routes, w, h],
  );
  const displayRoutes = routes.map((r, i) => ({ r, i }));
  if (onBendStart)
    displayRoutes.sort(
      (a, b) =>
        Number(a.r.id === selectedRouteId) - Number(b.r.id === selectedRouteId),
    );
  return (
    <svg
      className={
        "route-layer" +
        (selectedRouteId && onBendStart ? " has-selected-route" : "")
      }
      width={w}
      height={h}
    >
      {displayRoutes.map(({ r, i }) => {
        if (i >= step || r.points.length < 2) return null;
        const geometry = geometries[i],
          p = routeFrame(geometry, i === step - 1 ? progress : 1),
          Icon = icons[r.transport] || Car;
        const selected = !!onBendStart && selectedRouteId === r.id;
        const middle = routeFrame(geometry, 0.5);
        return (
          <g
            key={r.id}
            data-route={r.id}
            data-route-selected={selected || undefined}
            className={selected ? "route-selected" : undefined}
          >
            <path
              data-route-line
              d={p.path}
              fill="none"
              stroke="#e56c31"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              data-route-arrow
              d="M -13 -7 L 0 0 L -13 7"
              fill="none"
              stroke="#e56c31"
              strokeWidth="4"
              transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}
            />
            <foreignObject x={p.x - 16} y={p.y - 42} width="32" height="32">
              <div className="transport-icon" title={transports[r.transport]}>
                <Icon size={23} />
              </div>
            </foreignObject>
            {onBendStart &&
              !draft &&
              geometry.map((segment, index) => {
                const mid = routeFrame([segment], 0.5);
                return (
                  <g key={index} className="route-segment-editor">
                    <path
                      className="route-bend-hit"
                      data-route-segment={index}
                      d={`M ${segment.start.x} ${segment.start.y} ${segmentPath(segment)}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      vectorEffect="non-scaling-stroke"
                      onPointerDown={(event) => onBendStart(event, r.id, index)}
                    >
                      <title>
                        {selected
                          ? "拖动调整这段路线的弧度"
                          : "点击选中路线，选中后可拖动编辑"}
                      </title>
                    </path>
                    {selected && (
                      <circle
                        className="route-bend-point"
                        cx={mid.x}
                        cy={mid.y}
                        r={4 / scale}
                        fill="#fffdf2"
                        stroke="#d46c35"
                        strokeWidth={1.5 / scale}
                      />
                    )}
                  </g>
                );
              })}
            {selected && !draft && (
              <g className="route-selection-handles">
                {r.points.map((point, index) => (
                  <g key={index}>
                    <circle
                      className="route-point-handle"
                      data-route-point={index}
                      cx={point.x * w}
                      cy={point.y * h}
                      r={7 / scale}
                      strokeWidth={2 / scale}
                      onPointerDown={(event) =>
                        onPointStart?.(event, r.id, index)
                      }
                    >
                      <title>
                        {index === 0
                          ? "起点"
                          : index === r.points.length - 1
                            ? "终点"
                            : "途经点"}
                        ：拖动调整位置
                      </title>
                    </circle>
                    <text
                      className="route-point-label"
                      x={point.x * w}
                      y={point.y * h + 19 / scale}
                      fontSize={10 / scale}
                      strokeWidth={3 / scale}
                      textAnchor="middle"
                    >
                      {index === 0
                        ? "起点"
                        : index === r.points.length - 1
                          ? "终点"
                          : "途经点"}
                    </text>
                  </g>
                ))}
                <line
                  x1={middle.x}
                  y1={middle.y}
                  x2={middle.x}
                  y2={middle.y - 30 / scale}
                  stroke="#bd6c40"
                  strokeWidth={1 / scale}
                  strokeDasharray={`${3 / scale} ${3 / scale}`}
                />
                <g
                  className="route-move-handle"
                  data-route-move
                  transform={`translate(${middle.x} ${middle.y - 30 / scale}) scale(${1 / scale})`}
                  onPointerDown={(event) => onRouteMoveStart?.(event, r.id)}
                >
                  <title>拖动平移整条路线</title>
                  <circle
                    r="13"
                    fill="#b95529"
                    stroke="#fffdf5"
                    strokeWidth="2"
                  />
                  <path
                    d="M -7 0 H 7 M 0 -7 V 7 M -4 -3 L -7 0 L -4 3 M 4 -3 L 7 0 L 4 3 M -3 -4 L 0 -7 L 3 -4 M -3 4 L 0 7 L 3 4"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            )}
          </g>
        );
      })}
      {draft && (
        <>
          <polyline
            points={draft.map((p) => `${p.x * w},${p.y * h}`).join(" ")}
            fill="none"
            stroke="#e56c31"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          {draft.map((p, i) => (
            <circle key={i} cx={p.x * w} cy={p.y * h} r="5" fill="#e56c31" />
          ))}
        </>
      )}
    </svg>
  );
}
export function RouteControls({
  transport,
  setTransport,
  routes,
  onChange,
  draft,
  setDraft,
  showPlaceNames,
  onShow,
  playback,
  selectedRouteId,
  onSelect,
  compact = false,
}: {
  compact?: boolean;
  transport: Transport;
  setTransport: (transport: Transport) => void;
  routes: MapRoute[];
  onChange?: (r: MapRoute[]) => void;
  draft: RoutePoint[] | null;
  setDraft: (d: RoutePoint[] | null) => void;
  showPlaceNames: boolean;
  onShow?: (v: boolean) => void;
  playback: ReturnType<typeof useRoutePlayback>;
  selectedRouteId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div
      className={"route-controls" + (compact ? " compact-route-controls" : "")}
      data-map-tool
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {onShow && (
        <label>
          <input
            type="checkbox"
            checked={showPlaceNames}
            onChange={(e) => onShow(e.target.checked)}
          />
          显示地点名称
        </label>
      )}
      {onChange ? (
        <>
          <div className="route-actions">
            <button onClick={() => setDraft(draft ? null : [])}>
              {draft ? "取消绘制" : "+ 绘制路线"}
            </button>
            <select
              aria-label="交通工具"
              value={transport}
              onChange={(e) => setTransport(e.target.value as Transport)}
            >
              {Object.entries(transports).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {draft && (
              <button
                disabled={draft.length < 2}
                onClick={() => {
                  const id = uid();
                  onChange([
                    ...routes,
                    { id, points: draft, transport, duration: 2 },
                  ]);
                  onSelect?.(id);
                  setDraft(null);
                }}
              >
                完成路线
              </button>
            )}
          </div>
          {draft && (
            <small>
              依次点击起点、途经点、终点，再完成路线{" "}
              <button
                disabled={!draft.length}
                onClick={() => setDraft(draft.slice(0, -1))}
              >
                撤回点
              </button>
            </small>
          )}
          {routes.length === 0 && !draft && (
            <p className="route-empty">
              点击「绘制路线」，再在地图上依次标出起点、途经点和终点。
            </p>
          )}
          <p className="route-bend-help">
            先点击选择路线，再拖动圆点调整位置、拖动线条调弧度，或拖动十字手柄移动整条路线。Delete
            / Backspace 删除选中路线；拖动列表手柄调整步骤顺序。
          </p>
          {compact ? (
            <details className="route-inline-details" open={!!selectedRouteId}>
              <summary>路线步骤 · {routes.length} 条（点击展开）</summary>
              <RouteList
                routes={routes}
                onChange={onChange}
                selectedRouteId={selectedRouteId}
                onSelect={(id) => onSelect?.(id)}
              />
            </details>
          ) : (
            <RouteList
              routes={routes}
              onChange={onChange}
              selectedRouteId={selectedRouteId}
              onSelect={(id) => onSelect?.(id)}
            />
          )}
        </>
      ) : (
        routes.length > 0 && (
          <div className="route-actions">
            <button onClick={playback.reset}>重播</button>
            <button disabled={!playback.step} onClick={playback.previous}>
              上一步
            </button>
            <span>
              {playback.step} / {routes.length}
            </span>
            <button
              disabled={
                playback.step === routes.length && playback.progress === 1
              }
              onClick={playback.next}
            >
              {playback.paused
                ? "继续本步"
                : playback.progress < 1
                  ? "完成本步"
                  : "下一步"}
            </button>
          </div>
        )
      )}
    </div>
  );
}

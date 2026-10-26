import type { MapRoute, RoutePoint } from "./model";

export function moveRoutePoint(
  route: MapRoute,
  index: number,
  target: RoutePoint,
  w = 1,
  h = 1,
): MapRoute {
  if (!route.points[index]) return route;
  const points = route.points.map((p, i) =>
    i === index
      ? {
          x: Math.max(0, Math.min(1, target.x)),
          y: Math.max(0, Math.min(1, target.y)),
        }
      : p,
  );
  const controls = route.controls?.map((control, i) => {
    if (!control || (i !== index && i + 1 !== index)) return control;
    const a = route.points[i],
      b = route.points[i + 1],
      nextA = points[i],
      nextB = points[i + 1];
    const vx = (b.x - a.x) * w,
      vy = (b.y - a.y) * h,
      nx = (nextB.x - nextA.x) * w,
      ny = (nextB.y - nextA.y) * h,
      length = vx * vx + vy * vy;
    if (length < 1e-12 || nx * nx + ny * ny < 1e-12)
      return {
        x: control.x + (nextA.x + nextB.x - a.x - b.x) / 2,
        y: control.y + (nextA.y + nextB.y - a.y - b.y) / 2,
      };
    const along =
      ((control.x - a.x) * w * vx + (control.y - a.y) * h * vy) / length;
    const bend =
      (vx * (control.y - a.y) * h - vy * (control.x - a.x) * w) / length;
    return {
      x: nextA.x + (along * nx - bend * ny) / w,
      y: nextA.y + (along * ny + bend * nx) / h,
    };
  });
  return { ...route, points, ...(controls ? { controls } : {}) };
}
export function translateRoute(
  route: MapRoute,
  dx: number,
  dy: number,
): MapRoute {
  if (!route.points.length) return route;
  const x = Math.max(
    -Math.min(...route.points.map((p) => p.x)),
    Math.min(1 - Math.max(...route.points.map((p) => p.x)), dx),
  );
  const y = Math.max(
    -Math.min(...route.points.map((p) => p.y)),
    Math.min(1 - Math.max(...route.points.map((p) => p.y)), dy),
  );
  return {
    ...route,
    points: route.points.map((p) => ({ x: p.x + x, y: p.y + y })),
    ...(route.controls
      ? {
          controls: route.controls.map((p) =>
            p ? { x: p.x + x, y: p.y + y } : null,
          ),
        }
      : {}),
  };
}

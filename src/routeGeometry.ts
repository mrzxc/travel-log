import type { MapRoute, RoutePoint } from "./model";

type Segment = {
  start: RoutePoint;
  end: RoutePoint;
  control?: RoutePoint;
  distances: number[];
  length: number;
};
export function quadraticPoint(
  a: RoutePoint,
  b: RoutePoint,
  c: RoutePoint,
  t: number,
): RoutePoint {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}
export function closestCurveParameter(
  route: MapRoute,
  index: number,
  point: RoutePoint,
  w: number,
  h: number,
) {
  const a = route.points[index],
    b = route.points[index + 1];
  const c = route.controls?.[index] || {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  let best = 0.5,
    distance = Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100,
      p = quadraticPoint(a, b, c, t),
      d = Math.hypot((p.x - point.x) * w, (p.y - point.y) * h);
    if (d < distance) {
      distance = d;
      best = t;
    }
  }
  // Avoid unstable control changes when grabbing almost exactly at an endpoint.
  return Math.max(0.1, Math.min(0.9, best));
}
export function routeGeometry(
  points: RoutePoint[],
  w: number,
  h: number,
  controls?: MapRoute["controls"],
) {
  return points.slice(1).map((point, index): Segment => {
    const start = { x: points[index].x * w, y: points[index].y * h },
      end = { x: point.x * w, y: point.y * h };
    const c = controls?.[index],
      control = c ? { x: c.x * w, y: c.y * h } : undefined;
    const distances = [0];
    let previous = start;
    const count = control ? 100 : 1;
    for (let i = 1; i <= count; i++) {
      const p = control ? quadraticPoint(start, end, control, i / count) : end;
      distances.push(
        distances[i - 1] + Math.hypot(p.x - previous.x, p.y - previous.y),
      );
      previous = p;
    }
    return { start, end, control, distances, length: distances[count] };
  });
}
export function segmentPath(segment: Segment, t = 1) {
  const { start: a, end: b, control: c } = segment;
  if (!c) return `L ${a.x + (b.x - a.x) * t} ${a.y + (b.y - a.y) * t}`;
  const p = quadraticPoint(a, b, c, t);
  return `Q ${a.x + (c.x - a.x) * t} ${a.y + (c.y - a.y) * t} ${p.x} ${p.y}`;
}
export function routeFrame(
  segments: ReturnType<typeof routeGeometry>,
  progress: number,
) {
  if (!segments.length)
    return { x: 0, y: 0, angle: 0, path: "", segment: 0, t: 0 };
  const amount = Math.max(0, Math.min(1, progress));
  let remaining = segments.reduce((sum, s) => sum + s.length, 0) * amount;
  let path = `M ${segments[0].start.x} ${segments[0].start.y}`;
  for (let index = 0; index < segments.length; index++) {
    const s = segments[index];
    if (remaining <= s.length || index === segments.length - 1) {
      let sample = 1;
      while (sample < s.distances.length - 1 && s.distances[sample] < remaining)
        sample++;
      const lower = s.distances[sample - 1],
        upper = s.distances[sample];
      const t =
        amount === 1
          ? 1
          : upper > lower
            ? (sample - 1 + (remaining - lower) / (upper - lower)) /
              (s.distances.length - 1)
            : 0;
      const { start: a, end: b, control: c } = s;
      const p = c
        ? quadraticPoint(a, b, c, t)
        : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const dx = c ? 2 * ((1 - t) * (c.x - a.x) + t * (b.x - c.x)) : b.x - a.x;
      const dy = c ? 2 * ((1 - t) * (c.y - a.y) + t * (b.y - c.y)) : b.y - a.y;
      return {
        ...p,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        path: path + " " + segmentPath(s, t),
        segment: index,
        t,
      };
    }
    remaining -= s.length;
    path += " " + segmentPath(s);
  }
  return { x: 0, y: 0, angle: 0, path, segment: 0, t: 0 };
}

import { describe, it, expect } from "vitest";
import {
  routeGeometry,
  routeFrame,
  closestCurveParameter,
  quadraticPoint,
} from "./routeGeometry";
import { createProject, placeNamesShown } from "./model";
describe("curved routes", () => {
  const points = [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
    controls = [{ x: 0.5, y: 0 }];
  it("keeps old routes straight and matches a quadratic's endpoints, midpoint and tangents", () => {
    expect(routeFrame(routeGeometry(points, 200, 200), 1).path).not.toContain(
      "Q",
    );
    const curve = routeGeometry(points, 200, 200, controls);
    const start = routeFrame(curve, 0),
      middle = routeFrame(curve, 0.5),
      end = routeFrame(curve, 1);
    expect([start.x, start.y]).toEqual([0, 100]);
    expect(start.angle).toBeCloseTo(-45);
    expect(middle.x).toBeCloseTo(100);
    expect(middle.y).toBeCloseTo(50);
    expect(middle.angle).toBeCloseTo(0);
    expect([end.x, end.y]).toEqual([200, 100]);
    expect(end.angle).toBeCloseTo(45);
    expect(end.path).toBe("M 0 100 Q 100 0 200 100");
  });
  it("uses distance rather than the raw Bezier parameter for animation", () => {
    const geometry = routeGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      300,
      200,
      [{ x: 0, y: 1 }],
    );
    const a = routeFrame(geometry, 0.25),
      b = routeFrame(geometry, 0.5),
      c = routeFrame(geometry, 0.75);
    const lengths = [
      Math.hypot(a.x, a.y),
      Math.hypot(b.x - a.x, b.y - a.y),
      Math.hypot(c.x - b.x, c.y - b.y),
      Math.hypot(300 - c.x, 200 - c.y),
    ];
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThan(1.08);
    expect(b.t).not.toBeCloseTo(0.5, 1);
  });
  it("bends one segment independently and finds a grab point on a non-square map", () => {
    const route = {
      id: "route",
      points: [
        { x: 0, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
      controls: [null, { x: 0.75, y: 0 }],
      transport: "plane" as const,
      duration: 2,
    };
    const geometry = routeGeometry(route.points, 1200, 600, route.controls);
    expect(geometry[0].control).toBeUndefined();
    expect(geometry[1].control).toBeDefined();
    const point = quadraticPoint(
      route.points[1],
      route.points[2],
      route.controls[1]!,
      0.35,
    );
    expect(closestCurveParameter(route, 1, point, 1200, 600)).toBeCloseTo(0.35);
    expect(route.points[1]).toEqual({ x: 0.5, y: 0.5 });
  });
});
describe("name visibility compatibility", () => {
  it("reads legacy visibility as names only, with the new setting taking precedence", () => {
    const project = createProject("test"),
      place = project.nodes[project.rootId];
    expect(placeNamesShown(place)).toBe(true);
    place.showPlaces = false;
    expect(placeNamesShown(place)).toBe(false);
    place.showPlaceNames = true;
    expect(placeNamesShown(place)).toBe(true);
  });
});

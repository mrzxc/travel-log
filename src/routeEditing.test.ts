import { describe, it, expect } from "vitest";
import { moveRoutePoint, translateRoute } from "./routeEditing";
import type { MapRoute } from "./model";
describe("route point and whole-route editing", () => {
  const route: MapRoute = {
    id: "a",
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.8, y: 0.7 },
    ],
    controls: [
      { x: 0.4, y: 0.4 },
      { x: 0.9, y: 0.3 },
    ],
    transport: "plane",
    duration: 2,
  };
  it("preserves bend in image coordinates when an endpoint rotates the segment", () => {
    const changed = moveRoutePoint(route, 1, { x: 0.2, y: 0.8 }, 2, 1);
    expect(changed.points[0]).toEqual(route.points[0]);
    expect(changed.points[2]).toEqual(route.points[2]);
    expect(changed.controls![0]!.x).toBeCloseTo(0.125);
    expect(changed.controls![0]!.y).toBeCloseTo(0.5);
    expect(changed.controls![1]).not.toEqual(route.controls![1]);
    expect(route.points[1]).toEqual({ x: 0.6, y: 0.2 });
  });
  it("moves an intermediate vertex and updates only its two adjacent curves", () => {
    const source = {
      ...route,
      points: [...route.points, { x: 1, y: 1 }],
      controls: [...route.controls!, { x: 0.9, y: 0.8 }],
    };
    const result = moveRoutePoint(source, 1, { x: 0.55, y: 0.4 });
    expect(result.controls![0]).not.toEqual(source.controls![0]);
    expect(result.controls![1]).not.toEqual(source.controls![1]);
    expect(result.controls![2]).toEqual(source.controls![2]);
    expect(result.points.filter((_, i) => i !== 1)).toEqual(
      source.points.filter((_, i) => i !== 1),
    );
  });
  it("preserves straight routes and safely handles coincident endpoints", () => {
    const straight = { ...route, controls: undefined };
    expect(
      moveRoutePoint(straight, 0, { x: 0, y: 0 }).controls,
    ).toBeUndefined();
    const collapsed = moveRoutePoint(route, 1, route.points[0]);
    expect(Number.isFinite(collapsed.controls![0]!.x)).toBe(true);
    expect(moveRoutePoint(route, 0, { x: -2, y: 3 }).points[0]).toEqual({
      x: 0,
      y: 1,
    });
  });
  it("translates all points and controls equally and stops at image edges", () => {
    const result = translateRoute(route, 0.5, -0.5);
    expect(result.points[0].x).toBeCloseTo(0.4);
    expect(result.points[0].y).toBeCloseTo(0);
    expect(result.points[2].x).toBeCloseTo(1);
    expect(result.controls![0]!.x).toBeCloseTo(0.6);
    expect(result.controls![0]!.y).toBeCloseTo(0.2);
    expect(result.duration).toBe(route.duration);
    expect(result.transport).toBe(route.transport);
    expect(route.controls![0]).toEqual({ x: 0.4, y: 0.4 });
  });
});

import { describe, it, expect } from "vitest";
import { routePosition } from "./MapRoutes";
describe("route travel along image coordinates", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  it("moves at constant distance through waypoints with the image aspect ratio", () => {
    const p = routePosition(points, 0.75, 200, 100);
    expect(p.x).toBe(200);
    expect(p.y).toBe(25);
    expect(p.angle).toBe(90);
    expect(p.before).toHaveLength(2);
  });
  it("clamps progress and handles duplicate waypoints", () => {
    expect(routePosition(points, 2, 200, 100).y).toBe(100);
    expect(routePosition(points, -1, 200, 100).x).toBe(0);
    expect(
      routePosition(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        0,
        200,
        100,
      ).x,
    ).toBe(0);
  });
});

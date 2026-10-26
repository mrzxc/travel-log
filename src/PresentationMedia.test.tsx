import { describe, it, expect } from "vitest";
import { zoomMediaView, DEFAULT_MEDIA_SCALE } from "./PresentationMedia";
describe("presentation media zoom", () => {
  it("clamps both photos and videos to half size through five times", () => {
    expect(DEFAULT_MEDIA_SCALE).toBe(0.8);
    const view = { x: 0, y: 0, scale: 1 };
    expect(zoomMediaView(view, 0.001).scale).toBe(0.5);
    expect(zoomMediaView(view, 100).scale).toBe(5);
  });
  it("keeps the point under the cursor fixed while zooming", () => {
    const view = { x: 10, y: -5, scale: 1 },
      anchor = { x: 100, y: 50 },
      next = zoomMediaView(view, 2, anchor);
    expect((anchor.x - view.x) / view.scale).toBe(
      (anchor.x - next.x) / next.scale,
    );
    expect((anchor.y - view.y) / view.scale).toBe(
      (anchor.y - next.y) / next.scale,
    );
  });
  it("can reverse a zoom without introducing translation drift", () => {
    const view = { x: 10, y: -5, scale: 1 },
      anchor = { x: 100, y: 50 };
    expect(zoomMediaView(zoomMediaView(view, 2, anchor), 0.5, anchor)).toEqual(
      view,
    );
  });
});

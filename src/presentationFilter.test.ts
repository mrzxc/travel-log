import { describe, it, expect } from "vitest";
import { filterPresentationMedia, type Media } from "./model";
const media: Media[] = [
  { id: "default", name: "默认.jpg", path: "a.jpg", type: "image", time: 1 },
  {
    id: "excluded",
    name: "排除.jpg",
    path: "b.jpg",
    type: "image",
    time: 2,
    includeInPresentation: false,
  },
  {
    id: "included",
    name: "参加.mp4",
    path: "c.mp4",
    type: "video",
    time: 3,
    includeInPresentation: true,
  },
  {
    id: "missing",
    name: "缺失.jpg",
    path: "d.jpg",
    type: "image",
    time: 4,
    missing: true,
  },
];
describe("presentation media filter", () => {
  it("shows everything with the filter off", () =>
    expect(filterPresentationMedia(media, false)).toBe(media));
  it("matches the actual presentation eligibility without changing order", () =>
    expect(filterPresentationMedia(media, true).map((m) => m.id)).toEqual([
      "default",
      "included",
    ]));
  it("does not change participation flags or delete hidden media", () => {
    const before = JSON.stringify(media);
    filterPresentationMedia(media, true);
    expect(JSON.stringify(media)).toBe(before);
    expect(media).toHaveLength(4);
  });
});

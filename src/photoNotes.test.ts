import { describe, it, expect } from "vitest";
import { createProject, moveMediaBatch, setCover } from "./model";
describe("photo notes", () => {
  it("survives project serialization and media moves", () => {
    const project = createProject("旅行"),
      root = project.nodes[project.rootId];
    root.media.push({
      id: "photo",
      name: "照片.jpg",
      path: "photo.jpg",
      type: "image",
      time: 1,
      note: "第一行\n第二行 <普通文字>",
    });
    project.nodes.child = {
      id: "child",
      name: "地点",
      parentId: root.id,
      children: [],
      media: [],
      map: null,
      pins: [],
    };
    root.children.push("child");
    moveMediaBatch(project, root.id, ["photo"], "child");
    const loaded = JSON.parse(JSON.stringify(project));
    expect(loaded.nodes.child.media[0].note).toBe("第一行\n第二行 <普通文字>");
    expect(root.media).toHaveLength(0);
  });
  it("keeps source notes when making an independent cover", () => {
    const project = createProject("旅行"),
      root = project.nodes[project.rootId];
    const photo = {
      id: "photo",
      name: "照片.jpg",
      path: "photo.jpg",
      type: "image" as const,
      time: 1,
      note: "旅途记录",
    };
    root.media.push(photo);
    setCover(project, root.id, photo);
    expect(root.media[0].note).toBe("旅途记录");
    expect(root.coverAsset?.note).toBe("旅途记录");
    expect(root.coverAsset?.id).not.toBe(photo.id);
  });
});

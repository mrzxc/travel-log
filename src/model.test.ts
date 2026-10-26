import { describe, it, expect } from "vitest";
import {
  createProject,
  uid,
  flatten,
  visiblePins,
  cover,
  removePlace,
  moveMedia,
  available,
  canPresent,
  canEnterPlace,
  setCover,
  moveMediaBatch,
  removeMediaBatch,
  reorderMedia,
  type Project,
  type Media,
} from "./model";
function place(p: Project, parent: string, name: string) {
  const id = uid();
  p.nodes[id] = {
    id,
    name,
    parentId: parent,
    children: [],
    media: [],
    map: null,
    pins: [],
  };
  p.nodes[parent].children.push(id);
  return id;
}
function media(name: string, missing = false): Media {
  return {
    id: uid(),
    path: `C:\\${name}.jpg`,
    name,
    type: "image",
    time: 1,
    missing,
  };
}
describe("旅行演示规则", () => {
  it("直属素材优先，按子地点顺序深度展开，即使子地点有地图", () => {
    const p = createProject("旅行"),
      root = p.rootId,
      a = place(p, root, "意大利"),
      r = place(p, a, "罗马"),
      b = place(p, root, "奥地利");
    p.nodes[root].media = [media("概览")];
    p.nodes[a].media = [media("意大利")];
    p.nodes[r].media = [media("罗马")];
    p.nodes[b].media = [media("奥地利")];
    p.nodes[a].map = media("地图");
    expect(flatten(p, root).map((m) => m.name)).toEqual([
      "概览",
      "意大利",
      "罗马",
      "奥地利",
    ]);
  });
  it("同分支最上层标点覆盖后代标点，未标记父级不阻挡后代", () => {
    const p = createProject("旅行"),
      a = place(p, p.rootId, "意大利"),
      r = place(p, a, "罗马");
    p.nodes[a].map = media("地图");
    p.nodes[r].media = [media("罗马")];
    p.nodes[p.rootId].pins = [
      { nodeId: a, x: 0.2, y: 0.3 },
      { nodeId: r, x: 0.4, y: 0.5 },
    ];
    expect(visiblePins(p, p.rootId).map((v) => v.nodeId)).toEqual([a]);
    p.nodes[p.rootId].pins.shift();
    expect(visiblePins(p, p.rootId).map((v) => v.nodeId)).toEqual([r]);
  });
  it("隐藏无地图空地点，保留有地图无素材地点", () => {
    const p = createProject("旅行"),
      a = place(p, p.rootId, "空"),
      b = place(p, p.rootId, "地图");
    p.nodes[b].map = media("地图");
    p.nodes[a].media = [media("缺失", true)];
    p.nodes[p.rootId].pins = [
      { nodeId: a, x: 0, y: 0 },
      { nodeId: b, x: 0, y: 0 },
    ];
    expect(visiblePins(p, p.rootId).map((v) => v.nodeId)).toEqual([b]);
  });
  it("手动封面可取后代素材，缺失自动回退", () => {
    const p = createProject("旅行"),
      a = place(p, p.rootId, "罗马"),
      first = media("第一张"),
      chosen = media("封面");
    p.nodes[p.rootId].media = [first];
    p.nodes[a].media = [chosen];
    p.nodes[p.rootId].coverId = chosen.id;
    expect(cover(p, p.rootId)).toBe(chosen);
    chosen.missing = true;
    expect(cover(p, p.rootId)).toBe(first);
  });
  it("移动只修改归属，删除地点清理所有地图引用", () => {
    const p = createProject("旅行"),
      a = place(p, p.rootId, "意大利"),
      r = place(p, a, "罗马"),
      m = media("照片");
    p.nodes[a].media = [m];
    moveMedia(p, m.id, r);
    expect(p.nodes[a].media).toHaveLength(0);
    expect(p.nodes[r].media[0].path).toBe(m.path);
    p.nodes[p.rootId].pins = [{ nodeId: r, x: 0, y: 0 }];
    removePlace(p, a);
    expect(p.nodes[r]).toBeUndefined();
    expect(p.nodes[p.rootId].pins).toHaveLength(0);
  });
  it("排除的图片和视频不参与演示、数量、默认封面，管理数据仍保留", () => {
    const p = createProject("旅行"),
      id = p.rootId,
      a = media("排除的图片"),
      b = { ...media("排除的视频"), type: "video" as const },
      c = media("展示");
    a.includeInPresentation = false;
    b.includeInPresentation = false;
    p.nodes[id].media = [a, b, c];
    expect(available(p, id)).toEqual([c]);
    expect(cover(p, id)).toBe(c);
    expect(flatten(p, id)).toHaveLength(3);
    expect(canPresent(b)).toBe(false);
    a.includeInPresentation = true;
    expect(available(p, id)).toEqual([a, c]);
  });
  it("独立封面不计入数量，无内容地点显示为不可进入的标点", () => {
    const p = createProject("旅行"),
      id = place(p, p.rootId, "空");
    setCover(p, id, media("独立封面"));
    p.nodes[p.rootId].pins = [{ nodeId: id, x: 0.5, y: 0.5 }];
    expect(flatten(p, id)).toHaveLength(0);
    expect(available(p, id)).toHaveLength(0);
    expect(visiblePins(p, p.rootId)).toHaveLength(1);
    expect(canEnterPlace(p, id)).toBe(false);
    expect(cover(p, id)?.name).toBe("独立封面");
    p.nodes[id].map = media("地图");
    expect(visiblePins(p, p.rootId)).toHaveLength(1);
    expect(canEnterPlace(p, id)).toBe(true);
  });
  it("排除全部素材后保留手动封面标点，但不可进入；封面缺失后隐藏", () => {
    const p = createProject("旅行"),
      id = place(p, p.rootId, "地点"),
      m = media("照片");
    p.nodes[id].media = [m];
    setCover(p, id, m);
    p.nodes[p.rootId].pins = [{ nodeId: id, x: 0.4, y: 0.5 }];
    expect(canEnterPlace(p, id)).toBe(true);
    m.includeInPresentation = false;
    expect(visiblePins(p, p.rootId)).toHaveLength(1);
    expect(canEnterPlace(p, id)).toBe(false);
    p.nodes[id].coverAsset!.missing = true;
    expect(visiblePins(p, p.rootId)).toHaveLength(0);
  });
  it("手动封面独立于素材归属、排除设置、移除引用和重新定位", () => {
    const p = createProject("旅行"),
      id = p.rootId,
      target = place(p, id, "罗马"),
      m = media("照片");
    p.nodes[id].media = [m];
    setCover(p, id, m);
    expect(p.nodes[id].coverAsset?.id).not.toBe(m.id);
    m.includeInPresentation = false;
    expect(cover(p, id)?.path).toBe(m.path);
    moveMediaBatch(p, id, [m.id], target);
    m.path = "C:\\新照片.jpg";
    removeMediaBatch(p, target, [m.id]);
    expect(cover(p, id)?.path).toBe("C:\\照片.jpg");
    p.nodes[id].media = [media("候补")];
    p.nodes[id].coverAsset!.missing = true;
    expect(cover(p, id)?.name).toBe("候补");
  });
  it("多选移动按来源列表顺序追加目标，保留排除状态和原路径", () => {
    const p = createProject("旅行"),
      id = p.rootId,
      target = place(p, id, "罗马");
    const [a, b, c, d] = ["A", "B", "C", "D"].map((n) => media(n));
    b.includeInPresentation = false;
    p.nodes[id].media = [a, b, c, d];
    p.nodes[target].media = [media("原有")];
    moveMediaBatch(p, id, [d.id, b.id], target);
    expect(p.nodes[id].media.map((m) => m.name)).toEqual(["A", "C"]);
    expect(p.nodes[target].media.map((m) => m.name)).toEqual([
      "原有",
      "B",
      "D",
    ]);
    expect(p.nodes[target].media[1].includeInPresentation).toBe(false);
    expect(p.nodes[target].media[1].path).toBe(b.path);
    moveMediaBatch(p, target, [b.id], target);
    expect(p.nodes[target].media).toHaveLength(3);
  });
  it("整组排序支持非连续选择、向前、向后，保持组内原顺序", () => {
    const [a, b, c, d, e] = ["A", "B", "C", "D", "E"].map((n) => media(n));
    const items = [a, b, c, d, e];
    expect(
      reorderMedia(items, [d.id, b.id], e.id, true).map((m) => m.name),
    ).toEqual(["A", "C", "E", "B", "D"]);
    expect(
      reorderMedia(items, [d.id, b.id], a.id, false).map((m) => m.name),
    ).toEqual(["B", "D", "A", "C", "E"]);
    expect(reorderMedia(items, [b.id, d.id], d.id, true)).toBe(items);
  });
});

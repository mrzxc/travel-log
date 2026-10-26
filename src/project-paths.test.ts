import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  folderGroups,
  mapFolders,
  resolveProject,
  serializedProject,
  uniqueFiles,
} = require("../electron/project-paths.cjs");
const media = (id: string, path: string) => ({
  id,
  path,
  name: path.split(/[\\/]/).at(-1),
  type: "image",
  time: 1,
});
const project = (files: string[]) => ({
  version: 1,
  id: "project",
  name: "旅行",
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      name: "旅行",
      parentId: null,
      children: [],
      media: files.map((file, i) => media(String(i), file)),
      map: null,
      pins: [],
    },
  },
});
describe("project folder mappings", () => {
  it("groups Windows paths on macOS and counts shared media/map/cover files once", () => {
    const p: any = project(["D:\\照片\\IMG.HEIC", "D:\\照片\\other.jpg"]);
    p.nodes.root.coverAsset = media("cover", "d:\\照片\\img.heic");
    p.nodes.root.map = media("map", "D:\\地图\\底图.jpg");
    expect(uniqueFiles(p)).toHaveLength(3);
    expect(folderGroups(p)).toEqual([
      { source: "D:\\照片", target: "D:\\照片", count: 2 },
      { source: "D:\\地图", target: "D:\\地图", count: 1 },
    ]);
    const mapped = mapFolders(
      p,
      [
        { source: "D:\\照片", target: "素材/照片" },
        { source: "D:\\地图", target: "素材/地图" },
      ],
      { relativeOnly: true },
    );
    expect(mapped.nodes.root.coverAsset.path).toBe(
      mapped.nodes.root.media[0].path,
    );
  });
  it("maps each exact folder independently, keeping filenames and all references", () => {
    const p: any = project([
      "/照片/意大利/A.HEIC",
      "/照片/意大利/子目录/B.jpg",
    ]);
    p.nodes.root.coverAsset = media("cover", p.nodes.root.media[0].path);
    const mapped = mapFolders(p, [
      { source: "/照片/意大利", target: "E:\\旅行" },
      { source: "/照片/意大利/子目录", target: "E:\\另一个目录" },
    ]);
    expect(mapped.nodes.root.media.map((m: any) => m.path)).toEqual([
      "E:\\旅行\\A.HEIC",
      "E:\\另一个目录\\B.jpg",
    ]);
    expect(mapped.nodes.root.coverAsset.path).toBe("E:\\旅行\\A.HEIC");
    expect(p.nodes.root.media[0].path).toBe("/照片/意大利/A.HEIC");
  });
  it("rejects distinct files mapped to the same path, including Windows case collisions", () => {
    const p = project(["/a/IMG.jpg", "/b/img.jpg"]);
    expect(() =>
      mapFolders(p, [
        { source: "/a", target: "D:\\照片" },
        { source: "/b", target: "d:\\照片" },
      ]),
    ).toThrow("同一路径");
  });
  it("only permits safe relative export directories when copying originals", () => {
    for (const target of [
      "../escape",
      "D:\\照片",
      "/absolute",
      "a/../../escape",
    ])
      expect(() =>
        mapFolders(project(["/a/photo.jpg"]), [{ source: "/a", target }], {
          relativeOnly: true,
        }),
      ).toThrow();
    expect(
      mapFolders(
        project(["/a/photo.jpg"]),
        [{ source: "/a", target: "素材/照片" }],
        { relativeOnly: true },
      ).nodes.root.media[0].path,
    ).toBe("素材/照片/photo.jpg");
  });
  it("resolves and re-saves portable references without converting foreign absolute paths", () => {
    const p: any = project(["素材/照片.jpg", "D:\\外置\\视频.mov"]);
    p.portablePaths = true;
    const loaded = resolveProject(p, "/旅行项目");
    expect(loaded.nodes.root.media[0].path).toBe("/旅行项目/素材/照片.jpg");
    expect(
      serializedProject(loaded, "/旅行项目").nodes.root.media.map(
        (m: any) => m.path,
      ),
    ).toEqual(["素材/照片.jpg", "D:\\外置\\视频.mov"]);
  });
});

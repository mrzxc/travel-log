import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require = createRequire(import.meta.url);
const { installProjectTransfer } = require("../electron/project-transfer.cjs");
const {
  folderGroups,
  resolveProject,
} = require("../electron/project-paths.cjs");
const { extractArchive } = require("../electron/project-archive.cjs");

async function fixture(run: (context: any) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "travel-transfer-"));
  const source = path.join(dir, "原件");
  await mkdir(source);
  await writeFile(path.join(source, "照片.HEIC"), "untouched image bytes");
  const asset = {
    id: "photo",
    name: "照片.HEIC",
    path: path.join(source, "照片.HEIC"),
    type: "image",
    time: 1,
    includeInPresentation: false,
    note: "备注",
  };
  const project = {
    version: 1,
    id: "original",
    name: "旅行",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "旅行",
        parentId: null,
        children: [],
        media: [asset],
        map: { ...asset, id: "map" },
        coverAsset: { ...asset, id: "cover" },
        pins: [],
        routes: [],
      },
    },
  };
  const originalFile = path.join(dir, "original.travel");
  await writeFile(originalFile, JSON.stringify(project));
  const handlers = new Map(),
    selections: any[] = [],
    saves: any[] = [];
  let activePath = originalFile;
  const transfer = installProjectTransfer({
    ipcMain: {
      handle: (name: string, handler: unknown) => handlers.set(name, handler),
    },
    dialog: {
      showOpenDialog: async () => selections.shift(),
      showSaveDialog: async () => saves.shift(),
    },
    getWindow: () => null,
    getProjectPath: () => activePath,
    validate: (p: unknown) => p,
    check: async (p: unknown) => p,
    activate: (_p: unknown, file: string) => {
      activePath = file;
    },
    waitForSave: async () => {},
  });
  const call = (name: string, ...args: any[]) =>
    handlers.get("project:" + name)(null, ...args);
  try {
    await run({ dir, project, source, selections, saves, call, originalFile });
  } finally {
    await transfer.dispose();
    await rm(dir, { recursive: true, force: true });
  }
}

describe("project transfer transactions", () => {
  it("imports a reference-only project as a new file and remaps foreign paths locally", async () =>
    fixture(async ({ dir, project, source, selections, saves, call }) => {
      const foreign = structuredClone(project);
      for (const asset of [
        ...foreign.nodes.root.media,
        foreign.nodes.root.map,
        foreign.nodes.root.coverAsset,
      ])
        asset.path = "D:\\照片\\照片.HEIC";
      const input = path.join(dir, "foreign.travel"),
        output = path.join(dir, "imported.travel");
      await writeFile(input, JSON.stringify(foreign));
      selections.push({ canceled: false, filePaths: [input] });
      saves.push({ canceled: false, filePath: output });
      const draft = await call("prepare-import");
      const mappings = draft.groups.map((group: any) => ({
        ...group,
        target: source,
      }));
      const report = await call("preview-paths", {
        mode: "import",
        token: draft.token,
        mappings,
      });
      expect(report.found).toBe(1);
      const imported = await call("finish-import", {
        token: draft.token,
        mappings,
      });
      expect(imported.path).toBe(output);
      expect(imported.project.nodes.root.media[0].path).toBe(
        path.join(source, "照片.HEIC"),
      );
      expect(JSON.parse(await readFile(input, "utf8"))).toEqual(foreign);
    }));
  it("exports a remapped reference-only copy without touching source paths or original bytes", async () =>
    fixture(async ({ dir, project, source, saves, call, originalFile }) => {
      const target = path.join(dir, "export.travel");
      saves.push({ canceled: false, filePath: target });
      await call("export", {
        mode: "export",
        project,
        mappings: [{ source, target: "D:\\蜜月照片" }],
        includeMedia: false,
      });
      const exported = JSON.parse(await readFile(target, "utf8"));
      expect(exported.nodes.root.media[0].path).toBe("D:\\蜜月照片\\照片.HEIC");
      expect(exported.nodes.root.coverAsset.path).toBe(
        exported.nodes.root.media[0].path,
      );
      expect(JSON.parse(await readFile(originalFile, "utf8"))).toEqual(project);
      expect(await readFile(project.nodes.root.media[0].path, "utf8")).toBe(
        "untouched image bytes",
      );
    }));
  it("round-trips all asset roles through ZIP, deduplicates originals and keeps imported paths portable", async () =>
    fixture(async ({ dir, project, saves, selections, call }) => {
      const zip = path.join(dir, "export.zip");
      saves.push({ canceled: false, filePath: zip });
      await call("export", {
        project,
        mappings: folderGroups(project, true),
        includeMedia: true,
      });
      const extracted = path.join(dir, "inspect");
      await mkdir(extracted);
      await extractArchive(zip, extracted);
      await mkdir(path.join(dir, "旅行"));
      await writeFile(
        path.join(dir, "旅行", "keep.txt"),
        "existing user files",
      );
      expect(await readdir(path.join(extracted, "素材", "文件夹-001"))).toEqual(
        ["照片.HEIC"],
      );
      selections.push(
        { canceled: false, filePaths: [zip] },
        { canceled: false, filePaths: [dir] },
      );
      const draft = await call("prepare-import");
      const report = await call("preview-paths", {
        mode: "import",
        token: draft.token,
        mappings: draft.groups,
      });
      expect(report.found).toBe(1);
      expect(report.missing).toBe(0);
      const imported = await call("finish-import", {
        token: draft.token,
        mappings: draft.groups,
      });
      expect(draft.destination).toBe(path.join(dir, "旅行-2", "旅行.travel"));
      expect(await readFile(path.join(dir, "旅行", "keep.txt"), "utf8")).toBe(
        "existing user files",
      );
      const saved = JSON.parse(await readFile(imported.path, "utf8"));
      expect(saved.id).not.toBe(project.id);
      expect(saved.nodes.root.media[0].path).toBe("素材/文件夹-001/照片.HEIC");
      expect(saved.nodes.root.media[0].includeInPresentation).toBe(false);
      expect(saved.nodes.root.media[0].note).toBe("备注");
      const moved = resolveProject(saved, "/another/place");
      expect(moved.nodes.root.coverAsset.path).toBe(
        "/another/place/素材/文件夹-001/照片.HEIC",
      );
    }));
  it("permits missing mappings on import and cancels staged ZIP imports without a final folder", async () =>
    fixture(async ({ dir, project, saves, selections, call }) => {
      const zip = path.join(dir, "export.zip");
      saves.push({ canceled: false, filePath: zip });
      await call("export", {
        project,
        mappings: folderGroups(project, true),
        includeMedia: true,
      });
      selections.push(
        { canceled: false, filePaths: [zip] },
        { canceled: false, filePaths: [dir] },
      );
      const draft = await call("prepare-import");
      const report = await call("preview-paths", {
        mode: "import",
        token: draft.token,
        mappings: draft.groups.map((g: any) => ({
          ...g,
          target: path.join(dir, "not-here"),
        })),
      });
      expect(report.missing).toBe(1);
      await call("cancel-import", draft.token);
      expect(
        (await readdir(dir)).filter(
          (name) => name.startsWith(".travel-import-") || name === "旅行",
        ),
      ).toEqual([]);
    }));
  it("stops packaged export on missing originals unless the user explicitly skips them", async () =>
    fixture(async ({ dir, project, source, saves, call }) => {
      project.nodes.root.media.push({
        ...project.nodes.root.media[0],
        id: "missing",
        path: path.join(source, "missing.jpg"),
      });
      const request = {
        project,
        mappings: folderGroups(project, true),
        includeMedia: true,
      };
      await expect(call("export", request)).rejects.toThrow("缺失");
      const zip = path.join(dir, "partial.zip");
      saves.push({ canceled: false, filePath: zip });
      expect(await call("export", { ...request, skipMissing: true })).toBe(zip);
    }));
});

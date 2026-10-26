import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const {
  writeArchive,
  extractArchive,
  safeEntry,
} = require("../electron/project-archive.cjs");
describe("project archive", () => {
  it("streams a portable project and files with Unicode names into a round-trip archive", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "travel-archive-"));
    try {
      const file = path.join(dir, "照片 #1.HEIC"),
        zip = path.join(dir, "旅行.zip"),
        output = path.join(dir, "解压");
      await writeFile(file, "original bytes");
      await mkdir(output);
      const project = { name: "蜜月", path: "素材/照片 #1.HEIC" };
      await writeArchive(zip, project, [
        { source: file, destination: project.path },
      ]);
      await extractArchive(zip, output);
      expect(
        JSON.parse(await readFile(path.join(output, "project.travel"), "utf8")),
      ).toEqual(project);
      expect(await readFile(path.join(output, project.path), "utf8")).toBe(
        "original bytes",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("rejects traversal, absolute paths, Windows paths and ambiguous ZIP separators", () => {
    for (const name of [
      "../photo.jpg",
      "dir/../../photo.jpg",
      "/photo.jpg",
      "C:/photo.jpg",
      "dir\\photo.jpg",
    ])
      expect(() => safeEntry(name)).toThrow();
  });
  it("rejects corrupted original bytes even when archive entry sizes still match", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "travel-archive-crc-"));
    try {
      const file = path.join(dir, "photo.jpg"),
        zip = path.join(dir, "project.zip"),
        output = path.join(dir, "output");
      await writeFile(file, "original bytes");
      await mkdir(output);
      await writeArchive(zip, { name: "test" }, [
        { source: file, destination: "photo.jpg" },
      ]);
      const data = await readFile(zip),
        offset = data.indexOf(Buffer.from("original bytes"));
      expect(offset).toBeGreaterThan(0);
      data[offset] ^= 1;
      await writeFile(zip, data);
      await expect(extractArchive(zip, output)).rejects.toThrow("校验失败");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

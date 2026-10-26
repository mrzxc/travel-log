import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  readdir,
  rm,
  utimes,
} from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { createImagePreview, isHeic } = require("../electron/image-preview.cjs");
async function fixture(
  test: (
    directory: string,
    media: { path: string; type: string },
  ) => Promise<void>,
) {
  const root = path.resolve(".test-data");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, "travel-heic-"));
  const media = { path: path.join(directory, "photo.HEIC"), type: "image" };
  await writeFile(media.path, "test input");
  try {
    await test(directory, media);
  } finally {
    if (!directory.startsWith(root + path.sep))
      throw Error("Unexpected test directory");
    await rm(directory, { recursive: true, force: true });
  }
}
describe("HEIC image preview cache", () => {
  it("prioritizes an opened photo over queued thumbnails, including a shared pending conversion", async () =>
    fixture(async (dir, first) => {
      const second = { ...first, path: path.join(dir, "second.HEIC") };
      const opened = { ...first, path: path.join(dir, "opened.HEIC") };
      await Promise.all([
        writeFile(second.path, "second"),
        writeFile(opened.path, "opened"),
      ]);
      const order: string[] = [];
      let release!: () => void;
      let started!: () => void;
      const start = new Promise<void>((resolve) => {
        started = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const preview = createImagePreview(
        path.join(dir, "cache"),
        async (source: string, destination: string) => {
          order.push(source);
          if (source === first.path) {
            started();
            await gate;
          }
          await writeFile(destination, "jpeg");
        },
      );
      const a = preview(first, { priority: "background" });
      await start;
      const sourceStats = new Map(
        await Promise.all(
          [second.path, opened.path].map(
            async (file) => [file, await stat(file)] as const,
          ),
        ),
      );
      const filesystem = require("node:fs/promises");
      const originalStat = filesystem.stat;
      const statSpy = vi
        .spyOn(filesystem, "stat")
        .mockImplementation((file: unknown) => {
          if (sourceStats.has(String(file)))
            return Promise.resolve(sourceStats.get(String(file)));
          if (String(file).startsWith(path.join(dir, "cache") + path.sep))
            return Promise.reject(
              Object.assign(new Error("No cached preview"), { code: "ENOENT" }),
            );
          return originalStat(file);
        });
      try {
        const b = preview(second, { priority: "background" });
        const thumbnail = preview(opened, { priority: "background" });
        // Resolved stat promises make queue admission deterministic, without sleeps.
        await Promise.resolve();
        await Promise.resolve();
        const detail = preview(opened);
        await Promise.resolve();
        release();
        const results = await Promise.all([a, b, thumbnail, detail]);
        expect(order).toEqual([first.path, opened.path, second.path]);
        expect(results[2]).toBe(results[3]);
      } finally {
        release();
        statSpy.mockRestore();
      }
    }));
  it("only converts HEIC/HEIF photos", async () => {
    expect(isHeic({ path: "PHOTO.HEIF", type: "image" })).toBe(true);
    const preview = createImagePreview("unused", () => {
      throw Error("unexpected conversion");
    });
    expect(await preview({ path: "photo.jpg", type: "image" })).toBe(
      "photo.jpg",
    );
    expect(await preview({ path: "movie.mov", type: "video" })).toBe(
      "movie.mov",
    );
  });
  it("shares concurrent requests, reuses disk cache and preserves the source", async () =>
    fixture(async (dir, m) => {
      let calls = 0;
      const convert = async (_source: string, destination: string) => {
        calls++;
        await writeFile(destination, "jpeg");
      };
      const preview = createImagePreview(path.join(dir, "cache"), convert);
      const [a, b] = await Promise.all([preview(m), preview(m)]);
      expect(a).toBe(b);
      expect(calls).toBe(1);
      expect(
        await createImagePreview(path.join(dir, "cache"), convert)(m),
      ).toBe(a);
      expect(calls).toBe(1);
      expect(await readFile(m.path, "utf8")).toBe("test input");
      const original = await stat(m.path);
      await utimes(m.path, new Date(), new Date(original.mtimeMs + 2000));
      expect(await preview(m)).not.toBe(a);
      expect(calls).toBe(2);
    }));
  it("cleans partial conversions and allows retries after a decode failure", async () =>
    fixture(async (dir, m) => {
      let calls = 0;
      const cache = path.join(dir, "cache");
      const preview = createImagePreview(
        cache,
        async (_s: string, d: string) => {
          await writeFile(d, "partial");
          if (++calls === 1) throw Error("bad HEIC");
        },
      );
      await expect(preview(m)).rejects.toThrow("bad HEIC");
      expect(await readdir(cache)).toEqual([]);
      await expect(preview(m)).resolves.toMatch(/preview\.jpg$/);
      expect(calls).toBe(2);
    }));
  it("rejects corrupt HEIC using the actual background decoder", async () =>
    fixture(async (dir, m) => {
      await expect(
        createImagePreview(path.join(dir, "cache"))(m),
      ).rejects.toThrow();
      expect(await readdir(path.join(dir, "cache"))).toEqual([]);
    }));
});

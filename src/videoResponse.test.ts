import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
const { videoResponse } = createRequire(import.meta.url)(
  "../electron/video-response.cjs",
);

it("serves full video, byte ranges, suffixes, HEAD and invalid ranges", async () => {
  const dir = await mkdtemp(path.resolve(".test-data/video-range-"));
  const file = path.join(dir, "test.mp4");
  await writeFile(file, "0123456789");
  const request = (range?: string, method = "GET") =>
    new Request("https://local/video", {
      method,
      headers: range ? { Range: range } : {},
    });
  try {
    const full = await videoResponse(file, request());
    expect(full.status).toBe(200);
    expect(full.headers.get("accept-ranges")).toBe("bytes");
    expect(await full.text()).toBe("0123456789");
    for (const [range, body, contentRange] of [
      ["bytes=2-5", "2345", "bytes 2-5/10"],
      ["bytes=7-", "789", "bytes 7-9/10"],
      ["bytes=-3", "789", "bytes 7-9/10"],
      ["bytes=8-99", "89", "bytes 8-9/10"],
    ]) {
      const result = await videoResponse(file, request(range));
      expect(result.status).toBe(206);
      expect(result.headers.get("content-range")).toBe(contentRange);
      expect(result.headers.get("content-length")).toBe(String(body.length));
      expect(await result.text()).toBe(body);
    }
    for (const range of [
      "bytes=12-",
      "bytes=5-2",
      "bytes=-0",
      "bytes=-",
      "bytes=0-1,3-4",
    ]) {
      const result = await videoResponse(file, request(range));
      expect(result.status).toBe(416);
      expect(result.headers.get("content-range")).toBe("bytes */10");
    }
    const head = await videoResponse(file, request(undefined, "HEAD"));
    expect(head.headers.get("content-length")).toBe("10");
    expect(await head.text()).toBe("");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

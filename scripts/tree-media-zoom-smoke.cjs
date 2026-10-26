const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const assert = require("node:assert/strict");
const svg = (text, color = "#a6b998") =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="850"><rect width="1400" height="850" fill="${color}"/><path d="M20 450 Q300 50 680 400 T1380 450" fill="none" stroke="#e9eddd" stroke-width="130"/><path d="M200 50 Q800 550 900 850" fill="none" stroke="#e0d7ad" stroke-width="30"/><text x="700" y="440" text-anchor="middle" font-family="sans-serif" fill="#40543a" font-size="60">${text}</text></svg>`,
  );
const media = (id, name) => ({
  id,
  path: svg(name),
  name: name + ".jpg",
  type: "image",
  time: 1760000000000,
});
const node = (
  id,
  name,
  parentId,
  children = [],
  items = [],
  map = null,
  pins = [],
) => ({ id, name, parentId, children, media: items, map, pins });
const fixture = {
  version: 1,
  id: "static-pin",
  name: "封面标点测试",
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      name: "旅行",
      parentId: null,
      children: ["static", "playable", "hidden"],
      media: [],
      map: {
        id: "map",
        path: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22%23dce5d4%22%2F%3E%3Cpath%20d%3D%22M0%20500Q350%20200%20600%20430T1200%20250%22%20stroke%3D%22%23f1e5b5%22%20stroke-width%3D%2270%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M200%200L380%20800M800%200L640%20800%22%20stroke%3D%22%23f5f4e2%22%20stroke-width%3D%2224%22%2F%3E%3C%2Fsvg%3E",
        name: "封面.png",
        type: "image",
        time: 1,
        missing: false,
      },
      pins: [
        { nodeId: "static", x: 0.3, y: 0.5 },
        { nodeId: "playable", x: 0.7, y: 0.5 },
        { nodeId: "hidden", x: 0.5, y: 0.25 },
      ],
      routes: [
        {
          id: "first",
          points: [
            { x: 0.2, y: 0.6 },
            { x: 0.5, y: 0.7 },
          ],
          transport: "plane",
          duration: 0.4,
        },
        {
          id: "second",
          points: [
            { x: 0.5, y: 0.7 },
            { x: 0.8, y: 0.6 },
          ],
          transport: "jeep",
          duration: 0.4,
        },
        {
          id: "seed-2",
          points: [
            { x: 0.2, y: 0.38 },
            { x: 0.8, y: 0.38 },
          ],
          transport: "car",
          duration: 0.4,
        },
        {
          id: "seed-3",
          points: [
            { x: 0.2, y: 0.42 },
            { x: 0.8, y: 0.42 },
          ],
          transport: "car",
          duration: 0.4,
        },
        {
          id: "seed-4",
          points: [
            { x: 0.2, y: 0.45999999999999996 },
            { x: 0.8, y: 0.45999999999999996 },
          ],
          transport: "car",
          duration: 0.4,
        },
        {
          id: "seed-5",
          points: [
            { x: 0.2, y: 0.5 },
            { x: 0.8, y: 0.5 },
          ],
          transport: "car",
          duration: 0.4,
        },
        {
          id: "seed-6",
          points: [
            { x: 0.2, y: 0.54 },
            { x: 0.8, y: 0.54 },
          ],
          transport: "car",
          duration: 0.4,
        },
        {
          id: "seed-7",
          points: [
            { x: 0.2, y: 0.5800000000000001 },
            { x: 0.8, y: 0.5800000000000001 },
          ],
          transport: "car",
          duration: 0.4,
        },
      ],
      showPlaces: true,
    },
    static: {
      id: "static",
      name: "仅展示封面",
      parentId: "root",
      children: [],
      media: [],
      map: null,
      pins: [],
      coverAsset: {
        id: "independent",
        path: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22%23dce5d4%22%2F%3E%3Cpath%20d%3D%22M0%20500Q350%20200%20600%20430T1200%20250%22%20stroke%3D%22%23f1e5b5%22%20stroke-width%3D%2270%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M200%200L380%20800M800%200L640%20800%22%20stroke%3D%22%23f5f4e2%22%20stroke-width%3D%2224%22%2F%3E%3C%2Fsvg%3E",
        name: "封面.png",
        type: "image",
        time: 1,
        missing: false,
      },
    },
    playable: {
      id: "playable",
      name: "正常素材入口",
      parentId: "root",
      children: [],
      media: [
        {
          id: "photo",
          path: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22%23dce5d4%22%2F%3E%3Cpath%20d%3D%22M0%20500Q350%20200%20600%20430T1200%20250%22%20stroke%3D%22%23f1e5b5%22%20stroke-width%3D%2270%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M200%200L380%20800M800%200L640%20800%22%20stroke%3D%22%23f5f4e2%22%20stroke-width%3D%2224%22%2F%3E%3C%2Fsvg%3E",
          name: "封面.png",
          type: "image",
          time: 1,
          missing: false,
        },
      ],
      map: null,
      pins: [],
    },
    hidden: {
      id: "hidden",
      name: "隐藏空地点",
      parentId: "root",
      children: [],
      media: [],
      map: null,
      pins: [],
    },
  },
};
fixture.nodes.root.routes = [
  {
    id: "arc",
    points: [
      { x: 0.25, y: 0.65 },
      { x: 0.5, y: 0.65 },
      { x: 0.75, y: 0.65 },
    ],
    transport: "plane",
    duration: 1.5,
  },
  {
    id: "old-line",
    points: [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
    ],
    transport: "car",
    duration: 1,
  },
];
fixture.nodes.root.showPlaces = false;
fixture.nodes.root.pins = [
  { nodeId: "static", x: 0.4, y: 0.85 },
  { nodeId: "playable", x: 0.6, y: 0.85 },
  { nodeId: "hidden", x: 0.5, y: 0.95 },
];
fixture.id = "tree-and-zoom";
fixture.name = "树与缩放测试";
fixture.rootId = "root";
fixture.nodes = {
  root: {
    id: "root",
    name: "旅行目录",
    parentId: null,
    children: [],
    media: [],
    map: null,
    pins: [],
  },
};
for (let i = 0; i < 60; i++) {
  const id = "city" + i;
  fixture.nodes.root.children.push(id);
  const photos = Array.from({ length: i === 35 || i === 36 ? 30 : 3 }, (_, j) =>
    media(id + "-photo" + j, "地点" + i + "照片" + j),
  );
  fixture.nodes[id] = {
    id,
    name: "地点" + i,
    parentId: "root",
    children: [id + "a", id + "b"],
    media: photos,
    map: null,
    pins: [],
  };
  for (const suffix of ["a", "b"])
    fixture.nodes[id + suffix] = {
      id: id + suffix,
      name: "子地点" + i + suffix,
      parentId: id,
      children: [],
      media: [],
      map: null,
      pins: [],
    };
}
fixture.nodes.city35.media[2] = {
  id: "zoom-video",
  name: "缩放视频.mp4",
  type: "video",
  time: 1,
  path: "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAQbbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAA0V0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAUAAAADwAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAIAAABAAAAAAK9bWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAUABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACaG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAihzdGJsAAAAwHN0c2QAAAAAAAAAAQAAALBhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAUAA8ABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANmF2Y0MBZAAM/+EAGWdkAAys2UFB+wEQAAADABAAAAMBQPFCmWABAAZo6+PLIsD9+PgAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAAmTQAAJk0AAAAGHN0dHMAAAAAAAAAAQAAABQAAAQAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAACgY3R0cwAAAAAAAAASAAAAAQAACAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAAwAACAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAUAAAAAQAAAGRzdHN6AAAAAAAAAAAAAAAUAAAQOwAAA1YAAADIAAAAZQAAAFkAAALOAAAAsQAAAFIAAABKAAABfwAAAfIAAAGFAAAC6QAAAMEAAABZAAAAUgAAAlkAAADFAAAAYQAAAFEAAAAUc3RjbwAAAAAAAAABAAAESwAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAACZVbWRhdAAAAq4GBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxNzIgYzFjOTkzMSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz03IGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0xMCBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAADYVliIQAEf/+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",
};
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ fixture }) => {
      let opened;
      window.desktop = {
        newProject: async () => "test.travel",
        open: async () => ({
          project: window.savedProject || fixture,
          path: "F:\\旅行\\欧洲.travel",
        }),
        save: async (p) => {
          window.savedProject = structuredClone(p);
          return "F:\\旅行\\欧洲.travel";
        },
        pick: async () => [],
        import: async () => ({ items: [], duplicates: 0, unsupported: 0 }),
        map: async () => null,
        check: async (p) => p,
        relink: async () => null,
        url: (id) =>
          Object.values(fixture.nodes)
            .flatMap((n) => [...n.media, ...(n.map ? [n.map] : [])])
            .find((m) => m.id === id)?.path || "",
        dropped: () => [],
        fullscreen: async () => {},
        onOpen: (fn) => {
          opened = fn;
          return () => {};
        },
        onFlush: () => {},
      };
    },
    { fixture },
  );
  await page.goto(process.env.TRAVEL_TEST_URL || "http://127.0.0.1:5173");
  await page.getByRole("button", { name: "打开项目", exact: true }).click();

  try {
    const nav = page.locator(".sidebar nav");
    await nav.evaluate((el) => {
      window.originalNav = el;
      const row = el.querySelector('.tree-row[data-place-id="city35"]');
      el.scrollTop +=
        row.getBoundingClientRect().top - el.getBoundingClientRect().top - 60;
    });
    const scroll = await nav.evaluate((el) => el.scrollTop);
    assert(scroll > 500);
    const city = (id) =>
      page.locator('.tree-row[data-place-id="' + id + '"] > .tree-item');
    await city("city35").click();
    await page.getByRole("heading", { name: "地点35", exact: true }).waitFor();
    assert(await nav.evaluate((el) => el === window.originalNav));
    assert.equal(await nav.evaluate((el) => el.scrollTop), scroll);
    await page.locator(".workspace").evaluate((el) => {
      window.previousWorkspace = el;
      el.scrollTop = 250;
    });
    assert(
      (await page.locator(".workspace").evaluate((el) => el.scrollTop)) > 0,
    );
    await city("city36").click();
    await page.getByRole("heading", { name: "地点36", exact: true }).waitFor();
    assert(await nav.evaluate((el) => el === window.originalNav));
    assert.equal(await nav.evaluate((el) => el.scrollTop), scroll);
    assert.equal(
      await page.locator(".workspace").evaluate((el) => el.scrollTop),
      0,
    );
    assert(
      await page
        .locator(".workspace")
        .evaluate((el) => el !== window.previousWorkspace),
    );
    await page.getByRole("button", { name: "折叠地点36", exact: true }).click();
    assert.equal(
      await page.locator('.tree-row[data-place-id="city36a"]').count(),
      0,
    );
    for (let i = 0; i < 3; i++) {
      await city("city35").click();
      await city("city36").click();
      assert.equal(await nav.evaluate((el) => el.scrollTop), scroll);
    }
    await city("city35").focus();
    await city("city35").press("Enter");
    assert.equal(await nav.evaluate((el) => el.scrollTop), scroll);
    assert(await nav.evaluate((el) => el === window.originalNav));
    await page.screenshot({ path: "artifacts/tree-scroll-preserved.png" });
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".presentation");
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    const scale = async () =>
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      );
    assert.equal(await scale(), 0.8);
    const mediaStage = stage.locator(".media-zoom-stage");
    const photo = stage.locator(".slide>img");
    const originalSource = await photo.getAttribute("src");
    const rotation = () => mediaStage.getAttribute("data-media-rotation");
    const leftRotate = stage.getByRole("button", {
      name: "向左旋转 90°",
      exact: true,
    });
    const rightRotate = stage.getByRole("button", {
      name: "向右旋转 90°",
      exact: true,
    });
    await rightRotate.click();
    assert.equal(await rotation(), "90");
    const rotatedBox = await photo.boundingBox(),
      hostBox = await mediaStage.boundingBox();
    assert(Math.abs(rotatedBox.width - hostBox.width * 0.8) < 2);
    assert(Math.abs(rotatedBox.height - hostBox.height * 0.8) < 2);
    await leftRotate.click();
    assert.equal(await rotation(), "0");
    for (let i = 0; i < 4; i++) await leftRotate.click();
    assert.equal(await rotation(), "-360");
    await rightRotate.click();
    assert.equal(await rotation(), "-270");
    assert.equal(await photo.getAttribute("src"), originalSource);
    await page.screenshot({ path: "artifacts/presentation-rotation.png" });
    while (
      !(await stage
        .getByRole("button", { name: "缩小素材", exact: true })
        .isDisabled())
    )
      await stage
        .getByRole("button", { name: "缩小素材", exact: true })
        .click();
    assert.equal(await scale(), 0.5);
    while (
      !(await stage
        .getByRole("button", { name: "放大素材", exact: true })
        .isDisabled())
    )
      await stage
        .getByRole("button", { name: "放大素材", exact: true })
        .click();
    assert.equal(await scale(), 5);
    const area = await stage.locator(".media-zoom-stage").boundingBox();
    await page.mouse.move(area.width / 2, area.height / 2);
    await page.mouse.down();
    await page.mouse.move(area.width / 2 + 130, area.height / 2 + 80, {
      steps: 8,
    });
    await page.mouse.up();
    assert(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-pan-x"),
      ) > 0,
    );
    assert(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-pan-y"),
      ) > 0,
    );
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(15);
    }
    assert.equal(await scale(), 0.5);
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(15);
    }
    assert.equal(await scale(), 5);
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(await scale(), 0.8);
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-pan-x"),
      ),
      0,
    );
    await page.keyboard.press("ArrowRight");
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    assert.equal(await scale(), 0.8);
    assert.equal(await rotation(), "0");
    assert(
      (await stage.locator(".slide-counter").textContent()).includes("02"),
    );
    await page.keyboard.press("ArrowRight");
    const video = stage.locator(".slide>video");
    await video.waitFor();
    assert.equal(await leftRotate.count(), 0);
    assert.equal(await rightRotate.count(), 0);
    await video.evaluate((el) =>
      el.readyState >= 1
        ? Promise.resolve()
        : new Promise((resolve) =>
            el.addEventListener("loadedmetadata", resolve, { once: true }),
          ),
    );
    assert.equal(await scale(), 0.8);
    await stage.getByRole("button", { name: "放大素材", exact: true }).click();
    assert.equal(await scale(), 1);
    assert.equal(await video.evaluate((el) => el.controls), false);
    await stage.getByRole("button", { name: "播放视频", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector(".slide>video")?.paused === false,
    );
    await stage.getByRole("button", { name: "暂停视频", exact: true }).click();
    assert.equal(await video.evaluate((el) => el.paused), true);
    const seek = stage.getByLabel("视频播放进度");
    await seek.press("Home");
    await seek.press("ArrowRight");
    await seek.press("ArrowRight");
    await page.waitForTimeout(150);
    assert((await video.evaluate((el) => el.currentTime)) > 0.05);
    assert(
      (await stage.locator(".slide-counter").textContent()).includes("03"),
    );
    await stage.getByRole("button", { name: "静音", exact: true }).click();
    assert.equal(await video.evaluate((el) => el.muted), true);
    await video.evaluate((el) => {
      el.currentTime = el.duration - 0.3;
      return el.play();
    });
    await page.waitForFunction(
      () => document.querySelector(".slide>video")?.ended === true,
    );
    await stage
      .getByRole("button", { name: "播放视频", exact: true })
      .waitFor();
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(await scale(), 0.8);
    assert.equal(await video.evaluate((el) => el.controls), false);
    assert.equal(await stage.getByLabel("视频播放进度").count(), 1);
    assert.deepEqual(errors, []);
    console.log(
      "Tree and media zoom passed: stable tree DOM/scroll across pointer and keyboard navigation, right-pane reset, branch state, image/video 0.5–5 zoom, wheel/pan/reset, per-item reset and video controls.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

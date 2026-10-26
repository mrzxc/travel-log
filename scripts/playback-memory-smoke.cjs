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
fixture.nodes.root.routes = [
  {
    id: "root-1",
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
    ],
    transport: "car",
    duration: 0.25,
  },
  {
    id: "root-2",
    points: [
      { x: 0.2, y: 0.45 },
      { x: 0.8, y: 0.45 },
    ],
    controls: [{ x: 0.5, y: 0.1 }],
    transport: "plane",
    duration: 4,
  },
  {
    id: "root-3",
    points: [
      { x: 0.2, y: 0.6 },
      { x: 0.8, y: 0.6 },
    ],
    transport: "train",
    duration: 0.25,
  },
];
fixture.nodes.root.media = [media("root-photo", "本层素材")];
fixture.nodes.root.showPlaceNames = true;
fixture.nodes.root.pins = [{ nodeId: "playable", x: 0.7, y: 0.8 }];
fixture.nodes.playable.children = ["grand"];
fixture.nodes.playable.map = media("child-map", "子层地图");
fixture.nodes.playable.pins = [{ nodeId: "grand", x: 0.65, y: 0.8 }];
fixture.nodes.playable.routes = [
  {
    id: "child-1",
    points: [
      { x: 0.2, y: 0.4 },
      { x: 0.8, y: 0.4 },
    ],
    controls: [{ x: 0.5, y: 0.1 }],
    transport: "jeep",
    duration: 4,
  },
];
fixture.nodes.grand = {
  id: "grand",
  name: "孙层影像",
  parentId: "playable",
  children: [],
  media: [media("grand-photo", "孙层照片")],
  map: null,
  pins: [],
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
    const stage = page.locator(".presentation");
    const current = () =>
      stage.locator(".presentation-map:not(.mini-map) .map-canvas");
    async function phase() {
      return current().evaluate((el) => ({
        id: el.dataset.mapNode,
        step: Number(el.dataset.playbackStep),
        progress: Number(el.dataset.playbackProgress),
        paused: el.dataset.playbackPaused === "true",
      }));
    }
    async function waitMap(id) {
      await page.waitForFunction(
        (id) =>
          document
            .querySelector(".presentation-map:not(.mini-map) .map-canvas")
            ?.getAttribute("data-map-node") === id,
        id,
      );
      await current()
        .locator(".map-image")
        .evaluate((img) => img.decode());
    }
    async function done() {
      await page.waitForFunction(
        () =>
          Number(
            document
              .querySelector(".presentation-map:not(.mini-map) .map-canvas")
              ?.getAttribute("data-playback-progress"),
          ) === 1,
      );
    }
    async function partial(step) {
      await page.waitForFunction((step) => {
        const el = document.querySelector(
            ".presentation-map:not(.mini-map) .map-canvas",
          ),
          p = Number(el?.getAttribute("data-playback-progress"));
        return (
          Number(el?.getAttribute("data-playback-step")) === step &&
          p > 0.12 &&
          p < 0.85
        );
      }, step);
    }
    async function leave(title) {
      const pin = current().locator('.map-pin[title="' + title + '"]');
      await pin.evaluate((el) =>
        el.addEventListener(
          "pointerup",
          () => {
            const c = document.querySelector(
              ".presentation-map:not(.mini-map) .map-canvas",
            );
            window.lastMapSnapshot = {
              id: c.dataset.mapNode,
              step: Number(c.dataset.playbackStep),
              progress: Number(c.dataset.playbackProgress),
            };
          },
          { capture: true, once: true },
        ),
      );
      await pin.locator(".stack-button").click();
      return page.evaluate(() => window.lastMapSnapshot);
    }
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await waitMap("root");
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await done();
    assert.equal((await phase()).step, 1);
    await leave("正常素材入口");
    await waitMap("playable");
    assert.equal((await phase()).step, 0);
    await stage.locator(".presentation-crumb button").first().click();
    await waitMap("root");
    assert.deepEqual(await phase(), {
      id: "root",
      step: 1,
      progress: 1,
      paused: false,
    });
    assert.equal(await current().locator("[data-route]").count(), 1);
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await partial(2);
    await stage.getByTitle("放大", { exact: true }).click();
    const view = await current()
      .locator(".map-sheet")
      .evaluate((el) => el.style.transform);
    const parentSnapshot = await leave("正常素材入口");
    await waitMap("playable");
    assert.equal((await phase()).step, 0);
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await partial(1);
    const childSnapshot = await leave("孙层影像");
    await page.locator(".slide>img").evaluate((img) => img.decode());
    await page.waitForTimeout(400);
    await stage
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    await waitMap("playable");
    let restored = await phase();
    assert.equal(restored.step, childSnapshot.step);
    assert(Math.abs(restored.progress - childSnapshot.progress) < 0.02);
    assert(restored.paused);
    const childProgress = restored.progress;
    await page.waitForTimeout(250);
    assert.equal(
      (await phase()).progress,
      childProgress,
      "Hidden maps must not advance in the background",
    );
    await stage.locator(".presentation-crumb button").first().click();
    await waitMap("root");
    restored = await phase();
    assert.equal(restored.step, 2);
    assert(Math.abs(restored.progress - parentSnapshot.progress) < 0.02);
    assert(restored.paused);
    assert.equal(await current().locator("[data-route]").count(), 2);
    assert.equal(
      await current()
        .locator(".map-sheet")
        .evaluate((el) => el.style.transform),
      view,
    );
    await page.screenshot({ path: "artifacts/restored-map-animation.png" });
    const parentProgress = restored.progress;
    await page.waitForTimeout(250);
    assert.equal((await phase()).progress, parentProgress);
    await stage.getByRole("button", { name: "继续本步", exact: true }).click();
    await page.waitForFunction(
      (p) =>
        Number(
          document.querySelector(".presentation-map:not(.mini-map) .map-canvas")
            .dataset.playbackProgress,
        ) >
        p + 0.04,
      parentProgress,
    );
    await stage.getByRole("button", { name: /查看本地点素材/ }).click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    const mini = stage.locator(".mini-map .map-canvas");
    const miniProgress = Number(
      await mini.getAttribute("data-playback-progress"),
    );
    await page.waitForTimeout(350);
    assert.equal(
      Number(await mini.getAttribute("data-playback-progress")),
      miniProgress,
    );
    await stage.locator(".mini-map-shield").click();
    await waitMap("root");
    assert.equal((await phase()).progress, miniProgress);
    assert((await phase()).paused);
    await stage.getByRole("button", { name: "继续本步", exact: true }).click();
    await stage.getByRole("button", { name: "完成本步", exact: true }).click();
    assert.equal((await phase()).progress, 1);
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await done();
    assert.equal((await phase()).step, 3);
    await leave("正常素材入口");
    await waitMap("playable");
    assert.equal((await phase()).progress, childProgress);
    await stage.getByRole("button", { name: "继续本步", exact: true }).click();
    await stage.getByRole("button", { name: "完成本步", exact: true }).click();
    await stage.locator(".presentation-crumb button").first().click();
    await waitMap("root");
    assert.equal((await phase()).step, 3);
    assert.equal((await phase()).progress, 1);
    await stage.getByRole("button", { name: "重播", exact: true }).click();
    assert.equal((await phase()).step, 0);
    await leave("正常素材入口");
    await waitMap("playable");
    assert.equal((await phase()).step, 1);
    assert.equal((await phase()).progress, 1);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await waitMap("root");
    assert.equal((await phase()).step, 0);
    await leave("正常素材入口");
    await waitMap("playable");
    assert.equal((await phase()).step, 0);
    assert.deepEqual(errors, []);
    console.log(
      "Playback memory passed: completed and partial states restored per level, grandchild and breadcrumb navigation, paused background/mini map, continue, replay isolation and fresh presentation reset.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

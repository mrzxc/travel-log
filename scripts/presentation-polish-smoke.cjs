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
    const noteText =
      "夕阳下的旅途记录\n" +
      Array.from(
        { length: 14 },
        (_, i) => "第" + (i + 1) + "行：沿途的故事和当时的心情。",
      ).join("\n") +
      "\n<b>只是文字，不是 HTML</b>";
    await page
      .getByRole("button", { name: /预览素材/ })
      .first()
      .click();
    let detail = page.getByRole("dialog", { name: "素材详情", exact: true });
    await detail.getByLabel("图片备注").fill(noteText);
    await page.waitForTimeout(650);
    assert.equal(
      (await page.evaluate(() => window.savedProject)).nodes.root.media[0].note,
      noteText,
    );
    await detail
      .getByRole("button", { name: "关闭素材详情", exact: true })
      .click();
    await page.getByTitle("打开项目", { exact: true }).click();
    await page
      .getByRole("button", { name: /预览素材/ })
      .first()
      .click();
    detail = page.getByRole("dialog", { name: "素材详情", exact: true });
    assert.equal(await detail.getByLabel("图片备注").inputValue(), noteText);
    await detail
      .getByRole("button", { name: "关闭素材详情", exact: true })
      .click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".presentation");
    const canvas = () =>
      stage.locator(".presentation-map:not(.mini-map) .map-canvas");
    const opacity = (el) => Number(getComputedStyle(el).opacity);
    await page.mouse.move(700, 500);
    await page.waitForTimeout(250);
    assert.equal(await canvas().locator(".map-tools").evaluate(opacity), 0.25);
    assert.equal(
      await canvas().locator(".route-controls").evaluate(opacity),
      0.25,
    );
    assert.equal(
      await canvas().locator(".map-pin").first().evaluate(opacity),
      1,
    );
    assert.equal(await canvas().locator(".route-layer").evaluate(opacity), 1);
    await canvas().locator(".map-tools").hover();
    await page.waitForTimeout(240);
    assert.equal(await canvas().locator(".map-tools").evaluate(opacity), 1);
    await page.mouse.move(700, 500);
    await canvas().locator(".map-tools button").first().focus();
    await page.waitForTimeout(240);
    assert.equal(await canvas().locator(".map-tools").evaluate(opacity), 1);
    await canvas()
      .locator(".map-tools button")
      .first()
      .evaluate((el) => el.blur());
    await page.waitForTimeout(240);
    assert.equal(await canvas().locator(".map-tools").evaluate(opacity), 0.25);
    await canvas().locator(".route-controls").hover();
    await page.waitForTimeout(240);
    assert.equal(
      await canvas().locator(".route-controls").evaluate(opacity),
      1,
    );
    await canvas()
      .locator('.map-pin[data-pin-node="playable"] .stack-button')
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".presentation-stage")?.dataset.transition ===
        "open",
    );
    assert(
      await stage
        .locator(".presentation-stage")
        .evaluate((el) => el.getAnimations().length > 0),
    );
    await page.waitForFunction(
      () => !document.querySelector(".presentation-stage")?.dataset.transition,
    );
    assert.equal(await canvas().getAttribute("data-map-node"), "playable");
    await stage.getByRole("button", { name: /查看本地点素材/ }).click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      ),
      0.8,
    );
    assert.equal(await stage.locator(".picture-note").count(), 0);
    await page.waitForFunction(
      () => !document.querySelector(".presentation-stage")?.dataset.transition,
    );
    await stage.getByRole("button", { name: "返回地图", exact: true }).click();
    assert.equal(await stage.locator(".presentation-exit-ghost").count(), 1);
    await stage
      .locator(".presentation-exit-ghost")
      .waitFor({ state: "detached" });
    await stage.locator(".presentation-crumb button").first().click();
    await stage
      .locator(".presentation-exit-ghost")
      .waitFor({ state: "detached" });
    assert.equal(await canvas().getAttribute("data-map-node"), "root");
    await stage.getByRole("button", { name: /查看本地点素材/ }).click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    await page.waitForFunction(
      () => document.querySelector(".slide>img")?.getAnimations().length > 0,
    );
    await page.waitForFunction(
      () => !document.querySelector(".presentation-stage")?.dataset.transition,
    );
    const note = stage.getByRole("complementary", {
      name: "图片备注",
      exact: true,
    });
    assert.equal(await note.locator("p").textContent(), noteText);
    const compact = await note
      .locator("p")
      .evaluate((el) => ({
        height: el.clientHeight,
        line: Number.parseFloat(getComputedStyle(el).lineHeight),
      }));
    assert(compact.height <= compact.line * 3 + 2);
    await note.getByRole("button", { name: "展开备注", exact: true }).click();
    assert.equal(
      await note
        .getByRole("button", { name: "收起备注", exact: true })
        .getAttribute("aria-expanded"),
      "true",
    );
    const expanded = await note
      .locator("p")
      .evaluate((el) => ({ height: el.clientHeight, scroll: el.scrollHeight }));
    assert(expanded.height < expanded.scroll);
    assert.equal(await note.locator("b").count(), 0);
    const width = (await note.boundingBox()).width;
    await stage.getByRole("button", { name: "放大素材", exact: true }).click();
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      ),
      1,
    );
    assert.equal((await note.boundingBox()).width, width);
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      ),
      0.8,
    );
    await note.getByRole("button", { name: "收起备注", exact: true }).click();
    await page.screenshot({ path: "artifacts/presentation-notes-80.png" });
    await page.setViewportSize({ width: 1000, height: 800 });
    const narrow = await page.evaluate(() => ({
      note: document.querySelector(".picture-note").getBoundingClientRect()
        .left,
      map: document.querySelector(".mini-map").getBoundingClientRect().right,
    }));
    assert(
      narrow.note > narrow.map,
      "Notes do not cover the miniature map in a narrow window",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await stage.getByRole("button", { name: "返回地图", exact: true }).click();
    assert.equal(await stage.locator(".presentation-exit-ghost").count(), 0);
    await canvas()
      .locator('.map-pin[data-pin-node="playable"] .stack-button')
      .click();
    assert.equal(
      await stage
        .locator(".presentation-stage")
        .getAttribute("data-transition"),
      null,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Presentation polish passed: notes edit/save/reopen, album open/reverse, image fade, tools 25% hover/focus, 80% default/reset, long/plain-text notes, empty-note layout and reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

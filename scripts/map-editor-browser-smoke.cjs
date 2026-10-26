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
        open: async () => ({ project: fixture, path: "F:\\旅行\\欧洲.travel" }),
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

  await page.getByRole("button", { name: /地图与标点/ }).click();
  await page.locator(".map-editor .map-image").evaluate((img) => img.decode());
  const canvas = page.locator(".map-editor .map-canvas"),
    sheet = canvas.locator(".map-sheet");
  await canvas.scrollIntoViewIfNeeded();
  const scroll = await page
    .locator(".workspace")
    .evaluate((el) => el.scrollTop);
  const box = await canvas.boundingBox(),
    anchor = { x: box.x + box.width * 0.52, y: box.y + box.height * 0.75 };
  const before = await sheet.boundingBox();
  const coordinate = {
    x: (anchor.x - before.x) / before.width,
    y: (anchor.y - before.y) / before.height,
  };
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator(".workspace").evaluate((el) => el.scrollTop),
    scroll,
    "Map wheel must not scroll the page",
  );
  const after = await sheet.boundingBox();
  assert(after.width > before.width);
  assert(
    Math.abs((anchor.x - after.x) / after.width - coordinate.x) < 0.002,
    "Zoom must anchor on the pointer",
  );
  const transform = await sheet.evaluate((el) => el.style.transform);
  await page.getByLabel("交通工具", { exact: true }).selectOption("jeep");
  await page.getByRole("button", { name: "+ 绘制路线", exact: true }).click();
  await page.getByRole("button", { name: "放大编辑", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /地图编辑/ });
  await dialog.waitFor();
  const viewport =
    page.viewportSize() ||
    (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
  const full = await dialog.boundingBox();
  assert.equal(full.x, 0);
  assert.equal(full.y, 0);
  assert.equal(Math.round(full.width), viewport.width);
  assert.equal(
    await dialog.locator(".map-sheet").evaluate((el) => el.style.transform),
    transform,
  );
  assert.equal(
    await dialog.getByLabel("交通工具", { exact: true }).inputValue(),
    "jeep",
  );
  assert.equal(
    await page
      .locator(".workspace")
      .evaluate((el) => getComputedStyle(el).overflow),
    "hidden",
  );
  await dialog.getByRole("button", { name: "地点与标点", exact: true }).click();
  assert.equal(
    await dialog.locator(".left-panel").getAttribute("class"),
    "map-editor-panel left-panel is-collapsed",
  );
  await dialog.getByRole("button", { name: "地点与标点", exact: true }).click();
  await dialog.getByRole("button", { name: "路线与动画", exact: true }).click();
  await dialog.getByRole("button", { name: "路线与动画", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("交通工具", { exact: true }).inputValue(),
    "jeep",
  );
  const center = await dialog.boundingBox();
  await page.mouse.click(center.width * 0.46, center.height * 0.44);
  await page.mouse.click(center.width * 0.55, center.height * 0.61);
  assert.equal(await dialog.locator(".route-layer > circle").count(), 2);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".expanded-map-editor").count(), 0);
  assert.equal(
    await canvas.locator(".route-layer > circle").count(),
    2,
    "Draft must survive exiting the expanded editor",
  );
  await page.getByRole("button", { name: "放大编辑", exact: true }).click();
  await dialog.getByRole("button", { name: "完成路线", exact: true }).click();
  assert.equal(await dialog.locator("[data-route]").count(), 9);
  await dialog.getByLabel("显示地点名称").uncheck();
  assert.equal(await dialog.locator(".map-pin").count(), 3);
  assert.equal(await dialog.locator(".pin-name:visible").count(), 0);
  await dialog.getByLabel("显示地点名称").check();
  assert.equal(await dialog.locator(".map-pin").count(), 3);
  await dialog.getByTitle("完整显示地图", { exact: true }).click();
  const panel = dialog.locator(".right-panel .panel-body");
  const panelbox = await panel.boundingBox();
  const scaleBefore = await dialog
    .locator(".map-sheet")
    .evaluate((el) => el.style.transform);
  await page.mouse.move(
    panelbox.x + panelbox.width / 2,
    panelbox.y + panelbox.height / 2,
  );
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  assert(
    (await panel.evaluate((el) => el.scrollTop)) > 0,
    "Tools panel must scroll independently",
  );
  assert.equal(
    await dialog.locator(".map-sheet").evaluate((el) => el.style.transform),
    scaleBefore,
    "Tools scrolling must not zoom the map",
  );
  assert.equal(
    await page.locator(".workspace").evaluate((el) => el.scrollTop),
    scroll,
  );
  await dialog.getByRole("button", { name: "路线与动画", exact: true }).click();
  await dialog.getByRole("button", { name: "路线与动画", exact: true }).click();
  await dialog.getByTitle("移除标点：隐藏空地点", { exact: true }).click();
  await dialog.getByLabel("要标记的地点").selectOption("hidden");
  await dialog.getByRole("button", { name: "添加标点", exact: true }).click();
  assert.equal(await dialog.locator(".map-pin").count(), 3);
  const pin = dialog.locator(".map-pin").filter({ hasText: "仅展示封面" }),
    pinbox = await pin.boundingBox();
  await page.mouse.move(
    pinbox.x + pinbox.width / 2,
    pinbox.y + pinbox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    pinbox.x + pinbox.width / 2 + 45,
    pinbox.y + pinbox.height / 2 + 25,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.screenshot({ path: "artifacts/full-window-map-editor.png" });
  await dialog.getByRole("button", { name: /完成编辑/ }).click();
  assert.equal(await page.locator(".expanded-map-editor").count(), 0);
  assert.equal(
    await page
      .locator(".workspace")
      .evaluate((el) => getComputedStyle(el).overflow),
    "auto",
  );
  assert.equal(
    await page.locator(".workspace").evaluate((el) => el.scrollTop),
    scroll,
  );
  await page.waitForTimeout(800);
  const saved = await page.evaluate(() => window.savedProject);
  assert.equal(saved.nodes.root.routes.length, 9);
  assert.equal(saved.nodes.root.routes[8].transport, "jeep");
  assert(
    saved.nodes.root.pins.find((p) => p.nodeId === "static").x > 0.3,
    "Dragged place position must be saved",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Map editor passed: full window, floating panels, anchored zoom, scroll isolation, independent tool scrolling, draft and vehicle retention, pin editing and autosave.",
  );

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

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
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page
      .locator(".map-editor .map-image")
      .evaluate((img) => img.decode());
    await page.getByRole("button", { name: "放大编辑", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /地图编辑/ });
    const names = dialog.getByLabel("显示地点名称");
    assert.equal(
      await names.isChecked(),
      false,
      "Legacy false is migrated to name visibility",
    );
    assert.equal(
      await dialog.locator(".map-pin").count(),
      3,
      "Album markers remain present with names hidden",
    );
    assert.equal(await dialog.locator(".pin-name:visible").count(), 0);
    const albumBefore = await dialog
      .locator(".map-pin .photo-stack")
      .first()
      .boundingBox();
    await names.check();
    assert.equal(await dialog.locator(".pin-name:visible").count(), 3);
    const albumAfter = await dialog
      .locator(".map-pin .photo-stack")
      .first()
      .boundingBox();
    assert.deepEqual(
      albumBefore,
      albumAfter,
      "Toggling names must not move album artwork",
    );
    await names.uncheck();
    const arc = dialog.locator('[data-route="arc"]'),
      old = dialog.locator('[data-route="old-line"] [data-route-line]');
    const oldPath = await old.getAttribute("d");
    assert(!oldPath.includes("Q"));
    assert(
      !(await arc.locator("[data-route-line]").getAttribute("d")).includes("Q"),
      "Old routes start straight",
    );
    await dialog.getByTitle("放大", { exact: true }).click();
    const view = await dialog
      .locator(".map-sheet")
      .evaluate((el) => el.style.transform);
    const initialPoint = await arc
      .locator('[data-route-segment="0"]')
      .evaluate((path) => {
        const p = path.getPointAtLength(path.getTotalLength() / 2),
          screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM());
        return { x: screen.x, y: screen.y };
      });
    await page.mouse.click(initialPoint.x, initialPoint.y);
    async function bend(index, dy) {
      const target = arc.locator('[data-route-segment="' + index + '"]');
      const position = await target.evaluate((path) => {
        const p = path.getPointAtLength(path.getTotalLength() / 2);
        const point = new DOMPoint(p.x, p.y).matrixTransform(
          path.getScreenCTM(),
        );
        return { x: point.x, y: point.y };
      });
      await page.mouse.move(position.x, position.y);
      await page.mouse.down();
      await page.mouse.move(position.x, position.y + dy, { steps: 8 });
      await page.mouse.up();
    }
    await bend(0, -75);
    let drawn = await arc.locator("[data-route-line]").getAttribute("d");
    assert.equal((drawn.match(/Q /g) || []).length, 1);
    assert.equal(
      await dialog.locator(".map-sheet").evaluate((el) => el.style.transform),
      view,
      "Route dragging must not pan the map",
    );
    await bend(1, 65);
    drawn = await arc.locator("[data-route-line]").getAttribute("d");
    assert.equal((drawn.match(/Q /g) || []).length, 2);
    assert.equal(
      await old.getAttribute("d"),
      oldPath,
      "Editing another route must preserve existing lines",
    );
    await page.waitForTimeout(650);
    const saved = await page.evaluate(() => window.savedProject);
    assert.deepEqual(
      saved.nodes.root.routes[0].points,
      fixture.nodes.root.routes[0].points,
      "All segment endpoints stay fixed",
    );
    assert(saved.nodes.root.routes[0].controls[0].y < 0.65);
    assert(saved.nodes.root.routes[0].controls[1].y > 0.65);
    assert.equal(saved.nodes.root.showPlaceNames, false);
    assert.equal(saved.nodes.root.showPlaces, undefined);
    await page.screenshot({ path: "artifacts/curved-map-editor.png" });
    await dialog.getByRole("button", { name: /完成编辑/ }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const presentation = page.locator(".presentation");
    assert.equal(await presentation.locator(".map-pin").count(), 2);
    assert.equal(await presentation.locator(".pin-name:visible").count(), 0);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    const animation = await presentation
      .locator('[data-route="arc"]')
      .evaluate((group) => {
        const path = group.querySelector("[data-route-line]"),
          arrow = group.querySelector("[data-route-arrow]"),
          icon = group.querySelector("foreignObject");
        const p = path.getPointAtLength(path.getTotalLength()),
          previous = path.getPointAtLength(
            Math.max(0, path.getTotalLength() - 0.1),
          );
        const matrix = arrow.transform.baseVal.consolidate().matrix;
        return {
          curve: path.getAttribute("d"),
          x: p.x,
          y: p.y,
          arrowX: matrix.e,
          arrowY: matrix.f,
          angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
          tangent:
            (Math.atan2(p.y - previous.y, p.x - previous.x) * 180) / Math.PI,
          iconX: Number(icon.getAttribute("x")) + 16,
          iconY: Number(icon.getAttribute("y")) + 42,
        };
      });
    assert(animation.curve.includes("Q"));
    assert(Math.abs(animation.x - animation.arrowX) < 0.02);
    assert(Math.abs(animation.y - animation.arrowY) < 0.02);
    assert(Math.abs(animation.angle - animation.tangent) < 2);
    assert(Math.abs(animation.iconX - animation.arrowX) < 0.02);
    assert(Math.abs(animation.iconY - animation.arrowY) < 0.02);
    await presentation
      .getByRole("button", { name: "完成本步", exact: true })
      .click();
    const endpoint = await presentation
      .locator('[data-route="arc"] [data-route-line]')
      .evaluate((path) => {
        const p = path.getPointAtLength(path.getTotalLength());
        return { x: p.x, y: p.y };
      });
    const width = await presentation
        .locator(".map-sheet")
        .evaluate((el) => el.offsetWidth),
      height = await presentation
        .locator(".map-sheet")
        .evaluate((el) => el.offsetHeight);
    assert(Math.abs(endpoint.x - width * 0.75) < 1);
    assert(Math.abs(endpoint.y - height * 0.65) < 1);
    await presentation
      .locator('.map-pin[title="正常素材入口"] .stack-button')
      .click();
    await page.locator(".slide>img").waitFor();
    await page.keyboard.press("Escape");
    await page.getByTitle("打开项目", { exact: true }).click();
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page.getByRole("button", { name: "放大编辑", exact: true }).click();
    const reopened = page.getByRole("dialog", { name: /地图编辑/ });
    assert(
      (
        await reopened
          .locator('[data-route="arc"] [data-route-line]')
          .getAttribute("d")
      ).includes("Q"),
      "Saved curves survive reopening",
    );
    assert.equal(await reopened.getByLabel("显示地点名称").isChecked(), false);
    await reopened.getByTitle("恢复直线", { exact: true }).click();
    assert(
      !(
        await reopened
          .locator('[data-route="arc"] [data-route-line]')
          .getAttribute("d")
      ).includes("Q"),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Curved route UI passed: independent segment dragging under zoom, fixed endpoints, arc animation and tangent, vehicle follows, old routes and projects preserved, labels-only toggle, album entry, persistence and straighten.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

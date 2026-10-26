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
fixture.nodes.root.routes.push({
  id: "spare",
  points: [
    { x: 0.3, y: 0.18 },
    { x: 0.7, y: 0.18 },
  ],
  transport: "jeep",
  duration: 2,
});
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
    const dialog = page.getByRole("dialog", { name: /地图编辑/ }),
      arc = dialog.locator('[data-route="arc"]');
    const line = arc.locator("[data-route-line]"),
      hit = arc.locator('[data-route-segment="0"]');
    const initial = await line.getAttribute("d");
    async function position(locator) {
      return locator.evaluate((el) => {
        if (el.tagName.toLowerCase() === "path") {
          const p = el.getPointAtLength(el.getTotalLength() / 2),
            s = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
          return { x: s.x, y: s.y };
        }
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
    }
    async function drag(locator, dx, dy) {
      const p = await position(locator);
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.move(p.x + dx, p.y + dy, { steps: 10 });
      await page.mouse.up();
    }
    assert.equal(await dialog.locator("[data-route-point]").count(), 0);
    await drag(hit, 0, -35);
    assert.equal(
      await line.getAttribute("d"),
      initial,
      "First gesture only selects a route",
    );
    assert.equal(await arc.getAttribute("data-route-selected"), "true");
    assert.equal(await arc.locator("[data-route-point]").count(), 3);
    assert.equal(
      await dialog
        .getByRole("button", { name: "选择第1步路线", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await dialog
      .getByRole("button", { name: "地点与标点", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
    await dialog.getByTitle("放大", { exact: true }).click();
    const view = await dialog
      .locator(".map-sheet")
      .evaluate((el) => el.style.transform);
    await drag(hit, 0, -60);
    assert((await line.getAttribute("d")).includes("Q"));
    async function saved() {
      await page.waitForTimeout(650);
      return page.evaluate(() => window.savedProject);
    }
    let snapshot = await saved(),
      route = snapshot.nodes.root.routes.find((r) => r.id === "arc");
    const dims = await dialog
      .locator(".map-sheet")
      .evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
    const ratio = (r) => {
      const a = r.points[0],
        b = r.points[1],
        c = r.controls[0],
        vx = (b.x - a.x) * dims.w,
        vy = (b.y - a.y) * dims.h;
      return (
        (vx * (c.y - a.y) * dims.h - vy * (c.x - a.x) * dims.w) /
        (vx * vx + vy * vy)
      );
    };
    const originalBend = ratio(route),
      beforeStart = structuredClone(route);
    await drag(arc.locator('[data-route-point="0"]'), 25, -30);
    snapshot = await saved();
    route = snapshot.nodes.root.routes.find((r) => r.id === "arc");
    assert.notDeepEqual(route.points[0], beforeStart.points[0]);
    assert.deepEqual(route.points.slice(1), beforeStart.points.slice(1));
    assert(
      Math.abs(ratio(route) - originalBend) < 1e-6,
      "Moving endpoint preserves relative curve bend",
    );
    const beforeEnd = structuredClone(route);
    await drag(arc.locator('[data-route-point="2"]'), -25, 20);
    snapshot = await saved();
    route = snapshot.nodes.root.routes.find((r) => r.id === "arc");
    assert.notDeepEqual(route.points[2], beforeEnd.points[2]);
    assert.deepEqual(route.points.slice(0, 2), beforeEnd.points.slice(0, 2));
    assert.deepEqual(route.controls[0], beforeEnd.controls[0]);
    const beforeWaypoint = structuredClone(route);
    await drag(arc.locator('[data-route-point="1"]'), 30, 20);
    snapshot = await saved();
    route = snapshot.nodes.root.routes.find((r) => r.id === "arc");
    assert.notDeepEqual(route.points[1], beforeWaypoint.points[1]);
    assert.deepEqual(route.points[0], beforeWaypoint.points[0]);
    assert.deepEqual(route.points[2], beforeWaypoint.points[2]);
    const beforeMove = structuredClone(route);
    await drag(arc.locator("[data-route-move]"), 35, -25);
    snapshot = await saved();
    route = snapshot.nodes.root.routes.find((r) => r.id === "arc");
    const delta = {
      x: route.points[0].x - beforeMove.points[0].x,
      y: route.points[0].y - beforeMove.points[0].y,
    };
    assert(delta.x > 0);
    assert(delta.y < 0);
    for (let i = 0; i < route.points.length; i++) {
      assert(
        Math.abs(route.points[i].x - beforeMove.points[i].x - delta.x) < 1e-6,
      );
      assert(
        Math.abs(route.points[i].y - beforeMove.points[i].y - delta.y) < 1e-6,
      );
    }
    for (let i = 0; i < route.controls.length; i++)
      if (route.controls[i]) {
        assert(
          Math.abs(route.controls[i].x - beforeMove.controls[i].x - delta.x) <
            1e-6,
        );
        assert(
          Math.abs(route.controls[i].y - beforeMove.controls[i].y - delta.y) <
            1e-6,
        );
      }
    assert.equal(
      await dialog.locator(".map-sheet").evaluate((el) => el.style.transform),
      view,
      "Editing route never pans the map",
    );
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
    const beforeSort = structuredClone(snapshot.nodes.root.routes);
    const from = dialog.getByRole("button", {
        name: "拖动第3步路线排序",
        exact: true,
      }),
      to = dialog.getByRole("button", {
        name: "拖动第1步路线排序",
        exact: true,
      });
    const a = await position(from),
      b = await position(to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x, a.y - 15, { steps: 3 });
    await page.mouse.move(b.x, b.y - 5, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    snapshot = await saved();
    assert.deepEqual(
      snapshot.nodes.root.routes.map((r) => r.id),
      ["spare", "arc", "old-line"],
    );
    assert.deepEqual(
      snapshot.nodes.root.routes.find((r) => r.id === "arc"),
      beforeSort.find((r) => r.id === "arc"),
      "Sorting preserves all route geometry and animation settings",
    );
    assert.equal(
      await dialog
        .locator('[data-route="spare"]')
        .getAttribute("data-route-selected"),
      "true",
      "Selection follows the dragged route ID",
    );
    await dialog
      .getByRole("button", { name: "选择第2步路线", exact: true })
      .click();
    assert.equal(await arc.getAttribute("data-route-selected"), "true");
    const duration = dialog.getByLabel("第2步时长");
    await duration.fill("2.5");
    await duration.press("Backspace");
    assert.equal(
      await dialog.locator("[data-route]").count(),
      3,
      "Backspace in an input must not delete a route",
    );
    await duration.fill("2.5");
    await duration.press("Delete");
    assert.equal(await dialog.locator("[data-route]").count(), 3);
    await page.screenshot({ path: "artifacts/selected-route-editor.png" });
    await saved();
    await dialog.getByRole("button", { name: /完成编辑/ }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    assert.equal(
      await page
        .locator(".presentation [data-route]")
        .first()
        .getAttribute("data-route"),
      "spare",
      "Reordered list controls presentation order",
    );
    assert.equal(
      await page.locator(".presentation [data-route-point]").count(),
      0,
    );
    await page.keyboard.press("Escape");
    await page.getByTitle("打开项目", { exact: true }).click();
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page.getByRole("button", { name: "放大编辑", exact: true }).click();
    const reopen = page.getByRole("dialog", { name: /地图编辑/ });
    assert.deepEqual(
      await reopen
        .locator("[data-route-card]")
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-route-card")),
        ),
      ["spare", "arc", "old-line"],
    );
    assert.equal(
      await reopen.locator("[data-route-point]").count(),
      0,
      "Selection is temporary and not persisted",
    );
    assert(
      (
        await reopen
          .locator('[data-route="arc"] [data-route-line]')
          .getAttribute("d")
      ).includes("Q"),
    );
    await reopen
      .getByRole("button", { name: "选择第3步路线", exact: true })
      .click();
    const oldPosition = await position(
      reopen.locator('[data-route="old-line"] [data-route-segment="0"]'),
    );
    await page.mouse.click(oldPosition.x, oldPosition.y);
    await page.keyboard.press("Delete");
    assert.equal(await reopen.locator('[data-route="old-line"]').count(), 0);
    assert.equal(await reopen.locator("[data-route]").count(), 2);
    await page.keyboard.press("Backspace");
    assert.equal(
      await reopen.locator("[data-route]").count(),
      2,
      "No selection means no keyboard deletion",
    );
    await reopen
      .getByRole("button", { name: "选择第2步路线", exact: true })
      .click();
    await page.keyboard.press("Backspace");
    assert.equal(await reopen.locator('[data-route="arc"]').count(), 0);
    assert.equal(await reopen.locator("[data-route]").count(), 1);
    assert.deepEqual(errors, []);
    console.log(
      "Route selection passed: first-click guard, endpoint/waypoint/whole-route dragging, curvature preservation, list selection and pointer sorting, input-safe deletion, persistence and presentation order.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

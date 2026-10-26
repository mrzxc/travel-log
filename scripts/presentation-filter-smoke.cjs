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
fixture.id = "global-presentation-filter";
fixture.rootId = "root";
fixture.nodes = {
  root: {
    id: "root",
    name: "旅行",
    parentId: null,
    children: ["city", "excluded-only"],
    map: media("map", "地图"),
    pins: [],
    media: [
      media("A", "参加A"),
      { ...media("B", "排除B"), includeInPresentation: false },
      { ...media("C", "缺失C"), missing: true },
    ],
  },
  city: {
    id: "city",
    name: "城市",
    parentId: "root",
    children: ["grand"],
    map: null,
    pins: [],
    media: [
      { ...media("D", "参加D"), includeInPresentation: true },
      { ...media("E", "排除E"), includeInPresentation: false },
    ],
  },
  grand: {
    id: "grand",
    name: "景点",
    parentId: "city",
    children: [],
    map: null,
    pins: [],
    media: [
      media("F", "参加F"),
      { ...media("G", "排除G"), includeInPresentation: false },
    ],
  },
  "excluded-only": {
    id: "excluded-only",
    name: "待整理",
    parentId: "root",
    children: [],
    map: null,
    pins: [],
    media: [{ ...media("H", "排除H"), includeInPresentation: false }],
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
        open: async () => ({
          project:
            JSON.parse(localStorage.getItem("mock-project") || "null") ||
            window.savedProject ||
            fixture,
          path: "F:\\旅行\\欧洲.travel",
        }),
        save: async (p) => {
          window.savedProject = structuredClone(p);
          localStorage.setItem("mock-project", JSON.stringify(p));
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
    const toggle = () =>
      page.getByRole("switch", { name: "仅显示参加演示", exact: true });
    const ids = () =>
      page
        .locator(".media-sortable")
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-media-id")),
        );
    const place = (id) =>
      page.locator('.tree-row[data-place-id="' + id + '"] > .tree-item');
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["A", "B", "C"]);
    await toggle().check();
    assert.deepEqual(await ids(), ["A"]);
    assert.equal(await page.locator(".place-card").count(), 2);
    assert(
      (await page.locator(".media-filter-toolbar").textContent()).includes(
        "1 / 3",
      ),
    );
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await page.getByLabel("全选", { exact: true }).check();
    assert.equal(
      await page.locator(".selection-bar strong").textContent(),
      "1",
    );
    await page
      .locator(".selection-bar")
      .getByRole("button", { name: "不参加演示", exact: true })
      .click();
    assert.deepEqual(await ids(), []);
    assert.equal(await page.locator(".filter-empty").count(), 1);
    assert.equal(
      await page.locator(".selection-bar strong").textContent(),
      "0",
    );
    assert.equal(
      await page
        .locator(".selection-bar")
        .getByRole("button", { name: "删除", exact: true })
        .isDisabled(),
      true,
    );
    await place("city").click();
    assert.equal(await toggle().isChecked(), true);
    assert.deepEqual(await ids(), ["D"]);
    await page.locator(".place-card .place-caption button:has(strong)").click();
    assert.equal(await toggle().isChecked(), true);
    assert.deepEqual(await ids(), ["F"]);
    await toggle().uncheck();
    assert.deepEqual(await ids(), ["F", "G"]);
    await place("root").click();
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["A", "B", "C"]);
    await toggle().check();
    assert.deepEqual(await ids(), []);
    await place("excluded-only").click();
    assert.equal(await toggle().isChecked(), true);
    assert.equal(await page.locator(".filter-empty").count(), 1);
    await page
      .getByRole("button", { name: "显示全部素材", exact: true })
      .click();
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["H"]);
    await place("city").click();
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["D", "E"]);
    await toggle().check();
    assert.deepEqual(await ids(), ["D"]);
    await page
      .getByRole("button", { name: /预览素材/ })
      .first()
      .click();
    const detail = page.getByRole("dialog", { name: "素材详情", exact: true });
    await detail
      .getByRole("switch", { name: "参加演示", exact: true })
      .uncheck();
    await detail
      .getByRole("button", { name: "关闭素材详情", exact: true })
      .click();
    assert.deepEqual(await ids(), []);
    assert.equal(await toggle().isChecked(), true);
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page.getByRole("button", { name: /素材与地点/ }).click();
    assert.equal(await toggle().isChecked(), true);
    await place("grand").click();
    assert.deepEqual(await ids(), ["F"]);
    await page.screenshot({ path: "artifacts/global-presentation-filter.png" });
    await page.waitForTimeout(650);
    const saved = await page.evaluate(() => window.savedProject);
    assert.equal(saved.nodes.root.media.length, 3);
    assert.equal(saved.nodes.root.media[1].includeInPresentation, false);
    assert.equal(saved.nodes.root.media[2].missing, true);
    assert.equal(saved.nodes.city.media.length, 2);
    await page.reload();
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    assert.equal(await toggle().isChecked(), true);
    await place("grand").click();
    assert.deepEqual(await ids(), ["F"]);
    await toggle().uncheck();
    await page.reload();
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["A", "B", "C"]);
    assert.deepEqual(errors, []);
    console.log(
      "Global presentation filter passed: shared state across levels, missing/excluded media hidden, visible-only bulk actions, hidden selection cleanup, detail updates, empty state, tabs and reload persistence.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

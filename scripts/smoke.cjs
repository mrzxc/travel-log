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
  id: "fixture",
  name: "欧洲慢游 · 2026",
  rootId: "root",
  nodes: {
    root: node(
      "root",
      "欧洲慢游 · 2026",
      null,
      ["italy", "austria"],
      [media("intro", "旅途序章")],
      media("root-map", "EUROPE"),
      [
        { nodeId: "rome", x: 0.55, y: 0.65 },
        { nodeId: "venice", x: 0.6, y: 0.4 },
        { nodeId: "austria", x: 0.72, y: 0.27 },
      ],
    ),
    italy: node(
      "italy",
      "意大利",
      "root",
      ["rome", "venice"],
      [media("italy-1", "意大利概览")],
    ),
    rome: node(
      "rome",
      "罗马",
      "italy",
      ["colosseum"],
      [media("rome-1", "罗马街头"), media("rome-2", "台伯河畔")],
      media("rome-map", "ROMA"),
      [{ nodeId: "colosseum", x: 0.6, y: 0.6 }],
    ),
    colosseum: node(
      "colosseum",
      "斗兽场",
      "rome",
      [],
      [media("c-1", "斗兽场日落")],
    ),
    venice: node("venice", "威尼斯", "italy", [], [media("v-1", "水城记忆")]),
    austria: node("austria", "奥地利", "root", [], [media("a-1", "山间晨雾")]),
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
        save: async () => "F:\\旅行\\欧洲.travel",
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
  await page.getByRole("heading", { name: "欧洲慢游 · 2026" }).waitFor();
  await fs.mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/management.png", fullPage: true });
  await page.getByRole("button", { name: "开始演示" }).click();
  await page.locator(".presentation").waitFor();
  assert.equal(await page.locator(".map-pin").count(), 3);
  await page.locator(".map-pin").filter({ hasText: "罗马" }).click();
  assert.deepEqual(
    await page.locator(".presentation-crumb button").allTextContents(),
    ["欧洲慢游 · 2026", "罗马"],
  );
  await page.getByRole("button", { name: "查看本地点素材" }).click();
  await page.locator(".slide>img").waitFor();
  assert.equal(await page.locator(".slide-counter").innerText(), "01 / 02");
  assert.equal(await page.locator(".mini-map").count(), 1);
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator(".slide-counter").innerText(), "02 / 02");
  assert.equal(
    await page.getByRole("button", { name: "下一张", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "返回地图", exact: true }).click();
  await page.getByRole("button", { name: "查看本地点素材" }).click();
  assert.equal(await page.locator(".slide-counter").innerText(), "02 / 02");
  await page.locator(".mini-map").click();
  await page.locator(".map-pin").filter({ hasText: "斗兽场" }).click();
  assert.deepEqual(
    await page.locator(".presentation-crumb button").allTextContents(),
    ["欧洲慢游 · 2026", "罗马", "斗兽场"],
  );
  await page
    .getByRole("button", { name: "返回上一级地图", exact: true })
    .click();
  assert.equal(await page.locator(".presentation-crumb button").count(), 2);
  await page.locator(".presentation .map-image").evaluate(img => img.decode());
  await page.waitForFunction(() => document.querySelector('.presentation .map-sheet').getBoundingClientRect().width > 500);
  await page.screenshot({ path: "artifacts/presentation.png" });
  await page.keyboard.press("Escape");
  // Starting an un-mapped parent flattens descendants even if they own maps.
  await page.locator(".tree-item").filter({ hasText: "意大利" }).click();
  await page.getByRole("button", { name: "开始演示" }).click();
  assert.equal(await page.locator(".slide-counter").innerText(), "01 / 05");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator(".slide-counter").innerText(), "05 / 05");
  await page.getByRole("button", { name: "结束演示", exact: true }).click();
  assert.equal(await page.locator(".presentation").count(), 0);
  // Add and rename through actual dialogs, then verify the tree.
  await page
    .getByRole("button", { name: "添加子地点", exact: true })
    .last()
    .click();
  await page.locator(".dialog input").fill("托斯卡纳");
  await page.getByRole("button", { name: "确定", exact: true }).click();
  await page.locator(".tree-item").filter({ hasText: "托斯卡纳" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "UI smoke passed: map navigation, breadcrumbs, endings, resume, subtree flattening, adding places; no page errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

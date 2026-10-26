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

  await page.getByRole("button", { name: /地图与标点/ }).click();
  const sheet = page.locator(".map-editor .map-sheet");
  await page.locator(".map-editor .map-image").evaluate((img) => img.decode());
  await page.getByRole("button", { name: "+ 绘制路线", exact: true }).click();
  const box = await sheet.boundingBox();
  for (const [x, y] of [
    [0.25, 0.6],
    [0.5, 0.65],
    [0.8, 0.7],
  ])
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  await page.getByRole("button", { name: "完成路线", exact: true }).click();
  assert.equal(await page.locator("[data-route]").count(), 1);
  await page.getByLabel("第1步时长").fill("0.6");
  await page.getByLabel("第1步交通工具").selectOption("jeep");
  await page.getByLabel("显示地点名称").uncheck();
  assert.equal(await page.locator(".map-pin").count(), 3);
  assert.equal(await page.locator(".pin-name:visible").count(), 0);
  await page.getByRole("button", { name: "开始演示", exact: true }).click();
  assert.equal(await page.locator(".presentation [data-route]").count(), 0);
  assert.equal(await page.locator(".presentation .map-pin").count(), 3);
  assert.equal(
    await page.locator(".presentation .pin-name:visible").count(),
    0,
  );
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(180);
  const during = await page
    .locator(".presentation [data-route-arrow]")
    .getAttribute("transform");
  await page.waitForTimeout(650);
  const after = await page
    .locator(".presentation [data-route-arrow]")
    .getAttribute("transform");
  assert.notEqual(during, after);
  assert.equal(
    await page.locator(".presentation .transport-icon").getAttribute("title"),
    "吉普车",
  );
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.locator(".presentation [data-route]").count(), 0);
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "完成本步", exact: true }).click();
  const completed = await page
    .locator(".presentation [data-route-arrow]")
    .getAttribute("transform");
  await page.waitForTimeout(180);
  assert.equal(
    await page
      .locator(".presentation [data-route-arrow]")
      .getAttribute("transform"),
    completed,
  );
  await page.screenshot({ path: "artifacts/map-route-animation.png" });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "Route UI passed: drawing, vehicle, duration, visibility, keyboard animation and completion.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

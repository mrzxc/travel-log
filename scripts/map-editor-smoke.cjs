const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/cover-pin");
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir("artifacts", { recursive: true });
  const image = path.join(dir, "cover.png");
  execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xa0b18c:s=1200x800",
      "-frames:v",
      "1",
      "-y",
      image,
    ],
    { windowsHide: true },
  );
  const asset = (id) => ({
    id,
    path: image,
    name: "封面.png",
    type: "image",
    time: 1,
  });
  const place = (id, name, media = [], coverAsset) => ({
    id,
    name,
    parentId: "root",
    children: [],
    media,
    map: null,
    pins: [],
    coverAsset,
  });
  const project = {
    version: 1,
    id: "static-pin",
    name: "封面标点测试",
    rootId: "root",
    nodes: {
      root: {
        ...place("root", "旅行"),
        parentId: null,
        children: ["static", "playable", "hidden"],
        map: asset("map"),
        pins: [
          { nodeId: "static", x: 0.3, y: 0.5 },
          { nodeId: "playable", x: 0.7, y: 0.5 },
          { nodeId: "hidden", x: 0.5, y: 0.25 },
        ],
      },
      static: place("static", "仅展示封面", [], asset("independent")),
      playable: place("playable", "正常素材入口", [asset("photo")]),
      hidden: place("hidden", "隐藏空地点"),
    },
  };
  project.nodes.root.routes = [
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
  ];
  for (let i = 2; i < 8; i++)
    project.nodes.root.routes.push({
      id: "seed-" + i,
      points: [
        { x: 0.2, y: 0.3 + i * 0.04 },
        { x: 0.8, y: 0.3 + i * 0.04 },
      ],
      transport: "car",
      duration: 0.4,
    });
  const file = path.join(dir, "editor-test.travel");
  await fs.writeFile(file, JSON.stringify(project));
  const env = {
    ...process.env,
    TRAVEL_SMOKE: "1",
    TRAVEL_USER_DATA: path.join(dir, "userData"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.TRAVEL_DEV_URL;
  const app = await electron.launch({
    executablePath: process.env.TRAVEL_TEST_EXE || require("electron"),
    args: process.env.TRAVEL_TEST_EXE ? [] : [path.resolve(".")],
    env,
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();

    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page
      .locator(".map-editor .map-image")
      .evaluate((img) => img.decode());
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
    await dialog
      .getByRole("button", { name: "地点与标点", exact: true })
      .click();
    assert.equal(
      await dialog.locator(".left-panel").getAttribute("class"),
      "map-editor-panel left-panel is-collapsed",
    );
    await dialog
      .getByRole("button", { name: "地点与标点", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
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
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "路线与动画", exact: true })
      .click();
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
    // Visual layout is verified by the browser smoke; hidden Electron windows cannot reliably capture this overlay.
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
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
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
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

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
  const file = path.join(dir, "test.travel");
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
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await page
      .locator(".presentation .map-image")
      .evaluate((img) => img.decode());
    await page.locator(".static-marker img").evaluate((img) => img.decode());
    assert.equal(await page.locator(".presentation .map-pin").count(), 2);
    const marker = page.locator(".presentation .static-marker");
    assert.equal(await marker.getAttribute("aria-disabled"), "true");
    assert.equal(await marker.locator("button").isDisabled(), true);
    await page.waitForTimeout(350);
    await page.screenshot({ path: "artifacts/static-cover-before.png" });
    await marker.locator(".pin-name").scrollIntoViewIfNeeded();
    await marker.locator(".pin-name").click({ force: true });
    assert.deepEqual(
      await page.locator(".presentation-crumb button").allTextContents(),
      ["旅行"],
    );
    assert.equal(await page.locator(".slide").count(), 0);
    await page.screenshot({ path: "artifacts/static-cover-pin.png" });
    await page
      .locator(".presentation .map-pin")
      .filter({ hasText: "正常素材入口" })
      .click();
    await page.locator(".slide>img").evaluate((img) => img.decode());
    assert.deepEqual(
      await page.locator(".presentation-crumb button").allTextContents(),
      ["旅行", "正常素材入口"],
    );
    await page
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "Cover pin smoke passed: cover-only marker visible and disabled; cover image renders; empty marker hidden; normal leaf with media remains enterable.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

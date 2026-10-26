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
  project.nodes.root.routes[0].controls = [{ x: 0.35, y: 0.2 }];
  const file = path.join(dir, "route-test.travel");
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

    assert.equal(await page.locator(".presentation [data-route]").count(), 0);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".presentation [data-route]").count(), 1);
    assert(
      (
        await page
          .locator('.presentation [data-route="first"] [data-route-line]')
          .getAttribute("d")
      ).includes("Q"),
    );
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".presentation [data-route]").count(), 2);
    assert.equal(
      await page
        .locator('.presentation .transport-icon[title="吉普车"]')
        .count(),
      1,
    );
    await page.getByRole("button", { name: "上一步", exact: true }).click();
    assert.equal(await page.locator(".presentation [data-route]").count(), 1);
    await page.getByLabel("显示地点名称").uncheck();
    assert.equal(await page.locator(".presentation .map-pin").count(), 2);
    assert.equal(
      await page.locator(".presentation .pin-name:visible").count(),
      0,
    );
    await page.getByRole("button", { name: "重播", exact: true }).click();
    assert.equal(await page.locator(".presentation [data-route]").count(), 0);
    await page.screenshot({ path: "artifacts/packaged-map-routes.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Packaged map routes passed: incremental steps, retained routes, vehicle icons, reverse, replay and visibility.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

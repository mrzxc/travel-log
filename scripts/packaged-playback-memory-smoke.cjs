const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/playback-memory-packaged");
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
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
      ],
      transport: "car",
      duration: 0.25,
    },
    {
      id: "second",
      points: [
        { x: 0.2, y: 0.4 },
        { x: 0.8, y: 0.4 },
      ],
      controls: [{ x: 0.5, y: 0.1 }],
      transport: "plane",
      duration: 10,
    },
  ];
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

    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".presentation"),
      canvas = () =>
        stage.locator(".presentation-map:not(.mini-map) .map-canvas");
    async function phase() {
      return canvas().evaluate((el) => ({
        step: Number(el.dataset.playbackStep),
        progress: Number(el.dataset.playbackProgress),
      }));
    }
    async function done() {
      await page.waitForFunction(
        () =>
          Number(
            document
              .querySelector(".presentation-map:not(.mini-map) .map-canvas")
              ?.getAttribute("data-playback-progress"),
          ) === 1,
      );
    }
    await canvas()
      .locator(".map-image")
      .evaluate((img) => img.decode());
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await done();
    assert.equal((await phase()).step, 1);
    await canvas()
      .locator('.map-pin[title="正常素材入口"] .stack-button')
      .click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    await stage
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    assert.deepEqual(await phase(), { step: 1, progress: 1 });
    await stage.getByRole("button", { name: "下一步", exact: true }).click();
    await page.waitForFunction(() => {
      const c = document.querySelector(
        ".presentation-map:not(.mini-map) .map-canvas",
      );
      return (
        Number(c?.dataset.playbackStep) === 2 &&
        Number(c?.dataset.playbackProgress) > 0.05 &&
        Number(c?.dataset.playbackProgress) < 0.85
      );
    });
    const pin = canvas().locator('.map-pin[title="正常素材入口"]');
    await pin.evaluate((el) =>
      el.addEventListener(
        "pointerup",
        () =>
          (window.savedParentProgress = Number(
            document.querySelector(
              ".presentation-map:not(.mini-map) .map-canvas",
            ).dataset.playbackProgress,
          )),
        { capture: true, once: true },
      ),
    );
    await pin.locator(".stack-button").click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    const before = await page.evaluate(() => window.savedParentProgress);
    await stage
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    const restored = await phase();
    assert.equal(restored.step, 2);
    assert(Math.abs(restored.progress - before) < 0.02);
    assert(restored.progress < 1);
    await page.waitForTimeout(300);
    assert.equal((await phase()).progress, restored.progress);
    await stage.getByRole("button", { name: "继续本步", exact: true }).click();
    await page.waitForFunction(
      (p) =>
        Number(
          document.querySelector(".presentation-map:not(.mini-map) .map-canvas")
            .dataset.playbackProgress,
        ) >
        p + 0.01,
      restored.progress,
    );
    await stage.getByRole("button", { name: "完成本步", exact: true }).click();
    assert.deepEqual(await phase(), { step: 2, progress: 1 });
    await stage.getByRole("button", { name: /退出演示/ }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    assert.equal((await phase()).step, 0);
    assert.deepEqual(errors, []);
    console.log(
      "Packaged playback memory passed: completed and partial parent states, paused return, continue from saved position, and fresh session reset.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

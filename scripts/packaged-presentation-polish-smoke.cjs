const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/presentation-polish-packaged");
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
    // Hidden native windows cannot reliably finish compositor transitions.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();

    await page
      .locator('.tree-row[data-place-id="playable"] > .tree-item')
      .click();
    await page
      .getByRole("button", { name: /预览素材/ })
      .first()
      .click();
    let detail = page.getByRole("dialog", { name: "素材详情", exact: true });
    const text = "夕阳下的旅途\n一张值得记住的照片";
    await detail.getByLabel("图片备注").fill(text);
    await page.waitForTimeout(800);
    let saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.playable.media[0].note, text);
    await detail
      .getByRole("button", { name: "关闭素材详情", exact: true })
      .click();
    await page.locator('.tree-row[data-place-id="root"] > .tree-item').click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".presentation");
    await stage.locator(".map-image").evaluate((img) => img.decode());
    await page.mouse.move(700, 400);
    assert.equal(
      await stage
        .locator(".map-tools")
        .evaluate((el) => Number(getComputedStyle(el).opacity)),
      0.25,
    );
    await stage.locator(".map-tools").hover();
    await page.waitForFunction(
      () =>
        Number(
          getComputedStyle(document.querySelector(".presentation .map-tools"))
            .opacity,
        ) === 1,
    );
    await stage
      .locator('.map-pin[data-pin-node="playable"] .stack-button')
      .click();
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      ),
      0.8,
    );
    assert.equal(
      await stage
        .getByRole("complementary", { name: "图片备注", exact: true })
        .locator("p")
        .textContent(),
      text,
    );
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      ),
      0.8,
    );
    await stage
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    assert.equal(
      await stage.locator(".map-canvas").getAttribute("data-map-node"),
      "root",
    );
    await stage.getByRole("button", { name: /退出演示/ }).click();
    await page.getByTitle("打开项目", { exact: true }).click();
    await page
      .locator('.tree-row[data-place-id="playable"] > .tree-item')
      .click();
    await page
      .getByRole("button", { name: /预览素材/ })
      .first()
      .click();
    detail = page.getByRole("dialog", { name: "素材详情", exact: true });
    assert.equal(await detail.getByLabel("图片备注").inputValue(), text);
    await detail.getByLabel("图片备注").fill("");
    await page.waitForTimeout(800);
    saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.playable.media[0].note, undefined);
    assert.deepEqual(errors, []);
    console.log(
      "Packaged presentation polish passed: photo notes persisted/reopened/cleared, tools dim/hover, 80% default/reset and child return.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

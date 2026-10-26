const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/duration-layout-packaged");
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
    await page.locator(".map-inline-tools .route-controls").waitFor();
    const layout = await page.evaluate(() => ({
      map: document.querySelector(".map-editor").getBoundingClientRect().top,
      cover: document.querySelector(".map-settings-top").getBoundingClientRect()
        .bottom,
      pins: document.querySelector(".map-pin-settings").getBoundingClientRect()
        .bottom,
      tools: document.querySelector(".map-inline-tools").getBoundingClientRect()
        .bottom,
    }));
    assert(
      layout.cover <= layout.map &&
        layout.pins <= layout.map &&
        layout.tools <= layout.map,
    );
    assert.equal(await page.locator(".map-editor .route-controls").count(), 0);
    await page.getByRole("button", { name: "放大编辑", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: /地图编辑/ }),
      input = dialog.getByLabel("第1步时长");
    await input.fill("");
    await input.pressSequentially("0");
    assert.equal(await input.inputValue(), "0");
    await input.pressSequentially(".");
    assert.equal(await input.inputValue(), "0.");
    await input.pressSequentially("5");
    assert.equal(await input.inputValue(), "0.5");
    await input.press("Enter");
    await page.waitForTimeout(800);
    let saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.root.routes[0].duration, 0.5);
    await input.fill("0.25");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.root.routes[0].duration, 0.25);
    await page.getByTitle("打开项目", { exact: true }).click();
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page.getByRole("button", { name: "放大编辑", exact: true }).click();
    dialog = page.getByRole("dialog", { name: /地图编辑/ });
    input = dialog.getByLabel("第1步时长");
    assert.equal(await input.inputValue(), "0.25");
    await input.fill("0.5");
    await input.press("Enter");
    await page.waitForTimeout(800);
    saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.root.routes[0].duration, 0.5);
    assert.deepEqual(errors, []);
    console.log(
      "Packaged duration/layout passed: zero and decimal drafts, 0.5 confirmation, Esc save and reopen, and controls above map.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/tree-zoom-packaged");
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

  project.nodes = {
    root: {
      id: "root",
      name: "旅行目录",
      parentId: null,
      children: [],
      media: [],
      map: null,
      pins: [],
    },
  };
  for (let i = 0; i < 55; i++) {
    const id = "city" + i;
    project.nodes.root.children.push(id);
    project.nodes[id] = {
      id,
      name: "地点" + i,
      parentId: "root",
      children: [],
      media: Array.from({ length: 3 }, (_, j) => ({
        ...asset(id + "-" + j),
        name: "照片" + j + ".png",
      })),
      map: null,
      pins: [],
    };
  }
  project.nodes.city30.media[2] = {
    ...asset("video"),
    name: "视频.mp4",
    type: "video",
    path: path.resolve(".test-data/media-zoom-long.mp4"),
  };
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

    const nav = page.locator(".sidebar nav");
    await nav.evaluate((el) => {
      window.navBefore = el;
      const row = el.querySelector('.tree-row[data-place-id="city30"]');
      el.scrollTop +=
        row.getBoundingClientRect().top - el.getBoundingClientRect().top - 70;
    });
    const scroll = await nav.evaluate((el) => el.scrollTop);
    assert(scroll > 500);
    for (const id of ["city30", "city31", "city30"]) {
      await page
        .locator('.tree-row[data-place-id="' + id + '"] .tree-item')
        .click();
      assert.equal(await nav.evaluate((el) => el.scrollTop), scroll);
      assert(await nav.evaluate((el) => el === window.navBefore));
    }
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".presentation");
    await stage.locator(".slide>img").evaluate((img) => img.decode());
    const scale = async () =>
      Number(
        await stage
          .locator(".media-zoom-stage")
          .getAttribute("data-media-scale"),
      );
    while (
      !(await stage
        .getByRole("button", { name: "缩小素材", exact: true })
        .isDisabled())
    )
      await stage
        .getByRole("button", { name: "缩小素材", exact: true })
        .click();
    assert.equal(await scale(), 0.5);
    while (
      !(await stage
        .getByRole("button", { name: "放大素材", exact: true })
        .isDisabled())
    )
      await stage
        .getByRole("button", { name: "放大素材", exact: true })
        .click();
    assert.equal(await scale(), 5);
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(await scale(), 0.8);
    await stage.getByRole("button", { name: "下一张", exact: true }).click();
    await stage.getByRole("button", { name: "下一张", exact: true }).click();
    const video = stage.locator(".slide>video");
    await video.waitFor();
    await stage.getByRole("button", { name: "放大素材", exact: true }).click();
    assert.equal(await scale(), 1);
    assert.equal(await video.evaluate((el) => el.controls), false);
    await stage.getByRole("button", { name: "播放视频", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector(".slide>video")?.paused === false,
    );
    await stage.getByRole("button", { name: "暂停视频", exact: true }).click();
    assert.equal(await video.evaluate((el) => el.paused), true);
    await stage
      .getByRole("button", { name: "恢复素材比例", exact: true })
      .click();
    assert.equal(await video.evaluate((el) => el.controls), true);
    assert.deepEqual(errors, []);
    console.log(
      "Packaged tree/zoom passed: tree scroll and DOM preserved, photo 0.5–5 range, reset, video zoom and playback controls.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

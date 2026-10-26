const {
  _electron: electron,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/detail-carousel-native");
  await fs.mkdir(dir, { recursive: true });
  const image = path.resolve(
    ".test-data/presentation-filter-packaged/cover.png",
  );
  const candidates = await fs.readdir(path.dirname(image)).catch(() => []);
  const actualImage = candidates.find((x) => x.endsWith(".png"));
  assert(actualImage, "missing existing PNG fixture");
  const img = path.join(path.dirname(image), actualImage),
    video = path.resolve(".test-data/video-seek/seek.mp4");
  const media = [
    { id: "a", name: "第一张", path: img, type: "image", time: 1 },
    { id: "b", name: "视频", path: video, type: "video", time: 2 },
    { id: "c", name: "最后一张", path: img, type: "image", time: 3 },
  ];
  const file = path.join(dir, "carousel.travel");
  await fs.writeFile(
    file,
    JSON.stringify({
      version: 1,
      id: "native-carousel",
      name: "详情切换",
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          name: "旅行",
          parentId: null,
          children: [],
          media,
          map: null,
          pins: [],
        },
      },
    }),
  );
  const env = {
    ...process.env,
    TRAVEL_SMOKE: "1",
    TRAVEL_USER_DATA: path.join(dir, "userData"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.TRAVEL_DEV_URL;
  const app = await electron.launch({
    executablePath: process.env.TRAVEL_TEST_EXE,
    args: [],
    env,
  });
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    await page
      .getByRole("button", { name: "预览素材 第一张", exact: true })
      .click();
    const d = page.getByRole("dialog", { name: "素材详情", exact: true });
    const next = d.getByRole("button", { name: "下一个素材", exact: true }),
      prev = d.getByRole("button", { name: "上一个素材", exact: true });
    assert.equal(await prev.isDisabled(), true);
    await d.getByLabel("图片备注").fill("原图备注");
    await next.click();
    const v = d.locator("video");
    await v.evaluate((el) => {
      window.oldVideo = el;
      return el.play();
    });
    assert.equal(await v.evaluate((el) => el.paused), false);
    await next.click();
    await page.waitForFunction(() => window.oldVideo.paused);
    assert.equal(await d.locator("video").count(), 0);
    assert.equal(await next.isDisabled(), true);
    await prev.click();
    assert.equal(await d.locator("video").evaluate((el) => el.paused), true);
    await prev.click();
    assert.equal(await d.getByLabel("图片备注").inputValue(), "原图备注");
    assert.equal(await d.getByLabel("素材位置").textContent(), "1 / 3");
    console.log(
      "Packaged detail carousel passed: image/video navigation, endpoint buttons, notes preserved, previous video stops and returns paused.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

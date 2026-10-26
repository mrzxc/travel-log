const {
  _electron: electron,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
(async () => {
  const dir = path.resolve(".test-data/selection-rotation-native");
  await fs.mkdir(dir, { recursive: true });
  const image = path.join(dir, "photo.png");
  require("node:child_process").execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x879b73:s=1200x800",
      "-frames:v",
      "1",
      "-y",
      image,
    ],
    { windowsHide: true },
  );
  const hash = async () =>
    createHash("sha256")
      .update(await fs.readFile(image))
      .digest("hex");
  const before = await hash();
  const children = Array.from({ length: 30 }, (_, i) => "child" + i);
  const project = {
    version: 1,
    id: "native-selection-rotation",
    name: "快捷键与旋转",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "旅行",
        parentId: null,
        children,
        map: null,
        pins: [],
        media: Array.from({ length: 48 }, (_, i) => ({
          id: "m" + i,
          name: "照片" + i + ".png",
          path: image,
          type: "image",
          time: i + 1,
        })),
      },
      ...Object.fromEntries(
        children.map((id) => [
          id,
          {
            id,
            name: id,
            parentId: "root",
            children: [],
            map: null,
            pins: [],
            media: [],
          },
        ]),
      ),
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
    executablePath: process.env.TRAVEL_TEST_EXE,
    args: [],
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    const mode = page.getByRole("switch", { name: "选择", exact: true });
    await mode.waitFor();
    await page.keyboard.press("a");
    assert.equal(await mode.getAttribute("aria-checked"), "true");
    await page
      .getByRole("button", { name: "选择素材 照片0.png", exact: true })
      .click();
    await page.keyboard.press("a");
    assert.equal(await page.locator(".media-card.is-selected").count(), 1);
    const bar = page.locator(".selection-bar"),
      workspace = page.locator(".workspace");
    const initial = await bar.boundingBox(),
      w = await workspace.boundingBox();
    await workspace.evaluate(
      (el, y) => (el.scrollTop = y),
      initial.y - w.y + 100,
    );
    await page.waitForTimeout(150);
    assert(Math.abs((await bar.boundingBox()).y - w.y) < 2);
    await workspace.evaluate((el) => {
      const section = el.querySelector(".selection-bar").closest("section");
      el.scrollTop +=
        section.getBoundingClientRect().bottom -
        el.getBoundingClientRect().top +
        80;
    });
    await page.waitForTimeout(100);
    const end = await bar.boundingBox();
    assert(end.y + end.height < w.y + 2);
    await workspace.evaluate((el) => (el.scrollTop = 0));
    await page.keyboard.press("Escape");
    assert.equal(await mode.getAttribute("aria-checked"), "false");
    await page
      .getByRole("button", { name: "预览素材 照片0.png", exact: true })
      .click();
    const d = page.getByRole("dialog", { name: "素材详情", exact: true });
    const setting = d.getByRole("switch", { name: "参加演示", exact: true });
    assert(
      (await setting.boundingBox()).y <
        (await d.getByLabel("图片备注").boundingBox()).y,
    );
    await setting.uncheck();
    await d.getByTitle("关闭素材详情").click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const stage = page.locator(".media-zoom-stage");
    await stage.locator("img").evaluate((img) => img.decode());
    await page.locator(".presentation").dispatchEvent("mousemove");
    await page
      .getByRole("button", { name: "向右旋转 90°", exact: true })
      .click();
    assert.equal(await stage.getAttribute("data-media-rotation"), "90");
    await page
      .getByRole("button", { name: "向左旋转 90°", exact: true })
      .click();
    assert.equal(await stage.getAttribute("data-media-rotation"), "0");
    await page
      .getByRole("button", { name: "向左旋转 90°", exact: true })
      .click();
    await page.keyboard.press("ArrowRight");
    assert.equal(await stage.getAttribute("data-media-rotation"), "0");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+s");
    await page.waitForTimeout(500);
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.root.media[0].includeInPresentation, false);
    assert(saved.nodes.root.media.every((m) => m.rotation === undefined));
    assert.equal(await hash(), before);
    console.log(
      "Packaged 0.2.14 passed: A/Esc selection, sticky bounds, prominent participation saved, 90-degree rotation and reset, source image hash unchanged.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

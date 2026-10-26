const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
(async () => {
  const image = path.resolve(process.argv[2] || ".test-data/heic/example.heic");
  const hash = async () =>
    createHash("sha256")
      .update(await fs.readFile(image))
      .digest("hex");
  const before = await hash();
  const directory = path.resolve(process.env.TRAVEL_HEIC_TEST_DIR || ".test-data/heic-desktop");
  await fs.mkdir(directory, { recursive: true });
  const asset = {
    id: "heic-photo",
    path: image,
    name: path.basename(image),
    type: "image",
    time: 1,
  };
  const fixture = {
    version: 1,
    id: "heic-test",
    name: "HEIC 展示测试",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "HEIC 展示测试",
        parentId: null,
        children: [],
        media: [asset],
        map: null,
        pins: [],
      },
    },
  };
  const file = path.join(directory, "heic.travel");
  await fs.writeFile(file, JSON.stringify(fixture));
  const env = {
    ...process.env,
    TRAVEL_SMOKE: "1",
    TRAVEL_USER_DATA: path.join(directory, "userData"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.TRAVEL_DEV_URL;
  const app = await electron.launch({
    executablePath: process.env.TRAVEL_TEST_EXE || require("electron"),
    args: process.env.TRAVEL_TEST_EXE ? [] : [path.resolve(".")],
    env,
  });
  try {
    const page = await app.firstWindow(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const img = page.locator(".slide>img");
    await img.waitFor();
    await img.evaluate((image) => image.decode());
    const size = await img.evaluate((image) => ({
      w: image.naturalWidth,
      h: image.naturalHeight,
    }));
    assert(size.w > 640, "Presentation must use a full-resolution image");
    assert(size.h > 0);
    const thumbnail = await img.evaluate(async (image) => {
      const thumb = new Image();
      thumb.src = image.src + "&thumb=1";
      await thumb.decode();
      return { w: thumb.naturalWidth, h: thumb.naturalHeight };
    });
    assert(thumbnail.w <= 640 && thumbnail.h <= 640);
    assert(thumbnail.w > 0 && thumbnail.h > 0);
    await fs.mkdir("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/heic-presentation.png" });
    const cache = path.join(directory, "userData", "thumbnails");
    const generated = (await fs.readdir(cache)).filter((n) =>
      n.endsWith(".preview.jpg"),
    );
    assert.equal(generated.length, 1);
    const stamp = (await fs.stat(path.join(cache, generated[0]))).mtimeMs;
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await page.locator(".slide>img").evaluate((image) => image.decode());
    assert.equal(
      (await fs.stat(path.join(cache, generated[0]))).mtimeMs,
      stamp,
    );
    assert.equal(await hash(), before);
    assert.deepEqual(errors, []);
    console.log(
      "HEIC desktop smoke passed: full-resolution display",
      size,
      "cache reused; original unchanged.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

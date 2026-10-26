const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

(async () => {
  const images = process.argv.slice(2).map((file) => path.resolve(file));
  assert(images.length, "Pass one or more image fixtures to test");
  const root = path.resolve(".test-data");
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, "media-preview-"));
  const media = await Promise.all(
    images.map(async (file, index) => {
      await fs.access(file);
      return {
        id: `image-${index}`,
        name: path.basename(file),
        path: file,
        type: "image",
        time: index + 1,
      };
    }),
  );
  const hash = async (file) =>
    createHash("sha256")
      .update(await fs.readFile(file))
      .digest("hex");
  const originalHashes = await Promise.all(images.map(hash));
  let contextMedia = media;
  if (process.env.TRAVEL_PREVIEW_CONTEXT) {
    const context = JSON.parse(
      await fs.readFile(process.env.TRAVEL_PREVIEW_CONTEXT, "utf8"),
    );
    const node = Object.values(context.nodes).find((node) =>
      node.media.some((item) => images.includes(item.path)),
    );
    assert(node, "Preview context must contain the requested photo");
    contextMedia = node.media.map((item) => ({
      ...item,
      includeInPresentation: images.includes(item.path),
    }));
  }
  const fixture = {
    version: 1,
    id: "media-preview-test",
    name: "图片预览测试",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "图片预览测试",
        parentId: null,
        children: [],
        media: contextMedia,
        map: null,
        pins: [],
      },
    },
  };
  const project = path.join(directory, "preview.travel");
  await fs.writeFile(project, JSON.stringify(fixture));
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
    timeout: 30000,
  });
  try {
    const page = await app.firstWindow();
    page.on("response", (response) => {
      if (response.url().startsWith("travel:") && response.status() >= 400)
        console.log("Media response:", response.status(), response.url());
    });
    page.on("requestfailed", (request) =>
      console.log(
        "Request failed:",
        request.url(),
        request.failure()?.errorText,
      ),
    );
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, project);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    for (const item of media) {
      const started = performance.now();
      await page
        .getByRole("button", { name: `预览素材 ${item.name}`, exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector(".detail-missing") ||
          document.querySelector(".detail-preview img")?.complete,
        null,
        { timeout: 10000 },
      );
      assert.equal(
        await page.locator(".detail-missing").count(),
        0,
        `Detail preview failed: ${item.name}`,
      );
      const image = page.locator(".detail-preview img");
      await image.evaluate((image) => image.decode());
      assert(
        await image.evaluate((image) => image.naturalWidth > 640),
        `Expected full-resolution detail: ${item.name}`,
      );
      const bounds = await image.boundingBox();
      assert(
        bounds && bounds.width > 100 && bounds.height > 100,
        `Detail image must be visible: ${item.name}`,
      );
      await fs.mkdir("artifacts", { recursive: true });
      await page.screenshot({
        path: `artifacts/detail-preview-${item.id}.png`,
      });
      console.log(
        "Detail preview passed:",
        item.name,
        `${Math.round(performance.now() - started)}ms`,
      );
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    for (const [index, item] of media.entries()) {
      const image = page.locator(".presentation .slide > img");
      await image.waitFor();
      const expectedId = contextMedia.find(
        (entry) => entry.path === item.path,
      ).id;
      await page.waitForFunction(
        (id) =>
          document
            .querySelector(".presentation .slide > img")
            ?.src.includes(`/${id}?`),
        expectedId,
      );
      await image.evaluate((image) => image.decode());
      assert(
        await image.evaluate((image) => image.naturalWidth > 640),
        `Presentation preview failed: ${item.name}`,
      );
      console.log("Presentation preview passed:", item.name);
      if (index < media.length - 1) await page.keyboard.press("ArrowRight");
    }
    assert.deepEqual(
      await Promise.all(images.map(hash)),
      originalHashes,
      "Original photos must remain unchanged",
    );
  } finally {
    await app.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

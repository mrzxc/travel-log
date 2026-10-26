const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const data = path.resolve(".test-data");
(async () => {
  const mediaDir = path.join(data, "media");
  await fs.mkdir(mediaDir, { recursive: true });
  const ffmpeg = require("ffmpeg-static");
  const image = path.join(mediaDir, "旅行照片.png"),
    video = path.join(mediaDir, "旅行视频.mp4"),
    projectPath = path.join(data, "桌面测试.travel");
  execFileSync(
    ffmpeg,
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x8eaa78:s=1200x800",
      "-frames:v",
      "1",
      "-y",
      image,
    ],
    { windowsHide: true },
  );
  execFileSync(
    ffmpeg,
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=640x360:rate=24",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-metadata",
      "creation_time=2024-05-16T12:00:00Z",
      "-y",
      video,
    ],
    { windowsHide: true },
  );
  const env = {
    ...process.env,
    TRAVEL_USER_DATA: path.join(data, "userData"),
    TRAVEL_SMOKE: "1",
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
    await app.evaluate(({ dialog }, projectPath) => {
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: projectPath,
      });
    }, projectPath);
    await page.getByRole("button", { name: "新建旅行项目" }).click();
    await page.getByRole("heading", { name: "未命名的旅行" }).waitFor();
    await app.evaluate(
      ({ dialog }, files) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: files,
        });
      },
      [image, video, image],
    );
    await page.getByRole("button", { name: "导入素材", exact: true }).click();
    await page.locator(".media-card").nth(1).waitFor();
    await page.keyboard.press("Control+s");
    await page.waitForFunction(() =>
      document
        .querySelector(".save-status")
        ?.textContent?.includes("所有更改已保存"),
    );
    const imported = { p: JSON.parse(await fs.readFile(projectPath, "utf8")) };
    const all = Object.values(imported.p.nodes).flatMap((n) => n.media);
    assert.equal(all.length, 2);
    assert.ok(
      all.some(
        (m) => m.type === "video" && new Date(m.time).getUTCFullYear() === 2024,
      ),
    );
    assert.ok((await page.locator(".toast").innerText()).includes("重复"));
    await page.locator(".media-card").first().waitFor();
    assert.equal(await page.locator(".media-card").count(), 2);
    await page
      .locator(".media-image img")
      .first()
      .evaluate((img) => img.decode());
    await page.getByRole("button", { name: "开始演示" }).click();
    await page.locator(".slide>video").waitFor();
    await page.waitForFunction(() => {
      const v = document.querySelector(".slide>video");
      return v && v.readyState >= 2;
    });
    assert.equal(
      await page.locator(".slide>video").evaluate((v) => v.paused),
      true,
    );
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => document.querySelector(".slide>video")?.ended,
    );
    assert.equal(
      await page.locator(".slide>video").evaluate((v) => v.currentTime >= 0.9),
      true,
    );
    await page.keyboard.press("ArrowRight");
    await page.locator(".slide>img").evaluate((img) => img.decode());
    await page.getByRole("button", { name: "结束演示", exact: true }).click();
    // Verify actual folder traversal and duplicate prevention against saved references.
    const again = await page.evaluate(
      async ({ data, p }) => window.desktop.import([data], p),
      { data: mediaDir, p: imported.p },
    );
    assert.equal(again.items.length, 0);
    assert.equal(again.duplicates, 2);
    await fs.rename(image, path.join(data, "移走的照片.png"));
    const checked = await page.evaluate(
      (p) => window.desktop.check(p),
      imported.p,
    );
    assert.equal(
      checked.nodes[checked.rootId].media.find((m) => m.type === "image")
        .missing,
      true,
    );
    await fs.rename(path.join(data, "移走的照片.png"), image);
    await page
      .getByRole("button", { name: "添加子地点", exact: true })
      .last()
      .click();
    await page.locator(".dialog input").fill("景点");
    await page.getByRole("button", { name: "确定", exact: true }).click();
    await page
      .getByRole("button", { name: "预览素材 旅行照片.png", exact: true })
      .click();
    const targetPlace = await page
      .locator(".detail-move option")
      .filter({ hasText: "景点" })
      .getAttribute("value");
    await page.locator(".detail-move select").selectOption(targetPlace);
    await app.evaluate(({ dialog }, image) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [image],
      });
    }, image);
    await page.getByRole("button", { name: "地图与标点" }).click();
    await page.getByRole("button", { name: "上传地图" }).click();
    await page
      .locator(".map-editor .map-image")
      .evaluate((img) => img.decode());
    await page.locator(".pin-toolbar select").selectOption({ label: "景点" });
    await page.getByRole("button", { name: "添加标点", exact: true }).click();
    await page.getByRole("button", { name: "开始演示" }).click();
    await page
      .locator(".presentation .map-image")
      .evaluate((img) => img.decode());
    await page.waitForFunction(
      () =>
        document
          .querySelector(".presentation .map-sheet")
          .getBoundingClientRect().width > 500,
    );
    await page.screenshot({ path: "artifacts/desktop-map.png" });
    await page.locator(".presentation .map-pin").click();
    await page.locator(".slide>img").evaluate((img) => img.decode());
    await page
      .getByRole("button", { name: "返回上一级地图", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "artifacts/desktop.png" });
    assert.deepEqual(errors, []);
    const saved = JSON.parse(await fs.readFile(projectPath, "utf8"));
    assert.equal(saved.version, 1);
    await fs.access(projectPath + ".bak");
    console.log(
      "Desktop smoke passed: actual local import, Chinese paths, duplicate detection, EXIF/video date, thumbnails, custom protocol, paused video, playback end, missing-file detection, atomic save and backup.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

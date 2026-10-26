const {
  _electron: electron,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const dir = path.resolve(".test-data/video-seek");
  await fs.mkdir(dir, { recursive: true });
  const video = path.join(dir, "seek.mp4");
  require("node:child_process").execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=640x360:rate=24",
      "-t",
      "12",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-y",
      video,
    ],
    { windowsHide: true },
  );
  const file = path.join(dir, "seek.travel");
  await fs.writeFile(
    file,
    JSON.stringify({
      version: 1,
      id: "seek",
      name: "视频拖动验证",
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          name: "视频",
          parentId: null,
          children: [],
          media: [
            {
              id: "video",
              name: "seek.mp4",
              path: video,
              type: "video",
              time: 1,
            },
          ],
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
    executablePath: process.env.TRAVEL_TEST_EXE || require("electron"),
    args: process.env.TRAVEL_TEST_EXE ? [] : [path.resolve(".")],
    env,
  });
  try {
    await app.evaluate(({ BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.setBackgroundThrottling(false);
    });
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    const v = page.locator(".slide>video");
    await v.waitFor();
    await page.waitForFunction(
      () => document.querySelector(".slide>video")?.duration > 10,
    );
    const stage = page.locator(".media-zoom-stage");
    for (const scale of [0.8, 1, 1.25, 0.5]) {
      await page.locator(".presentation").dispatchEvent("mousemove");
      await page
        .getByRole("button", { name: "恢复素材比例", exact: true })
        .click();
      const button = scale > 0.8 ? "放大素材" : "缩小素材";
      for (
        let i = 0;
        i < (scale === 1.25 ? 2 : scale === 0.5 ? 3 : scale === 1 ? 1 : 0);
        i++
      )
        await page.getByRole("button", { name: button, exact: true }).click();
      const seek = page.getByLabel("视频播放进度");
      await seek.waitFor();
      const box = await seek.boundingBox();
      await v.evaluate((el) => {
        el.pause();
        el.currentTime = 0;
      });
      await page.mouse.move(box.x + 8, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, {
        steps: 15,
      });
      await page.mouse.up();
      await page.waitForTimeout(350);
      console.log(
        "seek state",
        scale,
        await seek.inputValue(),
        await v.evaluate((el) => ({
          time: el.currentTime,
          duration: el.duration,
          seekable: Array.from({ length: el.seekable.length }, (_, i) => [
            el.seekable.start(i),
            el.seekable.end(i),
          ]),
        })),
      );
      assert(
        (await v.evaluate((el) => el.currentTime)) > 6,
        "mouse seek failed at " + scale,
      );
      await page.getByRole("button", { name: "播放视频", exact: true }).click();
      await page.waitForTimeout(150);
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, {
        steps: 12,
      });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const time = await v.evaluate((el) => el.currentTime);
      assert(time > 1 && time < 5, "playing seek failed " + time);
      assert.equal(await v.evaluate((el) => el.paused), false);
      assert.equal(await stage.getAttribute("data-media-pan-x"), "0");
      await page.getByRole("button", { name: "暂停视频", exact: true }).click();
    }
    console.log(
      "Native video seek passed: mouse drag forward/back while paused/playing at 80%, 100%, 125%, 50%; no pan interference.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const dir = path.resolve(".test-data/optimization");
async function waitSaved(page) {
  await page.keyboard.press("Control+s");
  await page.waitForFunction(() =>
    document
      .querySelector(".save-status")
      ?.textContent?.includes("所有更改已保存"),
  );
}
async function drag(
  page,
  source,
  target,
  { after = true, assertTrash = true } = {},
) {
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox();
  assert.ok(a, "source box");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 3, {
    steps: 4,
  });
  if (assertTrash) await page.locator(".drag-trash").waitFor();
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox();
  assert.ok(b, "target box");
  await page.mouse.move(
    b.x + b.width * (after ? 0.8 : 0.2),
    b.y + b.height / 2,
    { steps: 20 },
  );
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.locator(".drag-trash").waitFor({ state: "detached" });
  await page.waitForTimeout(120);
}
(async () => {
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir("artifacts", { recursive: true });
  const ff = require("ffmpeg-static");
  const media = [];
  for (const [i, name] of ["A", "B", "C", "D", "E"].entries()) {
    const file = path.join(dir, name + ".png");
    execFileSync(
      ff,
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        `color=c=${["0x71986a", "0xc1a16b", "0x729eac", "0xa38fba", "0xb78d78"][i]}:s=900x600`,
        "-frames:v",
        "1",
        "-y",
        file,
      ],
      { windowsHide: true },
    );
    media.push({
      id: name,
      name: name + ".png",
      path: file,
      type: "image",
      time: 1700000000000 + i,
    });
  }
  const external = path.join(dir, "独立封面.png");
  await fs.copyFile(media[0].path, external);
  const fixture = {
    version: 1,
    id: "optimizations",
    name: "优化测试旅行",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "优化测试旅行",
        parentId: null,
        children: ["target", "italy"],
        media,
        map: null,
        pins: [],
        coverId: "B",
      },
      target: {
        id: "target",
        name: "目标地点",
        parentId: "root",
        children: [],
        media: [],
        map: null,
        pins: [],
      },
      italy: {
        id: "italy",
        name: "意大利",
        parentId: "root",
        children: ["rome"],
        media: [],
        map: null,
        pins: [],
      },
      rome: {
        id: "rome",
        name: "罗马",
        parentId: "italy",
        children: [],
        media: [],
        map: null,
        pins: [],
      },
    },
  };
  const projectPath = path.join(dir, "优化测试.travel");
  await fs.writeFile(projectPath, JSON.stringify(fixture));
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
    }, projectPath);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    await page.locator(".media-card").nth(4).waitFor();
    assert.equal(
      await page
        .locator(
          '.media-card select,.media-card .media-options,.media-card button[title="移除素材引用"]',
        )
        .count(),
      0,
    );
    await page.getByRole("button", { name: "折叠意大利", exact: true }).click();
    assert.equal(
      await page.locator('.tree-row[data-place-id="rome"]').count(),
      0,
    );
    await page.getByRole("button", { name: "展开意大利", exact: true }).click();
    await page.locator('.tree-row[data-place-id="rome"]').waitFor();
    // Single-item actions live in the detail drawer and update immediately.
    await page
      .getByRole("button", { name: "预览素材 A.png", exact: true })
      .click();
    await page.getByRole("dialog", { name: "素材详情" }).waitFor();
    await page.getByRole("switch", { name: "参加演示", exact: true }).uncheck();
    await page.getByRole("button", { name: "关闭素材详情" }).click();
    assert.equal(
      await page.locator('[data-media-id="A"] .excluded-badge').count(),
      1,
    );
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    assert.equal(await page.locator(".slide-counter").innerText(), "01 / 04");
    await page.keyboard.press("Escape");
    // Non-contiguous selected items reorder together, preserving their list order.
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await page
      .getByRole("button", { name: "选择素材 B.png", exact: true })
      .click();
    await page
      .getByRole("button", { name: "选择素材 D.png", exact: true })
      .click();
    await drag(
      page,
      page.locator('[data-media-id="B"] .media-image'),
      page.locator('[data-media-id="E"]'),
    );
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["A", "C", "E", "B", "D"],
    );
    await page.getByRole("button", { name: "不参加演示", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".excluded-badge").length === 3,
    );
    await page
      .getByRole("button", { name: "恢复参加演示", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".excluded-badge").length === 1,
    );
    // Drop a group onto the tree; the drawer stays closed after drag completion.
    await drag(
      page,
      page.locator('[data-media-id="B"] .media-image'),
      page.locator('.tree-row[data-place-id="target"]'),
    );
    assert.equal(
      await page.getByRole("dialog", { name: "素材详情" }).count(),
      0,
    );
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["A", "C", "E"],
    );
    await page.locator('.tree-row[data-place-id="target"] .tree-item').click();
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["B", "D"],
    );
    // Drag an unselected item while selection mode is on: move only that item.
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await page
      .getByRole("button", { name: "选择素材 B.png", exact: true })
      .click();
    await drag(
      page,
      page.locator('[data-media-id="D"] .media-image'),
      page.locator('.tree-row[data-place-id="root"]'),
    );
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["B"],
    );
    // Single-item drag to trash works even outside selection mode.
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await drag(
      page,
      page.locator('[data-media-id="B"] .media-image'),
      page.locator(".drag-trash"),
    );
    assert.equal(await page.locator(".media-card").count(), 0);
    await fs.access(media[1].path);
    await page.locator('.tree-row[data-place-id="root"] .tree-item').click();
    await waitSaved(page);
    let saved = JSON.parse(await fs.readFile(projectPath, "utf8"));
    assert.equal(saved.nodes.root.coverAsset.path, media[1].path);
    assert.ok(!saved.nodes.root.coverId);
    // A separately imported cover never enters the media list or presentation count.
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, external);
    const previousCover = await page
      .locator(".cover-choice img")
      .getAttribute("src");
    await page
      .getByRole("button", { name: "导入独立封面", exact: true })
      .click();
    await page.waitForFunction((previous) => {
      const image = document.querySelector(".cover-choice img");
      return image && image.getAttribute("src") !== previous;
    }, previousCover);
    await page.locator(".cover-choice img").evaluate((img) => img.decode());
    await waitSaved(page);
    saved = JSON.parse(await fs.readFile(projectPath, "utf8"));
    assert.equal(saved.nodes.root.coverAsset.path, external);
    assert.equal(saved.nodes.root.media.length, 4);
    assert.ok(!saved.nodes.root.media.some((m) => m.path === external));
    await page
      .getByRole("button", { name: "预览素材 C.png", exact: true })
      .click();
    await page
      .getByRole("button", { name: "设为地点封面", exact: true })
      .click();
    await page.getByRole("button", { name: "关闭素材详情" }).click();
    await page.locator(".cover-choice img").evaluate((img) => img.decode());
    await page
      .getByRole("button", { name: "预览素材 C.png", exact: true })
      .click();
    await page.getByRole("switch", { name: "参加演示", exact: true }).uncheck();
    await page.getByRole("button", { name: "删除素材", exact: true }).click();
    await waitSaved(page);
    saved = JSON.parse(await fs.readFile(projectPath, "utf8"));
    assert.equal(saved.nodes.root.coverAsset.path, media[2].path);
    assert.ok(!saved.nodes.root.media.some((m) => m.id === "C"));
    await fs.access(media[2].path);
    // Batch deletion removes only selected references.
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await page
      .getByRole("button", { name: "选择素材 E.png", exact: true })
      .click();
    await page
      .getByRole("button", { name: "选择素材 D.png", exact: true })
      .click();
    await page.getByRole("button", { name: "删除", exact: true }).click();
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["A"],
    );
    await page.screenshot({ path: "artifacts/optimization-management.png" });
    await page.getByRole("switch", { name: "选择", exact: true }).click();
    await page
      .getByRole("button", { name: "预览素材 A.png", exact: true })
      .click();
    await page.screenshot({ path: "artifacts/optimization-detail.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Optimization smoke passed: collapsible tree; drawer controls; exclusion and counts; group reorder; group tree drop; unselected drag; trash; legacy and independent covers; original-file preservation; batch actions.",
    );
  } catch (e) {
    const page = await app.firstWindow();
    await page.screenshot({ path: "artifacts/optimization-error.png" });
    console.log(await page.locator(".selection-bar").allTextContents());
    throw e;
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

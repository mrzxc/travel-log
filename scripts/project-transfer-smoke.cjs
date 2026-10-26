const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

(async () => {
  const root = path.resolve(".test-data");
  await fs.mkdir(root, { recursive: true });
  const dir = await fs.mkdtemp(path.join(root, "project-transfer-"));
  const originals = path.join(dir, "原件"),
    alternate = path.join(dir, "新位置");
  await fs.mkdir(originals);
  await fs.mkdir(alternate);
  const fixtureImage = path.join(originals, "照片.jpg");
  execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x8eaa78:s=800x600",
      "-frames:v",
      "1",
      "-y",
      fixtureImage,
    ],
    { windowsHide: true, timeout: 30000 },
  );
  execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x7755aa:s=1000x700",
      "-frames:v",
      "1",
      "-y",
      path.join(alternate, "照片.jpg"),
    ],
    { windowsHide: true, timeout: 30000 },
  );
  const asset = {
    id: "photo",
    name: "照片.jpg",
    path: path.join(originals, "照片.jpg"),
    type: "image",
    time: 1,
    includeInPresentation: false,
    note: "保留备注",
  };
  const project = {
    version: 1,
    id: "transfer-original",
    name: "往返旅行",
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        name: "往返旅行",
        parentId: null,
        children: [],
        media: [asset],
        coverAsset: { ...asset, id: "cover" },
        map: null,
        pins: [],
        routes: [],
      },
    },
  };
  const file = path.join(dir, "original.travel");
  await fs.writeFile(file, JSON.stringify(project, null, 2));
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
    const page = await app.firstWindow(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const select = async (files, saveFile) =>
      app.evaluate(
        ({ dialog }, { files, saveFile }) => {
          const queue = [...files];
          dialog.showOpenDialog = async () => ({
            canceled: false,
            filePaths: [queue.shift()],
          });
          dialog.showSaveDialog = async () => ({
            canceled: false,
            filePath: saveFile,
          });
        },
        { files, saveFile },
      );
    await select([file]);
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    // Reference-only export: defaults off, textual Windows mapping, all roles updated.
    const exported = path.join(dir, "reference.travel");
    await select([], exported);
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    assert.equal(
      await page.getByLabel("导出素材原件", { exact: false }).isChecked(),
      false,
    );
    await page
      .getByRole("button", { name: "配置文件路径", exact: true })
      .last()
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "选择文件夹 1", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("textbox", { name: "目标文件夹 1", exact: true })
      .fill("D:\\旅行照片");
    await page
      .getByRole("button", { name: "完成路径配置", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "导出项目", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const copy = JSON.parse(await fs.readFile(exported, "utf8"));
    assert.equal(copy.nodes.root.media[0].path, "D:\\旅行照片\\照片.jpg");
    assert.equal(
      copy.nodes.root.coverAsset.path,
      copy.nodes.root.media[0].path,
    );
    assert.equal(
      JSON.parse(await fs.readFile(file, "utf8")).nodes.root.media[0].path,
      asset.path,
    );
    // Packaged export and import auto-map to extracted local files.
    const zip = path.join(dir, "project.zip");
    await select([], zip);
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    await page.getByLabel("导出素材原件", { exact: false }).check();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "导出项目", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await select([zip, dir]);
    await page.getByRole("button", { name: "导入项目", exact: true }).click();
    await page.getByRole("dialog", { name: "配置文件路径" }).waitFor();
    await page.getByRole("button", { name: "确认导入", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const importedFile = path.join(dir, "往返旅行", "往返旅行.travel");
    const imported = JSON.parse(await fs.readFile(importedFile, "utf8"));
    assert.equal(imported.nodes.root.media[0].path, "素材/文件夹-001/照片.jpg");
    assert.equal(imported.nodes.root.media[0].includeInPresentation, false);
    assert.equal(imported.nodes.root.media[0].note, "保留备注");
    // Project-page mapping uses folder selection and saves every reference.
    await page
      .getByRole("button", { name: "预览素材 照片.jpg", exact: true })
      .click();
    await page
      .locator(".detail-preview img")
      .evaluate((image) => image.decode());
    assert.equal(
      await page
        .locator(".detail-preview img")
        .evaluate((image) => image.naturalWidth),
      800,
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "配置文件路径", exact: true })
      .click();
    await select([alternate]);
    await page
      .getByRole("button", { name: "选择文件夹 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "应用路径配置", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const changed = JSON.parse(await fs.readFile(importedFile, "utf8"));
    assert.equal(
      changed.nodes.root.media[0].path,
      path.join(alternate, "照片.jpg"),
    );
    assert.equal(
      changed.nodes.root.coverAsset.path,
      changed.nodes.root.media[0].path,
    );
    await page
      .getByRole("button", { name: "预览素材 照片.jpg", exact: true })
      .click();
    await page
      .locator(".detail-preview img")
      .evaluate((image) => image.decode());
    assert.equal(
      await page
        .locator(".detail-preview img")
        .evaluate((image) => image.naturalWidth),
      1000,
      "Path remapping must refresh the displayed image, not reuse the old URL cache",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      JSON.parse(await fs.readFile(file, "utf8")).nodes.root.media[0].path,
      asset.path,
    );
    await fs.mkdir("artifacts", { recursive: true });
    await page
      .getByRole("button", { name: "配置文件路径", exact: true })
      .click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (button) => button.textContent === "应用路径配置" && !button.disabled,
      ),
    );
    await page.screenshot({ path: "artifacts/project-path-config.png" });
    await page.getByRole("button", { name: "取消", exact: true }).click();
    assert.deepEqual(errors, []);
    console.log(
      "Project transfer UI passed: default reference export, cross-platform path editing, portable ZIP round-trip, folder chooser, independent project, shared cover references, notes and participation preserved.",
    );
  } finally {
    await app.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

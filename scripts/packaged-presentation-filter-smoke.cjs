const { _electron: electron } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
(async () => {
  const dir = path.resolve(".test-data/presentation-filter-packaged");
  await fs.mkdir(dir, { recursive: true });
  const image = path.join(dir, "photo.png");
  execFileSync(
    require("ffmpeg-static"),
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xaabb99:s=640x480",
      "-frames:v",
      "1",
      "-y",
      image,
    ],
    { windowsHide: true },
  );
  const media = (id, includeInPresentation = true) => ({
    id,
    path: image,
    name: id + ".png",
    type: "image",
    time: 1,
    includeInPresentation,
  });
  const place = (id, name, parentId, children, items) => ({
    id,
    name,
    parentId,
    children,
    media: items,
    map: null,
    pins: [],
  });
  const project = {
    version: 1,
    id: "global-filter-native",
    name: "全局筛选测试",
    rootId: "root",
    nodes: {
      root: place(
        "root",
        "旅行",
        null,
        ["city", "hidden"],
        [
          media("A"),
          media("B", false),
          { ...media("C"), path: path.join(dir, "missing.png") },
        ],
      ),
      city: place(
        "city",
        "城市",
        "root",
        ["grand"],
        [media("D"), media("E", false)],
      ),
      grand: place(
        "grand",
        "景点",
        "city",
        [],
        [media("F"), media("G", false)],
      ),
      hidden: place("hidden", "待整理", "root", [], [media("H", false)]),
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
  async function launch() {
    const app = await electron.launch({
      executablePath: process.env.TRAVEL_TEST_EXE || require("electron"),
      args: process.env.TRAVEL_TEST_EXE ? [] : [path.resolve(".")],
      env,
    });
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
    return { app, page, errors };
  }
  let run = await launch();
  try {
    const { page } = run,
      toggle = () =>
        page.getByRole("switch", { name: "仅显示参加演示", exact: true }),
      ids = () =>
        page
          .locator(".media-sortable")
          .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      select = (id) =>
        page
          .locator('.tree-row[data-place-id="' + id + '"] > .tree-item')
          .click();
    if (await toggle().isChecked()) await toggle().uncheck();
    assert.deepEqual(await ids(), ["A", "B", "C"]);
    await toggle().check();
    assert.deepEqual(await ids(), ["A"]);
    await select("city");
    assert.equal(await toggle().isChecked(), true);
    assert.deepEqual(await ids(), ["D"]);
    await select("grand");
    assert.deepEqual(await ids(), ["F"]);
    await toggle().uncheck();
    assert.deepEqual(await ids(), ["F", "G"]);
    await select("root");
    assert.equal(await toggle().isChecked(), false);
    assert.deepEqual(await ids(), ["A", "B", "C"]);
    await toggle().check();
    await page.waitForTimeout(650);
    assert.deepEqual(run.errors, []);
  } finally {
    await run.app.close();
  }
  run = await launch();
  try {
    const { page } = run;
    assert.equal(
      await page
        .getByRole("switch", { name: "仅显示参加演示", exact: true })
        .isChecked(),
      true,
    );
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["A"],
    );
    await page.locator('.tree-row[data-place-id="grand"] > .tree-item').click();
    assert.deepEqual(
      await page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId)),
      ["F"],
    );
    assert.deepEqual(run.errors, []);
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(saved.nodes.root.media.length, 3);
    assert.equal(saved.nodes.root.media[1].includeInPresentation, false);
    assert.equal(saved.onlyPresentable, undefined);
    console.log(
      "Packaged global filter passed: shared parent/child/grandchild state, excluded/missing filtering, unchanged media data and preference restored after app restart.",
    );
  } finally {
    await run.app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

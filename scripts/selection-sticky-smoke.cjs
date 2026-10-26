const {
  chromium,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#879b73"/></svg>',
  );
const items = Array.from({ length: 48 }, (_, i) => ({
  id: "m" + i,
  name: "照片" + i + ".jpg",
  type: "image",
  path: image,
  time: i + 1,
}));
const children = Array.from({ length: 30 }, (_, i) => "child" + i);
const fixture = {
  version: 1,
  id: "sticky",
  name: "快捷键与吸顶",
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      name: "旅行",
      parentId: null,
      children,
      media: items,
      map: null,
      pins: [],
    },
    ...Object.fromEntries(
      children.map((id) => [
        id,
        {
          id,
          name: id,
          parentId: "root",
          children: [],
          media: [],
          map: null,
          pins: [],
        },
      ]),
    ),
  },
};
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ fixture, image }) => {
        window.desktop = {
          open: async () => ({ project: fixture, path: "F:/sticky.travel" }),
          save: async (p) => {
            window.savedProject = p;
            return "F:/sticky.travel";
          },
          check: async (p) => p,
          url: () => image,
          onOpen: () => () => {},
          onFlush: () => {},
          fullscreen: async () => {},
        };
      },
      { fixture, image },
    );
    await page.goto(process.env.TRAVEL_TEST_URL || "http://127.0.0.1:5194");
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    const mode = () => page.getByRole("switch", { name: "选择", exact: true });
    const enabled = () => mode().getAttribute("aria-checked");
    await page.evaluate(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
          isComposing: true,
        }),
      );
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, repeat: true }),
      );
    });
    assert.equal(await enabled(), "false");
    await page.keyboard.press("Control+a");
    assert.equal(await enabled(), "false");
    await page.keyboard.press("a");
    assert.equal(await enabled(), "true");
    await page
      .getByRole("button", { name: "选择素材 照片0.jpg", exact: true })
      .click();
    await page.keyboard.press("a");
    assert.equal(await page.locator(".media-card.is-selected").count(), 1);
    assert.equal(await enabled(), "true");
    await page.keyboard.press("Escape");
    assert.equal(await enabled(), "false");
    assert.equal(await page.locator(".media-card.is-selected").count(), 0);
    await page
      .getByRole("button", { name: "预览素材 照片0.jpg", exact: true })
      .click();
    const d = page.getByRole("dialog", { name: "素材详情", exact: true });
    await page.keyboard.press("a");
    assert.equal(await enabled(), "false");
    await d.getByLabel("图片备注").fill("备注");
    await d.getByLabel("图片备注").press("a");
    assert.equal(await enabled(), "false");
    const participation = d.getByRole("switch", {
      name: "参加演示",
      exact: true,
    });
    const switchBox = await participation.boundingBox(),
      noteBox = await d.getByLabel("图片备注").boundingBox();
    assert(
      switchBox.y < noteBox.y,
      "participation switch should be above notes",
    );
    await participation.uncheck();
    await d.getByTitle("关闭素材详情").click();
    assert.equal(
      await page.locator('[data-media-id="m0"] .excluded-badge').count(),
      1,
    );
    await page
      .getByRole("button", { name: "预览素材 照片0.jpg", exact: true })
      .click();
    assert.equal(await participation.isChecked(), false);
    await participation.check();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /地图与标点/ }).click();
    await page.keyboard.press("a");
    await page.getByRole("button", { name: /素材与地点/ }).click();
    assert.equal(await enabled(), "false");
    await page.getByTitle("重命名", { exact: true }).click();
    const input = page.locator(".dialog input");
    await input.fill("名称");
    await input.press("a");
    assert.equal(await enabled(), "false");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await page.getByRole("button", { name: "开始演示", exact: true }).click();
    await page.keyboard.press("a");
    assert.equal(await page.locator(".selection-bar").count(), 0);
    await page.keyboard.press("Escape");
    assert.equal(await enabled(), "false");
    await page.keyboard.press("a");
    const bar = page.locator(".selection-bar");
    const workspace = page.locator(".workspace");
    const original = await bar.boundingBox(),
      w = await workspace.boundingBox();
    await workspace.evaluate(
      (el, scroll) => (el.scrollTop = scroll),
      original.y - w.y + 100,
    );
    await page.waitForTimeout(120);
    const stuck = await bar.boundingBox();
    assert(
      Math.abs(stuck.y - w.y) < 2,
      "bar should stick to workspace top: " + JSON.stringify({ stuck, w }),
    );
    await bar.getByRole("checkbox").check();
    assert.equal(await page.locator(".media-card.is-selected").count(), 48);
    await page.screenshot({ path: "artifacts/selection-sticky.png" });
    await workspace.evaluate((el) => {
      const section = el.querySelector(".selection-bar").closest("section");
      el.scrollTop +=
        section.getBoundingClientRect().bottom -
        el.getBoundingClientRect().top +
        80;
    });
    await page.waitForTimeout(100);
    const released = await bar.boundingBox();
    assert(
      released.y + released.height < w.y + 2,
      "bar should leave with media section",
    );
    await workspace.evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(100);
    assert(
      Math.abs((await bar.boundingBox()).y - original.y) < 2,
      "bar returns to original position",
    );
    await page.keyboard.press("Escape");
    assert.equal(await bar.count(), 0);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.keyboard.press("a");
    const narrowBar = await bar.boundingBox(),
      narrowWorkspace = await workspace.boundingBox();
    await workspace.evaluate(
      (el, scroll) => (el.scrollTop = scroll),
      narrowBar.y - narrowWorkspace.y + 100,
    );
    await page.waitForTimeout(100);
    assert(
      Math.abs((await bar.boundingBox()).y - narrowWorkspace.y) < 2,
      "narrow window sticky top",
    );
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "Selection shortcut/sticky passed: A activation, repeated A preserves selection, Ctrl+A/typing/details/map/presentation guarded, sticky top/section end/return, detail participation prominent and saved.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

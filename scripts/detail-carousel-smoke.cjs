const {
  chromium,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#879b73"/></svg>',
  );
const items = ["A", "B", "C", "D"].map((id, i) => ({
  id,
  name: id + ".jpg",
  path: image,
  type: "image",
  time: i + 1,
  ...(id === "B" ? { includeInPresentation: false } : {}),
  ...(id === "D" ? { missing: true } : {}),
}));
const fixture = {
  version: 1,
  id: "carousel",
  name: "详情轮播",
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      name: "旅行",
      parentId: null,
      children: [],
      map: null,
      pins: [],
      media: items,
    },
  },
};
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ fixture, image }) => {
        window.desktop = {
          open: async () => ({ project: fixture, path: "F:/carousel.travel" }),
          save: async (p) => {
            window.savedProject = p;
            return "F:/carousel.travel";
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
    await page.goto(process.env.TRAVEL_TEST_URL || "http://127.0.0.1:5192");
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    const open = async (name) =>
      page
        .getByRole("button", { name: "预览素材 " + name + ".jpg", exact: true })
        .click();
    const d = page.getByRole("dialog", { name: "素材详情", exact: true });
    const next = () =>
      d.getByRole("button", { name: "下一个素材", exact: true });
    const prev = () =>
      d.getByRole("button", { name: "上一个素材", exact: true });
    const name = () => d.locator("aside>h3").textContent();
    await open("A");
    assert.equal(await prev().isDisabled(), true);
    assert.equal(await d.getByLabel("素材位置").textContent(), "1 / 4");
    await page.keyboard.press("ArrowRight");
    assert.equal(await name(), "B.jpg");
    await d.getByLabel("图片备注").fill("仅属于 B 的备注");
    await d.getByLabel("图片备注").press("ArrowLeft");
    assert.equal(await name(), "B.jpg");
    await next().click();
    assert.equal(await name(), "C.jpg");
    assert.equal(await d.getByLabel("图片备注").inputValue(), "");
    await prev().click();
    assert.equal(
      await d.getByLabel("图片备注").inputValue(),
      "仅属于 B 的备注",
    );
    await next().click();
    await next().click();
    assert.equal(await name(), "D.jpg");
    assert.equal(await next().isDisabled(), true);
    assert.equal(await d.locator(".detail-missing").count(), 1);
    await prev().click();
    assert.equal(await d.locator(".detail-preview>img").count(), 1);
    await d.getByTitle("关闭素材详情").click();
    await page
      .getByRole("switch", { name: "仅显示参加演示", exact: true })
      .check();
    await open("A");
    assert.equal(await d.getByLabel("素材位置").textContent(), "1 / 2");
    await next().click();
    assert.equal(await name(), "C.jpg");
    assert.equal(await next().isDisabled(), true);
    await page.screenshot({ path: "artifacts/detail-carousel.png" });
    await page.keyboard.press("Escape");
    assert.equal(await d.count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "Detail carousel passed: previous/next, keyboard, endpoints, notes isolation, missing media recovery, filter order, Escape.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

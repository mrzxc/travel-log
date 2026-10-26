const {
  chromium,
} = require("C:/Users/10559/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#879b73"/></svg>',
  );
const fixture = {
  version: 1,
  id: "sort",
  name: "排序测试",
  rootId: "root",
  nodes: {
    root: {
      id: "root",
      name: "旅行",
      parentId: null,
      children: [],
      map: null,
      pins: [],
      media: "ABCDEFGH"
        .split("")
        .map((id, i) => ({
          id,
          name: id + ".jpg",
          path: image,
          type: "image",
          time: i + 1,
        })),
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
      viewport: { width: 1440, height: 1100 },
    });
    await page.addInitScript(
      ({ fixture, image }) => {
        window.desktop = {
          open: async () => ({ project: fixture, path: "F:/sort.travel" }),
          save: async () => "F:/sort.travel",
          check: async (p) => p,
          url: () => image,
          onOpen: () => () => {},
          onFlush: () => {},
        };
      },
      { fixture, image },
    );
    await page.goto(process.env.TRAVEL_TEST_URL || "http://127.0.0.1:5193");
    await page.getByRole("button", { name: "打开项目", exact: true }).click();
    const tile = (id) => page.locator(`[data-media-id="${id}"]`);
    const ids = () =>
      page
        .locator(".media-sortable")
        .evaluateAll((els) => els.map((el) => el.dataset.mediaId));
    async function drag(source, target, half) {
      const before = await ids();
      const a = await tile(source).locator(".media-image").boundingBox(),
        b = await tile(target).boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, {
        steps: 3,
      });
      await page.locator(".media-drag-preview").waitFor();
      await page.mouse.move(b.x + b.width * half, b.y + b.height * 0.4, {
        steps: 12,
      });
      await page.waitForTimeout(250);
      // The target must occupy its adjacent slot in the animated preview.
      const predicted = await tile(target).boundingBox();
      const from = before.indexOf(source),
        to = before.indexOf(target);
      const expected = before.filter((id) => id !== source);
      expected.splice(to, 0, source);
      assert(
        from < to
          ? predicted.y < b.y - 2 || predicted.x < b.x - 2
          : predicted.y > b.y + 2 || predicted.x > b.x + 2,
        "preview target should move into a new slot",
      );
      await page.mouse.up();
      await page.waitForTimeout(250);
      assert.deepEqual(
        await ids(),
        expected,
        `preview/drop mismatch ${source} -> ${target}`,
      );
      assert.equal(
        await page.getByRole("dialog", { name: "素材详情" }).count(),
        0,
      );
    }
    await drag("D", "B", 0.8);
    await drag("A", "C", 0.2);
    await drag("H", "D", 0.8);
    await drag("H", "G", 0.2);
    const choose = page.getByRole("switch", { name: "选择", exact: true });
    await choose.click();
    await page
      .getByRole("button", { name: "选择素材 B.jpg", exact: true })
      .click();
    assert.equal(await page.locator(".media-card.is-selected").count(), 1);
    const beforeCancel = await ids();
    const box = await tile("B").locator(".media-image").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2, { steps: 3 });
    await page.locator(".media-drag-preview").waitFor();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.locator(".media-drag-preview").waitFor({ state: "detached" });
    assert.deepEqual(await ids(), beforeCancel);
    assert.equal(await choose.getAttribute("aria-checked"), "true");
    await page.keyboard.press("Escape");
    assert.equal(await choose.getAttribute("aria-checked"), "false");
    assert.equal(await page.locator(".media-card.is-selected").count(), 0);
    await choose.click();
    assert.equal(await page.locator(".media-card.is-selected").count(), 0);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "预览素材 B.jpg", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.getByRole("dialog", { name: "素材详情" }).count(),
      0,
    );
    console.log(
      "Media sort passed: animated preview matches drop both directions and across rows, Esc exits multi-select and clears selection.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

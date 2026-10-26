const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { randomUUID, createHash } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const run = promisify(execFile);
const { isHeic, createImagePreview } = require("./image-preview.cjs");
const { videoResponse } = require("./video-response.cjs");
const { resolveProject, serializedProject } = require("./project-paths.cjs");
const { installProjectTransfer } = require("./project-transfer.cjs");
let imagePreview,
  projectTransfer,
  transferDisposing,
  transferDisposed = false;
if (process.env.TRAVEL_USER_DATA)
  app.setPath("userData", path.resolve(process.env.TRAVEL_USER_DATA));
protocol.registerSchemesAsPrivileged([
  {
    scheme: "travel",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
let win,
  projectPath = null,
  current = null,
  cacheDir,
  saveQueue = Promise.resolve();
const registry = new Map();
const images = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
]);
const videos = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".mkv",
  ".avi",
  ".mts",
  ".m2ts",
]);
const key = (p) => path.resolve(p).toLowerCase();
function assets(n) {
  return [
    ...n.media,
    ...(n.map ? [n.map] : []),
    ...(n.coverAsset ? [n.coverAsset] : []),
  ];
}
function register(p) {
  current = p;
  for (const n of Object.values(p.nodes)) {
    for (const m of assets(n)) registry.set(m.id, m);
  }
}
function validate(p) {
  if (p?.version !== 1 || typeof p.rootId !== "string" || !p.nodes?.[p.rootId])
    throw Error("不支持的项目格式");
  const seen = new Set();
  const visit = (id, parent) => {
    if (seen.has(id)) throw Error("地点结构存在循环或重复");
    seen.add(id);
    const n = p.nodes[id];
    if (
      !n ||
      n.id !== id ||
      n.parentId !== parent ||
      !Array.isArray(n.children) ||
      !Array.isArray(n.media) ||
      !Array.isArray(n.pins)
    )
      throw Error("地点结构损坏");
    for (const m of assets(n))
      if (typeof m.path !== "string" || typeof m.id !== "string")
        throw Error("素材记录损坏");
    for (const c of n.children) visit(c, id);
  };
  visit(p.rootId, null);
  if (seen.size !== Object.keys(p.nodes).length)
    throw Error("项目包含孤立地点");
  const all = Object.values(p.nodes).flatMap((n) => n.media);
  for (const n of Object.values(p.nodes))
    if (n.coverId) {
      const original = all.find((m) => m.id === n.coverId);
      if (!n.coverAsset && original)
        n.coverAsset = { ...original, id: randomUUID() };
      delete n.coverId;
    }
  return p;
}
async function check(p) {
  for (const n of Object.values(p.nodes))
    for (const m of assets(n)) {
      try {
        await fs.access(m.path);
        m.missing = false;
      } catch {
        m.missing = true;
      }
    }
  register(p);
  return p;
}
async function openFile(file) {
  const p = resolveProject(
    validate(JSON.parse(await fs.readFile(file, "utf8"))),
    path.dirname(file),
  );
  projectPath = file;
  registry.clear();
  return { project: await check(p), path: file };
}
async function selectOpen() {
  const r = await dialog.showOpenDialog(win, {
    filters: [{ name: "旅行项目", extensions: ["travel"] }],
    properties: ["openFile"],
  });
  return r.canceled ? null : openFile(r.filePaths[0]);
}
function cachePath(m) {
  return path.join(
    cacheDir,
    createHash("sha256")
      .update(m.path + "|" + m.time)
      .digest("hex") + ".jpg",
  );
}
let exif;
function unpacked(file) {
  return app.isPackaged
    ? file.replace("app.asar" + path.sep, "app.asar.unpacked" + path.sep)
    : file;
}
async function probe(file) {
  try {
    // ffprobe-static's darwin/arm64 binary is x64; use a native Apple Silicon build.
    const binary =
      process.platform === "darwin" && process.arch === "arm64"
        ? require.resolve("@ffprobe-installer/darwin-arm64/ffprobe")
        : require("ffprobe-static").path;
    const result = await run(
      unpacked(binary),
      ["-v", "quiet", "-show_format", "-show_streams", "-of", "json", file],
      { windowsHide: true, timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
    );
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}
async function metadata(file) {
  let tags = {};
  try {
    exif ??= require("exiftool-vendored").exiftool;
    tags = await exif.read(file);
  } catch {}
  for (const field of [
    "DateTimeOriginal",
    "CreationDate",
    "CreateDate",
    "MediaCreateDate",
  ]) {
    const v = tags[field];
    if (v) {
      const t =
        typeof v.toMillis === "function" ? v.toMillis() : Date.parse(String(v));
      if (Number.isFinite(t)) return t;
    }
  }
  return null;
}
async function makeMedia(file) {
  const ext = path.extname(file).toLowerCase();
  if (!images.has(ext) && !videos.has(ext)) return null;
  const stat = await fs.stat(file);
  if (!stat.isFile()) return null;
  const info = videos.has(ext) ? await probe(file) : null;
  const probeTime = Date.parse(
    info?.format?.tags?.creation_time ||
      info?.streams?.find((s) => s.tags?.creation_time)?.tags.creation_time ||
      "",
  );
  const m = {
    id: randomUUID(),
    path: path.resolve(file),
    name: path.basename(file),
    type: videos.has(ext) ? "video" : "image",
    time:
      (await metadata(file)) ||
      (Number.isFinite(probeTime) ? probeTime : 0) ||
      stat.mtimeMs ||
      stat.birthtimeMs,
  };
  registry.set(m.id, m);
  await thumb(m);
  return m;
}
async function thumb(m) {
  const dest = cachePath(m);
  try {
    await fs.access(dest);
    return dest;
  } catch {}
  let source = m.path;
  try {
    source = isHeic(m)
      ? await imagePreview(m, { priority: "background" })
      : m.path;
    const bin = unpacked(require("ffmpeg-static"));
    await run(
      bin,
      [
        "-v",
        "error",
        "-i",
        source,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:640:force_original_aspect_ratio=decrease",
        "-y",
        dest,
      ],
      { windowsHide: true, timeout: 30000 },
    );
    return dest;
  } catch {
    // HEIC must never fall back to an undecodable original in Chromium.
    if (isHeic(m)) return source !== m.path ? source : null;
    return m.type === "image" ? m.path : null;
  }
}
async function walk(entries) {
  const out = [];
  async function visit(file) {
    try {
      const s = await fs.lstat(file);
      if (s.isSymbolicLink()) return;
      if (s.isDirectory()) {
        for (const name of (await fs.readdir(file)).sort())
          await visit(path.join(file, name));
      } else out.push(file);
    } catch {}
  }
  for (const f of entries) await visit(f);
  return out;
}
function setup() {
  projectTransfer = installProjectTransfer({
    ipcMain,
    dialog,
    getWindow: () => win,
    getProjectPath: () => projectPath,
    validate,
    check,
    waitForSave: () => saveQueue,
    activate: (project, file) => {
      projectPath = file;
      registry.clear();
      register(project);
    },
  });
  ipcMain.handle("project:new", async () => {
    const r = await dialog.showSaveDialog(win, {
      defaultPath: "新的旅行.travel",
      filters: [{ name: "旅行项目", extensions: ["travel"] }],
    });
    if (r.canceled) return null;
    projectPath = r.filePath;
    registry.clear();
    return projectPath;
  });
  ipcMain.handle("project:open", selectOpen);
  ipcMain.handle("project:save", (_, p) => {
    const file = projectPath;
    if (!file) throw Error("请先创建或打开项目");
    validate(p);
    register(p);
    const body = JSON.stringify(
      serializedProject(p, path.dirname(file)),
      null,
      2,
    );
    const task = saveQueue
      .catch(() => {})
      .then(async () => {
        await fs.writeFile(file + ".tmp", body, "utf8");
        try {
          await fs.copyFile(file, file + ".bak");
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
        await fs.rename(file + ".tmp", file);
        return file;
      });
    saveQueue = task;
    return task;
  });
  ipcMain.handle("files:pick", async (_, folder) => {
    const r = await dialog.showOpenDialog(win, {
      properties: folder ? ["openDirectory"] : ["openFile", "multiSelections"],
      filters: folder
        ? []
        : [
            {
              name: "图片与视频",
              extensions: [...images, ...videos].map((e) => e.slice(1)),
            },
          ],
    });
    return r.canceled ? [] : r.filePaths;
  });
  ipcMain.handle("files:import", async (_, entries, p) => {
    const known = new Set(
      Object.values(p.nodes).flatMap((n) => n.media.map((m) => key(m.path))),
    );
    let duplicates = 0,
      unsupported = 0;
    const items = [];
    for (const file of await walk(entries)) {
      if (known.has(key(file))) {
        duplicates++;
        continue;
      }
      try {
        const m = await makeMedia(file);
        if (m) {
          known.add(key(file));
          items.push(m);
        } else unsupported++;
      } catch {
        unsupported++;
      }
    }
    items.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name));
    return { items, duplicates, unsupported };
  });
  ipcMain.handle("map:pick", async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [
        { name: "地图图片", extensions: [...images].map((v) => v.slice(1)) },
      ],
    });
    return r.canceled ? null : makeMedia(r.filePaths[0]);
  });
  ipcMain.handle("project:check", (_, p) => check(p));
  ipcMain.handle("cover:pick", async () => {
    const r = await dialog.showOpenDialog(win, {
      title: "选择独立地点封面",
      properties: ["openFile"],
      filters: [
        { name: "封面图片", extensions: [...images].map((v) => v.slice(1)) },
      ],
    });
    if (r.canceled) return null;
    if (!images.has(path.extname(r.filePaths[0]).toLowerCase()))
      throw Error("请选择图片作为独立封面");
    return makeMedia(r.filePaths[0]);
  });
  ipcMain.handle("media:relink", async (_, m, p) => {
    const r = await dialog.showOpenDialog(win, {
      title: "重新定位：" + m.name,
      properties: ["openFile"],
      filters: [
        {
          name: m.type === "image" ? "图片" : "视频",
          extensions: [...(m.type === "image" ? images : videos)].map((v) =>
            v.slice(1),
          ),
        },
      ],
    });
    if (r.canceled) return null;
    const file = r.filePaths[0];
    if (
      Object.values(p.nodes).some((n) =>
        n.media.some((v) => v.id !== m.id && key(v.path) === key(file)),
      )
    )
      throw Error("这个文件已归属其他素材");
    const next = await makeMedia(file);
    if (!next) return null;
    next.id = m.id;
    registry.set(next.id, next);
    return next;
  });
  ipcMain.handle("window:fullscreen", (_, value) => win.setFullScreen(!!value));
}
async function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#f6f5f1",
    title: "旅行图志",
    autoHideMenuBar: true,
    show: process.env.TRAVEL_SMOKE !== "1",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.on("close", (e) => {
    if (win._canClose) return;
    e.preventDefault();
    win.webContents.send("app:flush");
    setTimeout(async () => {
      await saveQueue.catch(() => {});
      win._canClose = true;
      win.close();
    }, 1000);
  });
  if (process.env.TRAVEL_DEV_URL) await win.loadURL(process.env.TRAVEL_DEV_URL);
  else await win.loadFile(path.join(__dirname, "../dist/index.html"));
  const arg = process.argv.find((v) => v.endsWith(".travel"));
  if (arg) {
    try {
      win.webContents.send("project:opened", await openFile(path.resolve(arg)));
    } catch (e) {
      dialog.showErrorBox("无法打开项目", e.message);
    }
  }
}
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on("second-instance", async (_, args) => {
    win?.show();
    win?.focus();
    const file = args.find((v) => v.endsWith(".travel"));
    if (file)
      try {
        await saveQueue.catch(() => {});
        win.webContents.send(
          "project:opened",
          await openFile(path.resolve(file)),
        );
      } catch (e) {
        dialog.showErrorBox("无法打开项目", e.message);
      }
  });
  app.whenReady().then(async () => {
    cacheDir = path.join(app.getPath("userData"), "thumbnails");
    await fs.mkdir(cacheDir, { recursive: true });
    imagePreview = createImagePreview(cacheDir);
    protocol.handle("travel", async (request) => {
      try {
        const u = new URL(request.url),
          id = u.pathname.slice(1),
          m = registry.get(id) || registry.get(u.searchParams.get("source"));
        if (!m) return new Response("Not found", { status: 404 });
        const file = u.searchParams.has("thumb")
          ? await thumb(m)
          : await imagePreview(m);
        if (!file) return new Response("No preview", { status: 404 });
        if (m.type === "video" && !u.searchParams.has("thumb"))
          return await videoResponse(file, request);
        return net.fetch(pathToFileURL(file).href, {
          headers: request.headers,
        });
      } catch {
        return new Response("Missing file", { status: 404 });
      }
    });
    setup();
    await createWindow();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    exif?.end();
    if (projectTransfer && !transferDisposed) {
      event.preventDefault();
      transferDisposing ||= projectTransfer
        .dispose()
        .catch(() => {})
        .finally(() => {
          transferDisposed = true;
          app.quit();
        });
    }
  });
}

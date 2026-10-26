const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  folderGroups,
  mapFolders,
  references,
  uniqueFiles,
  syntax,
  pathKey,
  absolute,
  localPath,
  resolveProject,
  serializedProject,
} = require("./project-paths.cjs");
const { writeArchive, extractArchive } = require("./project-archive.cjs");

const safeName = (name) =>
  String(name || "旅行项目")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 80) || "旅行项目";
async function exists(file) {
  if (
    process.platform !== "win32" &&
    syntax(file) === path.win32 &&
    absolute(file)
  )
    return false;
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}
async function freeDirectory(parent, name) {
  for (let i = 0; ; i++) {
    const candidate = path.join(parent, name + (i ? `-${i + 1}` : ""));
    try {
      await fs.access(candidate);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
}
async function inspectPaths(project, mappings, options = {}) {
  const mapped = mapFolders(project, mappings, options);
  const sourceReferences = references(project);
  const before = uniqueFiles(project),
    after = new Map(
      references(mapped).map((asset, index) => [
        pathKey(sourceReferences[index].path),
        asset.path,
      ]),
    );
  const folders = folderGroups(project).map((group) => ({
    ...group,
    target:
      mappings.find((item) => pathKey(item.source) === pathKey(group.source))
        ?.target || group.source,
    found: 0,
    missing: 0,
    missingFiles: [],
  }));
  const lookup = new Map(
    folders.map((group) => [pathKey(group.source), group]),
  );
  for (const source of before) {
    let file = options.checkSources ? source : after.get(pathKey(source));
    if (options.staging && options.destination && path.isAbsolute(file)) {
      const relative = path.relative(options.destination, file);
      if (
        relative &&
        relative !== ".." &&
        !relative.startsWith(".." + path.sep) &&
        !path.isAbsolute(relative)
      )
        file = path.join(options.staging, relative);
    }
    const group = lookup.get(pathKey(syntax(source).dirname(source)));
    if (await exists(file)) group.found++;
    else {
      group.missing++;
      group.missingFiles.push(after.get(pathKey(source)));
    }
  }
  return {
    project: mapped,
    folders,
    total: before.length,
    found: folders.reduce((sum, item) => sum + item.found, 0),
    missing: folders.reduce((sum, item) => sum + item.missing, 0),
  };
}

function installProjectTransfer({
  ipcMain,
  dialog,
  getWindow,
  getProjectPath,
  validate,
  check,
  activate,
  waitForSave,
}) {
  const sessions = new Map();
  const operations = new Set();
  let closing = false;
  const handle = (name, callback) =>
    ipcMain.handle(name, (...args) => {
      if (closing) throw Error("应用正在关闭，请稍后重新打开项目");
      const operation = Promise.resolve().then(() => callback(...args));
      operations.add(operation);
      operation.then(
        () => operations.delete(operation),
        () => operations.delete(operation),
      );
      return operation;
    });
  const progress = (message) => {
    const window = getWindow();
    if (window && !window.isDestroyed())
      window.webContents.send("project:transfer-progress", message);
  };
  async function discard(token) {
    const session = sessions.get(token);
    sessions.delete(token);
    if (session?.staging)
      await fs.rm(session.staging, { recursive: true, force: true });
  }
  const checkedCopy = (project) => validate(structuredClone(project));
  handle("project:folders", (_, project, packaged = false) =>
    folderGroups(checkedCopy(project), packaged),
  );
  handle("project:pick-folder", async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  handle("project:prepare-import", async () => {
    const input = await dialog.showOpenDialog(getWindow(), {
      title: "导入项目",
      filters: [
        { name: "旅行项目或导出压缩包", extensions: ["travel", "zip"] },
      ],
      properties: ["openFile"],
    });
    if (input.canceled) return null;
    const source = input.filePaths[0],
      packaged = path.extname(source).toLowerCase() === ".zip";
    let staging, destination, file, project;
    try {
      if (packaged) {
        const output = await dialog.showOpenDialog(getWindow(), {
          title: "选择导入位置（将创建项目专属文件夹）",
          properties: ["openDirectory"],
        });
        if (output.canceled) return null;
        staging = await fs.mkdtemp(
          path.join(output.filePaths[0], ".travel-import-"),
        );
        progress("正在解压项目和素材…");
        await extractArchive(source, staging, (done, total) =>
          progress(`正在解压 ${done} / ${total} 项…`),
        );
        project = checkedCopy(
          JSON.parse(
            await fs.readFile(path.join(staging, "project.travel"), "utf8"),
          ),
        );
        // Packaged originals are portable: absolute references may only be legacy
        // missing assets. Relative paths must never escape the extraction root.
        for (const asset of references(project))
          if (!absolute(asset.path)) {
            const { safeEntry } = require("./project-archive.cjs");
            safeEntry(asset.path);
          }
        destination = await freeDirectory(
          output.filePaths[0],
          safeName(project.name),
        );
        file = path.join(destination, safeName(project.name) + ".travel");
      } else {
        project = checkedCopy(JSON.parse(await fs.readFile(source, "utf8")));
        // Resolve relative references against the source, not the new save location.
        project = resolveProject(project, path.dirname(source));
        const output = await dialog.showSaveDialog(getWindow(), {
          title: "另存导入项目",
          defaultPath: safeName(project.name) + "-导入.travel",
          filters: [{ name: "旅行项目", extensions: ["travel"] }],
        });
        if (output.canceled) return null;
        file = output.filePath;
        try {
          await fs.access(file);
          throw Error("导入会创建独立项目，请选择尚不存在的文件名");
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        destination = path.dirname(file);
      }
      const token = randomUUID(),
        groups = folderGroups(project);
      if (packaged)
        for (const group of groups)
          group.target = localPath(group.source, destination);
      sessions.set(token, { project, staging, destination, file, packaged });
      return { token, project, groups, destination: file, packaged };
    } catch (error) {
      if (staging) await fs.rm(staging, { recursive: true, force: true });
      throw error;
    }
  });
  handle("project:cancel-import", (_, token) => discard(token));
  async function preview(request) {
    if (request.mode === "import") {
      const session = sessions.get(request.token);
      if (!session) throw Error("导入会话已结束，请重新选择项目");
      return inspectPaths(session.project, request.mappings, {
        baseDirectory: session.destination,
        staging: session.staging,
        destination: session.destination,
      });
    }
    const project = checkedCopy(request.project);
    return inspectPaths(
      project,
      request.mappings,
      request.mode === "export"
        ? { relativeOnly: request.includeMedia, checkSources: true }
        : { baseDirectory: path.dirname(getProjectPath()) },
    );
  }
  handle("project:preview-paths", async (_, request) => {
    try {
      const result = await preview(request);
      return { ...result, project: undefined };
    } catch (error) {
      return { error: error.message };
    }
  });
  handle("project:apply-paths", async (_, request) => {
    const result = await preview({ ...request, mode: "paths" });
    return check(result.project);
  });
  handle("project:export", async (_, request) => {
    await waitForSave();
    const result = await preview({ ...request, mode: "export" });
    if (request.includeMedia && result.missing && !request.skipMissing)
      throw Error(
        `有 ${result.missing} 份原件缺失。请先修复路径，或明确选择跳过缺失文件。`,
      );
    const extension = request.includeMedia ? "zip" : "travel";
    const output = await dialog.showSaveDialog(getWindow(), {
      title: "导出项目",
      defaultPath: safeName(request.project.name) + "." + extension,
      filters: [
        {
          name: request.includeMedia ? "旅行项目与素材" : "旅行项目",
          extensions: [extension],
        },
      ],
    });
    if (output.canceled) return null;
    if (pathKey(output.filePath) === pathKey(getProjectPath()))
      throw Error("导出副本不能覆盖当前项目，请选择其他文件名");
    if (
      uniqueFiles(request.project).some(
        (file) => pathKey(file) === pathKey(output.filePath),
      )
    )
      throw Error("导出文件不能覆盖素材原件，请选择其他文件名");
    progress(
      request.includeMedia
        ? `正在导出项目与 ${result.found} 份原件…`
        : "正在导出项目…",
    );
    result.project.portablePaths = !!request.includeMedia;
    if (request.includeMedia) {
      const original = uniqueFiles(request.project),
        mapped = references(result.project),
        source = references(request.project);
      const targets = new Map(
        source.map((asset, index) => [pathKey(asset.path), mapped[index].path]),
      );
      const files = [];
      for (const file of original)
        if (await exists(file))
          files.push({ source: file, destination: targets.get(pathKey(file)) });
        else if (!request.skipMissing)
          throw Error("导出期间有文件失效，请重新检查路径");
      await writeArchive(output.filePath, result.project, files);
    } else {
      const temporary = output.filePath + `.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(result.project, null, 2), {
          flag: "wx",
        });
        await fs.rename(temporary, output.filePath);
      } finally {
        await fs.rm(temporary, { force: true });
      }
    }
    return output.filePath;
  });
  handle("project:finish-import", async (_, request) => {
    const session = sessions.get(request.token);
    if (!session) throw Error("导入会话已结束");
    await waitForSave();
    const result = await preview({ ...request, mode: "import" });
    result.project.id = randomUUID();
    result.project.portablePaths = session.packaged;
    const serialized = serializedProject(
      result.project,
      path.dirname(session.file),
    );
    if (session.packaged) {
      const filename = path.basename(session.file);
      await fs.writeFile(
        path.join(session.staging, "project.travel"),
        JSON.stringify(serialized, null, 2),
      );
      if (filename !== "project.travel")
        await fs.rename(
          path.join(session.staging, "project.travel"),
          path.join(session.staging, filename),
        );
      // mkdir is the exclusive reservation; move only into the directory we own.
      await fs.mkdir(session.destination);
      try {
        for (const name of await fs.readdir(session.staging))
          await fs.rename(
            path.join(session.staging, name),
            path.join(session.destination, name),
          );
      } catch (error) {
        await fs.rm(session.destination, { recursive: true, force: true });
        await discard(request.token);
        throw error;
      }
    } else
      await fs.writeFile(session.file, JSON.stringify(serialized, null, 2), {
        flag: "wx",
      });
    const project = await check(result.project);
    activate(project, session.file);
    await discard(request.token);
    return { project, path: session.file };
  });
  return {
    dispose: async () => {
      closing = true;
      await Promise.allSettled([...operations]);
      for (const token of sessions.keys()) await discard(token);
    },
  };
}
module.exports = { installProjectTransfer, inspectPaths, safeName };

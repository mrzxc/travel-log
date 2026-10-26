const path = require("node:path");

function syntax(value) {
  return /^[a-z]:[\\/]|^[\\/]{2}/i.test(value) ||
    (!value.startsWith("/") && value.includes("\\"))
    ? path.win32
    : path.posix;
}
function absolute(value) {
  return path.win32.isAbsolute(value) || path.posix.isAbsolute(value);
}
function pathKey(value) {
  const parser = syntax(value);
  const normalized = parser.normalize(value);
  return parser === path.win32 ? normalized.toLowerCase() : normalized;
}
function references(project) {
  return Object.values(project.nodes).flatMap((node) => [
    ...node.media,
    ...(node.map ? [node.map] : []),
    ...(node.coverAsset ? [node.coverAsset] : []),
  ]);
}
function uniqueFiles(project) {
  const files = new Map();
  for (const asset of references(project))
    if (!files.has(pathKey(asset.path)))
      files.set(pathKey(asset.path), asset.path);
  return [...files.values()];
}
function folderGroups(project, packaged = false) {
  const groups = new Map();
  for (const file of uniqueFiles(project)) {
    const source = syntax(file).dirname(file),
      key = pathKey(source);
    if (!groups.has(key))
      groups.set(key, {
        source,
        target: packaged
          ? `素材/文件夹-${String(groups.size + 1).padStart(3, "0")}`
          : source,
        count: 0,
      });
    groups.get(key).count++;
  }
  return [...groups.values()];
}
function relativeFolder(value) {
  if (absolute(value) || value.includes(":"))
    throw Error("携带原件时，请填写包内相对目录");
  const normalized = value.replace(/\\/g, "/");
  if (normalized.split("/").includes("..") || normalized.includes("\0"))
    throw Error("相对目录不能包含上级目录或无效字符");
  return path.posix.normalize(normalized);
}
function localPath(value, baseDirectory) {
  return absolute(value)
    ? syntax(value).normalize(value)
    : path.resolve(baseDirectory, ...value.split(/[\\/]/));
}
function mapFolders(
  project,
  mappings,
  { relativeOnly = false, baseDirectory } = {},
) {
  const lookup = new Map(
    mappings.map((mapping) => {
      const target = mapping.target.trim();
      if (!target || target.includes("\0"))
        throw Error("请为每个文件夹填写有效路径");
      if (/^[a-z]:[^\\/]/i.test(target) || /^[a-z]:$/i.test(target))
        throw Error("Windows 路径需要包含盘符和根目录，例如 D:\\照片");
      return [
        pathKey(mapping.source),
        relativeOnly ? relativeFolder(target) : target,
      ];
    }),
  );
  const result = structuredClone(project),
    destinations = new Map(),
    sourceDestinations = new Map(),
    conflicts = [];
  for (const asset of references(result)) {
    const parser = syntax(asset.path),
      sourceKey = pathKey(asset.path);
    if (sourceDestinations.has(sourceKey)) {
      asset.path = sourceDestinations.get(sourceKey);
      delete asset.missing;
      continue;
    }
    const target = lookup.get(pathKey(parser.dirname(asset.path)));
    if (target === undefined)
      throw Error("文件夹列表已变化，请重新打开路径配置");
    const targetParser = relativeOnly ? path.posix : syntax(target);
    let destination = targetParser.join(target, parser.basename(asset.path));
    if (!relativeOnly && baseDirectory)
      destination = localPath(destination, baseDirectory);
    const key = relativeOnly
        ? pathKey(destination).toLowerCase()
        : pathKey(destination),
      previous = destinations.get(key);
    if (previous && previous !== sourceKey) conflicts.push(destination);
    destinations.set(key, sourceKey);
    sourceDestinations.set(sourceKey, destination);
    asset.path = destination;
    delete asset.missing;
  }
  if (conflicts.length)
    throw Error(
      `不同文件指向同一路径，请修改文件夹配置：\n${[...new Set(conflicts)].join("\n")}`,
    );
  return result;
}
function resolveProject(project, directory) {
  const result = structuredClone(project);
  for (const asset of references(result))
    asset.path = localPath(asset.path, directory);
  return result;
}
function serializedProject(project, directory) {
  const result = structuredClone(project);
  if (result.portablePaths)
    for (const asset of references(result)) {
      // Foreign absolute paths must not be interpreted using the host OS syntax.
      if (
        !path.isAbsolute(asset.path) ||
        (process.platform !== "win32" && syntax(asset.path) === path.win32)
      )
        continue;
      const relative = path.relative(directory, asset.path);
      if (
        relative &&
        relative !== ".." &&
        !relative.startsWith(".." + path.sep) &&
        !path.isAbsolute(relative)
      )
        asset.path = relative.split(path.sep).join("/");
    }
  return result;
}
module.exports = {
  syntax,
  absolute,
  pathKey,
  references,
  uniqueFiles,
  folderGroups,
  relativeFolder,
  localPath,
  mapFolders,
  resolveProject,
  serializedProject,
};

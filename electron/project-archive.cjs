const fs = require("node:fs/promises");
const streams = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");
const { crc32 } = require("node:zlib");
const { randomUUID } = require("node:crypto");
const yazl = require("yazl");
const yauzl = require("yauzl");

function safeEntry(name) {
  if (
    !name ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.includes(":") ||
    path.posix.isAbsolute(name) ||
    name.split("/").includes("..")
  )
    throw Error("压缩包包含无效文件路径");
  return path.posix.normalize(name);
}
async function writeArchive(destination, project, files) {
  const temporary = destination + `.${randomUUID()}.tmp`;
  const zip = new yazl.ZipFile();
  zip.on("error", (error) => zip.outputStream.destroy(error));
  const completion = pipeline(
    zip.outputStream,
    streams.createWriteStream(temporary, { flags: "wx" }),
  );
  // Attach immediately: file errors can arrive while adding entries.
  completion.catch(() => {});
  try {
    zip.addBuffer(
      Buffer.from(JSON.stringify(project, null, 2)),
      "project.travel",
    );
    for (const file of files)
      zip.addFile(file.source, safeEntry(file.destination), {
        compress: false,
      });
    zip.end();
    await completion;
    await fs.rename(temporary, destination);
  } finally {
    zip.outputStream.destroy();
    await completion.catch(() => {});
    await fs.rm(temporary, { force: true });
  }
}
async function extractArchive(file, directory, progress = () => {}) {
  const zip = await new Promise((resolve, reject) =>
    yauzl.open(
      file,
      { lazyEntries: true, strictFileNames: true },
      (error, value) => (error ? reject(error) : resolve(value)),
    ),
  );
  const seen = new Set();
  let completed = 0;
  try {
    await new Promise((resolve, reject) => {
      zip.once("error", reject);
      zip.once("end", resolve);
      zip.on("entry", (entry) => {
        void (async () => {
          const name = safeEntry(entry.fileName),
            mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (mode === 0xa000 || (mode && mode !== 0x8000 && mode !== 0x4000))
            throw Error("不支持压缩包中的链接或特殊文件");
          const key =
            process.platform === "win32" || process.platform === "darwin"
              ? name.toLowerCase()
              : name;
          if (seen.has(key))
            throw Error("压缩包中存在重复或大小写冲突的文件路径");
          seen.add(key);
          const destination = path.join(directory, ...name.split("/"));
          if (entry.fileName.endsWith("/"))
            await fs.mkdir(destination, { recursive: true });
          else {
            await fs.mkdir(path.dirname(destination), { recursive: true });
            const input = await new Promise((resolve, reject) =>
              zip.openReadStream(entry, (error, value) =>
                error ? reject(error) : resolve(value),
              ),
            );
            await pipeline(
              input,
              new Transform({
                transform(chunk, _encoding, done) {
                  this.checksum = crc32(chunk, this.checksum || 0);
                  done(null, chunk);
                },
                flush(done) {
                  done(
                    (this.checksum || 0) === entry.crc32
                      ? null
                      : Error(`压缩包文件校验失败：${name}`),
                  );
                },
              }),
              streams.createWriteStream(destination, { flags: "wx" }),
            );
          }
          progress(++completed, zip.entryCount);
          zip.readEntry();
        })().catch(reject);
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
}
module.exports = { writeArchive, extractArchive, safeEntry };

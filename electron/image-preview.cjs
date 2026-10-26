const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { Worker } = require("node:worker_threads");

const isHeic = (media) =>
  media.type === "image" && /\.(heic|heif)$/i.test(media.path);
function convertInWorker(source, destination) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "heic-worker.cjs"), {
      workerData: { source, destination },
    });
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker
        .terminate()
        .then(() => (error ? reject(error) : resolve()), reject);
    };
    const timer = setTimeout(
      () => finish(new Error("HEIC 图片转换超时")),
      120000,
    );
    worker.once("message", (result) =>
      finish(result.ok ? null : new Error(result.error || "HEIC 图片转换失败")),
    );
    worker.once("error", finish);
    worker.once("exit", (code) =>
      finish(new Error(`HEIC 转换线程提前退出 (${code})`)),
    );
  });
}
function createImagePreview(cacheDirectory, convert = convertInWorker) {
  const pending = new Map();
  // Keep one large decode active, but never put an opened photo behind a page
  // of thumbnails. Cached previews bypass the queue entirely.
  const queue = [];
  let active = false;
  async function runNext() {
    if (active || !queue.length) return;
    const foreground = queue.findIndex((job) => job.priority === "foreground");
    const [job] = queue.splice(foreground < 0 ? 0 : foreground, 1);
    active = true;
    try {
      job.resolve(await job.run());
    } catch (error) {
      job.reject(error);
    } finally {
      pending.delete(job.destination);
      active = false;
      void runNext();
    }
  }
  function reuse(job, priority) {
    if (priority === "foreground") job.priority = priority;
    return job.promise;
  }
  return async function imagePreview(media, { priority = "foreground" } = {}) {
    if (!isHeic(media)) return media.path;
    const stat = await fs.stat(media.path);
    const hash = createHash("sha256")
      .update(
        JSON.stringify([
          path.resolve(media.path),
          stat.size,
          stat.mtimeMs,
          "heic-jpeg-v1",
        ]),
      )
      .digest("hex");
    const destination = path.join(cacheDirectory, `${hash}.preview.jpg`);
    if (pending.has(destination))
      return reuse(pending.get(destination), priority);
    try {
      if ((await fs.stat(destination)).size > 0) return destination;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    // Another request may have queued the same photo while checking the cache.
    if (pending.has(destination))
      return reuse(pending.get(destination), priority);
    const job = { destination, priority };
    job.promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    job.run = async () => {
      await fs.mkdir(cacheDirectory, { recursive: true });
      const temporary = destination + `.${randomUUID()}.tmp`;
      try {
        await convert(media.path, temporary);
        await fs.rename(temporary, destination);
        return destination;
      } finally {
        await fs.rm(temporary, { force: true });
      }
    };
    pending.set(destination, job);
    queue.push(job);
    void runNext();
    return job.promise;
  };
}
module.exports = { isHeic, createImagePreview };

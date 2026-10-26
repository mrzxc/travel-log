const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs/promises");
const convert = require("heic-convert");
(async () => {
  const buffer = await fs.readFile(workerData.source);
  const jpeg = await convert({ buffer, format: "JPEG", quality: 0.95 });
  await fs.writeFile(workerData.destination, jpeg);
  parentPort.postMessage({ ok: true });
})().catch((error) => parentPort.postMessage({ error: error.message }));

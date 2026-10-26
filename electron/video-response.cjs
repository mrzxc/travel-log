const { stat } = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const { Readable } = require("node:stream");
const path = require("node:path");

async function videoResponse(file, request) {
  const { size } = await stat(file);
  const types = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".mkv": "video/x-matroska",
  };
  const headers = {
    "Accept-Ranges": "bytes",
    "Content-Type":
      types[path.extname(file).toLowerCase()] || "application/octet-stream",
  };
  const range = request.headers.get("range");
  let start = 0,
    end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end =
      match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= size
    )
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(Math.max(0, end - start + 1));
  const body =
    request.method === "HEAD" || !size
      ? null
      : Readable.toWeb(createReadStream(file, { start, end }));
  return new Response(body, { status: range ? 206 : 200, headers });
}
module.exports = { videoResponse };

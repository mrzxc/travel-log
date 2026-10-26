const { contextBridge, ipcRenderer, webUtils } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  newProject: () => ipcRenderer.invoke("project:new"),
  open: () => ipcRenderer.invoke("project:open"),
  save: (p) => ipcRenderer.invoke("project:save", p),
  projectFolders: (project, packaged) =>
    ipcRenderer.invoke("project:folders", project, packaged),
  pickProjectFolder: () => ipcRenderer.invoke("project:pick-folder"),
  prepareProjectImport: () => ipcRenderer.invoke("project:prepare-import"),
  cancelProjectImport: (token) =>
    ipcRenderer.invoke("project:cancel-import", token),
  previewProjectPaths: (request) =>
    ipcRenderer.invoke("project:preview-paths", request),
  applyProjectPaths: (request) =>
    ipcRenderer.invoke("project:apply-paths", request),
  exportProject: (request) => ipcRenderer.invoke("project:export", request),
  finishProjectImport: (request) =>
    ipcRenderer.invoke("project:finish-import", request),
  onTransferProgress: (fn) => {
    const listener = (_, message) => fn(message);
    ipcRenderer.on("project:transfer-progress", listener);
    return () =>
      ipcRenderer.removeListener("project:transfer-progress", listener);
  },
  pick: (folder) => ipcRenderer.invoke("files:pick", folder),
  import: (paths, p) => ipcRenderer.invoke("files:import", paths, p),
  map: () => ipcRenderer.invoke("map:pick"),
  cover: () => ipcRenderer.invoke("cover:pick"),
  check: (p) => ipcRenderer.invoke("project:check", p),
  relink: (m, p) => ipcRenderer.invoke("media:relink", m, p),
  url: (id, thumb, sourceId) =>
    `travel://asset/${encodeURIComponent(id)}?${thumb ? "thumb=1&" : ""}${sourceId ? "source=" + encodeURIComponent(sourceId) : ""}`,
  dropped: (files) => files.map((f) => webUtils.getPathForFile(f)),
  fullscreen: (value) => ipcRenderer.invoke("window:fullscreen", value),
  onOpen: (fn) => {
    const listener = (_, data) => fn(data);
    ipcRenderer.on("project:opened", listener);
    return () => ipcRenderer.removeListener("project:opened", listener);
  },
  onFlush: (fn) => {
    ipcRenderer.on("app:flush", fn);
  },
});

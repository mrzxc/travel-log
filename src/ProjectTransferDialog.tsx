import { useEffect, useRef, useState } from "react";
import { FolderOpen, X } from "lucide-react";
import type { Project } from "./model";
import type {
  FolderGroup,
  ImportDraft,
  PathReport,
  TransferRequest,
} from "./projectTransfer";
import "./project-transfer.css";

export function ProjectTransferDialog({
  mode,
  project,
  draft,
  onClose,
  onApply,
  onImported,
  onExported,
}: {
  mode: "paths" | "export" | "import";
  project: Project;
  draft?: ImportDraft;
  onClose: () => void;
  onApply: (project: Project) => Promise<void>;
  onImported: (data: { project: Project; path: string }) => void;
  onExported: (file: string) => void;
}) {
  const api = window.desktop!;
  const [includeMedia, setIncludeMedia] = useState(false);
  const [skipMissing, setSkipMissing] = useState(false);
  const [groups, setGroups] = useState<FolderGroup[] | null>(null);
  const [report, setReport] = useState<PathReport | null>(null);
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [editing, setEditing] = useState(mode !== "export");
  const snapshot = useRef<FolderGroup[]>([]);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => api.onTransferProgress(setProgress), [api]);
  useEffect(() => {
    dialog.current?.focus();
  }, [editing]);
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setGroups(null);
    void (
      draft
        ? Promise.resolve(draft.groups)
        : api.projectFolders(project, includeMedia)
    )
      .then((value) => {
        if (!cancelled) setGroups(value);
      })
      .catch((error) => {
        if (!cancelled) {
          setError(String(error));
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, project, draft, includeMedia]);
  const request = (): TransferRequest => ({
    mode,
    project,
    token: draft?.token,
    mappings: groups || [],
    includeMedia,
    skipMissing,
  });
  useEffect(() => {
    if (!groups) return;
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(() => {
      void api
        .previewProjectPaths({
          mode,
          project,
          token: draft?.token,
          mappings: groups,
          includeMedia,
        })
        .then((value) => {
          if (!cancelled) {
            setReport(value);
            setChecking(false);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setReport({ error: String(error) });
            setChecking(false);
          }
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, groups, mode, project, draft?.token, includeMedia]);
  function change(index: number, value: string) {
    setChecking(true);
    setError("");
    setSkipMissing(false);
    setGroups((groups) =>
      groups!.map((group, i) =>
        i === index ? { ...group, target: value } : group,
      ),
    );
  }
  function close() {
    if (working) return;
    if (editing && mode === "export") {
      setGroups(snapshot.current);
      setChecking(true);
      setEditing(false);
      return;
    }
    setWorking(true);
    void (draft ? api.cancelProjectImport(draft.token) : Promise.resolve())
      .then(onClose)
      .catch((error) => {
        setError(String(error));
        setWorking(false);
      });
  }
  async function confirm() {
    if (checking || report?.error || !groups) return;
    if (editing && mode === "export") {
      setEditing(false);
      return;
    }
    setWorking(true);
    setError("");
    setProgress(
      mode === "export"
        ? "正在导出项目…"
        : mode === "import"
          ? "正在保存导入项目…"
          : "正在更新文件路径…",
    );
    try {
      if (mode === "export") {
        const file = await api.exportProject(request());
        if (file) onExported(file);
      } else if (mode === "import")
        onImported(await api.finishProjectImport(request()));
      else {
        await onApply(await api.applyProjectPaths(request()));
        onClose();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorking(false);
    }
  }
  const canConfirm =
    !!groups &&
    !checking &&
    !report?.error &&
    !(
      mode === "export" &&
      !editing &&
      includeMedia &&
      !!report?.missing &&
      !skipMissing
    );
  const title = editing ? "配置文件路径" : "导出项目";
  return (
    <div
      className="modal-backdrop transfer-backdrop"
      onClick={close}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <section
        className="transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          if (event.key === "Tab") {
            const controls = [
              ...dialog.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
              ),
            ].filter((element) => element.getClientRects().length);
            const first = controls[0],
              last = controls.at(-1);
            if (
              event.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === dialog.current)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">
              {mode === "import" ? "导入项目" : project.name}
            </span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="关闭路径配置"
            disabled={working}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="transfer-content">
          {draft && (
            <p className="transfer-destination">
              导入为独立项目：<code>{draft.destination}</code>
            </p>
          )}
          {mode === "export" && !editing && (
            <>
              <label className="transfer-option">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  disabled={working}
                  onChange={(event) => {
                    setChecking(true);
                    setIncludeMedia(event.target.checked);
                    setSkipMissing(false);
                  }}
                />
                <span>
                  <strong>导出素材原件</strong>
                  <small>
                    {includeMedia
                      ? "生成 ZIP，包含素材、地图、独立封面和不参加演示的原件。"
                      : "仅生成 .travel 项目文件，素材原件留在原处。"}
                  </small>
                </span>
              </label>
              <div className="transfer-path-summary">
                <div>
                  <strong>
                    {groups?.length ?? "…"} 个文件夹 ·{" "}
                    {groups?.reduce((sum, group) => sum + group.count, 0) ??
                      "…"}{" "}
                    份文件
                  </strong>
                  <p>
                    {includeMedia
                      ? "配置 ZIP 内的相对目录。"
                      : "保留原路径，或输入另一台电脑的文件夹路径。"}
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={!groups || working}
                  onClick={() => {
                    snapshot.current = structuredClone(groups!);
                    setEditing(true);
                  }}
                >
                  配置文件路径
                </button>
              </div>
            </>
          )}
          {editing && (
            <>
              <p className="transfer-help">
                每个文件夹单独配置，保留原文件名。同一文件被素材、地图、封面重复引用时只计一次。
                {mode === "export"
                  ? includeMedia
                    ? "请输入包内相对目录，例如：素材/意大利。"
                    : "可输入 Windows 或 macOS 路径，目标文件夹无需在本机存在。"
                  : "可输入路径或选择本地文件夹。确认后只更新引用，不移动原件。"}
              </p>
              <div className="transfer-folders">
                {groups?.map((group, index) => {
                  const status = report?.folders?.find(
                    (item) => item.source === group.source,
                  );
                  return (
                    <div className="transfer-folder" key={group.source}>
                      <div className="transfer-source">
                        <code>{group.source}</code>
                        <span>{group.count} 份文件</span>
                      </div>
                      <label>
                        <span>目标文件夹</span>
                        <div className="transfer-target">
                          <input
                            aria-label={`目标文件夹 ${index + 1}`}
                            value={group.target}
                            disabled={working}
                            onChange={(event) =>
                              change(index, event.target.value)
                            }
                          />
                          {mode !== "export" && (
                            <button
                              className="secondary"
                              aria-label={`选择文件夹 ${index + 1}`}
                              disabled={working}
                              onClick={() => {
                                void api
                                  .pickProjectFolder()
                                  .then((folder) => {
                                    if (folder) change(index, folder);
                                  })
                                  .catch((error) => setError(String(error)));
                              }}
                            >
                              <FolderOpen size={16} />
                              选择文件夹
                            </button>
                          )}
                        </div>
                      </label>
                      {status && !checking && (
                        <small
                          className={
                            status.missing
                              ? "transfer-warning"
                              : "transfer-found"
                          }
                        >
                          找到 {status.found} 份 · 缺失 {status.missing} 份
                        </small>
                      )}
                      {!!status?.missing && !checking && (
                        <details>
                          <summary>查看缺失文件</summary>
                          <ul>
                            {status.missingFiles.map((file) => (
                              <li key={file}>
                                <code>{file}</code>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  );
                })}
                {groups?.length === 0 && (
                  <p>项目尚未引用文件，仍可导出或导入地点与演示配置。</p>
                )}
              </div>
            </>
          )}
          <div className="transfer-validation" aria-live="polite">
            {checking ? (
              "正在检查文件路径…"
            ) : report?.error ? (
              <p className="transfer-error">{report.error}</p>
            ) : (
              <p>
                共 {report?.total ?? 0} 份文件 · 找到 {report?.found ?? 0} 份 ·
                缺失 {report?.missing ?? 0} 份
                {mode === "export" && (
                  <small>检查的是当前原件；不检查目标电脑上的目录。</small>
                )}
              </p>
            )}
          </div>
          {mode === "export" &&
            includeMedia &&
            !checking &&
            !!report?.missing && (
              <label className="transfer-option transfer-warning">
                <input
                  type="checkbox"
                  aria-label="跳过缺失文件继续导出"
                  checked={skipMissing}
                  disabled={working}
                  onChange={(event) => setSkipMissing(event.target.checked)}
                />
                <span>
                  跳过 {report.missing} 份缺失原件继续导出（保留项目引用）
                </span>
              </label>
            )}
          {mode !== "export" && !checking && !!report?.missing && (
            <p className="transfer-warning">
              仍有缺失文件，可以确认保存，之后再配置路径。
            </p>
          )}
          {error && (
            <p role="alert" className="transfer-error">
              {error}
            </p>
          )}
          {working && <p role="status">{progress}</p>}
        </div>
        <footer>
          <button className="secondary" disabled={working} onClick={close}>
            取消
          </button>
          <button
            className="primary"
            disabled={working || !canConfirm}
            onClick={() => void confirm()}
          >
            {working
              ? "正在处理…"
              : editing && mode === "export"
                ? "完成路径配置"
                : mode === "export"
                  ? "导出项目"
                  : mode === "import"
                    ? "确认导入"
                    : "应用路径配置"}
          </button>
        </footer>
      </section>
    </div>
  );
}

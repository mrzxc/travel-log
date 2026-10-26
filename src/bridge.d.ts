import type { Project, Media } from "./model";
import type {
  FolderGroup,
  ImportDraft,
  PathReport,
  TransferRequest,
} from "./projectTransfer";
declare global {
  interface Window {
    desktop?: {
      newProject: () => Promise<string | null>;
      open: () => Promise<{ project: Project; path: string } | null>;
      save: (p: Project) => Promise<string>;
      projectFolders: (
        project: Project,
        packaged?: boolean,
      ) => Promise<FolderGroup[]>;
      pickProjectFolder: () => Promise<string | null>;
      prepareProjectImport: () => Promise<ImportDraft | null>;
      cancelProjectImport: (token: string) => Promise<void>;
      previewProjectPaths: (request: TransferRequest) => Promise<PathReport>;
      applyProjectPaths: (request: TransferRequest) => Promise<Project>;
      exportProject: (request: TransferRequest) => Promise<string | null>;
      finishProjectImport: (
        request: TransferRequest,
      ) => Promise<{ project: Project; path: string }>;
      onTransferProgress: (fn: (message: string) => void) => () => void;
      pick: (folder?: boolean) => Promise<string[]>;
      import: (
        paths: string[],
        p: Project,
      ) => Promise<{ items: Media[]; duplicates: number; unsupported: number }>;
      map: () => Promise<Media | null>;
      cover: () => Promise<Media | null>;
      check: (p: Project) => Promise<Project>;
      relink: (m: Media, p: Project) => Promise<Media | null>;
      url: (id: string, thumb?: boolean, sourceId?: string) => string;
      dropped: (files: File[]) => string[];
      fullscreen: (value: boolean) => Promise<void>;
      onOpen: (
        fn: (data: { project: Project; path: string }) => void,
      ) => () => void;
    };
  }
}

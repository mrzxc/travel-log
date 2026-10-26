import type { Project } from "./model";
export interface FolderMapping {
  source: string;
  target: string;
}
export interface FolderGroup extends FolderMapping {
  count: number;
}
export interface PathReport {
  error?: string;
  total?: number;
  found?: number;
  missing?: number;
  folders?: (FolderGroup & {
    found: number;
    missing: number;
    missingFiles: string[];
  })[];
}
export interface ImportDraft {
  token: string;
  project: Project;
  groups: FolderGroup[];
  destination: string;
  packaged: boolean;
}
export interface TransferRequest {
  mode: "export" | "import" | "paths";
  project?: Project;
  token?: string;
  mappings: FolderMapping[];
  includeMedia?: boolean;
  skipMissing?: boolean;
}

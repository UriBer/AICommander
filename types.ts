
export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
  BUCKET = 'bucket',
  TABLE = 'table',
  DATASET = 'dataset'
}

export interface FileItem {
  name: string;
  size: number;
  type: FileType;
  modified: string;
  id: string;
  extension?: string;
  metadata?: Record<string, any>;
}

export interface SourceProfile {
  id: string;
  name: string;
  pluginId: string;
  config: Record<string, string>;
}

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  configFields: string[];
}

export interface IStoragePlugin {
  metadata: PluginMetadata;
  list: (profile: SourceProfile, path: string) => Promise<FileItem[]>;
  read: (profile: SourceProfile, id: string) => Promise<string | ArrayBuffer>;
  write: (profile: SourceProfile, id: string, content: string | ArrayBuffer) => Promise<void>;
  delete: (profile: SourceProfile, id: string) => Promise<void>;
  copy?: (profile: SourceProfile, ids: string[], targetPath: string) => Promise<void>;
  move?: (profile: SourceProfile, ids: string[], targetPath: string) => Promise<void>;
}

export interface PanelState {
  profileId: string;
  path: string;
  items: FileItem[];
  selectedIndex: number;
  selection: string[]; // List of selected item IDs
}

export interface AppState {
  leftPanel: PanelState;
  rightPanel: PanelState;
  activeSide: 'left' | 'right';
  logs: string[];
  profiles: SourceProfile[];
  viewingFile: {
    item: FileItem;
    content: string;
    mode: 'text' | 'table';
    isEditing: boolean;
  } | null;
  operation: {
    type: 'copy' | 'move' | 'delete';
    items: FileItem[];
    sourceProfileId: string;
    targetPath: string;
    targetProfileId: string;
  } | null;
  showSourceConfig: boolean;
  showDriveMenu: 'left' | 'right' | null;
  shellMode: boolean;
  helpVisible: boolean;
}

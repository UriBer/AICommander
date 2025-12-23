
export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
  BUCKET = 'bucket',
  TABLE = 'table'
}

export interface FileItem {
  name: string;
  size: number;
  type: FileType;
  modified: string;
  id: string;
}

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface IStoragePlugin {
  metadata: PluginMetadata;
  list: (path: string) => Promise<FileItem[]>;
  read: (id: string) => Promise<string | ArrayBuffer>;
  write: (id: string, content: string | ArrayBuffer) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export interface AppState {
  leftPanel: {
    pluginId: string;
    path: string;
    items: FileItem[];
    selectedIndex: number;
  };
  rightPanel: {
    pluginId: string;
    path: string;
    items: FileItem[];
    selectedIndex: number;
  };
  activeSide: 'left' | 'right';
  logs: string[];
}

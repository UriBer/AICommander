
import { IStoragePlugin, FileType, FileItem } from '../types';

class PluginManager {
  private plugins: Map<string, IStoragePlugin> = new Map();

  register(plugin: IStoragePlugin) {
    this.plugins.set(plugin.metadata.id, plugin);
  }

  getPlugin(id: string): IStoragePlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): IStoragePlugin[] {
    return Array.from(this.plugins.values());
  }
}

// Mock Local FS Plugin
export const localFsPlugin: IStoragePlugin = {
  metadata: {
    id: 'local-fs',
    name: 'Local FS',
    description: 'Local file system simulator',
    icon: '📁'
  },
  list: async (path) => {
    // Simulate latency
    await new Promise(r => setTimeout(r, 100));
    return [
      { id: '1', name: '..', type: FileType.DIRECTORY, size: 0, modified: '2023-10-01' },
      { id: '2', name: 'documents', type: FileType.DIRECTORY, size: 0, modified: '2023-10-02' },
      { id: '3', name: 'notes.txt', type: FileType.FILE, size: 1024, modified: '2023-10-05' },
      { id: '4', name: 'config.json', type: FileType.FILE, size: 512, modified: '2023-10-07' },
    ];
  },
  read: async (id) => "Content of file " + id,
  write: async (id, content) => console.log('Writing to', id),
  delete: async (id) => console.log('Deleting', id)
};

// Mock Cloud Storage Plugin
export const cloudStoragePlugin: IStoragePlugin = {
  metadata: {
    id: 'cloud-storage',
    name: 'S3 Buckets',
    description: 'AWS S3 multi-region buckets',
    icon: '☁️'
  },
  list: async (path) => {
    await new Promise(r => setTimeout(r, 150));
    return [
      { id: 'b1', name: 'prod-backups', type: FileType.BUCKET, size: 1024 * 1024 * 50, modified: '2023-09-01' },
      { id: 'b2', name: 'user-uploads', type: FileType.BUCKET, size: 1024 * 200, modified: '2023-10-10' },
      { id: 'b3', name: 'lambda-layers', type: FileType.BUCKET, size: 0, modified: '2023-08-15' },
    ];
  },
  read: async (id) => "Cloud binary data",
  write: async (id, content) => console.log('Cloud upload', id),
  delete: async (id) => console.log('Cloud delete', id)
};

export const pluginManager = new PluginManager();
pluginManager.register(localFsPlugin);
pluginManager.register(cloudStoragePlugin);

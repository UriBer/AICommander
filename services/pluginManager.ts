
import { IStoragePlugin, FileType, FileItem, SourceProfile } from '../types';

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

export const localFsPlugin: IStoragePlugin = {
  metadata: { 
    id: 'local-fs', 
    name: 'Local FS', 
    description: 'Local file system', 
    icon: '📁',
    configFields: ['rootPath']
  },
  list: async (profile, path) => {
    return [
      { id: 'up', name: '..', type: FileType.DIRECTORY, size: 0, modified: '-' },
      { id: 'f1', name: 'readme.md', type: FileType.FILE, size: 1240, modified: '2024-03-01', extension: 'md' },
      { id: 'f2', name: 'data.csv', type: FileType.FILE, size: 5400, modified: '2024-03-05', extension: 'csv' },
    ];
  },
  read: async (p, id) => id === 'f2' ? "id,name,role,last_login,dept\n1,Alice,Admin,2024-01-01,IT\n2,Bob,User,2024-01-02,Sales" : "Local content",
  write: async () => {},
  delete: async () => {}
};

export const s3Plugin: IStoragePlugin = {
  metadata: { 
    id: 's3', 
    name: 'AWS S3', 
    description: 'S3 Buckets', 
    icon: '☁️',
    configFields: ['bucket', 'region', 'accessKey']
  },
  list: async (profile, path) => [
    { id: 'up', name: '..', type: FileType.DIRECTORY, size: 0, modified: '-' },
    { id: 's3-1', name: 'logs/', type: FileType.DIRECTORY, size: 0, modified: '2024-01-01' },
    { id: 's3-2', name: 'backup.json', type: FileType.FILE, size: 1024, modified: '2024-02-01', extension: 'json' }
  ],
  read: async () => JSON.stringify({status: "ok", version: 1.2}, null, 2),
  write: async () => {},
  delete: async () => {}
};

export const bigQueryPlugin: IStoragePlugin = {
  metadata: { 
    id: 'bigquery', 
    name: 'BigQuery', 
    description: 'Google Cloud Data Warehouse', 
    icon: '📊',
    configFields: ['projectId', 'dataset']
  },
  list: async (profile, path) => [
    { id: 'up', name: '..', type: FileType.DIRECTORY, size: 0, modified: '-' },
    { id: 'bq-t1', name: 'users_table', type: FileType.TABLE, size: 850000, modified: '2024-03-10', extension: 'parquet' },
    { id: 'bq-t2', name: 'events_log', type: FileType.TABLE, size: 21000000, modified: '2024-03-11', extension: 'parquet' }
  ],
  read: async (profile, id) => {
    // Return mock row data as JSON string for the "table" viewer
    return JSON.stringify([
      { id: 'u101', name: 'John Doe', email: 'john@example.com', country: 'USA', created_at: '2023-01-15' },
      { id: 'u102', name: 'Jane Smith', email: 'jane@example.com', country: 'UK', created_at: '2023-02-20' },
      { id: 'u103', name: 'Karl Marx', email: 'karl@example.com', country: 'DE', created_at: '2023-03-05' }
    ]);
  },
  write: async () => {},
  delete: async () => {}
};

export const pluginManager = new PluginManager();
pluginManager.register(localFsPlugin);
pluginManager.register(s3Plugin);
pluginManager.register(bigQueryPlugin);

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Project } from '../types';

interface SyncQueueItem {
  id: string;
  type: 'task' | 'project';
  action: 'create' | 'update' | 'delete';
  data: Task | Project | null;
  timestamp: number;
  retryCount: number;
}

interface DevFocusDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-created': number };
  };
  projects: {
    key: string;
    value: Project;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-timestamp': number };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: string | number | boolean;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'devfocus-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DevFocusDB>> | null = null;

const getDB = async (): Promise<IDBPDatabase<DevFocusDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<DevFocusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-created', 'createdAt');
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-timestamp', 'timestamp');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// Generate unique ID
export const generateSyncId = (): string => {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const indexedDBService = {
  // ============ TASKS ============
  async getAllTasks(): Promise<Task[]> {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    return tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async getTask(id: string): Promise<Task | undefined> {
    const db = await getDB();
    return db.get('tasks', id);
  },

  async saveTask(task: Task): Promise<void> {
    const db = await getDB();
    await db.put('tasks', task);
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    await Promise.all([
      ...tasks.map(task => tx.store.put(task)),
      tx.done,
    ]);
  },

  async deleteTask(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('tasks', id);
  },

  async clearTasks(): Promise<void> {
    const db = await getDB();
    await db.clear('tasks');
  },

  // ============ PROJECTS ============
  async getAllProjects(): Promise<Project[]> {
    const db = await getDB();
    return db.getAll('projects');
  },

  async getProject(id: string): Promise<Project | undefined> {
    const db = await getDB();
    return db.get('projects', id);
  },

  async saveProject(project: Project): Promise<void> {
    const db = await getDB();
    await db.put('projects', project);
  },

  async saveProjects(projects: Project[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('projects', 'readwrite');
    await Promise.all([
      ...projects.map(project => tx.store.put(project)),
      tx.done,
    ]);
  },

  async deleteProject(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('projects', id);
  },

  // ============ SYNC QUEUE ============
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await getDB();
    const syncItem: SyncQueueItem = {
      ...item,
      id: generateSyncId(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.put('syncQueue', syncItem);
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    const items = await db.getAllFromIndex('syncQueue', 'by-timestamp');
    return items;
  },

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('syncQueue', id);
  },

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await getDB();
    await db.put('syncQueue', item);
  },

  async clearSyncQueue(): Promise<void> {
    const db = await getDB();
    await db.clear('syncQueue');
  },

  async getSyncQueueCount(): Promise<number> {
    const db = await getDB();
    return db.count('syncQueue');
  },

  // ============ METADATA ============
  async getMetadata(key: string): Promise<string | number | boolean | undefined> {
    const db = await getDB();
    const item = await db.get('metadata', key);
    return item?.value;
  },

  async setMetadata(key: string, value: string | number | boolean): Promise<void> {
    const db = await getDB();
    await db.put('metadata', { key, value, updatedAt: Date.now() });
  },

  // ============ UTILITIES ============
  async clearAll(): Promise<void> {
    const db = await getDB();
    await Promise.all([
      db.clear('tasks'),
      db.clear('projects'),
      db.clear('syncQueue'),
    ]);
  },

  async getStorageInfo(): Promise<{ tasks: number; projects: number; queue: number }> {
    const db = await getDB();
    const [tasks, projects, queue] = await Promise.all([
      db.count('tasks'),
      db.count('projects'),
      db.count('syncQueue'),
    ]);
    return { tasks, projects, queue };
  },
};

export default indexedDBService;

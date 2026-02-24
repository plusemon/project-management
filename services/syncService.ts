import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Task, Project } from '../types';
import { db } from './firebase';
import indexedDBService from './indexedDB';

const TASKS_COLLECTION = 'tasks';
const PROJECTS_COLLECTION = 'projects';
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 3000;

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'unauthenticated';

interface SyncCallbacks {
  onStatusChange?: (status: SyncStatus) => void;
  onTasksSync?: (tasks: Task[]) => void;
  onProjectsSync?: (projects: Project[]) => void;
  onQueueCountChange?: (count: number) => void;
}

let syncStatus: SyncStatus = 'idle';
let isOnline = navigator.onLine;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let callbacks: SyncCallbacks = {};
let currentUser: User | null = null;
const isSyncing = false;
let unsubscribes: Unsubscribe[] = [];
let hasRealtimeListeners = false;
let isProcessSyncQueueLocked = false;

const getUserId = (user: User | null): string => {
  if (user) return user.uid;
  const stored = localStorage.getItem('devfocus_device_id');
  if (stored) return stored;
  const newId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('devfocus_device_id', newId);
  return newId;
};

const updateStatus = (newStatus: SyncStatus) => {
  if (syncStatus !== newStatus) {
    syncStatus = newStatus;
    callbacks.onStatusChange?.(syncStatus);
  }
};

const processSyncQueue = async (): Promise<void> => {
  if (!isOnline || !currentUser) return;
  
  // Use a promise lock to prevent concurrent processing
  if (isProcessSyncQueueLocked) return;
  isProcessSyncQueueLocked = true;
  
  try {
    const queue = await indexedDBService.getSyncQueue();
    if (queue.length === 0) {
      updateStatus('idle');
      return;
    }
    
    console.log('[Sync] Processing sync queue, items:', queue.length);
    
    updateStatus('syncing');
    
    const userId = getUserId(currentUser);
    
    for (const item of queue) {
      try {
        console.log('[Sync] Syncing item:', item.type, item.action, item.data?.id);
        const collectionName = item.type === 'task' ? TASKS_COLLECTION : PROJECTS_COLLECTION;
        const path = `users/${userId}/${collectionName}`;
        
        if (item.action === 'delete') {
          if (item.data?.id) {
            await deleteDoc(doc(db, path, item.data.id));
          }
        } else if (item.data) {
          // Filter out undefined values - Firestore doesn't accept them
          const cleanData = Object.fromEntries(
            Object.entries(item.data).filter(([_, v]) => v !== undefined)
          );
          await setDoc(doc(db, path, item.data.id), {
            ...cleanData,
            syncedAt: Date.now(),
          });
        }
        
        await indexedDBService.removeSyncQueueItem(item.id);
        console.log('[Sync] Successfully synced:', item.type, item.action);
      } catch (error) {
        console.error('[Sync] Error syncing item:', error);
        if (error instanceof Error && (error.message.includes('offline') || (error as unknown as { code?: string }).code === 'unavailable')) {
          updateStatus('offline');
          break;
        }
        
        if (item.retryCount >= MAX_RETRY_COUNT) {
          await indexedDBService.removeSyncQueueItem(item.id);
        } else {
          await indexedDBService.updateSyncQueueItem({
            ...item,
            retryCount: item.retryCount + 1,
          });
        }
      }
    }
    
    const remainingCount = await indexedDBService.getSyncQueueCount();
    callbacks.onQueueCountChange?.(remainingCount);
    
    if (remainingCount === 0) {
      updateStatus('idle');
    }
  } finally {
    isProcessSyncQueueLocked = false;
  }
};

const setupNetworkListeners = () => {
  const handleOnline = async () => {
    isOnline = true;
    updateStatus('idle');
    await processSyncQueue();
  };
  
  const handleOffline = () => {
    isOnline = false;
    updateStatus('offline');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

const setupRealtimeListeners = (user: User) => {
  // Clean up existing listeners
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];
  
  const userId = getUserId(user);
  const tasksPath = `users/${userId}/${TASKS_COLLECTION}`;
  const projectsPath = `users/${userId}/${PROJECTS_COLLECTION}`;
  
  let lastTasksUpdate = 0;
  let lastProjectsUpdate = 0;
  const DEBOUNCE_MS = 100; // Debounce rapid real-time updates
  
  // Listen for tasks changes in real-time
  const tasksUnsubscribe = onSnapshot(
    collection(db, tasksPath),
    (snapshot) => {
      const now = Date.now();
      // Debounce rapid updates
      if (now - lastTasksUpdate < DEBOUNCE_MS) {
        return;
      }
      lastTasksUpdate = now;
      
      console.log('[Sync] Real-time update received for tasks, count:', snapshot.docs.length);
      const remoteTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      
      // Save to IndexedDB
      indexedDBService.saveTasks(remoteTasks).then(() => {
        console.log('[Sync] Tasks saved to IndexedDB, triggering UI update');
        callbacks.onTasksSync?.(remoteTasks);
      });
    },
    (error) => {
      console.error('Tasks real-time listener error:', error);
    }
  );
  
  // Listen for projects changes in real-time
  const projectsUnsubscribe = onSnapshot(
    collection(db, projectsPath),
    (snapshot) => {
      const now = Date.now();
      // Debounce rapid updates
      if (now - lastProjectsUpdate < DEBOUNCE_MS) {
        return;
      }
      lastProjectsUpdate = now;
      
      console.log('[Sync] Real-time update received for projects, count:', snapshot.docs.length);
      const remoteProjects: Project[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      
      // Save to IndexedDB
      indexedDBService.saveProjects(remoteProjects).then(() => {
        callbacks.onProjectsSync?.(remoteProjects);
      });
    },
    (error) => {
      console.error('Projects real-time listener error:', error);
    }
  );
  
  unsubscribes.push(tasksUnsubscribe, projectsUnsubscribe);
  hasRealtimeListeners = true;
};

export const syncService = {
  async initialize(user: User | null) {
    currentUser = user;
    
    const cleanup = setupNetworkListeners();
    
    if (user) {
      updateStatus('syncing');
      await this.loadFromCloud(user, true); // Skip callbacks - real-time listener will handle it
      setupRealtimeListeners(user); // Add real-time listeners
      this.startAutoSync();
    } else {
      updateStatus('unauthenticated');
    }
    
    return cleanup;
  },
  
  setUser(user: User | null) {
    currentUser = user;
    
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
    
    // Clean up existing real-time listeners
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    
    if (user) {
      updateStatus('syncing');
      this.loadFromCloud(user, true); // Skip callbacks - real-time listener will handle it
      setupRealtimeListeners(user); // Add real-time listeners
      this.startAutoSync();
    } else {
      updateStatus('unauthenticated');
    }
  },
  
  async loadFromCloud(user: User, skipCallbacks = false) {
    if (!isOnline) {
      const localTasks = await indexedDBService.getAllTasks();
      const localProjects = await indexedDBService.getAllProjects();
      if (!skipCallbacks) {
        callbacks.onTasksSync?.(localTasks);
        callbacks.onProjectsSync?.(localProjects);
      }
      updateStatus('offline');
      return;
    }
    
    try {
      const userId = getUserId(user);
      
      const [tasksSnap, projectsSnap] = await Promise.all([
        getDocs(collection(db, `users/${userId}/${TASKS_COLLECTION}`)),
        getDocs(collection(db, `users/${userId}/${PROJECTS_COLLECTION}`))
      ]);
      
      const remoteTasks: Task[] = tasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      
      const remoteProjects: Project[] = projectsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      
      if (remoteTasks.length > 0) {
        await indexedDBService.saveTasks(remoteTasks);
      }
      
      if (remoteProjects.length > 0) {
        await indexedDBService.saveProjects(remoteProjects);
      }
      
      // Only trigger callbacks if skipCallbacks is false
      // (real-time listeners will handle the update)
      if (!skipCallbacks) {
        const localTasks = await indexedDBService.getAllTasks();
        const localProjects = await indexedDBService.getAllProjects();
        callbacks.onTasksSync?.(localTasks);
        callbacks.onProjectsSync?.(localProjects);
      }
      
      updateStatus('idle');
    } catch (error) {
      console.error('Failed to load from cloud:', error);
      if (!skipCallbacks) {
        const localTasks = await indexedDBService.getAllTasks();
        const localProjects = await indexedDBService.getAllProjects();
        callbacks.onTasksSync?.(localTasks);
        callbacks.onProjectsSync?.(localProjects);
      }
      updateStatus('offline');
    }
  },
  
  startAutoSync() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    
    syncIntervalId = setInterval(() => {
      processSyncQueue();
    }, SYNC_INTERVAL);
  },
  
  async queueTaskChange(action: 'create' | 'update' | 'delete', task: Task | null) {
    if (!task && action !== 'delete') return;
    
    console.log('[Sync] queueTaskChange:', action, task?.id);
    
    if (task) {
      await indexedDBService.saveTask(task);
    } else if (action === 'delete') {
      await indexedDBService.deleteTask(task.id);
    }
    
    if (task || action === 'delete') {
      await indexedDBService.addToSyncQueue({
        type: 'task',
        action,
        data: task,
      });
      console.log('[Sync] Task added to sync queue');
    }
    
    // Only trigger callbacks if no real-time listeners (real-time will handle it)
    if (!hasRealtimeListeners) {
      const tasks = await indexedDBService.getAllTasks();
      callbacks.onTasksSync?.(tasks);
    }
    
    const count = await indexedDBService.getSyncQueueCount();
    callbacks.onQueueCountChange?.(count);
    
    if (isOnline && currentUser && !isSyncing) {
      processSyncQueue();
    }
  },
  
  async queueProjectChange(action: 'create' | 'update' | 'delete', project: Project | null) {
    if (!project && action !== 'delete') return;
    
    if (project) {
      await indexedDBService.saveProject(project);
    } else if (action === 'delete') {
      await indexedDBService.deleteProject(project.id);
    }
    
    if (project || action === 'delete') {
      await indexedDBService.addToSyncQueue({
        type: 'project',
        action,
        data: project,
      });
    }
    
    // Only trigger callbacks if no real-time listeners (real-time will handle it)
    if (!hasRealtimeListeners) {
      const projects = await indexedDBService.getAllProjects();
      callbacks.onProjectsSync?.(projects);
    }
    
    const count = await indexedDBService.getSyncQueueCount();
    callbacks.onQueueCountChange?.(count);
    
    if (isOnline && currentUser && !isSyncing) {
      processSyncQueue();
    }
  },
  
  async getLocalTasks(): Promise<Task[]> {
    return indexedDBService.getAllTasks();
  },
  
  async getLocalProjects(): Promise<Project[]> {
    return indexedDBService.getAllProjects();
  },
  
  async getPendingSyncCount(): Promise<number> {
    return indexedDBService.getSyncQueueCount();
  },
  
  getStatus(): SyncStatus {
    return syncStatus;
  },
  
  getIsOnline(): boolean {
    return isOnline;
  },
  
  disconnect() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
    // Clean up real-time listeners
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    hasRealtimeListeners = false;
    currentUser = null;
    callbacks = {};
    updateStatus('unauthenticated');
  },
  
  on(cbs: SyncCallbacks) {
    callbacks = cbs;
  }
};

export default syncService;

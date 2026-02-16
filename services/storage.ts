import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  User
} from 'firebase/auth';
import { Task, Project } from '../types';
import { db, auth, googleProvider } from './firebase';

const TASKS_COLLECTION = 'tasks';
const PROJECTS_COLLECTION = 'projects';

// Get or create a unique device ID for this browser
const getDeviceId = (): string => {
  const STORAGE_KEY = 'devfocus_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a unique device ID
    deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
};

// Get user ID - use Firebase auth user or fall back to device ID
const getUserId = (user: User | null): string => {
  if (user) {
    return user.uid; // Authenticated user
  }
  return getDeviceId(); // Anonymous device-based sync
};

// Mock initial data if empty
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'Core Platform', color: 'text-indigo-400' },
  { id: 'p2', name: 'Mobile App', color: 'text-emerald-400' },
  { id: 'p3', name: 'Design System', color: 'text-pink-400' },
];

// Check if Firebase is configured
const isFirebaseConfigured = (): boolean => {
  const config = (window as unknown as { __firebaseConfig?: { apiKey: string } }).__firebaseConfig;
  return config?.apiKey && config.apiKey !== "YOUR_API_KEY";
};

export const storageService = {
  // Tasks
  getTasks: async (user: User | null): Promise<Task[]> => {
    try {
      const userId = getUserId(user);
      const q = query(
        collection(db, `users/${userId}/${TASKS_COLLECTION}`),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await import('firebase/firestore').then(({ getDocs }) => getDocs(q));
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      // Also keep local backup
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
      return tasks;
    } catch (e) {
      console.warn('Firebase unavailable, using localStorage fallback');
      // Fallback to localStorage
      const data = localStorage.getItem('devfocus_tasks');
      return data ? JSON.parse(data) : [];
    }
  },

  // Save a task (create or update)
  saveTask: async (task: Task, user: User | null): Promise<void> => {
    try {
      const userId = getUserId(user);
      await setDoc(doc(db, `users/${userId}/${TASKS_COLLECTION}`, task.id), task);
      // Update local backup
      const tasks = await storageService.getTasks(user);
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save task to Firebase', e);
      // Keep local backup
      const data = localStorage.getItem('devfocus_tasks');
      const tasks: Task[] = data ? JSON.parse(data) : [];
      const existingIndex = tasks.findIndex(t => t.id === task.id);
      if (existingIndex >= 0) {
        tasks[existingIndex] = task;
      } else {
        tasks.unshift(task);
      }
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
    }
  },

  // Delete a task
  deleteTask: async (taskId: string, user: User | null): Promise<void> => {
    try {
      const userId = getUserId(user);
      await deleteDoc(doc(db, `users/${userId}/${TASKS_COLLECTION}`, taskId));
      // Update local backup
      const tasks = await storageService.getTasks(user);
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to delete task from Firebase', e);
      // Fallback to localStorage
      const data = localStorage.getItem('devfocus_tasks');
      const tasks: Task[] = data ? JSON.parse(data) : [];
      const filtered = tasks.filter(t => t.id !== taskId);
      localStorage.setItem('devfocus_tasks', JSON.stringify(filtered));
    }
  },

  // Save all tasks (bulk operation)
  saveAllTasks: async (tasks: Task[], user: User | null): Promise<void> => {
    try {
      const userId = getUserId(user);
      const batch = writeBatch(db);
      
      // Clear existing tasks and add new ones
      const q = query(collection(db, `users/${userId}/${TASKS_COLLECTION}`));
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      tasks.forEach(task => {
        const docRef = doc(db, `users/${userId}/${TASKS_COLLECTION}`, task.id);
        batch.set(docRef, task);
      });
      
      await batch.commit();
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to sync tasks to Firebase', e);
      localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
    }
  },

  // Projects
  getProjects: async (user: User | null): Promise<Project[]> => {
    try {
      const userId = getUserId(user);
      const q = query(collection(db, `users/${userId}/${PROJECTS_COLLECTION}`));
      
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Return initial projects if none exist
        localStorage.setItem('devfocus_projects', JSON.stringify(INITIAL_PROJECTS));
        return INITIAL_PROJECTS;
      }
      
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      localStorage.setItem('devfocus_projects', JSON.stringify(projects));
      return projects;
    } catch (e) {
      console.warn('Firebase unavailable, using localStorage fallback');
      const data = localStorage.getItem('devfocus_projects');
      return data ? JSON.parse(data) : INITIAL_PROJECTS;
    }
  },

  // Save a project
  saveProject: async (project: Project, user: User | null): Promise<void> => {
    try {
      const userId = getUserId(user);
      await setDoc(doc(db, `users/${userId}/${PROJECTS_COLLECTION}`, project.id), project);
      const projects = await storageService.getProjects(user);
      localStorage.setItem('devfocus_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save project to Firebase', e);
      const data = localStorage.getItem('devfocus_projects');
      const projects: Project[] = data ? JSON.parse(data) : INITIAL_PROJECTS;
      const existingIndex = projects.findIndex(p => p.id === project.id);
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.push(project);
      }
      localStorage.setItem('devfocus_projects', JSON.stringify(projects));
    }
  },

  // Delete a project
  deleteProject: async (projectId: string, user: User | null): Promise<void> => {
    try {
      const userId = getUserId(user);
      await deleteDoc(doc(db, `users/${userId}/${PROJECTS_COLLECTION}`, projectId));
      const projects = await storageService.getProjects(user);
      localStorage.setItem('devfocus_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to delete project from Firebase', e);
      const data = localStorage.getItem('devfocus_projects');
      const projects: Project[] = data ? JSON.parse(data) : INITIAL_PROJECTS;
      const filtered = projects.filter(p => p.id !== projectId);
      localStorage.setItem('devfocus_projects', JSON.stringify(filtered));
    }
  },

  // Real-time listeners
  subscribeToTasks: (user: User | null, callback: (tasks: Task[]) => void) => {
    const userId = getUserId(user);
    
    try {
      const q = query(
        collection(db, `users/${userId}/${TASKS_COLLECTION}`),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        localStorage.setItem('devfocus_tasks', JSON.stringify(tasks));
        callback(tasks);
      }, (error) => {
        console.warn('Firebase subscription error, using localStorage', error);
        const data = localStorage.getItem('devfocus_tasks');
        callback(data ? JSON.parse(data) : []);
      });
    } catch (e) {
      console.warn('Firebase unavailable, using localStorage');
      const data = localStorage.getItem('devfocus_tasks');
      callback(data ? JSON.parse(data) : []);
      return () => {}; // Return empty unsubscribe function
    }
  },

  subscribeToProjects: (user: User | null, callback: (projects: Project[]) => void) => {
    const userId = getUserId(user);
    
    try {
      const q = query(collection(db, `users/${userId}/${PROJECTS_COLLECTION}`));
      
      return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          localStorage.setItem('devfocus_projects', JSON.stringify(INITIAL_PROJECTS));
          callback(INITIAL_PROJECTS);
          return;
        }
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        localStorage.setItem('devfocus_projects', JSON.stringify(projects));
        callback(projects);
      }, (error) => {
        console.warn('Firebase subscription error, using localStorage', error);
        const data = localStorage.getItem('devfocus_projects');
        callback(data ? JSON.parse(data) : INITIAL_PROJECTS);
      });
    } catch (e) {
      console.warn('Firebase unavailable, using localStorage');
      const data = localStorage.getItem('devfocus_projects');
      callback(data ? JSON.parse(data) : INITIAL_PROJECTS);
      return () => {};
    }
  },

  // Authentication
  signInWithGoogle: async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (e) {
      console.error('Failed to sign in with Google', e);
      return null;
    }
  },

  // Sign in anonymously to enable Firestore sync without explicit authentication
  signInAnonymously: async (): Promise<User | null> => {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (e) {
      console.warn('Anonymous sign-in failed (may need to enable in Firebase Console)', e);
      return null;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Failed to sign out', e);
    }
  },

  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  getDeviceId: (): string => {
    return getDeviceId();
  },

  isAuthenticated: (): boolean => {
    return auth.currentUser !== null;
  }
};

export default storageService;

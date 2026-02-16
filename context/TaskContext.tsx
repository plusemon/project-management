import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Task, Project, TaskStatus, ViewMode } from '../types';
import { storageService } from '../services/storage';
import { generateId } from '../utils/cn';
import { User } from 'firebase/auth';

type Theme = 'light' | 'dark';

interface TaskContextType {
  tasks: Task[];
  projects: Project[];
  viewMode: ViewMode;
  searchQuery: string;
  activeTaskId: string | null;
  sidebarOpen: boolean;
  selectedProjectId: string | null;
  filteredTasks: Task[];
  theme: Theme;
  user: User | null;
  isLoading: boolean;
  isSynced: boolean;
  
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  
  addProject: (project: Omit<Project, 'id'>) => void;
  deleteProject: (id: string) => void;
  setSelectedProject: (id: string | null) => void;

  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setActiveTask: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with localStorage data first (for faster initial render)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  // Responsive sidebar init: Closed on mobile (< 768px), Open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [selectedProjectId, setSelectedProject] = useState<string | null>(null);

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    };
    // Only run once on mount to set initial correct state based on width if needed, 
    // but not actively listening to resize to avoid annoying auto-closing during window resizing
  }, []);

  // Authentication effect - try anonymous sign-in for sync, fall back to localStorage
  useEffect(() => {
    const unsubscribe = storageService.onAuthChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        // Try anonymous sign-in to enable Firestore sync
        // This requires Anonymous Authentication to be enabled in Firebase Console
        try {
          await storageService.signInAnonymously();
        } catch (e) {
          console.warn('Anonymous auth not enabled - using local storage only');
          // Load from localStorage as fallback
          const localTasks = localStorage.getItem('devfocus_tasks');
          if (localTasks) {
            setTasks(JSON.parse(localTasks));
          }
          const localProjects = localStorage.getItem('devfocus_projects');
          if (localProjects) {
            setProjects(JSON.parse(localProjects));
          }
          setIsSynced(false);
        }
      }
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Real-time sync effect for tasks
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupSync = async () => {
      unsubscribe = storageService.subscribeToTasks(user, (syncedTasks) => {
        setTasks(syncedTasks);
        setIsSynced(true);
      });
    };
    
    setupSync();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Real-time sync effect for projects
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupSync = async () => {
      unsubscribe = storageService.subscribeToProjects(user, (syncedProjects) => {
        setProjects(syncedProjects);
      });
    };
    
    setupSync();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Sync to Firebase when tasks change (for offline support)
  useEffect(() => {
    if (isSynced && tasks.length > 0) {
      // Only save when we've received initial sync
      storageService.saveAllTasks(tasks, user);
    }
  }, [tasks, user, isSynced]);

  const filteredTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter(t => {
      const matchesSearch = searchQuery.trim() === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProject = selectedProjectId ? t.projectId === selectedProjectId : true;
      
      return matchesSearch && matchesProject;
    });
  }, [tasks, searchQuery, selectedProjectId]);

  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Optimistic update
    setTasks((prev) => [newTask, ...prev]);
    // Save to Firebase
    storageService.saveTask(newTask, user);
  }, [user]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
    // Find the task and save to Firebase
    const task = tasks.find(t => t.id === id);
    if (task) {
      storageService.saveTask({ ...task, ...updates, updatedAt: Date.now() }, user);
    }
  }, [tasks, user]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
    storageService.deleteTask(id, user);
  }, [user, activeTaskId]);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    updateTask(id, { status });
  }, [updateTask]);

  const addProject = useCallback((projectData: Omit<Project, 'id'>) => {
    const newProject: Project = {
        ...projectData,
        id: generateId()
    };
    setProjects(prev => [...prev, newProject]);
    storageService.saveProject(newProject, user);
  }, [user]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProject(null);
    storageService.deleteProject(id, user);
  }, [user, selectedProjectId]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Authentication methods
  const signIn = async () => {
    await storageService.signInWithGoogle();
  };

  const signOut = async () => {
    await storageService.signOut();
    // Re-sign in anonymously to maintain sync
    try {
      await storageService.signInAnonymously();
    } catch (e) {
      console.warn('Could not re-establish anonymous session');
      setIsSynced(false);
    }
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      projects,
      viewMode,
      searchQuery,
      activeTaskId,
      sidebarOpen,
      selectedProjectId,
      filteredTasks,
      theme,
      user,
      isLoading,
      isSynced,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      addProject,
      deleteProject,
      setSelectedProject,
      setViewMode,
      setSearchQuery,
      setActiveTask: setActiveTaskId,
      toggleSidebar,
      setSidebarOpen,
      toggleTheme,
      signIn,
      signOut
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (context === undefined) throw new Error("useTaskContext must be used within a TaskProvider");
  return context;
};

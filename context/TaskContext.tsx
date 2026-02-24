import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Task, Project, TaskStatus, ViewMode } from '../types';
import { syncService } from '../services/syncService';
import { storageService } from '../services/storage';
import { generateId } from '../utils/cn';
import { User } from 'firebase/auth';

type Theme = 'light' | 'dark';
type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'unauthenticated';

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
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  reorderTask: (taskId: string, newOrder: number) => void;
  
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [selectedProjectId, setSelectedProject] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unauthenticated');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = storageService.onAuthChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setSyncStatus('idle');
      } else {
        setUser(null);
        setSyncStatus('unauthenticated');
        const localTasks = localStorage.getItem('devfocus_tasks');
        if (localTasks) {
          setTasks(JSON.parse(localTasks));
        }
        const localProjects = localStorage.getItem('devfocus_projects');
        if (localProjects) {
          setProjects(JSON.parse(localProjects));
        }
      }
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    syncService.on({
      onStatusChange: (status) => {
        setSyncStatus(status);
        setIsSynced(status === 'idle');
      },
      onTasksSync: (syncedTasks) => {
        setTasks(syncedTasks);
        localStorage.setItem('devfocus_tasks', JSON.stringify(syncedTasks));
      },
      onProjectsSync: (syncedProjects) => {
        console.log('[Context] onProjectsSync received, count:', syncedProjects.length, 'ids:', syncedProjects.map(p => p.id));
        setProjects(syncedProjects);
        localStorage.setItem('devfocus_projects', JSON.stringify(syncedProjects));
      },
      onQueueCountChange: (count) => {
        setPendingSyncCount(count);
      },
    });

    const cleanup = syncService.initialize(user);

    return () => {
      cleanup.then(fn => fn());
    };
  }, [user]);

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
    setTasks((prev) => [newTask, ...prev]);
    syncService.queueTaskChange('create', newTask);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
    const task = tasks.find(t => t.id === id);
    if (task) {
      syncService.queueTaskChange('update', { ...task, ...updates, updatedAt: Date.now() });
    }
  }, [tasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
    syncService.queueTaskChange('delete', { id } as Task);
  }, [activeTaskId]);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    updateTask(id, { status });
  }, [updateTask]);

  const reorderTask = useCallback((taskId: string, newOrder: number) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      
      // Get tasks with same status (excluding the task being moved)
      const sameStatusTasks = prev
        .filter(t => t.status === task.status && t.id !== taskId)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
      
      // Find the new order value for the target position
      const targetTask = sameStatusTasks[newOrder];
      let finalOrder: number;
      
      if (targetTask) {
        // Insert between tasks - use average of surrounding orders
        const prevTask = sameStatusTasks[newOrder - 1];
        if (prevTask) {
          finalOrder = (prevTask.order ?? prevTask.createdAt + targetTask.order ?? targetTask.createdAt) / 2;
        } else {
          finalOrder = (targetTask.order ?? targetTask.createdAt) - 1000;
        }
      } else {
        // Moving to end - use a value after the last task
        const lastTask = sameStatusTasks[sameStatusTasks.length - 1];
        finalOrder = lastTask ? (lastTask.order ?? lastTask.createdAt) + 1000 : Date.now();
      }
      
      const updatedTasks = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, order: finalOrder, updatedAt: Date.now() };
        }
        return t;
      });
      
      // Sync only the moved task
      const reorderedTask = updatedTasks.find(t => t.id === taskId);
      if (reorderedTask) {
        syncService.queueTaskChange('update', reorderedTask);
      }
      
      return updatedTasks;
    });
  }, []);

  const addProject = useCallback((projectData: Omit<Project, 'id'>) => {
    const newProject: Project = {
        ...projectData,
        id: generateId(),
        updatedAt: Date.now(),
    };
    console.log('[Context] addProject called:', newProject.id);
    setProjects(prev => [...prev, newProject]);
    syncService.queueProjectChange('create', newProject);
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProject(null);
    syncService.queueProjectChange('delete', { id } as Project);
  }, [selectedProjectId]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const signIn = async () => {
    await storageService.signInWithGoogle();
  };

  const signOut = async () => {
    await storageService.signOut();
    syncService.disconnect();
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
      syncStatus,
      pendingSyncCount,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      reorderTask,
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

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Task, Project, TaskStatus, ViewMode } from '../types';
import { storageService } from '../services/storage';
import { generateId } from '../utils/cn';

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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state directly from storage
  const [tasks, setTasks] = useState<Task[]>(() => storageService.getTasks());
  const [projects, setProjects] = useState<Project[]>(() => storageService.getProjects());
  
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

  // Persistence effect for Tasks
  useEffect(() => {
    storageService.saveTasks(tasks);
  }, [tasks]);

  // Persistence effect for Projects
  useEffect(() => {
    storageService.saveProjects(projects);
  }, [projects]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = searchQuery.trim() === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProject = selectedProjectId ? t.projectId === selectedProjectId : true;
      
      return matchesSearch && matchesProject;
    });
  }, [tasks, searchQuery, selectedProjectId]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const moveTask = (id: string, status: TaskStatus) => {
    updateTask(id, { status });
  };

  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newProject: Project = {
        ...projectData,
        id: generateId()
    };
    setProjects(prev => [...prev, newProject]);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProject(null);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

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
      toggleTheme
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTaskContext must be used within a TaskProvider");
  return context;
};
import { Task, Project } from '../types';

const TASKS_KEY = 'devfocus_tasks';
const PROJECTS_KEY = 'devfocus_projects';

// Mock initial data if empty
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'Core Platform', color: 'text-indigo-400' },
  { id: 'p2', name: 'Mobile App', color: 'text-emerald-400' },
  { id: 'p3', name: 'Design System', color: 'text-pink-400' },
];

export const storageService = {
  getTasks: (): Task[] => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  },

  saveTasks: (tasks: Task[]) => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks", e);
    }
  },

  getProjects: (): Project[] => {
    try {
      const data = localStorage.getItem(PROJECTS_KEY);
      return data ? JSON.parse(data) : INITIAL_PROJECTS;
    } catch (e) {
      return INITIAL_PROJECTS;
    }
  },

  saveProjects: (projects: Project[]) => {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to save projects", e);
    }
  }
};
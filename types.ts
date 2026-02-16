export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class mostly
}

export interface Task {
  id: string;
  title: string;
  description: string; // Markdown supported
  status: TaskStatus;
  tags: Tag[];
  createdAt: number;
  updatedAt: number;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type ViewMode = 'KANBAN' | 'LIST';

export const INITIAL_TAGS: Tag[] = [
  { id: '1', name: 'Bug Fix', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: '2', name: 'Feature', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: '3', name: 'Deep Work', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: '4', name: 'Meeting', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.REVIEW]: 'Review',
  [TaskStatus.DONE]: 'Done',
};
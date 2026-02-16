import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Tag, INITIAL_TAGS, Project } from '../types';
import { useTaskContext } from '../context/TaskContext';
import { X, Save, Trash2, Tag as TagIcon, Hash } from 'lucide-react';
import { cn } from '../utils/cn';
import ReactMarkdown from 'react-markdown';
import { ConfirmationModal } from './ConfirmationModal';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit, initialStatus }) => {
  const { addTask, updateTask, deleteTask, projects } = useTaskContext();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.BACKLOG);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setStatus(taskToEdit.status);
      setSelectedTags(taskToEdit.tags);
      setProjectId(taskToEdit.projectId || '');
    } else {
      resetForm();
      if (initialStatus) setStatus(initialStatus);
    }
  }, [taskToEdit, initialStatus, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus(TaskStatus.BACKLOG);
    setSelectedTags([]);
    setProjectId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title,
        description,
        status,
        tags: selectedTags,
        projectId: projectId || undefined
      });
    } else {
      addTask({
        title,
        description,
        status,
        tags: selectedTags,
        projectId: projectId || undefined
      });
    }
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (taskToEdit) {
      deleteTask(taskToEdit.id);
      onClose();
    }
  };

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {taskToEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <div className="flex items-center gap-2">
            {taskToEdit && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Meta Controls */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-xs font-semibold uppercase">Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(TaskStatus).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-xs font-semibold uppercase">Project</label>
                <div className="flex items-center gap-2">
                  {projects.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setProjectId(p.id)}
                      className={cn(
                        "px-2 py-1 rounded-md border text-xs font-medium transition-all",
                        projectId === p.id 
                          ? `bg-slate-100 dark:bg-slate-800 ${p.color} border-slate-300 dark:border-slate-600`
                          : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-2">
                <TagIcon size={12} /> Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {INITIAL_TAGS.map(tag => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border transition-all",
                        isSelected 
                          ? tag.color 
                          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description / Markdown Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-500 text-xs font-semibold uppercase">Description (Markdown)</label>
                <button 
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                >
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </button>
              </div>
              
              {isPreviewMode ? (
                <div className="prose prose-slate dark:prose-invert prose-sm max-w-none bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg min-h-[200px] border border-slate-200 dark:border-slate-700">
                  <ReactMarkdown>{description || '*No description provided.*'}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, code snippets, or checklists..."
                  className="w-full h-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                />
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="task-form"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Save size={16} /> Save Task
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToEdit?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

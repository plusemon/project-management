import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, TaskStatus, Tag, INITIAL_TAGS, Subtask, Priority } from '../types';
import { useTaskContext } from '../context/TaskContext';
import {
  X,
  Save,
  Trash2,
  Tag as TagIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Eraser,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ConfirmationModal } from './ConfirmationModal';
import { DatePicker } from './DatePicker';
import { PrioritySelect } from './PrioritySelect';
import { SubtaskList } from './SubtaskList';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit, initialStatus }) => {
  const { addTask, updateTask, deleteTask, projects, selectedProjectId } = useTaskContext();
  const editorRef = useRef<HTMLDivElement | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.BACKLOG);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  const escapeHtml = useCallback((value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  , []);

  const toEditorHtml = useCallback((value: string) => {
    if (!value.trim()) return '';
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(value);
    if (looksLikeHtml) return value;
    return escapeHtml(value).replace(/\n/g, '<br />');
  }, [escapeHtml]);

  const applyFormat = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    setDescription(editorRef.current.innerHTML);
  };

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(toEditorHtml(taskToEdit.description));
      setStatus(taskToEdit.status);
      setSelectedTags(taskToEdit.tags);
      setProjectId(taskToEdit.projectId || '');
      setDueDate(taskToEdit.dueDate ?? null);
      setPriority(taskToEdit.priority ?? null);
      setSubtasks(taskToEdit.subtasks ?? []);
    } else {
      resetForm();
      if (initialStatus) setStatus(initialStatus);
      if (selectedProjectId) setProjectId(selectedProjectId);
    }
  }, [taskToEdit, initialStatus, isOpen, selectedProjectId, toEditorHtml]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus(TaskStatus.BACKLOG);
    setSelectedTags([]);
    setProjectId('');
    setDueDate(null);
    setPriority(null);
    setSubtasks([]);
  };

  useEffect(() => {
    if (!isOpen || !editorRef.current) return;
    editorRef.current.innerHTML = description || '';
  }, [isOpen, description]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title,
        description,
        status,
        tags: selectedTags,
        projectId: projectId || undefined,
        dueDate: dueDate ?? undefined,
        priority: priority ?? undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined
      });
    } else {
      addTask({
        title,
        description,
        status,
        tags: selectedTags,
        projectId: projectId || undefined,
        dueDate: dueDate ?? undefined,
        priority: priority ?? undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.22),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,0.25),transparent_35%)]" />
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 shadow-[0_32px_120px_-36px_rgba(15,23,42,0.65)] animate-in zoom-in-95 duration-200">

        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-500 dark:text-slate-400">
                {taskToEdit ? 'Task Workspace' : 'Create Flow'}
              </p>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                {taskToEdit ? 'Edit Task' : 'Create New Task'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Capture context, priority, and next actions in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {taskToEdit && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <form id="task-form" onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-3 sm:p-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to get done?"
                className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
              />
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {title.trim().length}/120
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)] gap-3">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-3">
                    Status
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {Object.values(TaskStatus).map((currentStatus) => {
                      const isSelected = status === currentStatus;
                      return (
                        <button
                          key={currentStatus}
                          type="button"
                          onClick={() => setStatus(currentStatus)}
                          className={cn(
                            'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-all',
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                          )}
                        >
                          {currentStatus.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Description
                  </p>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
                    <button
                      type="button"
                      onClick={() => applyFormat('bold')}
                      aria-label="Bold"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('italic')}
                      aria-label="Italic"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('underline')}
                      aria-label="Underline"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Underline"
                    >
                      <Underline size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('insertUnorderedList')}
                      aria-label="Bullet list"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Bullet list"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('insertOrderedList')}
                      aria-label="Numbered list"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Numbered list"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt('Enter URL');
                        if (url) applyFormat('createLink', url);
                      }}
                      aria-label="Insert link"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Insert link"
                    >
                      <Link2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editorRef.current) return;
                        editorRef.current.focus();
                        document.execCommand('removeFormat');
                        setDescription(editorRef.current.innerHTML);
                      }}
                      aria-label="Remove selected formatting"
                      className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Remove selected formatting"
                    >
                      <RemoveFormatting size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDescription('');
                        if (editorRef.current) editorRef.current.innerHTML = '';
                      }}
                      aria-label="Clear"
                      className="ml-auto p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20"
                      title="Clear"
                    >
                      <Eraser size={14} />
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setDescription((e.target as HTMLDivElement).innerHTML)}
                    data-placeholder="Add details, code snippets, or checklists..."
                    className="min-h-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-slate-400 dark:[&:empty:before]:text-slate-500"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <SubtaskList subtasks={subtasks} onChange={setSubtasks} />
                </div>
              </div>

              <aside className="space-y-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Scheduling
                  </p>
                  <DatePicker value={dueDate} onChange={setDueDate} />
                  <PrioritySelect value={priority} onChange={setPriority} />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-3">
                    Project
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setProjectId('')}
                      className={cn(
                        'text-[11px] px-2 py-1 rounded-full border font-medium transition-colors',
                        !projectId
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      No project
                    </button>
                    {projects.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setProjectId(p.id)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded-full border font-medium transition-colors',
                          projectId === p.id
                            ? `bg-slate-100 dark:bg-slate-800 ${p.color} border-slate-300 dark:border-slate-600`
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <TagIcon size={12} /> Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INITIAL_TAGS.map((tag) => {
                      const isSelected = selectedTags.some((t) => t.id === tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'text-[11px] px-2 py-1 rounded-full border transition-all',
                            isSelected
                              ? tag.color
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          )}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </section>
          </form>
        </div>

        <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {taskToEdit ? 'Update task details' : 'Create task and start execution'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-1.5"
            >
              <Save size={15} /> Save Task
            </button>
          </div>
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

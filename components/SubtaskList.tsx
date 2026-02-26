import React, { useState } from 'react';
import { Subtask } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { generateId } from '../utils/cn';

interface SubtaskListProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ subtasks, onChange }) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: Subtask = {
      id: generateId(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    onChange([...subtasks, newSubtask]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    onChange(subtasks.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const handleDeleteSubtask = (id: string) => {
    onChange(subtasks.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs font-semibold uppercase">
          Subtasks
                  </span>
        {totalCount > 0 && (
          <span className="text-xs text-slate-400">
            {completedCount}/{totalCount} completed
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'Hide' : 'Show'} subtasks
          </button>

          {isExpanded && (
            <div className="space-y-1 mt-2">
              {subtasks.map((subtask) => (
                <div 
                  key={subtask.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      subtask.completed 
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                    )}
                  >
                    {subtask.completed && <Check size={10} />}
                  </button>
                  <span className={cn(
                    "flex-1 text-sm",
                    subtask.completed 
                      ? "text-slate-400 line-through" 
                      : "text-slate-700 dark:text-slate-300"
                  )}>
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add subtask input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSubtask();
            }
          }}
          placeholder="Add a subtask..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim()}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

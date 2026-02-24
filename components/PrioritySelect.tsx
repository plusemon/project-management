import React from 'react';
import { Priority, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import { cn } from '../utils/cn';

interface PrioritySelectProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: null, label: 'None' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export const PrioritySelect: React.FC<PrioritySelectProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-slate-500 text-xs font-semibold uppercase">
        Priority
      </label>
      <div className="flex flex-wrap gap-2">
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const colorClass = option.value 
            ? PRIORITY_COLORS[option.value] 
            : isSelected 
              ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

          return (
            <button
              key={option.value ?? 'none'}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all",
                isSelected 
                  ? colorClass
                  : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

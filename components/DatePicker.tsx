import React from 'react';
import { Calendar, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface DatePickerProps {
  value: number | null | undefined;
  onChange: (date: number | null) => void;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label = 'Due Date' }) => {
  // Convert timestamp to YYYY-MM-DD for input
  const formatDateForInput = (timestamp: number | null | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  // Convert YYYY-MM-DD input to timestamp
  const parseDateFromInput = (dateString: string): number | null => {
    if (!dateString) return null;
    return new Date(dateString).getTime();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateFromInput(e.target.value);
    onChange(newDate);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const isOverdue = value && value < Date.now();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-2">
        <Calendar size={12} /> {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={formatDateForInput(value)}
          onChange={handleChange}
          className={cn(
            "bg-slate-100 dark:bg-slate-800 border rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none",
            "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
            isOverdue && "border-red-500/50 text-red-600 dark:text-red-400"
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
            title="Clear due date"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {value && (
        <span className={cn(
          "text-xs",
          isOverdue ? "text-red-500 font-medium" : "text-slate-400"
        )}>
          {isOverdue ? 'Overdue' : `Due: ${new Date(value).toLocaleDateString()}`
          }
        </span>
      )}
    </div>
  );
};

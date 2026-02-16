import React from 'react';
import { Task, INITIAL_TAGS } from '../types';
import { useTaskContext } from '../context/TaskContext';
import { Clock, CheckCircle2, MoreVertical, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  isListMode?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, isListMode = false }) => {
  const { activeTaskId, setActiveTask, projects } = useTaskContext();
  
  const isActive = activeTaskId === task.id;
  const project = projects.find(p => p.id === task.projectId);

  // Fix: Framer Motion's onDragStart type conflicts with React's native DragEvent.
  // We use 'any' here to bypass the type check, as we know we're using native drag-and-drop behavior
  // because 'draggable' is set to true and 'drag' prop (framer motion) is not set.
  const handleDragStart = (e: any) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.div
      layoutId={task.id}
      draggable
      onDragStart={handleDragStart}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative bg-white dark:bg-slate-800 border rounded-lg p-4 cursor-grab active:cursor-grabbing transition-colors shadow-sm",
        isActive 
            ? "border-indigo-500 ring-1 ring-indigo-500/20" 
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
        isListMode ? "flex items-center gap-4" : "flex flex-col gap-3"
      )}
      onClick={() => onEdit(task)}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-lg" />
      )}

      {/* Header / Title Area */}
      <div className={cn("flex-1", isListMode && "min-w-0")}>
        <div className="flex justify-between items-start mb-1">
           {project && !isListMode && (
             <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block bg-slate-100 dark:bg-slate-900/50", project.color)}>
               {project.name}
             </span>
           )}
           {!isListMode && (
             <button 
               onClick={(e) => { e.stopPropagation(); setActiveTask(isActive ? null : task.id); }}
               className={cn("p-1 rounded-md transition-colors", isActive ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700")}
             >
               {isActive ? <Pause size={14} /> : <Play size={14} />}
             </button>
           )}
        </div>
        
        <h3 className={cn("font-medium text-slate-800 dark:text-slate-200 leading-tight", isListMode ? "truncate" : "line-clamp-2")}>
          {task.title}
        </h3>
        
        {isListMode && project && (
          <span className={cn("text-xs ml-2 opacity-80", project.color)}>{project.name}</span>
        )}
      </div>

      {/* Tags & Meta */}
      <div className={cn("flex items-center gap-2", isListMode ? "shrink-0" : "justify-between w-full mt-auto pt-2")}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border", tag.color)}>
              {tag.name}
            </span>
          ))}
        </div>
        
        {isListMode && (
           <button 
             onClick={(e) => { e.stopPropagation(); setActiveTask(isActive ? null : task.id); }}
             className={cn("p-2 rounded-full transition-colors mx-2", isActive ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700")}
           >
             {isActive ? <Pause size={16} /> : <Play size={16} />}
           </button>
        )}

        <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1 text-xs">
           <Clock size={12} />
           <span>{new Date(task.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
        </div>
      </div>
    </motion.div>
  );
};
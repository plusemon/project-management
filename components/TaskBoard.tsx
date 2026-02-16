import React from 'react';
import { TaskStatus, STATUS_LABELS, Task } from '../types';
import { useTaskContext } from '../context/TaskContext';
import { TaskCard } from './TaskCard';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface TaskBoardProps {
  onEditTask: (task: Task) => void;
  onNewTask: (status: TaskStatus) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ onEditTask, onNewTask }) => {
  const { filteredTasks, moveTask } = useTaskContext();

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => t.status === status);

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTask(taskId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  return (
    <div className="flex h-full gap-4 sm:gap-6 overflow-x-auto pb-4 items-start snap-x scrollbar-hide">
      {Object.values(TaskStatus).map((status) => (
        <div 
          key={status} 
          className="flex-shrink-0 w-72 sm:w-80 flex flex-col h-full max-h-full snap-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/50 transition-colors duration-200"
          onDrop={(e) => handleDrop(e, status)}
          onDragOver={handleDragOver}
        >
          {/* Column Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-t-xl transition-colors duration-200">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                status === TaskStatus.DONE ? 'bg-emerald-500' : 
                status === TaskStatus.IN_PROGRESS ? 'bg-indigo-500' : 
                status === TaskStatus.REVIEW ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
              }`} />
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {STATUS_LABELS[status]}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-200 dark:bg-slate-800 px-1.5 rounded">
                {getTasksByStatus(status).length}
              </span>
            </div>
            <button 
              onClick={() => onNewTask(status)}
              className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 p-1 rounded transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Task List Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] scrollbar-hide">
            <AnimatePresence mode='popLayout'>
              {getTasksByStatus(status).map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={onEditTask} 
                />
              ))}
            </AnimatePresence>
            {getTasksByStatus(status).length === 0 && (
              <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs transition-colors duration-200">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
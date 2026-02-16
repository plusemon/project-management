import React from 'react';
import { TaskStatus, Task } from '../types';
import { useTaskContext } from '../context/TaskContext';
import { TaskCard } from './TaskCard';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

interface TaskListProps {
  onEditTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ onEditTask }) => {
  const { filteredTasks, moveTask } = useTaskContext();

  // Sort: In Progress first, then Backlog, Review, Done last
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const score = (s: TaskStatus) => {
      if (s === TaskStatus.IN_PROGRESS) return 3;
      if (s === TaskStatus.REVIEW) return 2;
      if (s === TaskStatus.BACKLOG) return 1;
      return 0;
    };
    return score(b.status) - score(a.status);
  });

  const handleToggleDone = (task: Task) => {
    moveTask(task.id, task.status === TaskStatus.DONE ? TaskStatus.IN_PROGRESS : TaskStatus.DONE);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-2">
      <AnimatePresence mode='popLayout'>
        {sortedTasks.map(task => (
          <motion.div 
            key={task.id} 
            layout 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group"
          >
            <button 
              onClick={() => handleToggleDone(task)}
              className="text-slate-400 dark:text-slate-600 hover:text-emerald-500 transition-colors"
            >
              {task.status === TaskStatus.DONE ? (
                <CheckCircle2 className="text-emerald-500" />
              ) : (
                <Circle />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <TaskCard 
                task={task} 
                onEdit={onEditTask} 
                isListMode={true} 
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {sortedTasks.length === 0 && (
         <div className="text-center text-slate-500 py-20">
            No tasks found. Press 'N' to create one.
         </div>
      )}
    </div>
  );
};
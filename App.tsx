import React, { useState } from 'react';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskBoard } from './components/TaskBoard';
import { TaskList } from './components/TaskList';
import { TaskModal } from './components/TaskModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Task, TaskStatus } from './types';
import LoginScreen from './components/LoginScreen';

const DevFocusApp: React.FC = () => {
  const { viewMode, user, isLoading } = useTaskContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<TaskStatus | undefined>(undefined);

  const handleNewTask = (status?: TaskStatus) => {
    setEditingTask(null);
    setInitialStatus(status);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  useKeyboardShortcuts({
    onNewTask: () => handleNewTask(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-200">
      
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-hidden p-4 sm:p-6 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-5 pointer-events-none z-0"></div>
          <div className="relative z-10 h-full">
            {viewMode === 'KANBAN' ? (
              <TaskBoard onEditTask={handleEditTask} onNewTask={handleNewTask} />
            ) : (
              <TaskList onEditTask={handleEditTask} />
            )}
          </div>
        </main>
      </div>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        taskToEdit={editingTask}
        initialStatus={initialStatus}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <TaskProvider>
      <DevFocusApp />
    </TaskProvider>
  );
};

export default App;

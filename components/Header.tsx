import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useTimer } from '../hooks/useTimer';
import { Search, Play, Pause, RotateCcw, Coffee, Menu } from 'lucide-react';
import { cn } from '../utils/cn';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, activeTaskId, tasks, toggleSidebar } = useTaskContext();
  const { formattedTime, isActive, mode, startTimer, pauseTimer, resetTimer, toggleMode } = useTimer();

  const activeTask = tasks.find(t => t.id === activeTaskId);

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 transition-colors duration-200">
      
      {/* Mobile Menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"
        >
            <Menu size={20} />
        </button>

        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input 
            id="search-input"
            type="text" 
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
        </div>
      </div>

      {/* Center - Active Task Context (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 justify-center px-4">
        {activeTask ? (
          <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 max-w-xs truncate">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-indigo-700 dark:text-indigo-200 truncate">{activeTask.title}</span>
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-sm italic">No active task</div>
        )}
      </div>

      {/* Right - Timer */}
      <div className="flex items-center gap-2 sm:gap-4 pl-2">
        <div className={cn("flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 rounded-lg border transition-colors", 
            mode === 'FOCUS' 
              ? (isActive ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700") 
              : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
          )}>
          <div className="flex flex-col items-end">
             <span className={cn("font-mono text-lg sm:text-xl font-bold leading-none", 
               mode === 'FOCUS' ? (isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400") : "text-emerald-600 dark:text-emerald-400"
             )}>
               {formattedTime}
             </span>
             <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-600 tracking-wider hidden sm:block">
               {mode}
             </span>
          </div>
          
          <div className="h-6 sm:h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button 
              onClick={isActive ? pauseTimer : startTimer}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              {isActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button 
              onClick={resetTimer}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors hidden sm:block"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={toggleMode}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title={mode === 'FOCUS' ? "Switch to Break" : "Switch to Focus"}
            >
              <Coffee size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
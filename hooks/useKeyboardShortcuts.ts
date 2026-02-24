import { useEffect } from 'react';

interface ShortcutsProps {
  onNewTask: () => void;
}

export const useKeyboardShortcuts = ({ onNewTask }: ShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewTask();
          break;
        case '/': {
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.focus();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewTask]);
};

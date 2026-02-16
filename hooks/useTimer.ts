import { useState, useEffect, useCallback, useRef } from 'react';

const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60;

export const useTimer = () => {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const timerRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
    }
  }, [isActive]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(mode === 'FOCUS' ? FOCUS_TIME : SHORT_BREAK);
  }, [mode]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'FOCUS' ? 'BREAK' : 'FOCUS';
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'FOCUS' ? FOCUS_TIME : SHORT_BREAK);
  }, [mode]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Play sound or notification here
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isActive,
    mode,
    formattedTime: formatTime(timeLeft),
    startTimer,
    pauseTimer,
    resetTimer,
    toggleMode
  };
};
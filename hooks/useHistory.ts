import { useState, useCallback } from 'react';

interface UseHistoryProps {
  initialSrc: string;
  onStateChange: (newSrc: string) => void;
}

export const useHistory = ({ initialSrc, onStateChange }: UseHistoryProps) => {
  const [history, setHistory] = useState<string[]>([initialSrc]);
  const [index, setIndex] = useState(0);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const updateHistory = useCallback((newSrc: string) => {
    const newHistory = history.slice(0, index + 1);
    newHistory.push(newSrc);
    setHistory(newHistory);
    const newIndex = newHistory.length - 1;
    setIndex(newIndex);
    onStateChange(newSrc);
  }, [history, index, onStateChange]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      const newIndex = index - 1;
      setIndex(newIndex);
      onStateChange(history[newIndex]);
    }
  }, [canUndo, index, history, onStateChange]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      const newIndex = index + 1;
      setIndex(newIndex);
      onStateChange(history[newIndex]);
    }
  }, [canRedo, index, history, onStateChange]);
  
  const resetHistory = useCallback((src: string) => {
      setHistory([src]);
      setIndex(0);
  }, []);

  return {
    updateHistory,
    resetHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  };
};
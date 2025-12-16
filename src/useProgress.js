import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chinese-tutor-progress';
const SYNC_CODE_KEY = 'chinese-tutor-sync-code';

const defaultProgress = {
  currentLessonId: '1.1',
  completedLessons: [],
  vocabularyProgress: {},
  totalPracticeTime: 0,
  sessionsCompleted: 0,
  lastSessionDate: null,
  streak: 0,
};

export function useProgress() {
  const [progress, setProgress] = useState(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncCode, setSyncCode] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Load progress and sync code from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProgress({ ...defaultProgress, ...parsed });
      }
      const savedCode = localStorage.getItem(SYNC_CODE_KEY);
      if (savedCode) {
        setSyncCode(savedCode);
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }
  }, [progress, isLoaded]);

  // Save sync code to localStorage
  useEffect(() => {
    if (syncCode) {
      localStorage.setItem(SYNC_CODE_KEY, syncCode);
    }
  }, [syncCode]);

  // Create a new sync code and upload progress
  const createSyncCode = useCallback(async (messages = []) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, messages }),
      });
      const data = await response.json();
      if (data.code) {
        setSyncCode(data.code);
        return data.code;
      }
      throw new Error('Failed to create sync code');
    } catch (err) {
      setSyncError(err.message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [progress]);

  // Save progress to existing sync code
  const saveToCloud = useCallback(async (messages = []) => {
    if (!syncCode) return false;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: syncCode, progress, messages }),
      });
      const data = await response.json();
      return data.success;
    } catch (err) {
      setSyncError(err.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [syncCode, progress]);

  // Load progress from a sync code
  const loadFromCloud = useCallback(async (code) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch(`/api/sync?code=${code}`);
      if (!response.ok) {
        throw new Error('Sync code not found');
      }
      const data = await response.json();
      if (data.progress) {
        setProgress({ ...defaultProgress, ...data.progress });
        setSyncCode(code.toUpperCase());
        return { progress: data.progress, messages: data.messages || [] };
      }
      throw new Error('Invalid sync data');
    } catch (err) {
      setSyncError(err.message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Clear sync code (disconnect from cloud)
  const clearSyncCode = useCallback(() => {
    setSyncCode(null);
    localStorage.removeItem(SYNC_CODE_KEY);
  }, []);

  // Mark a lesson as complete
  const completeLesson = useCallback((lessonId) => {
    setProgress((prev) => {
      if (prev.completedLessons.includes(lessonId)) {
        return prev;
      }
      return {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
      };
    });
  }, []);

  // Set current lesson
  const setCurrentLesson = useCallback((lessonId) => {
    setProgress((prev) => ({
      ...prev,
      currentLessonId: lessonId,
    }));
  }, []);

  // Track vocabulary encounter
  const trackVocabulary = useCallback((chinese, wasCorrect) => {
    setProgress((prev) => {
      const existing = prev.vocabularyProgress[chinese] || {
        seen: 0,
        correct: 0,
        lastSeen: null,
      };
      return {
        ...prev,
        vocabularyProgress: {
          ...prev.vocabularyProgress,
          [chinese]: {
            seen: existing.seen + 1,
            correct: existing.correct + (wasCorrect ? 1 : 0),
            lastSeen: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  // Update session stats
  const updateSessionStats = useCallback((minutesPracticed) => {
    setProgress((prev) => {
      const today = new Date().toDateString();
      const lastDate = prev.lastSessionDate
        ? new Date(prev.lastSessionDate).toDateString()
        : null;

      let newStreak = prev.streak;
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastDate === yesterday.toDateString()) {
          newStreak = prev.streak + 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }
      }

      return {
        ...prev,
        totalPracticeTime: prev.totalPracticeTime + minutesPracticed,
        sessionsCompleted: prev.sessionsCompleted + 1,
        lastSessionDate: new Date().toISOString(),
        streak: newStreak,
      };
    });
  }, []);

  // Reset all progress
  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  // Get vocabulary that needs review
  const getVocabularyForReview = useCallback(() => {
    const now = new Date();
    const reviewItems = [];

    Object.entries(progress.vocabularyProgress).forEach(([chinese, data]) => {
      if (!data.lastSeen) return;

      const lastSeen = new Date(data.lastSeen);
      const daysSince = (now - lastSeen) / (1000 * 60 * 60 * 24);
      const accuracy = data.seen > 0 ? data.correct / data.seen : 0;

      const reviewInterval = accuracy > 0.8 ? 7 : accuracy > 0.5 ? 3 : 1;

      if (daysSince >= reviewInterval) {
        reviewItems.push({ chinese, ...data, daysSince });
      }
    });

    return reviewItems.sort((a, b) => b.daysSince - a.daysSince);
  }, [progress.vocabularyProgress]);

  return {
    progress,
    isLoaded,
    syncCode,
    isSyncing,
    syncError,
    completeLesson,
    setCurrentLesson,
    trackVocabulary,
    updateSessionStats,
    resetProgress,
    getVocabularyForReview,
    createSyncCode,
    saveToCloud,
    loadFromCloud,
    clearSyncCode,
  };
}

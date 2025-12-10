import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chinese-tutor-progress';

const defaultProgress = {
  currentLessonId: '1.1',
  completedLessons: [],
  vocabularyProgress: {}, // { "你好": { seen: 3, correct: 2, lastSeen: "2024-01-01" } }
  totalPracticeTime: 0, // in minutes
  sessionsCompleted: 0,
  lastSessionDate: null,
  streak: 0,
};

export function useProgress() {
  const [progress, setProgress] = useState(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProgress({ ...defaultProgress, ...parsed });
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

      // Calculate streak
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

  // Get vocabulary that needs review (spaced repetition logic)
  const getVocabularyForReview = useCallback(() => {
    const now = new Date();
    const reviewItems = [];

    Object.entries(progress.vocabularyProgress).forEach(([chinese, data]) => {
      if (!data.lastSeen) return;

      const lastSeen = new Date(data.lastSeen);
      const daysSince = (now - lastSeen) / (1000 * 60 * 60 * 24);
      const accuracy = data.seen > 0 ? data.correct / data.seen : 0;

      // Simple spaced repetition: review sooner if accuracy is low
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
    completeLesson,
    setCurrentLesson,
    trackVocabulary,
    updateSessionStats,
    resetProgress,
    getVocabularyForReview,
  };
}

import { useState, useEffect } from 'react';

export type Rating = 'Good' | 'Bad' | null;

const STORAGE_KEY = 'ui-visualizer-ratings';

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function useRatings() {
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const storageAvailable = isLocalStorageAvailable();

  // Load ratings from localStorage on mount
  useEffect(() => {
    if (!storageAvailable) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setRatings(new Map(Object.entries(parsed)));
        }
      }
    } catch (e) {
      console.error('Error loading ratings from localStorage:', e);
    }
  }, [storageAvailable]);

  // Save ratings to localStorage whenever they change
  const updateRating = (folderName: string, rating: Rating) => {
    setRatings((prev) => {
      const next = new Map(prev);
      if (rating === null) {
        next.delete(folderName);
      } else {
        next.set(folderName, rating);
      }
      
      // Save to localStorage if available
      if (storageAvailable) {
        try {
          const obj = Object.fromEntries(next);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
          console.error('Error saving ratings to localStorage:', e);
        }
      }
      
      return next;
    });
  };

  const getRating = (folderName: string): Rating => {
    return ratings.get(folderName) || null;
  };

  return {
    ratings,
    updateRating,
    getRating,
  };
}


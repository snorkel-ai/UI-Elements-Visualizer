import { useState, useEffect } from 'react';

export type Rating = 'Good' | 'Bad' | null;

const STORAGE_KEY = 'ui-visualizer-ratings';

export function useRatings() {
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());

  // Load ratings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRatings(new Map(Object.entries(parsed)));
      }
    } catch (e) {
      console.error('Error loading ratings from localStorage:', e);
    }
  }, []);

  // Save ratings to localStorage whenever they change
  const updateRating = (folderName: string, rating: Rating) => {
    setRatings((prev) => {
      const next = new Map(prev);
      if (rating === null) {
        next.delete(folderName);
      } else {
        next.set(folderName, rating);
      }
      
      // Save to localStorage
      try {
        const obj = Object.fromEntries(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      } catch (e) {
        console.error('Error saving ratings to localStorage:', e);
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


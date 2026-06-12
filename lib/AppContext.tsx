'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, UserProfile, MealRecord, FoodItem } from './types';
import { loadState, saveState } from './db';

const EMPTY_STATE: AppState = { profile: null, meals: [] };

type Action =
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'ADD_MEAL'; meal: MealRecord }
  | { type: 'UPDATE_MEAL'; meal: MealRecord }
  | { type: 'DELETE_MEAL'; id: string }
  | { type: 'UPDATE_FOOD'; mealId: string; food: FoodItem }
  | { type: 'LOAD_STATE'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;

    case 'SET_PROFILE':
      return { ...state, profile: action.profile };

    case 'ADD_MEAL':
      return { ...state, meals: [...state.meals, action.meal] };

    case 'UPDATE_MEAL':
      return {
        ...state,
        meals: state.meals.map((m) => (m.id === action.meal.id ? action.meal : m)),
      };

    case 'DELETE_MEAL':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) };

    case 'UPDATE_FOOD': {
      const updatedMeals = state.meals.map((meal) => {
        if (meal.id !== action.mealId) return meal;
        const foods = meal.foods.map((f) =>
          f.id === action.food.id ? action.food : f
        );
        const totalCaloriesMin = foods.reduce((s, f) => s + f.caloriesMin, 0);
        const totalCaloriesMax = foods.reduce((s, f) => s + f.caloriesMax, 0);
        return { ...meal, foods, totalCaloriesMin, totalCaloriesMax };
      });
      return { ...state, meals: updatedMeals };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  loading: boolean;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load from Supabase
  useEffect(() => {
    loadState().then((s) => {
      dispatch({ type: 'LOAD_STATE', state: s });
      setLoading(false);
    });
  }, []);

  // Debounced save to Supabase on state change
  useEffect(() => {
    // Skip save on initial render (state was just loaded)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveState(state);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state]);

  // Flush pending save on page close / navigation (prevent data loss)
  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveState(state); // fire-and-forget on unload
      }
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [state]);

  return React.createElement(AppContext.Provider, { value: { state, loading, dispatch } }, children);
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

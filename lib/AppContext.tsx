'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, UserProfile, MealRecord, FoodItem } from './types';
import { loadState, saveState } from './storage';

type Action =
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'ADD_MEAL'; meal: MealRecord }
  | { type: 'UPDATE_MEAL'; meal: MealRecord }
  | { type: 'DELETE_MEAL'; id: string }
  | { type: 'UPDATE_FOOD'; mealId: string; food: FoodItem };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return React.createElement(AppContext.Provider, { value: { state, dispatch } }, children);
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

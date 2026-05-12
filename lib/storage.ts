import { AppState } from './types';

const STORAGE_KEY = 'calorie-tracker-state';

const EMPTY_STATE: AppState = {
  profile: null,
  meals: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return JSON.parse(raw) as AppState;
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

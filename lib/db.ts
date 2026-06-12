import { supabase, getDeviceId } from './supabase';
import type { AppState, UserMemory } from './types';
import { getDefaultMemory } from './user-memory';

// ── App State ──

const EMPTY_STATE: AppState = {
  profile: null,
  meals: [],
  workouts: [],
};

export async function loadState(): Promise<AppState> {
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from('app_state')
      .select('profile, meals, workouts')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error || !data) return EMPTY_STATE;

    return {
      profile: (data.profile as AppState['profile']) ?? null,
      meals: (data.meals as AppState['meals']) ?? [],
      workouts: (data.workouts as AppState['workouts']) ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const deviceId = getDeviceId();
    await supabase.from('app_state').upsert({
      device_id: deviceId,
      profile: state.profile,
      meals: state.meals,
      workouts: state.workouts,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // silent fail — data still in-memory
  }
}

// ── User Memory ──

export async function loadMemory(): Promise<UserMemory> {
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error || !data) return getDefaultMemory();

    return {
      aiConfig: (data.ai_config as UserMemory['aiConfig']) ?? getDefaultMemory().aiConfig,
      insights: (data.insights as UserMemory['insights']) ?? [],
      preferences: (data.preferences as UserMemory['preferences']) ?? [],
      milestones: (data.milestones as UserMemory['milestones']) ?? [],
      lastSummaryDate: (data.last_summary_date as string | null) ?? null,
    };
  } catch {
    return getDefaultMemory();
  }
}

export async function saveMemory(memory: UserMemory): Promise<void> {
  try {
    const deviceId = getDeviceId();
    await supabase.from('user_memory').upsert({
      device_id: deviceId,
      ai_config: memory.aiConfig,
      insights: memory.insights,
      preferences: memory.preferences,
      milestones: memory.milestones,
      last_summary_date: memory.lastSummaryDate,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // silent fail
  }
}

// ── Avatar Upload ──

export async function uploadAvatar(base64: string): Promise<string | null> {
  try {
    const deviceId = getDeviceId();
    // Convert base64 to Blob
    const res = await fetch(base64);
    const blob = await res.blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${deviceId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: false, contentType: blob.type });

    if (error) {
      // If bucket doesn't exist or upload fails, fall back to base64
      console.warn('Avatar upload failed:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

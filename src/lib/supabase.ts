import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidSupabaseUrl(url: string): boolean {
  if (!url || url.includes('your-project') || url.includes('MY_')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function isValidAnonKey(key: string): boolean {
  return Boolean(key && !key.includes('your-anon-key') && !key.includes('MY_'));
}

export const isSupabaseConfigured: boolean =
  isValidSupabaseUrl(rawUrl) && isValidAnonKey(rawAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

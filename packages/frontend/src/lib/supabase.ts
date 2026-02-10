import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function initSupabase(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    console.warn('Supabase not configured: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    // Return a dummy client that won't crash but auth calls will fail gracefully
    return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder');
  }
}

export const supabase = initSupabase();

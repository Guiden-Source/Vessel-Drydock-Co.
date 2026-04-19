import { createClient } from '@supabase/supabase-js';

// These environment variables should be defined in .env.local
// Using empty strings as fallback to prevent crash in design-only mode
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null; // Allows the app to render UI even if not fully configured yet

import { createClient } from '@supabase/supabase-js';

let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
let SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up potential quotes from the env variables
if (SUPABASE_URL && SUPABASE_URL.startsWith('"') && SUPABASE_URL.endsWith('"')) {
  SUPABASE_URL = SUPABASE_URL.slice(1, -1);
}
if (SUPABASE_PUBLISHABLE_KEY && SUPABASE_PUBLISHABLE_KEY.startsWith('"') && SUPABASE_PUBLISHABLE_KEY.endsWith('"')) {
  SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY.slice(1, -1);
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file");
}

if (!SUPABASE_URL.startsWith('http')) {
  throw new Error(`Invalid Supabase URL. It must start with 'http'. Received: ${SUPABASE_URL}`);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
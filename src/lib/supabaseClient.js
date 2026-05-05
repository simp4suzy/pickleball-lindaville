import { createClient } from '@supabase/supabase-js'

// We read the URL and Key from our .env file.
// Vite requires env variables to start with VITE_ to be visible in the browser.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This creates the connection bridge between our React app and Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
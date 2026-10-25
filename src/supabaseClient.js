import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://njsccgnyuxztxcrdbeso.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9VSvojmqtaw9vU0SFX6Zyw_af-Pbqs6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

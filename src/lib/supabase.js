import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const supabaseUrl =
	env.PUBLIC_SUPABASE_URL ||
	import.meta.env.VITE_SUPABASE_URL ||
	'https://placeholder.supabase.co';
const supabasePublishableKey =
	env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	'placeholder-key';

export const supabase = createClient(
	supabaseUrl,
	supabasePublishableKey
);
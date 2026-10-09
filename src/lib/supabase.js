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

/**
 * Wraps a promise (like a Supabase query) with a strict timeout.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} [ms=1000]
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
export async function withTimeout(promise, ms = 1000, fallback = /** @type {any} */ ({ data: null, error: new Error('Request timeout') })) {
	let timer;
	const timeoutPromise = new Promise((resolve) => {
		timer = setTimeout(() => resolve(fallback), ms);
	});
	try {
		const res = await Promise.race([promise, timeoutPromise]);
		clearTimeout(timer);
		return res;
	} catch (err) {
		clearTimeout(timer);
		return fallback;
	}
}
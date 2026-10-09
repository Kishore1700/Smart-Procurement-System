// @ts-nocheck
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Safely retrieves an environment variable from public/private env, process.env,
 * or directly by reading the project's .env file on disk.
 * @param {string} key
 * @param {string} defaultValue
 * @returns {string}
 */
function getEnvVar(key, defaultValue = '') {
	try {
		if (publicEnv && /** @type {any} */ (publicEnv)[key]) return /** @type {any} */ (publicEnv)[key];
		if (env && /** @type {any} */ (env)[key]) return /** @type {any} */ (env)[key];
		if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
	} catch (e) {
		// ignore
	}

	try {
		const cwd = typeof process !== 'undefined' ? process.cwd() : '.';
		const envPath = path.resolve(cwd, '.env');
		if (fs.existsSync(envPath)) {
			const envContent = fs.readFileSync(envPath, 'utf-8');
			const lines = envContent.split(/\r?\n/);
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;
				const [k, ...v] = trimmed.split('=');
				if (k && k.trim() === key) {
					return v.join('=').trim().replace(/^["']|["']$/g, '');
				}
			}
		}
	} catch (e) {
		console.warn('Error reading .env directly in create-order:', e);
	}

	return defaultValue;
}

export async function POST({ request }) {
	try {
		const { amount, receipt, notes } = await request.json();

		if (!amount || amount <= 0) {
			return json({ error: 'Invalid amount' }, { status: 400 });
		}

		const keyId = getEnvVar('PUBLIC_RAZORPAY_KEY_ID', 'rzp_test_TlNidAwnB5mNJ4');
		const keySecret = getEnvVar('RAZORPAY_KEY_SECRET', 'pmADCNIxBaCYrKcscA8JWGX2');

		if (!keyId || !keySecret) {
			return json({ error: 'Razorpay API keys not configured' }, { status: 500 });
		}

		// Razorpay expects amount in paise (1 INR = 100 Paise)
		const amountInPaise = Math.round(Number(amount) * 100);

		let orderId = undefined;
		let currency = 'INR';

		try {
			const authString = typeof Buffer !== 'undefined'
				? Buffer.from(`${keyId}:${keySecret}`).toString('base64')
				: btoa(`${keyId}:${keySecret}`);

			const response = await fetch('https://api.razorpay.com/v1/orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${authString}`
				},
				body: JSON.stringify({
					amount: amountInPaise,
					currency: 'INR',
					receipt: receipt || `rec_${Date.now()}`,
					notes: notes || {}
				})
			});

			const orderData = await response.json();

			if (response.ok && orderData.id) {
				orderId = orderData.id;
				currency = orderData.currency || 'INR';
			} else {
				console.warn('Razorpay Order API response not ok (falling back to direct checkout):', orderData);
			}
		} catch (fetchErr) {
			console.warn('Razorpay fetch order error (falling back to direct checkout):', fetchErr);
		}

		return json({
			success: true,
			orderId: orderId,
			amount: amountInPaise,
			currency: currency,
			keyId: keyId
		});
	} catch (err) {
		console.error('Create Order Server Error:', err);
		return json({ error: err.message || 'Internal server error' }, { status: 500 });
	}
}

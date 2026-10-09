import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function POST({ request }) {
	try {
		const { amount, receipt, notes } = await request.json();

		if (!amount || amount <= 0) {
			return json({ error: 'Invalid amount' }, { status: 400 });
		}

		const keyId = publicEnv.PUBLIC_RAZORPAY_KEY_ID || process.env.PUBLIC_RAZORPAY_KEY_ID;
		const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

		if (!keyId || !keySecret) {
			return json({ error: 'Razorpay API keys not configured' }, { status: 500 });
		}

		// Razorpay expects amount in paise (1 INR = 100 Paise)
		const amountInPaise = Math.round(Number(amount) * 100);

		const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

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

		if (!response.ok) {
			console.error('Razorpay Order Creation Error:', orderData);
			return json(
				{ error: orderData.error?.description || 'Failed to create Razorpay Order' },
				{ status: response.status }
			);
		}

		return json({
			success: true,
			orderId: orderData.id,
			amount: orderData.amount,
			currency: orderData.currency,
			keyId: keyId
		});
	} catch (err) {
		console.error('Create Order Server Error:', err);
		return json({ error: err.message || 'Internal server error' }, { status: 500 });
	}
}

import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return json({ error: 'Missing payment verification parameters' }, { status: 400 });
		}

		const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

		if (!keySecret) {
			return json({ error: 'Razorpay Key Secret is missing' }, { status: 500 });
		}

		const generatedSignature = crypto
			.createHmac('sha256', keySecret)
			.update(`${razorpay_order_id}|${razorpay_payment_id}`)
			.digest('hex');

		if (generatedSignature === razorpay_signature) {
			return json({
				success: true,
				message: 'Payment verified successfully',
				paymentId: razorpay_payment_id,
				orderId: razorpay_order_id
			});
		} else {
			return json({ success: false, error: 'Invalid payment signature verification' }, { status: 400 });
		}
	} catch (err) {
		console.error('Verify Payment Server Error:', err);
		return json({ error: err.message || 'Internal server error' }, { status: 500 });
	}
}

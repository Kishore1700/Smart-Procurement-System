// @ts-nocheck
/**
 * Dynamically loads the Razorpay Checkout SDK script if not already loaded.
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
	return new Promise((resolve) => {
		if (typeof window === 'undefined') {
			resolve(false);
			return;
		}

		if (/** @type {any} */ (window).Razorpay) {
			resolve(true);
			return;
		}

		const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
		if (existingScript) {
			if (/** @type {any} */ (window).Razorpay) {
				resolve(true);
				return;
			}
			existingScript.addEventListener('load', () => resolve(true));
			existingScript.addEventListener('error', () => resolve(false));
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.async = true;
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

/**
 * Initiates Razorpay payment for a given amount and details
 * @param {Object} options
 * @param {number} options.amount - Amount in INR (e.g. 5000)
 * @param {string} [options.title] - Payment title
 * @param {string} [options.description] - Payment description
 * @param {string} [options.receipt] - Custom receipt ID
 * @param {Object} [options.notes] - Custom notes metadata
 * @param {Object} [options.prefill] - { name, email, contact }
 * @returns {Promise<{ success: boolean, paymentId?: string, orderId?: string, error?: string }>}
 */
export async function processRazorpayPayment({
	amount,
	title = 'Smart Procurement Payment',
	description = 'Stock Purchase Payment',
	receipt,
	notes = {},
	prefill = {}
}) {
	try {
		const isScriptLoaded = await loadRazorpayScript();
		if (!isScriptLoaded) {
			throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
		}

		// 1. Create order via server endpoint
		const orderRes = await fetch('/api/payment/create-order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: amount,
				receipt: receipt || `rec_${Date.now()}`,
				notes: notes
			})
		});

		const orderData = await orderRes.json();

		if (!orderRes.ok || !orderData.success) {
			throw new Error(orderData.error || 'Could not initiate Razorpay order');
		}

		// 2. Open Razorpay Checkout modal
		return new Promise((resolve) => {
			/** @type {Record<string, any>} */
			const options = {
				key: orderData.keyId,
				amount: orderData.amount,
				currency: orderData.currency || 'INR',
				name: title,
				description: description,
				notes: notes,
				prefill: {
					name: prefill.name || 'Procurement Manager',
					email: prefill.email || 'manager@procurement.com',
					contact: prefill.contact || '9999999999'
				},
				theme: {
					color: '#0284c7'
				},
				handler: async function (response) {
					try {
						// 3. Verify signature via server endpoint
						const verifyRes = await fetch('/api/payment/verify', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								razorpay_order_id: response.razorpay_order_id,
								razorpay_payment_id: response.razorpay_payment_id,
								razorpay_signature: response.razorpay_signature
							})
						});

						const verifyData = await verifyRes.json();

						if (verifyRes.ok && verifyData.success) {
							resolve({
								success: true,
								paymentId: response.razorpay_payment_id,
								orderId: response.razorpay_order_id
							});
						} else {
							resolve({
								success: false,
								error: verifyData.error || 'Payment signature verification failed'
							});
						}
					} catch (err) {
						resolve({
							success: false,
							error: err.message || 'Payment verification failed'
						});
					}
				},
				modal: {
					ondismiss: function () {
						resolve({
							success: false,
							error: 'Payment cancelled by user'
						});
					}
				}
			};

			if (orderData.orderId) {
				options.order_id = orderData.orderId;
			}

			try {
				const RazorpayConstructor = /** @type {any} */ (window).Razorpay;
				if (!RazorpayConstructor) {
					throw new Error('Razorpay SDK not found on window');
				}
				const rzp = new RazorpayConstructor(options);
				if (typeof rzp.on === 'function') {
					rzp.on('payment.failed', function (resp) {
						console.warn('Razorpay payment failed:', resp.error);
						resolve({
							success: false,
							error: resp.error?.description || 'Payment was declined or failed'
						});
					});
				}
				rzp.open();
			} catch (err) {
				console.error('Error opening Razorpay modal:', err);
				resolve({
					success: false,
					error: err.message || 'Failed to open Razorpay modal'
				});
			}
		});
	} catch (err) {
		console.error('Razorpay process error:', err);
		return {
			success: false,
			error: err.message || 'Payment processing error'
		};
	}
}

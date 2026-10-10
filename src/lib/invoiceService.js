// @ts-nocheck
import { db } from '$lib/db/mockDb';
import { supabase, withTimeout } from '$lib/supabase';
import { globalStore } from '$lib/stores/globalStore.svelte';

/**
 * Convert numeric INR currency into words (e.g. 145000 -> "Rupees One Lakh Forty-Five Thousand Only")
 * @param {number} num 
 * @returns {string}
 */
export function numberToWords(num) {
	if (!num || isNaN(num) || num <= 0) return 'Rupees Zero Only';
	num = Math.round(Number(num));
	const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
	const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

	function inWords(n) {
		if (n < 20) return a[n];
		const digit = n % 10;
		return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : ' ');
	}

	let str = '';
	const crore = Math.floor(num / 10000000);
	num %= 10000000;
	const lakh = Math.floor(num / 100000);
	num %= 100000;
	const thousand = Math.floor(num / 1000);
	num %= 1000;
	const hundred = Math.floor(num / 100);
	const rem = num % 100;

	if (crore > 0) str += inWords(crore) + 'Crore ';
	if (lakh > 0) str += inWords(lakh) + 'Lakh ';
	if (thousand > 0) str += inWords(thousand) + 'Thousand ';
	if (hundred > 0) str += inWords(hundred) + 'Hundred ';
	if (rem > 0) str += (str !== '' ? 'and ' : '') + inWords(rem);

	return 'Rupees ' + str.trim() + ' Only';
}

/**
 * Automatically creates a Vendor Tax Invoice after successful Razorpay payment
 * and dispatches it with notifications to Admin and the specific Vendor.
 *
 * @param {Object} params
 * @param {string} params.poNumber - e.g. PO-2026-0001
 * @param {string} params.vendorId - Vendor ID (e.g. vendor-apex)
 * @param {string} [params.vendorName] - Vendor display name
 * @param {number} params.amount - Total amount paid in INR
 * @param {string} params.paymentId - Razorpay Payment ID (e.g. pay_xxx)
 * @param {string} [params.requestId] - Associated purchase request ID
 * @param {string} [params.description] - Description of items or contract
 * @param {Array} [params.items] - Line items list
 * @param {Object} [params.currentUser] - The user who initiated the action
 * @returns {Promise<{ success: boolean, invoice?: Object, error?: string }>}
 */
export async function createAndSendVendorInvoice({
	poNumber,
	vendorId,
	vendorName,
	amount,
	paymentId,
	requestId = '',
	description = '',
	items = [],
	currentUser = null
}) {
	try {
		// 1. Resolve vendor details
		const vendors = db.getVendors() || [];
		let matchedVendor = vendors.find(
			(v) => v.id === vendorId || v.vendorId === vendorId
		);

		// Fallback check via PO
		if (!matchedVendor && poNumber) {
			const po = (db.getPurchaseOrders() || []).find((p) => p.poNumber === poNumber || p.po_number === poNumber);
			if (po && (po.vendorId || po.vendor_id)) {
				const fallbackVendorId = po.vendorId || po.vendor_id;
				matchedVendor = vendors.find((v) => v.id === fallbackVendorId || v.vendorId === fallbackVendorId);
				if (!vendorId) vendorId = fallbackVendorId;
			}
		}

		const resolvedVendorId = vendorId || matchedVendor?.id || matchedVendor?.vendorId || 'vendor-apex';
		const resolvedVendorName =
			vendorName ||
			matchedVendor?.name ||
			matchedVendor?.company_name ||
			matchedVendor?.companyName ||
			(resolvedVendorId === 'vendor-apex' ? 'Apex IT Solutions' : resolvedVendorId === 'vendor-acme' ? 'ACME Office Supplies' : 'Authorized Vendor');

		// 2. Tax & Subtotal calculation (18% GST standard: 9% CGST + 9% SGST)
		const totalAmount = Number(amount) || 0;
		const subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
		const taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;
		const cgst = Math.round((taxAmount / 2) * 100) / 100;
		const sgst = Math.round((taxAmount - cgst) * 100) / 100;
		const amountInWords = numberToWords(totalAmount);
		const timestamp = new Date().toISOString();

		// 3. Resolve Line Items
		let resolvedItems = [];
		if (Array.isArray(items) && items.length > 0) {
			resolvedItems = items.map((it, idx) => ({
				id: it.id || `item-${idx + 1}`,
				name: it.itemName || it.name || it.description || `Deliverable Item ${idx + 1}`,
				hsnCode: it.hsnCode || '84713010',
				quantity: Number(it.quantity) || 1,
				unitPrice: Number(it.unitPrice) || Math.round((subtotal / (items.length || 1)) * 100) / 100,
				total: Number(it.estimatedCost) || Number(it.total) || Math.round((subtotal / (items.length || 1)) * 100) / 100
			}));
		} else if (requestId) {
			const pr = (db.getPurchaseRequests() || []).find((r) => r.id === requestId || r.request_id === requestId);
			if (pr && Array.isArray(pr.items) && pr.items.length > 0) {
				resolvedItems = pr.items.map((it, idx) => ({
					id: it.id || `item-${idx + 1}`,
					name: it.itemName || it.name || `Deliverable Item ${idx + 1}`,
					hsnCode: '84713010',
					quantity: Number(it.quantity) || 1,
					unitPrice: Number(it.unitPrice) || Math.round((subtotal / (pr.items.length || 1)) * 100) / 100,
					total: Number(it.estimatedCost) || Math.round((subtotal / (pr.items.length || 1)) * 100) / 100
				}));
			}
		}

		if (resolvedItems.length === 0) {
			resolvedItems = [
				{
					id: 'item-1',
					name: description || `Contract Order Supply under ${poNumber}`,
					hsnCode: '84713010',
					quantity: 1,
					unitPrice: subtotal,
					total: subtotal
				}
			];
		}

		// 4. Generate unique invoice number or link to existing PO invoice
		const existingInvoices = db.getInvoices() || [];
		const existingPoIndex = existingInvoices.findIndex(
			(inv) => inv.poNumber === poNumber || inv.po_number === poNumber
		);

		const currentYear = new Date().getFullYear();
		let invNumber = '';
		let invoiceId = '';

		if (existingPoIndex !== -1 && existingInvoices[existingPoIndex].invoiceNumber) {
			invNumber = existingInvoices[existingPoIndex].invoiceNumber;
			invoiceId = existingInvoices[existingPoIndex].id;
		} else {
			const yearInvoices = existingInvoices.filter(
				(inv) => typeof inv.invoiceNumber === 'string' && inv.invoiceNumber.startsWith(`INV-${currentYear}-`)
			);
			invNumber =
				'INV-' +
				currentYear +
				'-' +
				String(yearInvoices.length + 101).padStart(4, '0');
			invoiceId = 'inv-' + Math.random().toString(36).substring(2, 9);
		}

		// 5. Construct complete official Tax Invoice record
		const newInvoice = {
			id: invoiceId,
			invoiceNumber: invNumber,
			invoice_number: invNumber,
			poNumber: poNumber,
			po_number: poNumber,
			vendorId: resolvedVendorId,
			vendor_id: resolvedVendorId,
			vendorName: resolvedVendorName,
			vendorEmail: matchedVendor?.email || 'vendor@procurement.com',
			vendorPhone: matchedVendor?.phone || '+91-9876543210',
			vendorAddress: matchedVendor?.address || 'Industrial Estate, Phase 2, Industrial Hub',
			vendorGstin: matchedVendor?.gstin || (resolvedVendorId === 'vendor-apex' ? '33AABCA5678G1Z9' : resolvedVendorId === 'vendor-acme' ? '29ABCDE1234F1Z5' : '27GLOBA9876H1Z2'),
			buyerName: 'Smart Procurement System (Enterprise ERP)',
			buyerDepartment: 'Central Procurement & Finance Division',
			buyerGstin: '29SMART8888P1Z4',
			buyerAddress: 'Corporate Towers, Phase 1, Silicon Corridor, Bangalore, KA - 560001',
			buyerEmail: 'admin@procurement.org',
			buyerPhone: '+91-80-23456789',
			amount: totalAmount,
			subtotal: subtotal,
			taxAmount: taxAmount,
			cgst: cgst,
			sgst: sgst,
			amountInWords: amountInWords,
			currency: 'INR',
			status: 'Paid',
			paymentId: paymentId || `pay_sim_${Date.now()}`,
			payment_id: paymentId || `pay_sim_${Date.now()}`,
			paymentMethod: 'Razorpay',
			paymentStatus: 'Settled',
			submittedAt: existingPoIndex !== -1 ? existingInvoices[existingPoIndex].submittedAt || timestamp : timestamp,
			paidAt: timestamp,
			verifiedAt: timestamp,
			verifiedById: currentUser?.id || 'user-mgr1',
			sentToAdmin: true,
			sentToAdminAt: timestamp,
			requestId: requestId,
			description: description || `Contract order supply deliverable under ${poNumber}`,
			items: resolvedItems,
			notes: `Official Tax Invoice generated by vendor (${resolvedVendorName}) upon instant Razorpay settlement (${paymentId}). Dispatched to Admin and Vendor portals.`,
			attachmentUrl: `/invoices/${invNumber}.pdf`
		};

		// 6. Save into local database
		if (existingPoIndex !== -1) {
			existingInvoices[existingPoIndex] = {
				...existingInvoices[existingPoIndex],
				...newInvoice
			};
		} else {
			existingInvoices.unshift(newInvoice);
		}
		db.saveInvoices(existingInvoices);

		// 7. Non-blocking Supabase sync
		try {
			await withTimeout(
				supabase.from('invoices').upsert({
					id: invoiceId,
					po_number: poNumber,
					invoice_number: invNumber,
					vendor_id: resolvedVendorId,
					amount: totalAmount,
					status: 'Paid',
					payment_id: paymentId,
					paid_at: timestamp,
					submitted_at: timestamp
				}),
				1500
			);
		} catch (supaErr) {
			console.warn('Supabase invoice upsert warning (local db persistent):', supaErr);
		}

		// 8. Notifications to Admin/Manager AND the Vendor User
		try {
			const users = db.getUsers() || [];
			
			// A. Notify Admin / Managers
			const adminUsers = users.filter(
				(u) => u.role === 'Manager' || u.role === 'Admin' || u.id === 'user-mgr1'
			);

			adminUsers.forEach((admin) => {
				db.addNotification(
					admin.id,
					'Vendor Tax Invoice Received (Paid)',
					`Vendor ${resolvedVendorName} has generated and submitted Paid Tax Invoice ${invNumber} for PO ${poNumber} (₹${totalAmount.toLocaleString()}). Payment verified via Razorpay (${paymentId}). Available in Admin Invoices feature.`,
					'Success'
				);
			});

			// B. Notify the Vendor User who was paid
			const vendorUsers = users.filter((u) => u.vendorId === resolvedVendorId);
			vendorUsers.forEach((vu) => {
				db.addNotification(
					vu.id,
					'Payment Received & Tax Invoice Generated',
					`Payment of ₹${totalAmount.toLocaleString()} for PO ${poNumber} was successfully settled via Razorpay (${paymentId}). Your Tax Invoice ${invNumber} is now ready and available in your Vendor Invoices feature.`,
					'Success'
				);
			});

			if (currentUser?.id && typeof globalStore.loadNotifications === 'function') {
				globalStore.loadNotifications(currentUser.id);
			}
		} catch (notifErr) {
			console.warn('Notification dispatch error:', notifErr);
		}

		// 9. Audit log
		try {
			db.logAction(
				currentUser?.id || 'system',
				'Tax Invoice Generated & Settled',
				`Vendor ${resolvedVendorName} invoice ${invNumber} (PO: ${poNumber}, ₹${totalAmount.toLocaleString()}) settled via Razorpay (${paymentId}). Available in Admin and Vendor Invoices.`
			);
		} catch (logErr) {
			console.warn('Audit log error:', logErr);
		}

		return {
			success: true,
			invoice: newInvoice
		};
	} catch (err) {
		console.error('createAndSendVendorInvoice error:', err);
		return {
			success: false,
			error: err.message || 'Invoice generation error'
		};
	}
}

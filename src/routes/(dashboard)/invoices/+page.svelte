<script>
	// @ts-nocheck
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { processRazorpayPayment } from '$lib/razorpay';
	import { createAndSendVendorInvoice, numberToWords } from '$lib/invoiceService';
	import { z } from 'zod';
	import {
		DollarSign,
		UploadCloud,
		CheckCircle2,
		AlertTriangle,
		Search,
		Plus,
		FileText,
		Calendar,
		Printer,
		X,
		ShieldCheck,
		Building,
		Receipt,
		CreditCard,
		ArrowUpRight,
		Eye,
		Check,
		Layers,
		BadgeCheck,
		Filter,
		ExternalLink,
		Download
	} from '@lucide/svelte';
	import { downloadTaxInvoicePdf } from '$lib/pdfService';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);
	let isAdmin = $derived(role === 'Manager' || role === 'Admin' || currentUser?.id === 'user-mgr1');
	let isVendor = $derived(role === 'Vendor');

	// Grid states
	let filterStatus = $state('All');
	let filterVendor = $state('All');

	// Create Invoice state
	let isCreateModalOpen = $state(false);
	let selectedInvoiceForModal = $state(/** @type {any} */ (null));
	let invoicePoNumber = $state('');
	let invoiceNumberInput = $state('');
	let invoiceAmount = $state(0);
	let attachmentName = $state(/** @type {string | null} */ (null));

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	// Vendors list for Admin filter
	let allVendors = $derived.by(() => {
		return db.getVendors() || [];
	});

	// Active PO list for vendor dropdown
	let issuedPos = $derived.by(() => {
		const pos = db.getPurchaseOrders().filter((/** @type {any} */ po) => po.status === 'Issued' || po.status === 'Completed' || po.status === 'Approved');
		if (isVendor) {
			return pos.filter((/** @type {any} */ po) => (po.vendorId === currentUser?.vendorId || po.vendor_id === currentUser?.vendorId));
		}
		return pos;
	});

	// Load and filter Invoices
	let invoices = $derived.by(() => {
		let list = db.getInvoices() || [];
		const pos = db.getPurchaseOrders() || [];
		const vendors = db.getVendors() || [];

		// Auto-hydrate any legacy invoice missing vendorId by matching PO
		list = list.map((inv) => {
			if (!inv.vendorId && inv.poNumber) {
				const matchingPo = pos.find((p) => p.poNumber === inv.poNumber || p.po_number === inv.poNumber);
				if (matchingPo && (matchingPo.vendorId || matchingPo.vendor_id)) {
					const vId = matchingPo.vendorId || matchingPo.vendor_id;
					const vObj = vendors.find((v) => v.id === vId || v.vendorId === vId);
					return {
						...inv,
						vendorId: vId,
						vendor_id: vId,
						vendorName: inv.vendorName || vObj?.name || 'Authorized Vendor'
					};
				}
			}
			return inv;
		});

		// 1. If Vendor, strictly show their company's invoices only
		if (isVendor) {
			const userVendorId = currentUser?.vendorId;
			const myPoNumbers = new Set(
				pos
					.filter((po) => po.vendorId === userVendorId || po.vendor_id === userVendorId)
					.map((po) => po.poNumber || po.po_number)
			);

			list = list.filter((inv) => {
				const invVendorId = inv.vendorId || inv.vendor_id;
				if (invVendorId && userVendorId && invVendorId === userVendorId) {
					return true;
				}
				if (inv.poNumber && myPoNumbers.has(inv.poNumber)) {
					return true;
				}
				const matchingPo = pos.find((p) => p.poNumber === inv.poNumber || p.po_number === inv.poNumber);
				if (matchingPo && (matchingPo.vendorId === userVendorId || matchingPo.vendor_id === userVendorId)) {
					return true;
				}
				return false;
			});
		} else if (filterVendor !== 'All') {
			// 2. Admin vendor filter
			list = list.filter((inv) => (inv.vendorId || inv.vendor_id) === filterVendor);
		}

		// 3. Status filter
		if (filterStatus !== 'All') {
			list = list.filter((/** @type {any} */ i) => i.status === filterStatus);
		}

		// 4. Search filter
		const q = (globalStore.searchQuery || '').toLowerCase().trim();
		if (q) {
			list = list.filter((/** @type {any} */ i) => {
				const invNum = (i.invoiceNumber || '').toLowerCase();
				const poNum = (i.poNumber || '').toLowerCase();
				const vName = (i.vendorName || '').toLowerCase();
				const payId = (i.paymentId || '').toLowerCase();
				return invNum.includes(q) || poNum.includes(q) || vName.includes(q) || payId.includes(q);
			});
		}

		return list;
	});

	// Quick Stats Calculation
	let stats = $derived.by(() => {
		const totalCount = invoices.length;
		const paidInvoices = invoices.filter((i) => i.status === 'Paid');
		const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
		const verifiedCount = invoices.filter((i) => i.status === 'Verified').length;
		const unverifiedCount = invoices.filter((i) => i.status === 'Unverified').length;

		return {
			totalCount,
			paidCount: paidInvoices.length,
			totalPaidAmount,
			verifiedCount,
			unverifiedCount
		};
	});

	// Vendor Name of Current Logged-in Vendor
	let currentVendorProfile = $derived.by(() => {
		if (!isVendor) return null;
		const vendors = db.getVendors() || [];
		return vendors.find((v) => v.id === currentUser?.vendorId || v.vendorId === currentUser?.vendorId) || null;
	});

	function handleFileChange(/** @type {Event} */ e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		if (target.files && target.files.length > 0) {
			attachmentName = target.files[0].name;
		}
	}

	function submitInvoice(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};

		const invoiceSchema = z.object({
			invoiceNumber: z.string().min(3, { message: 'Invoice number is required' }),
			poNumber: z.string().min(2, { message: 'Select a purchase order number' }),
			amount: z.number().positive({ message: 'Amount must be positive' }),
			attachment: z.string().min(1, { message: 'Please upload invoice document' })
		});

		const result = invoiceSchema.safeParse({
			invoiceNumber: invoiceNumberInput,
			poNumber: invoicePoNumber,
			amount: Number(invoiceAmount),
			attachment: attachmentName || ''
		});

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		// Save Invoice with complete vendor reference
		const list = db.getInvoices();
		const matchedVendor = currentVendorProfile || (db.getVendors() || []).find((v) => v.id === currentUser?.vendorId);
		const vendorName = matchedVendor?.name || currentUser?.fullName || 'Vendor Partner';

		const newInv = {
			id: 'inv-' + Math.random().toString(36).substring(2, 8),
			poNumber: invoicePoNumber,
			po_number: invoicePoNumber,
			invoiceNumber: invoiceNumberInput,
			invoice_number: invoiceNumberInput,
			vendorId: currentUser?.vendorId || 'vendor-apex',
			vendor_id: currentUser?.vendorId || 'vendor-apex',
			vendorName: vendorName,
			vendorEmail: currentUser?.email || matchedVendor?.email || 'vendor@procurement.com',
			vendorPhone: matchedVendor?.phone || '+91-9876543210',
			vendorAddress: matchedVendor?.address || 'Industrial Estate, Phase 2',
			amount: Number(invoiceAmount),
			subtotal: Math.round((Number(invoiceAmount) / 1.18) * 100) / 100,
			taxAmount: Math.round((Number(invoiceAmount) - (Number(invoiceAmount) / 1.18)) * 100) / 100,
			attachmentUrl: '/uploads/' + attachmentName,
			status: 'Unverified',
			submittedAt: new Date().toISOString(),
			verifiedAt: null,
			verifiedById: null,
			paidAt: null
		};

		list.unshift(newInv);
		db.saveInvoices(list);
		db.logAction(
			currentUser?.id || '',
			'Upload Invoice',
			`Vendor ${vendorName} uploaded Invoice ${newInv.invoiceNumber} for PO ${invoicePoNumber}`
		);

		// Notify manager / admin
		const financeUsers = db.getUsers().filter((/** @type {any} */ u) => u.role === 'Manager' || u.role === 'Admin');
		financeUsers.forEach((/** @type {any} */ fu) => {
			db.addNotification(
				fu.id,
				'New Invoice Uploaded',
				`Vendor ${vendorName} submitted Invoice ${newInv.invoiceNumber} (₹${newInv.amount.toLocaleString()}) for verification.`,
				'Info'
			);
		});

		globalStore.showToast(`Invoice ${newInv.invoiceNumber} submitted successfully!`, 'success');
		resetForm();
	}

	function resetForm() {
		invoicePoNumber = '';
		invoiceNumberInput = '';
		invoiceAmount = 0;
		attachmentName = null;
		errors = {};
		isCreateModalOpen = false;
	}

	function verifyInvoice(/** @type {string} */ invId) {
		const list = db.getInvoices();
		const idx = list.findIndex((/** @type {any} */ i) => i.id === invId);
		if (idx === -1) return;

		list[idx].status = 'Verified';
		list[idx].verifiedAt = new Date().toISOString();
		list[idx].verifiedById = currentUser?.id || 'user-mgr1';
		db.saveInvoices(list);

		db.logAction(currentUser?.id || '', 'Verify Invoice', `Verified Invoice ${list[idx].invoiceNumber}`);
		globalStore.showToast(`Invoice ${list[idx].invoiceNumber} marked as Verified. Ready for payout.`, 'success');
	}

	async function payInvoice(/** @type {string} */ invId) {
		const list = db.getInvoices();
		const idx = list.findIndex((/** @type {any} */ i) => i.id === invId);
		if (idx === -1) return;

		const targetInv = list[idx];
		const po = (db.getPurchaseOrders() || []).find((/** @type {any} */ p) => p.poNumber === targetInv.poNumber || p.po_number === targetInv.poNumber);
		const targetVendorId = targetInv.vendorId || targetInv.vendor_id || po?.vendorId || po?.vendor_id || 'vendor-apex';
		const vendor = (db.getVendors() || []).find((/** @type {any} */ v) => v.id === targetVendorId || v.vendorId === targetVendorId);
		const vendorDisplayName = targetInv.vendorName || vendor?.name || 'Authorized Supplier';

		globalStore.showToast(`Opening Razorpay payout modal for Invoice ${targetInv.invoiceNumber} (₹${targetInv.amount.toLocaleString()})...`, 'info');

		const paymentResult = await processRazorpayPayment({
			amount: targetInv.amount,
			title: 'Vendor Invoice Settlement',
			description: `Payout to ${vendorDisplayName} for ${targetInv.invoiceNumber}`,
			receipt: `inv_${invId.substring(0, 10)}`,
			notes: {
				invoice_id: invId,
				po_number: targetInv.poNumber,
				invoice_number: targetInv.invoiceNumber,
				vendor_id: targetVendorId
			},
			prefill: {
				name: currentUser?.fullName || currentUser?.username || 'Finance Officer',
				email: currentUser?.email || 'finance@procurement.com'
			}
		});

		if (!paymentResult.success) {
			globalStore.showToast(`Payment Cancelled or Failed: ${paymentResult.error || 'Invoice not settled.'}`, 'error');
			return;
		}

		// Use the centralized invoiceService to generate and record the official Paid Tax Invoice
		const genResult = await createAndSendVendorInvoice({
			poNumber: targetInv.poNumber,
			vendorId: targetVendorId,
			vendorName: vendorDisplayName,
			amount: targetInv.amount,
			paymentId: paymentResult.paymentId,
			requestId: po?.requestId || targetInv.requestId || '',
			description: targetInv.description || `Settlement for Invoice ${targetInv.invoiceNumber}`,
			currentUser: currentUser
		});

		if (genResult.success && genResult.invoice) {
			selectedInvoiceForModal = genResult.invoice;
		} else {
			// Direct fallback update
			list[idx].status = 'Paid';
			list[idx].paidAt = new Date().toISOString();
			list[idx].paymentId = paymentResult.paymentId;
			list[idx].payment_id = paymentResult.paymentId;
			list[idx].paymentMethod = 'Razorpay';
			list[idx].paymentStatus = 'Settled';
			db.saveInvoices(list);
		}

		// Update or generate Delivery Tracking record for this settled PO
		try {
			const deliveries = db.getDeliveries() || [];
			let existingDel = deliveries.find((d) => d.poNumber === targetInv.poNumber || d.po_number === targetInv.poNumber);
			if (existingDel) {
				existingDel.paymentStatus = 'Paid';
				existingDel.paymentId = paymentResult.paymentId;
				db.saveDeliveries(deliveries);
			} else {
				const trackingCode = 'TRK-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
				deliveries.unshift({
					id: 'del-' + Math.random().toString(36).substring(2, 8),
					poNumber: targetInv.poNumber,
					po_number: targetInv.poNumber,
					vendorId: targetVendorId,
					vendor_id: targetVendorId,
					vendorName: vendorDisplayName,
					totalAmount: targetInv.amount,
					paymentStatus: 'Paid',
					paymentId: paymentResult.paymentId,
					status: 'Pending',
					carrier: 'BlueDart Express',
					trackingNumber: trackingCode,
					estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
					actualDeliveryDate: null,
					notes: `Invoice settled via Razorpay (${paymentResult.paymentId}). Awaiting vendor shipping dispatch.`,
					items: [],
					createdAt: new Date().toISOString()
				});
				db.saveDeliveries(deliveries);
			}
		} catch (delErr) {
			console.warn('Delivery update note:', delErr);
		}

		globalStore.showToast(`Payment of ₹${targetInv.amount.toLocaleString()} settled for Invoice ${targetInv.invoiceNumber}! Txn ID: ${paymentResult.paymentId}`, 'success');
	}

	function printTaxInvoice() {
		window.print();
	}

	function handleDownloadInvoicePdf(inv) {
		const targetInv = inv || selectedInvoiceForModal;
		if (!targetInv) return;
		try {
			const po = (db.getPurchaseOrders() || []).find((p) => p.poNumber === targetInv.poNumber || p.po_number === targetInv.poNumber);
			const vendor = (db.getVendors() || []).find((v) => v.id === targetInv.vendorId || v.vendorId === targetInv.vendorId || v.id === targetInv.vendor_id);
			downloadTaxInvoicePdf(targetInv, po, vendor, currentUser);
			globalStore.showToast(`Official Tax Invoice ${targetInv.invoiceNumber} PDF downloaded!`, 'success');
		} catch (e) {
			console.error('Invoice PDF error:', e);
			globalStore.showToast('Failed to generate Tax Invoice PDF: ' + (e?.message || 'Error'), 'error');
		}
	}
</script>

<div class="space-y-6">
	<!-- Top Banner Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20">
					<Receipt class="w-5 h-5" />
				</div>
				<div>
					<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
						{#if isVendor}
							Vendor Invoices & Payment Receipts
						{:else}
							Tax Invoices & Payout Settlements
						{/if}
					</h1>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
						{#if isVendor}
							Track your billed purchase orders, verified payouts, and official automated Tax Invoices.
						{:else}
							Centrally monitor all vendor billing, audit Razorpay settlement records, and inspect bilateral tax copies.
						{/if}
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2.5">
			{#if isVendor}
				<div class="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center gap-1.5">
					<Building class="w-3.5 h-3.5" />
					<span>{currentVendorProfile?.name || currentUser?.fullName || 'Vendor Portal'}</span>
				</div>
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/25 px-4 py-2 flex items-center"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Upload Invoice
				</button>
			{:else}
				<div class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
					<ShieldCheck class="w-3.5 h-3.5 text-sky-500" />
					<span>Admin Audit View (All Vendors)</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats Overview Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<!-- Total Invoices -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Total Invoices</span>
				<FileText class="w-4 h-4 text-sky-500" />
			</div>
			<p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
				{stats.totalCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				{stats.paidCount} fully settled
			</p>
		</div>

		<!-- Settled Amount -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Settled Payouts</span>
				<CheckCircle2 class="w-4 h-4 text-emerald-500" />
			</div>
			<p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
				₹{stats.totalPaidAmount.toLocaleString()}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Verified via Razorpay
			</p>
		</div>

		<!-- Verified / Ready -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Verified / Ready</span>
				<BadgeCheck class="w-4 h-4 text-sky-500" />
			</div>
			<p class="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
				{stats.verifiedCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Awaiting payout execution
			</p>
		</div>

		<!-- Unverified -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
				<AlertTriangle class="w-4 h-4 text-amber-500" />
			</div>
			<p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
				{stats.unverifiedCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Awaiting verification
			</p>
		</div>
	</div>

	<!-- Toolbar & Filters -->
	<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg text-xs">
		<div class="flex flex-wrap items-center gap-3">
			<!-- Status Filter -->
			<div class="flex items-center gap-1.5">
				<span class="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Status:</span>
				<select bind:value={filterStatus} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
					<option value="All">All Invoices</option>
					<option value="Paid">Paid / Settled</option>
					<option value="Verified">Verified</option>
					<option value="Unverified">Unverified</option>
				</select>
			</div>

			<!-- Admin Vendor Filter -->
			{#if isAdmin}
				<div class="flex items-center gap-1.5">
					<span class="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Vendor:</span>
					<select bind:value={filterVendor} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
						<option value="All">All Vendors</option>
						{#each allVendors as v}
							<option value={v.id}>{v.name}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<div class="text-[11px] text-slate-400 font-semibold">
			Showing <span class="text-slate-800 dark:text-slate-200 font-bold">{invoices.length}</span> record{invoices.length === 1 ? '' : 's'}
		</div>
	</div>

	<!-- Invoices Data Table -->
	<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-100/80 dark:bg-slate-900/80 font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th>Invoice Number</th>
						{#if isAdmin}
							<th>Vendor / Supplier</th>
						{/if}
						<th>PO Link</th>
						<th>Billing Amount</th>
						<th>Payment Settlement</th>
						<th>Date</th>
						<th>Status</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
					{#if invoices.length === 0}
						<tr>
							<td colspan={isAdmin ? 8 : 7} class="text-center py-14 text-slate-400 font-semibold">
								<Receipt class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
								No invoice documents found for the selected criteria.
							</td>
						</tr>
					{/if}
					{#each invoices as inv}
						{@const po = db.getPurchaseOrders().find((/** @type {any} */ p) => p.poNumber === inv.poNumber || p.po_number === inv.poNumber)}
						{@const vendor = db.getVendors().find((/** @type {any} */ v) => v.id === inv.vendorId || v.vendorId === inv.vendorId || v.id === po?.vendorId)}
						{@const vendorDisplayName = inv.vendorName || vendor?.name || 'Authorized Supplier'}
						<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
							<!-- Invoice Number with quick modal trigger -->
							<td>
								<button
									onclick={() => (selectedInvoiceForModal = inv)}
									class="flex items-center gap-1.5 font-black text-sky-600 dark:text-sky-400 hover:underline text-left"
								>
									<FileText class="w-3.5 h-3.5 shrink-0" />
									<span>{inv.invoiceNumber}</span>
								</button>
							</td>

							<!-- Vendor Name (Admin only) -->
							{#if isAdmin}
								<td>
									<div>
										<p class="font-extrabold text-slate-900 dark:text-slate-100">{vendorDisplayName}</p>
										<p class="text-[10px] text-slate-400">{vendor?.email || inv.vendorEmail || 'vendor@procurement.com'}</p>
									</div>
								</td>
							{/if}

							<!-- PO Link -->
							<td>
								<span class="font-extrabold text-slate-700 dark:text-slate-300">{inv.poNumber}</span>
							</td>

							<!-- Billing Amount -->
							<td>
								<div class="flex items-center gap-1.5">
									<span class="font-black text-slate-900 dark:text-slate-100">₹{Number(inv.amount || 0).toLocaleString()}</span>
									{#if po && Math.abs(po.totalAmount - inv.amount) > 0.01}
										<span class="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-black uppercase border border-rose-500/30" title="PO Value is ₹{po.totalAmount}">Mismatch</span>
									{/if}
								</div>
							</td>

							<!-- Payment Settlement Info -->
							<td>
								{#if inv.status === 'Paid'}
									<div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
										<CheckCircle2 class="w-3.5 h-3.5 shrink-0" />
										<span class="font-mono text-[10px]">{inv.paymentId || 'Settled'}</span>
									</div>
								{:else}
									<span class="text-slate-400 text-[11px] font-medium">Unsettled</span>
								{/if}
							</td>

							<!-- Submission Date -->
							<td>
								<div class="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
									<Calendar class="w-3 h-3 text-sky-500" />
									<span>{new Date(inv.submittedAt || Date.now()).toLocaleDateString()}</span>
								</div>
							</td>

							<!-- Status Badge -->
							<td>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {inv.status === 'Unverified' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : inv.status === 'Verified' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30' : inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}"
								>
									{inv.status}
								</span>
							</td>

							<!-- Actions -->
							<td class="text-right">
								<div class="flex items-center justify-end gap-1.5">
									<!-- View Tax Invoice Button -->
									<button
										onclick={() => (selectedInvoiceForModal = inv)}
										class="btn btn-ghost btn-xs text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-lg px-2 flex items-center gap-1"
										title="View Official Tax Invoice Copy"
									>
										<Eye class="w-3.5 h-3.5" />
										<span>View</span>
									</button>

									<!-- Download PDF Button -->
									<button
										onclick={() => handleDownloadInvoicePdf(inv)}
										class="btn btn-ghost btn-xs text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-2 flex items-center gap-1"
										title="Download Official Tax Invoice PDF"
									>
										<Download class="w-3.5 h-3.5" />
										<span>PDF</span>
									</button>

									<!-- Admin Verify Action -->
									{#if inv.status === 'Unverified' && isAdmin}
										<button
											onclick={() => verifyInvoice(inv.id)}
											class="btn btn-gradient-primary btn-xs font-extrabold rounded-lg px-2.5 py-1 shadow-md shadow-sky-600/20"
										>
											Verify
										</button>
									{/if}

									<!-- Admin Payout Action -->
									{#if inv.status === 'Verified' && isAdmin}
										<button
											onclick={() => payInvoice(inv.id)}
											class="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-emerald-600/20"
										>
											Payout
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Create / Upload Invoice Modal (Vendor View) -->
	{#if isCreateModalOpen}
		<div class="modal modal-open z-50">
			<div class="modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs max-w-sm">
				<h3 class="font-black text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
					Upload Vendor Invoice Sheet
				</h3>

				<form onsubmit={submitInvoice} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="inv-po">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Select Purchase Order</span>
						</label>
						<select id="inv-po" bind:value={invoicePoNumber} class="select text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl">
							<option value="">-- Choose PO --</option>
							{#each issuedPos as po}
								<option value={po.poNumber}>{po.poNumber} (₹{Number(po.totalAmount || 0).toLocaleString()})</option>
							{/each}
						</select>
						{#if errors.poNumber}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.poNumber}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-num">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Invoice Reference Number</span>
						</label>
						<input
							id="inv-num"
							type="text"
							placeholder="e.g. INV-2026-908"
							bind:value={invoiceNumberInput}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.invoiceNumber}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.invoiceNumber}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-amount">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Invoice Total (₹)</span>
						</label>
						<input
							id="inv-amount"
							type="number"
							placeholder="Enter invoice total billed"
							bind:value={invoiceAmount}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.amount}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.amount}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-file">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Upload Billing PDF</span>
						</label>
						<input
							id="inv-file"
							type="file"
							accept=".pdf"
							onchange={handleFileChange}
							class="file-input file-input-bordered file-input-xs w-full rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
						/>
						{#if errors.attachment}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.attachment}</span>
						{/if}
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
						<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs font-bold rounded-xl">
							Cancel
						</button>
						<button type="submit" class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-6 shadow-lg shadow-sky-600/25">
							Save Invoice
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- OFFICIAL TAX INVOICE COPY MODAL (Accessible by Admin and Vendor) -->
	{#if selectedInvoiceForModal}
		{@const po = db.getPurchaseOrders().find((/** @type {any} */ p) => p.poNumber === selectedInvoiceForModal.poNumber || p.po_number === selectedInvoiceForModal.poNumber)}
		{@const vendor = db.getVendors().find((/** @type {any} */ v) => v.id === selectedInvoiceForModal.vendorId || v.vendorId === selectedInvoiceForModal.vendorId || v.id === po?.vendorId)}
		{@const vendorDisplayName = selectedInvoiceForModal.vendorName || vendor?.name || 'Authorized Supplier'}
		{@const vendorGstin = selectedInvoiceForModal.vendorGstin || vendor?.gstin || '33AABCA5678G1Z9'}
		{@const vendorAddress = selectedInvoiceForModal.vendorAddress || vendor?.address || 'Industrial Estate, Phase 2, Industrial Corridor'}
		{@const vendorEmail = selectedInvoiceForModal.vendorEmail || vendor?.email || 'sales@vendor.com'}
		{@const vendorPhone = selectedInvoiceForModal.vendorPhone || vendor?.phone || '+91-9876543210'}
		{@const buyerName = selectedInvoiceForModal.buyerName || 'Smart Procurement System (Enterprise ERP)'}
		{@const buyerGstin = selectedInvoiceForModal.buyerGstin || '29SMART8888P1Z4'}
		{@const buyerAddress = selectedInvoiceForModal.buyerAddress || 'Corporate Towers, Phase 1, Silicon Corridor, Bangalore, KA - 560001'}
		{@const totalAmount = Number(selectedInvoiceForModal.amount) || 0}
		{@const subtotal = selectedInvoiceForModal.subtotal || Math.round((totalAmount / 1.18) * 100) / 100}
		{@const taxAmount = selectedInvoiceForModal.taxAmount || Math.round((totalAmount - subtotal) * 100) / 100}
		{@const cgst = selectedInvoiceForModal.cgst || Math.round((taxAmount / 2) * 100) / 100}
		{@const sgst = selectedInvoiceForModal.sgst || Math.round((taxAmount - cgst) * 100) / 100}
		{@const amountInWords = selectedInvoiceForModal.amountInWords || numberToWords(totalAmount)}
		{@const lineItems = (selectedInvoiceForModal.items && selectedInvoiceForModal.items.length > 0)
			? selectedInvoiceForModal.items
			: [{ id: '1', name: selectedInvoiceForModal.description || `Procurement supply deliverables under ${selectedInvoiceForModal.poNumber}`, hsnCode: '84713010', quantity: 1, unitPrice: subtotal, total: subtotal }]}

		<div class="modal modal-open z-50">
			<div class="modal-box bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-xs max-w-3xl max-h-[92vh] overflow-y-auto">
				<!-- Modal Actions Bar (Hidden on print) -->
				<div class="flex items-center justify-between border-b border-slate-800 pb-4 no-print">
					<div class="flex items-center gap-2.5">
						<div class="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
							<ShieldCheck class="w-5 h-5" />
						</div>
						<div>
							<h3 class="font-black text-base text-white tracking-tight flex items-center gap-2">
								Official Tax Invoice & Settlement Record
							</h3>
							<p class="text-[11px] text-slate-400">
								Bilateral Record: Accessible by Admin and Billed Vendor ({vendorDisplayName})
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button
							onclick={() => handleDownloadInvoicePdf(selectedInvoiceForModal)}
							class="btn btn-gradient-primary btn-sm text-xs font-black rounded-xl shadow-lg shadow-sky-600/25 px-4 flex items-center gap-1.5"
						>
							<Download class="w-4 h-4" />
							Download PDF
						</button>
						<button
							onclick={printTaxInvoice}
							class="btn btn-outline btn-sm text-xs font-bold rounded-xl border-slate-700 text-slate-300 hover:text-white px-3 flex items-center gap-1.5"
						>
							<Printer class="w-4 h-4" />
							Print Sheet
						</button>
						<button
							onclick={() => (selectedInvoiceForModal = null)}
							class="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-white"
							aria-label="Close"
						>
							<X class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- THE PRINTABLE TAX INVOICE DOCUMENT SHEET -->
				<div
					id="printable-tax-invoice"
					class="p-6 sm:p-8 space-y-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl mt-4"
				>
					<!-- Top Document Title & ERP Header -->
					<div class="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-0.5 rounded bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase">
									ORIGINAL FOR RECIPIENT
								</span>
								<span class="text-[10px] font-bold text-slate-500">
									Issued under Section 31 of CGST Act, 2017
								</span>
							</div>
							<h2 class="text-2xl font-black tracking-tight text-slate-900 mt-1 uppercase">
								TAX INVOICE
							</h2>
						</div>
						<div class="sm:text-right">
							<h3 class="font-black text-sm text-slate-900 uppercase tracking-wider">
								SMART PROCUREMENT SYSTEM
							</h3>
							<p class="text-[10px] text-slate-600">Enterprise Supply Chain & ERP Management</p>
							<p class="text-[9px] text-slate-500 font-mono mt-0.5">REF: {selectedInvoiceForModal.id}</p>
						</div>
					</div>

					<!-- Invoice Metadata Bar -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
						<div class="p-1 border-r border-slate-200/80 last:border-none">
							<span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">INVOICE NUMBER</span>
							<p class="font-black text-sm text-slate-900 font-mono mt-0.5">{selectedInvoiceForModal.invoiceNumber}</p>
						</div>
						<div class="p-1 border-r border-slate-200/80 last:border-none">
							<span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">INVOICE DATE</span>
							<p class="font-black text-xs text-slate-800 mt-0.5">
								{new Date(selectedInvoiceForModal.submittedAt || selectedInvoiceForModal.paidAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
							</p>
						</div>
						<div class="p-1 border-r border-slate-200/80 last:border-none">
							<span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">PURCHASE ORDER REF</span>
							<p class="font-black text-xs text-sky-700 font-mono mt-0.5">{selectedInvoiceForModal.poNumber}</p>
						</div>
						<div class="p-1">
							<span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">PLACE OF SUPPLY</span>
							<p class="font-black text-xs text-slate-800 mt-0.5">Karnataka (Code 29)</p>
						</div>
					</div>

					<!-- Parties Section: Two Columns (Supplier vs Buyer) -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<!-- Supplier / Vendor Column -->
						<div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-[11px]">
							<span class="text-[9px] font-black tracking-widest text-sky-700 uppercase block mb-1">
								DETAILS OF SUPPLIER / ISSUER (VENDOR)
							</span>
							<h4 class="font-black text-sm text-slate-900 leading-tight">{vendorDisplayName}</h4>
							<p class="text-slate-600 font-medium leading-relaxed">{vendorAddress}</p>
							<p class="text-slate-800 font-bold pt-1">
								GSTIN / UIN: <span class="font-mono text-slate-900 font-black">{vendorGstin}</span>
							</p>
							<p class="text-slate-500 text-[10px]">Email: {vendorEmail} | Phone: {vendorPhone}</p>
						</div>

						<!-- Buyer / Organization Column -->
						<div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-[11px]">
							<span class="text-[9px] font-black tracking-widest text-sky-700 uppercase block mb-1">
								BILLED TO / RECIPIENT (BUYER)
							</span>
							<h4 class="font-black text-sm text-slate-900 leading-tight">{buyerName}</h4>
							<p class="text-slate-600 font-medium leading-relaxed">{buyerAddress}</p>
							<p class="text-slate-800 font-bold pt-1">
								GSTIN / UIN: <span class="font-mono text-slate-900 font-black">{buyerGstin}</span>
							</p>
							<p class="text-slate-500 text-[10px]">Email: admin@procurement.org | Attn: Central Finance</p>
						</div>
					</div>

					<!-- Razorpay Payment Settlement Banner -->
					{#if selectedInvoiceForModal.paymentId}
						<div class="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<div class="flex items-center gap-2.5">
								<div class="p-1.5 bg-emerald-600 text-white rounded-lg">
									<CheckCircle2 class="w-4 h-4" />
								</div>
								<div>
									<p class="font-black text-emerald-900 text-xs">
										PAYMENT SETTLED & VERIFIED VIA RAZORPAY GATEWAY
									</p>
									<p class="text-[10px] text-emerald-800 font-mono mt-0.5">
										Transaction ID: <span class="font-bold underline">{selectedInvoiceForModal.paymentId}</span> | Settled At: {new Date(selectedInvoiceForModal.paidAt || Date.now()).toLocaleString()}
									</p>
								</div>
							</div>
							<div class="sm:text-right shrink-0">
								<span class="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
									100% PAID & DISBURSED
								</span>
							</div>
						</div>
					{/if}

					<!-- Line Items Table -->
					<div class="overflow-x-auto border border-slate-200 rounded-xl">
						<table class="table table-xs w-full text-slate-900">
							<thead class="bg-slate-100 font-black text-slate-800 border-b border-slate-200 text-[10px] uppercase">
								<tr>
									<th class="py-2.5">#</th>
									<th class="py-2.5">Description of Goods / Services</th>
									<th class="py-2.5 text-center">HSN/SAC</th>
									<th class="py-2.5 text-right">Qty</th>
									<th class="py-2.5 text-right">Unit Rate (₹)</th>
									<th class="py-2.5 text-right">Taxable Value (₹)</th>
									<th class="py-2.5 text-right">CGST (9%)</th>
									<th class="py-2.5 text-right">SGST (9%)</th>
									<th class="py-2.5 text-right">Total (₹)</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100 text-[11px]">
								{#each lineItems as item, idx}
									{@const itemTaxable = Number(item.total || item.unitPrice || 0)}
									{@const itemCgst = Math.round(itemTaxable * 0.09 * 100) / 100}
									{@const itemSgst = Math.round(itemTaxable * 0.09 * 100) / 100}
									{@const itemTotal = Math.round((itemTaxable + itemCgst + itemSgst) * 100) / 100}
									<tr>
										<td class="font-mono text-slate-500 py-2.5">{idx + 1}</td>
										<td class="font-bold text-slate-900 py-2.5">{item.name}</td>
										<td class="text-center font-mono text-slate-600 py-2.5">{item.hsnCode || '84713010'}</td>
										<td class="text-right font-medium py-2.5">{item.quantity || 1}</td>
										<td class="text-right font-mono py-2.5">₹{Number(item.unitPrice || itemTaxable).toLocaleString()}</td>
										<td class="text-right font-mono font-bold py-2.5">₹{itemTaxable.toLocaleString()}</td>
										<td class="text-right font-mono text-slate-600 py-2.5">₹{itemCgst.toLocaleString()}</td>
										<td class="text-right font-mono text-slate-600 py-2.5">₹{itemSgst.toLocaleString()}</td>
										<td class="text-right font-mono font-black text-slate-900 py-2.5">₹{itemTotal.toLocaleString()}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Bottom Totals & Amount in Words Grid -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
						<!-- Left Side: Amount in Words & Notes -->
						<div class="space-y-3">
							<div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
								<span class="text-[9px] font-black uppercase tracking-wider text-slate-500 block">TOTAL AMOUNT IN WORDS</span>
								<p class="font-black text-xs text-slate-900 mt-1 italic">
									{amountInWords}
								</p>
							</div>

							<div class="text-[10px] text-slate-500 space-y-1">
								<p class="font-black text-slate-700 uppercase tracking-wide">TERMS & CONDITIONS</p>
								<p>1. Supply acknowledged against Purchase Order {selectedInvoiceForModal.poNumber}.</p>
								<p>2. Electronic settlement verified via Razorpay API. No separate receipt needed.</p>
								<p>3. This is an authentic computer-generated Tax Invoice.</p>
							</div>
						</div>

						<!-- Right Side: Tax Breakdown & Grand Total -->
						<div class="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
							<div class="flex justify-between text-slate-600">
								<span>Total Taxable Subtotal:</span>
								<span class="font-mono font-bold text-slate-900">₹{subtotal.toLocaleString()}</span>
							</div>
							<div class="flex justify-between text-slate-600">
								<span>Central GST (CGST @ 9%):</span>
								<span class="font-mono font-bold text-slate-900">₹{cgst.toLocaleString()}</span>
							</div>
							<div class="flex justify-between text-slate-600">
								<span>State GST (SGST @ 9%):</span>
								<span class="font-mono font-bold text-slate-900">₹{sgst.toLocaleString()}</span>
							</div>
							<div class="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
								<span>Total GST Output (18%):</span>
								<span class="font-mono font-bold text-slate-900">₹{taxAmount.toLocaleString()}</span>
							</div>
							<div class="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2 mt-1">
								<span>Grand Invoice Total:</span>
								<span class="font-mono text-sky-700">₹{totalAmount.toLocaleString()}</span>
							</div>
						</div>
					</div>

					<!-- Endorsement Stamps & Digital Signatures -->
					<div class="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-center">
						<!-- Green Digital Paid Seal -->
						<div>
							<div class="inline-flex items-center gap-2 p-2 px-3 border-2 border-emerald-600 rounded-2xl bg-emerald-50/80">
								<div class="w-8 h-8 rounded-full border-2 border-dashed border-emerald-600 flex items-center justify-center font-black text-[9px] text-emerald-700">
									PAID
								</div>
								<div>
									<p class="font-black text-[10px] uppercase tracking-wider text-emerald-800">DIGITALLY VERIFIED SEAL</p>
									<p class="text-[9px] font-mono text-emerald-700 font-bold">SMART PROCURE / RAZORPAY</p>
								</div>
							</div>
						</div>

						<!-- Vendor Authorized Signatory -->
						<div class="text-right space-y-1">
							<p class="text-[9px] font-black uppercase tracking-wider text-slate-500">FOR {vendorDisplayName}</p>
							<div class="h-8 flex items-center justify-end">
								<span class="font-serif italic font-bold text-base text-slate-800 tracking-wider">
									Authorized Signatory
								</span>
							</div>
							<p class="text-[9px] text-slate-400">Digitally Generated & Verified via Portal</p>
						</div>
					</div>
				</div>

				<!-- Modal Footer (Hidden on print) -->
				<div class="flex items-center justify-between pt-4 mt-2 border-t border-slate-800 no-print">
					<span class="text-[11px] text-slate-400">
						Dispatched to Admin and Vendor for audit records.
					</span>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => handleDownloadInvoicePdf(selectedInvoiceForModal)}
							class="btn btn-gradient-primary btn-sm text-xs font-black rounded-xl px-4 flex items-center gap-1.5"
						>
							<Download class="w-4 h-4" />
							Download PDF
						</button>
						<button
							type="button"
							onclick={printTaxInvoice}
							class="btn btn-outline btn-sm text-xs font-bold rounded-xl border-slate-700 text-slate-300 hover:text-white px-3 flex items-center gap-1.5"
						>
							<Printer class="w-4 h-4" />
							Print Sheet
						</button>
						<button
							type="button"
							onclick={() => (selectedInvoiceForModal = null)}
							class="btn btn-ghost btn-sm text-xs font-bold rounded-xl text-slate-300 hover:text-white"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@media print {
		/* Hide everything except printable invoice */
		:global(body *) {
			visibility: hidden;
		}

		#printable-tax-invoice,
		#printable-tax-invoice * {
			visibility: visible;
		}

		#printable-tax-invoice {
			position: fixed;
			left: 0;
			top: 0;
			width: 100% !important;
			max-width: 100% !important;
			margin: 0 !important;
			padding: 24px !important;
			background: white !important;
			color: #0f172a !important;
			border: none !important;
			box-shadow: none !important;
			page-break-after: avoid;
		}

		.no-print {
			display: none !important;
		}
	}
</style>

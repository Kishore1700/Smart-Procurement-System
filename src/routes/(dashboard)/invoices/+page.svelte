<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { z } from 'zod';
	import {
		DollarSign,
		UploadCloud,
		CheckCircle2,
		AlertTriangle,
		Search,
		Plus,
		FileText,
		Calendar
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Grid states
	let filterStatus = $state('All');

	// Create Invoice state
	let isCreateModalOpen = $state(false);
	let invoicePoNumber = $state('');
	let invoiceNumberInput = $state('');
	let invoiceAmount = $state(0);
	let attachmentName = $state(/** @type {string | null} */ (null));

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	// Active PO list for vendor dropdown
	let issuedPos = $derived.by(() => {
		const pos = db.getPurchaseOrders().filter((/** @type {any} */ po) => po.status === 'Issued' || po.status === 'Completed');
		if (role === 'Vendor') {
			return pos.filter((/** @type {any} */ po) => po.vendorId === currentUser?.vendorId);
		}
		return pos;
	});

	// Load Invoices
	let invoices = $derived.by(() => {
		let list = db.getInvoices();

		// If vendor, show only their invoices
		if (role === 'Vendor') {
			const myPos = db.getPurchaseOrders().filter((/** @type {any} */ po) => po.vendorId === currentUser?.vendorId);
			list = list.filter((/** @type {any} */ inv) => myPos.some((/** @type {any} */ po) => po.poNumber === inv.poNumber));
		}

		if (filterStatus !== 'All') {
			list = list.filter((/** @type {any} */ i) => i.status === filterStatus);
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(/** @type {any} */ i) =>
					i.invoiceNumber.toLowerCase().includes(q) ||
					i.poNumber.toLowerCase().includes(q)
			);
		}

		return list;
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

		// Save Invoice
		const list = db.getInvoices();
		const newInv = {
			id: 'inv-' + Math.random().toString(36).substring(2, 6),
			poNumber: invoicePoNumber,
			invoiceNumber: invoiceNumberInput,
			amount: Number(invoiceAmount),
			attachmentUrl: '/uploads/' + attachmentName,
			status: 'Unverified',
			submittedAt: new Date().toISOString(),
			verifiedAt: null,
			verifiedById: null,
			paidAt: null
		};

		list.push(newInv);
		db.saveInvoices(list);
		db.logAction(
			currentUser?.id || '',
			'Upload Invoice',
			`Vendor uploaded Invoice ${newInv.invoiceNumber} for PO ${invoicePoNumber}`
		);

		// Notify manager
		const financeUsers = db.getUsers().filter((/** @type {any} */ u) => u.role === 'Manager');
		financeUsers.forEach((/** @type {any} */ fu) => {
			db.addNotification(
				fu.id,
				'New Invoice Uploaded',
				`Vendor submitted Invoice ${newInv.invoiceNumber} (₹${newInv.amount}) for verification.`,
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
		globalStore.showToast(`Invoice ${list[idx].invoiceNumber} marked as Verified.`, 'success');
	}

	function payInvoice(/** @type {string} */ invId) {
		const list = db.getInvoices();
		const idx = list.findIndex((/** @type {any} */ i) => i.id === invId);
		if (idx === -1) return;

		list[idx].status = 'Paid';
		list[idx].paidAt = new Date().toISOString();
		db.saveInvoices(list);

		db.logAction(currentUser?.id || '', 'Pay Invoice', `Disbursed payment for Invoice ${list[idx].invoiceNumber}`);

		// Notify vendor
		const po = db.getPurchaseOrders().find((/** @type {any} */ p) => p.poNumber === list[idx].poNumber);
		if (po) {
			const vendorUsers = db.getUsers().filter((/** @type {any} */ u) => u.vendorId === po.vendorId);
			vendorUsers.forEach((/** @type {any} */ vu) => {
				db.addNotification(
					vu.id,
					'Invoice Paid',
					`Payment disbursed for Invoice ${list[idx].invoiceNumber} ($${list[idx].amount}).`,
					'Success'
				);
			});
		}

		globalStore.showToast(`Payment disbursed for Invoice ${list[idx].invoiceNumber}!`, 'success');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Invoice Management
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Upload vendor billing assets, match against PO totals, and execute verified payouts.
			</p>
		</div>
		<div>
			{#if role === 'Vendor'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/25 px-4 py-2 flex items-center"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Upload Invoice
				</button>
			{/if}
		</div>
	</div>

	<!-- Toolbar -->
	<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-lg text-xs">
		<div class="flex items-center gap-2">
			<span class="font-extrabold text-slate-400 uppercase tracking-widest">Status:</span>
			<select bind:value={filterStatus} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
				<option value="All">All Invoices</option>
				<option value="Unverified">Unverified</option>
				<option value="Verified">Verified</option>
				<option value="Paid">Paid</option>
				<option value="Rejected">Rejected</option>
			</select>
		</div>
	</div>

	<!-- Data Table -->
	<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-100/80 dark:bg-slate-900/80 font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th>Invoice Number</th>
						<th>PO Link</th>
						<th>Billing Amount</th>
						<th>Billing File</th>
						<th>Submission Date</th>
						<th>Status</th>
						<th>Payment Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
					{#if invoices.length === 0}
						<tr>
							<td colspan="7" class="text-center py-12 text-slate-400 font-semibold">
								No invoice documents submitted.
							</td>
						</tr>
					{/if}
					{#each invoices as inv}
						{@const po = db.getPurchaseOrders().find((/** @type {any} */ p) => p.poNumber === inv.poNumber)}
						<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
							<td class="font-black text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</td>
							<td class="font-extrabold text-sky-600 dark:text-sky-400">{inv.poNumber}</td>
							<td class="font-black text-slate-800 dark:text-slate-200">
								<div class="flex items-center gap-1.5">
									<span>₹{inv.amount.toLocaleString()}</span>
									{#if po && Math.abs(po.totalAmount - inv.amount) > 0.01}
										<span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-black uppercase border border-rose-500/30" title="PO Value is ₹{po.totalAmount}">Mismatch</span>
									{/if}
								</div>
							</td>
							<td>
								<span class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
									<FileText class="w-4 h-4 text-sky-500" />
									invoice_doc.pdf
								</span>
							</td>
							<td>
								<div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
									<Calendar class="w-3.5 h-3.5 text-sky-500" />
									<span class="font-medium">{new Date(inv.submittedAt).toLocaleDateString()}</span>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {inv.status === 'Unverified' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : inv.status === 'Verified' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30' : inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}"
								>
									{inv.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if inv.status === 'Unverified' && role === 'Manager'}
										<button
											onclick={() => verifyInvoice(inv.id)}
											class="btn btn-gradient-primary btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-sky-600/20"
										>
											Verify Amount
										</button>
									{/if}

									{#if inv.status === 'Verified' && role === 'Manager'}
										<button
											onclick={() => payInvoice(inv.id)}
											class="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-emerald-600/20"
										>
											Process Payout
										</button>
									{/if}

									{#if inv.status === 'Paid'}
										<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
											<CheckCircle2 class="w-4 h-4" />
											Settled
										</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Create Invoice Modal (Vendor view) -->
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
								<option value={po.poNumber}>{po.poNumber} (₹{po.totalAmount.toLocaleString()})</option>
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
</div>


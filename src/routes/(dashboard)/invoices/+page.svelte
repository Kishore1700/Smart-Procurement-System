<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { Invoice, PurchaseOrder, Vendor } from '$lib/db/types';
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
	let invoiceAmount = $state<number>(0);
	let attachmentName = $state<string | null>(null);

	let errors = $state<{ [key: string]: string }>({});

	// Active PO list for vendor dropdown
	let issuedPos = $derived.by(() => {
		const pos = db.getPurchaseOrders().filter((po) => po.status === 'Issued' || po.status === 'Completed');
		if (role === 'Vendor') {
			return pos.filter((po) => po.vendorId === currentUser?.vendorId);
		}
		return pos;
	});

	// Load Invoices
	let invoices = $derived.by(() => {
		let list = db.getInvoices();

		// If vendor, show only their invoices
		if (role === 'Vendor') {
			const myPos = db.getPurchaseOrders().filter((po) => po.vendorId === currentUser?.vendorId);
			list = list.filter((inv) => myPos.some((po) => po.poNumber === inv.poNumber));
		}

		if (filterStatus !== 'All') {
			list = list.filter((i) => i.status === filterStatus);
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(i) =>
					i.invoiceNumber.toLowerCase().includes(q) ||
					i.poNumber.toLowerCase().includes(q)
			);
		}

		return list;
	});

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			attachmentName = target.files[0].name;
		}
	}

	function submitInvoice(e: Event) {
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
				const path = issue.path[0] as string;
				errors[path] = issue.message;
			});
			return;
		}

		// Save Invoice
		const list = db.getInvoices();
		const newInv: Invoice = {
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
		const financeUsers = db.getUsers().filter((u) => u.role === 'Manager');
		financeUsers.forEach((fu) => {
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

	function verifyInvoice(invId: string) {
		const list = db.getInvoices();
		const idx = list.findIndex((i) => i.id === invId);
		if (idx === -1) return;

		list[idx].status = 'Verified';
		list[idx].verifiedAt = new Date().toISOString();
		list[idx].verifiedById = currentUser?.id || 'user-mgr1';
		db.saveInvoices(list);

		db.logAction(currentUser?.id || '', 'Verify Invoice', `Verified Invoice ${list[idx].invoiceNumber}`);
		globalStore.showToast(`Invoice ${list[idx].invoiceNumber} marked as Verified.`, 'success');
	}

	function payInvoice(invId: string) {
		const list = db.getInvoices();
		const idx = list.findIndex((i) => i.id === invId);
		if (idx === -1) return;

		list[idx].status = 'Paid';
		list[idx].paidAt = new Date().toISOString();
		db.saveInvoices(list);

		db.logAction(currentUser?.id || '', 'Pay Invoice', `Disbursed payment for Invoice ${list[idx].invoiceNumber}`);

		// Notify vendor
		const po = db.getPurchaseOrders().find((p) => p.poNumber === list[idx].poNumber);
		if (po) {
			const vendorUsers = db.getUsers().filter((u) => u.vendorId === po.vendorId);
			vendorUsers.forEach((vu) => {
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
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Invoice Management</h1>
			<p class="text-xs text-slate-500 mt-1">
				Upload vendor billing assets, match against PO totals, and execute verified payouts.
			</p>
		</div>
		<div>
			{#if role === 'Vendor'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-primary btn-sm text-xs font-semibold rounded-lg"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Upload Invoice
				</button>
			{/if}
		</div>
	</div>

	<!-- Toolbar -->
	<div class="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm text-xs">
		<div class="flex items-center gap-2">
			<span class="font-bold text-slate-400 uppercase tracking-wider">Status:</span>
			<select bind:value={filterStatus} class="select select-bordered select-xs text-[11px] rounded-lg">
				<option value="All">All Invoices</option>
				<option value="Unverified">Unverified</option>
				<option value="Verified">Verified</option>
				<option value="Paid">Paid</option>
				<option value="Rejected">Rejected</option>
			</select>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-50 font-bold text-slate-600 border-b border-slate-100">
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
				<tbody class="divide-y divide-slate-100/60">
					{#if invoices.length === 0}
						<tr>
							<td colspan="7" class="text-center py-8 text-slate-400">
								No invoice documents submitted.
							</td>
						</tr>
					{/if}
					{#each invoices as inv}
						{@const po = db.getPurchaseOrders().find((p) => p.poNumber === inv.poNumber)}
						<tr class="hover:bg-slate-50/40">
							<td class="font-bold text-slate-900">{inv.invoiceNumber}</td>
							<td class="font-semibold text-slate-800">{inv.poNumber}</td>
							<td class="font-extrabold text-slate-800">
								<div class="flex items-center gap-1.5">
									<span>₹{inv.amount.toLocaleString()}</span>
									{#if po && Math.abs(po.totalAmount - inv.amount) > 0.01}
										<span class="badge badge-soft badge-error text-[8px] font-bold uppercase leading-none" title="PO Value is ₹{po.totalAmount}">Mismatch</span>
									{/if}
								</div>
							</td>
							<td>
								<span class="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
									<FileText class="w-3.5 h-3.5" />
									invoice_doc.pdf
								</span>
							</td>
							<td>
								<div class="flex items-center gap-1 text-slate-600">
									<Calendar class="w-3.5 h-3.5 text-slate-400" />
									<span>{new Date(inv.submittedAt).toLocaleDateString()}</span>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-bold text-[9px] uppercase px-2 py-0.5"
									class:badge-warning={inv.status === 'Unverified'}
									class:badge-info={inv.status === 'Verified'}
									class:badge-success={inv.status === 'Paid'}
									class:badge-error={inv.status === 'Rejected'}
								>
									{inv.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if inv.status === 'Unverified' && role === 'Manager'}
										<button
											onclick={() => verifyInvoice(inv.id)}
											class="btn btn-primary btn-xs font-bold rounded"
										>
											Verify Amount
										</button>
									{/if}

									{#if inv.status === 'Verified' && role === 'Manager'}
										<button
											onclick={() => payInvoice(inv.id)}
											class="btn btn-success text-white btn-xs font-bold rounded"
										>
											Process Payout
										</button>
									{/if}

									{#if inv.status === 'Paid'}
										<span class="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
											<CheckCircle2 class="w-3.5 h-3.5" />
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
			<div class="modal-box bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-6 text-xs max-w-sm">
				<h3 class="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">
					Upload Vendor Invoice Sheet
				</h3>

				<form onsubmit={submitInvoice} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="inv-po">
							<span class="label-text font-bold text-slate-700">Select Purchase Order</span>
						</label>
						<select id="inv-po" bind:value={invoicePoNumber} class="select select-bordered text-xs w-full">
							<option value="">-- Choose PO --</option>
							{#each issuedPos as po}
								<option value={po.poNumber}>{po.poNumber} (₹{po.totalAmount.toLocaleString()})</option>
							{/each}
						</select>
						{#if errors.poNumber}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.poNumber}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-num">
							<span class="label-text font-bold text-slate-700">Invoice Reference Number</span>
						</label>
						<input
							id="inv-num"
							type="text"
							placeholder="e.g. INV-2026-908"
							bind:value={invoiceNumberInput}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.invoiceNumber}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.invoiceNumber}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-amount">
							<span class="label-text font-bold text-slate-700">Invoice Total (₹)</span>
						</label>
						<input
							id="inv-amount"
							type="number"
							placeholder="Enter invoice total billed"
							bind:value={invoiceAmount}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.amount}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.amount}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="inv-file">
							<span class="label-text font-bold text-slate-700">Upload Billing PDF</span>
						</label>
						<input
							id="inv-file"
							type="file"
							accept=".pdf"
							onchange={handleFileChange}
							class="file-input file-input-bordered file-input-xs w-full"
						/>
						{#if errors.attachment}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.attachment}</span>
						{/if}
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
						<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs rounded-lg">
							Cancel
						</button>
						<button type="submit" class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-6">
							Save Invoice
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { PurchaseOrder, Vendor, PurchaseRequest } from '$lib/db/types';
	import {
		CreditCard,
		FileText,
		Download,
		Mail,
		CheckCircle,
		Send,
		Printer,
		Clock
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Grid states
	let selectedPoId = $state<string | null>(null);
	let activeTab = $state<'po' | 'invoice'>('po');

	$effect(() => {
		selectedPoId; // track dependency
		activeTab = 'po'; // Reset to PO tab whenever selection changes
	});

	// Load PO list
	let purchaseOrders = $derived.by(() => {
		let list = db.getPurchaseOrders();

		// If vendor, show only POs belonging to their vendor account
		if (role === 'Vendor') {
			list = list.filter((po) => po.vendorId === currentUser?.vendorId);
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(po) =>
					po.poNumber.toLowerCase().includes(q) ||
					po.status.toLowerCase().includes(q)
			);
		}

		return list;
	});

	// Active PO details
	let selectedPo = $derived(
		purchaseOrders.find((p) => p.id === selectedPoId) || null
	);

	let poRequest = $derived.by(() => {
		if (!selectedPo) return null;
		return db.getPurchaseRequests().find((r) => r.id === selectedPo.requestId);
	});

	let poVendor = $derived.by(() => {
		if (!selectedPo) return null;
		return db.getVendors().find((v) => v.id === selectedPo.vendorId);
	});

	function handleAction(poId: string, action: 'Approve' | 'Issue') {
		const pos = db.getPurchaseOrders();
		const idx = pos.findIndex((p) => p.id === poId);
		if (idx === -1) return;

		if (action === 'Approve') {
			pos[idx].status = 'Approved';
			db.logAction(currentUser?.id || '', 'Approve PO', `Approved Purchase Order ${pos[idx].poNumber}`);

			// Notify creator
			db.addNotification(
				pos[idx].createdById,
				'Purchase Order Approved',
				`Purchase Order ${pos[idx].poNumber} has been approved. You can now issue it to the vendor.`,
				'Success'
			);
		} else if (action === 'Issue') {
			pos[idx].status = 'Issued';
			db.logAction(currentUser?.id || '', 'Issue PO', `Issued Purchase Order ${pos[idx].poNumber} to vendor.`);

			// Notify Vendor
			const vendorUsers = db.getUsers().filter((u) => u.vendorId === pos[idx].vendorId);
			vendorUsers.forEach((v) => {
				db.addNotification(
					v.id,
					'New Purchase Order Issued',
					`A new Purchase Order ${pos[idx].poNumber} (₹${pos[idx].totalAmount}) was issued to you. Please dispatch products.`,
					'Alert'
				);
			});

			// Create dynamic delivery placeholder for tracking
			const deliveries = db.getDeliveries();
			const newDelivery = {
				id: 'del-' + Math.random().toString(36).substring(2, 6),
				poNumber: pos[idx].poNumber,
				status: 'Pending' as const,
				trackingNumber: 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
				carrier: 'DHL Express',
				estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
				actualDeliveryDate: null,
				notes: 'Awaiting shipping confirmation from vendor.',
				itemsReceived: [],
				createdAt: new Date().toISOString()
			};
			deliveries.push(newDelivery);
			db.saveDeliveries(deliveries);

			// Generate rough invoice automatically
			const invoices = db.getInvoices();
			const newInvoice = {
				id: 'inv-' + Math.random().toString(36).substring(2, 6),
				poNumber: pos[idx].poNumber,
				invoiceNumber: 'INV-ROUGH-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
				amount: pos[idx].totalAmount,
				attachmentUrl: null,
				status: 'Unverified' as const,
				submittedAt: new Date().toISOString(),
				verifiedAt: null,
				verifiedById: null,
				paidAt: null
			};
			invoices.push(newInvoice);
			db.saveInvoices(invoices);
		}

		db.savePurchaseOrders(pos);
		globalStore.showToast(`Purchase Order ${action === 'Approve' ? 'approved' : 'issued'} successfully.`, 'success');
	}

	function simulatePrint() {
		window.print();
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Orders</h1>
		<p class="text-xs text-slate-500 mt-1">
			Generate official procurement contracts, export documents, and track issue status to suppliers.
		</p>
	</div>

	<!-- PO Operations split grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs md:text-sm">
		<!-- Left list -->
		<div class="lg:col-span-5 space-y-3">
			<h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Orders List ({purchaseOrders.length})</h2>
			{#if purchaseOrders.length === 0}
				<div class="card bg-white border border-slate-200/80 p-8 text-center text-slate-400 text-xs shadow-sm rounded-xl">
					No Purchase Orders generated.
				</div>
			{:else}
				<div class="space-y-3">
					{#each purchaseOrders as po}
						{@const v = db.getVendors().find((vend) => vend.id === po.vendorId)}
						<button
							onclick={() => (selectedPoId = po.id)}
							class="w-full text-left card bg-white hover:bg-slate-50/50 border rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col gap-2"
							class:border-primary={selectedPoId === po.id}
							class:border-slate-200={selectedPoId !== po.id}
						>
							<div class="flex justify-between items-start">
								<span class="font-bold text-slate-900">{po.poNumber}</span>
								<span class="badge badge-sm font-bold text-[9px] uppercase px-2"
									class:badge-warning={po.status === 'Draft'}
									class:badge-info={po.status === 'Approved'}
									class:badge-success={po.status === 'Issued' || po.status === 'Completed'}
									class:badge-ghost={po.status === 'Cancelled'}
								>
									{po.status}
								</span>
							</div>
							<div>
								<p class="font-bold text-slate-800 leading-tight">{v?.name}</p>
								<p class="text-[10px] text-slate-400 mt-0.5">Created {new Date(po.createdAt).toLocaleDateString()}</p>
							</div>
							<div class="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-1 font-bold text-slate-800">
								<span>Amount:</span>
								<span>₹{po.totalAmount.toLocaleString()}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right: Simulated Document Viewer -->
		<div class="lg:col-span-7">
			{#if !selectedPo}
				<div class="card bg-white border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-sm rounded-xl h-full flex flex-col items-center justify-center">
					<CreditCard class="w-8 h-8 text-slate-300 mb-2" />
					Select a purchase order to review the contract sheet, trigger approvals or export as printable PDF sheet.
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Action Row -->
					<div class="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
						<div class="flex gap-2">
							{#if selectedPo.status === 'Draft' && role === 'Manager'}
								<button
									onclick={() => handleAction(selectedPo.id, 'Approve')}
									class="btn btn-primary btn-xs font-bold rounded px-3 py-1"
								>
									Approve PO
								</button>
							{/if}
							{#if selectedPo.status === 'Approved' && role === 'Manager'}
								<button
									onclick={() => handleAction(selectedPo.id, 'Issue')}
									class="btn btn-success text-white btn-xs font-bold rounded px-3 py-1"
								>
									Send to Vendor
								</button>
							{/if}
						</div>

						<div class="flex gap-2">
							<button
								onclick={simulatePrint}
								class="btn btn-ghost btn-xs text-slate-600 border border-slate-200 hover:bg-slate-50 font-semibold"
							>
								<Printer class="w-3.5 h-3.5 mr-1" />
								Print / PDF
							</button>
						</div>
					</div>

					<!-- Document Mode Tabs -->
					{#if selectedPo.status === 'Issued' || selectedPo.status === 'Completed'}
						<div class="tabs tabs-boxed bg-slate-100 p-1 flex gap-1 rounded-xl">
							<button 
								class="tab flex-1 font-bold text-xs rounded-lg py-2"
								class:bg-white={activeTab === 'po'}
								class:text-primary={activeTab === 'po'}
								class:text-slate-500={activeTab !== 'po'}
								onclick={() => activeTab = 'po'}
							>
								Purchase Order Sheet
							</button>
							<button 
								class="tab flex-1 font-bold text-xs rounded-lg py-2 flex items-center justify-center gap-1.5"
								class:bg-white={activeTab === 'invoice'}
								class:text-primary={activeTab === 'invoice'}
								class:text-slate-500={activeTab !== 'invoice'}
								onclick={() => activeTab = 'invoice'}
							>
								<span class="badge badge-primary badge-xs scale-90">New</span>
								Rough Invoice / Receipt
							</button>
						</div>
					{/if}

					{#if activeTab === 'po'}
						<!-- PDF Visual Simulator Document Paper -->
						<div class="bg-white border border-slate-300/60 shadow-lg rounded-xl p-8 space-y-6 print:p-0 print:border-none print:shadow-none" id="po-document-paper">
							<!-- Brand header -->
							<div class="flex justify-between items-start border-b border-slate-200 pb-5">
								<div>
									<h2 class="text-base font-black tracking-wide text-slate-900 uppercase">PROCURERSMART ENTERPRISE</h2>
									<p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Corporate Procurement Headquarters</p>
									<p class="text-[10px] text-slate-500 mt-1.5">123 ERP Plaza, Suite 400<br>Metropolis, NY 10001</p>
								</div>
								<div class="text-right">
									<h3 class="text-base font-extrabold text-primary">PURCHASE ORDER</h3>
									<p class="font-bold text-slate-800 text-xs mt-1">{selectedPo.poNumber}</p>
									<p class="text-[10px] text-slate-400 mt-0.5">Date: {new Date(selectedPo.createdAt).toLocaleDateString()}</p>
								</div>
							</div>

							<!-- To / From Addresses -->
							<div class="grid grid-cols-2 gap-6 text-xs text-slate-600">
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Ship To:</span>
									<p class="font-bold text-slate-800 mt-1">Enterprise Facility Operations</p>
									<p class="mt-0.5">Warehouse Division B</p>
									<p class="mt-0.5">500 Industrial Circle, Suite 10</p>
								</div>
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Vendor:</span>
									{#if poVendor}
										<p class="font-bold text-slate-800 mt-1">{poVendor.name}</p>
										<p class="mt-0.5">{poVendor.contactPerson} • {poVendor.phone}</p>
										<p class="mt-0.5">{poVendor.address}</p>
									{/if}
								</div>
							</div>

							<!-- Items Table -->
							<div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
								<table class="table table-xs w-full text-slate-700">
									<thead class="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
										<tr>
											<th>Item Name</th>
											<th class="text-center">Qty</th>
											<th class="text-right">Unit Price</th>
											<th class="text-right">Total Amount</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200">
										{#if poRequest}
											{#each poRequest.items as item}
												<tr>
													<td class="font-medium text-slate-800">{item.itemName}</td>
													<td class="text-center">{item.quantity}</td>
													<td class="text-right">₹{item.unitPrice.toLocaleString()}</td>
													<td class="text-right font-bold text-slate-900">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
												</tr>
											{/each}
										{:else}
											<tr>
												<td colspan="4" class="text-center py-6 text-slate-400">Loading order products...</td>
											</tr>
										{/if}
									</tbody>
								</table>
							</div>

							<!-- Terms Summary -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-xs">
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Notes & Terms</span>
									<p class="text-slate-500 mt-1 leading-snug">{selectedPo.termsAndConditions}</p>
								</div>
								<div class="text-right space-y-1.5 font-bold text-slate-800">
									<div class="flex justify-between">
										<span class="text-slate-400">Subtotal:</span>
										<span>₹{selectedPo.totalAmount.toLocaleString()}</span>
									</div>
									<div class="flex justify-between border-t border-slate-100 pt-1.5 text-base">
										<span class="text-slate-900">Grand Total:</span>
										<span class="text-primary font-black">₹{selectedPo.totalAmount.toLocaleString()}</span>
									</div>
								</div>
							</div>
						</div>
					{:else}
						{@const subTotal = selectedPo.totalAmount}
						{@const gst = Math.round(subTotal * 0.18)}
						{@const grandTotal = subTotal + gst}
						<!-- Rough Invoice / Receipt Sheet -->
						<div class="bg-white border border-slate-300/60 shadow-lg rounded-xl p-8 space-y-6 relative overflow-hidden print:p-0 print:border-none print:shadow-none animate-fade-in" id="rough-invoice-paper">
							<!-- Watermark -->
							<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-12">
								<span class="text-slate-900 font-black text-6xl tracking-widest uppercase">ROUGH INVOICE</span>
							</div>

							<!-- Header -->
							<div class="flex justify-between items-start border-b border-slate-200 pb-5">
								<div>
									<h2 class="text-base font-black tracking-wide text-slate-900 uppercase">PROCURERSMART ENTERPRISE</h2>
									<p class="text-[9px] text-slate-400 font-bold uppercase mt-0.5">ROUGH RECEIPT / PRO-FORMA INVOICE</p>
									<p class="text-[10px] text-slate-500 mt-1.5">Auto-generated upon order checkout/issue.</p>
								</div>
								<div class="text-right">
									<h3 class="text-base font-extrabold text-amber-600">DRAFT RECEIPT</h3>
									<p class="font-bold text-slate-800 text-xs mt-1">INV-ROUGH-{selectedPo.poNumber.substring(3)}</p>
									<p class="text-[10px] text-slate-400 mt-0.5">Date: {new Date().toLocaleDateString()}</p>
								</div>
							</div>

							<!-- Ship to / Vendor details -->
							<div class="grid grid-cols-2 gap-6 text-xs text-slate-600">
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Billed To:</span>
									<p class="font-bold text-slate-800 mt-1">Enterprise Facility Operations</p>
									<p class="mt-0.5">Division: {db.getDepartments().find(d => d.id === poRequest?.departmentId)?.name || 'Store'}</p>
								</div>
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Vendor:</span>
									{#if poVendor}
										<p class="font-bold text-slate-800 mt-1">{poVendor.name}</p>
										<p class="mt-0.5">{poVendor.address}</p>
									{/if}
								</div>
							</div>

							<!-- Items Table -->
							<div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
								<table class="table table-xs w-full text-slate-700">
									<thead class="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
										<tr>
											<th>Item Details</th>
											<th class="text-center">Quantity</th>
											<th class="text-right">Rate</th>
											<th class="text-right">Billed Amount</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200">
										{#if poRequest}
											{#each poRequest.items as item}
												<tr>
													<td class="font-medium text-slate-800">{item.itemName}</td>
													<td class="text-center">{item.quantity}</td>
													<td class="text-right">₹{item.unitPrice.toLocaleString()}</td>
													<td class="text-right font-bold text-slate-900">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>

							<!-- Total calculations (Subtotal + GST 18%) -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-xs">
								<div>
									<span class="text-[10px] font-bold text-slate-400 uppercase block">Pro-Forma Note</span>
									<p class="text-slate-400 mt-1 leading-snug">This is an auto-generated rough receipt. Official invoice is pending vendor verification and final billing confirmation.</p>
								</div>
								<div class="text-right space-y-1.5 font-bold text-slate-800">
									<div class="flex justify-between">
										<span class="text-slate-400 font-normal">Subtotal:</span>
										<span>₹{subTotal.toLocaleString()}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-slate-400 font-normal">GST (18%):</span>
										<span>₹{gst.toLocaleString()}</span>
									</div>
									<div class="flex justify-between border-t border-slate-100 pt-1.5 text-base">
										<span class="text-slate-900">Grand Total:</span>
										<span class="text-amber-600 font-black">₹{grandTotal.toLocaleString()}</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

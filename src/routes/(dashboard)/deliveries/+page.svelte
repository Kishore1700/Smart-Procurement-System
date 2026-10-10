<script>
	// @ts-nocheck
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { supabase, withTimeout } from '$lib/supabase';
	import {
		Truck,
		PackageCheck,
		Search,
		CheckCircle2,
		Calendar,
		ArrowRight,
		FileText,
		Clock,
		ShieldCheck,
		Eye,
		X,
		Building,
		CreditCard,
		Printer,
		Box,
		Send,
		Check,
		AlertCircle,
		MapPin,
		Filter,
		Download
	} from '@lucide/svelte';
	import { downloadDeliveryChallanPdf } from '$lib/pdfService';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);
	let isVendor = $derived(role === 'Vendor');
	let isManagerOrEmployee = $derived(role === 'Manager' || role === 'Employee' || role === 'Admin');

	// Filter states
	let filterStatus = $state('All');
	let filterCarrier = $state('All');

	// Modal states
	let selectedDeliveryForModal = $state(/** @type {any} */ (null));
	let isDispatchModalOpen = $state(false);
	let deliveryToDispatch = $state(/** @type {any} */ (null));
	let dispatchCarrier = $state('BlueDart Express');
	let dispatchTrackingNumber = $state('');
	let dispatchNotes = $state('');

	// Recalculate deliveries with auto-healing and payment synchronization
	let deliveries = $derived.by(() => {
		let list = db.getDeliveries() || [];
		const pos = db.getPurchaseOrders() || [];
		const invoices = db.getInvoices() || [];
		const vendors = db.getVendors() || [];
		const requests = db.getPurchaseRequests() || [];

		// Auto-heal / synchronize each delivery with its PO & payment details
		list = list.map((del) => {
			const matchingPo = pos.find((p) => p.poNumber === del.poNumber || p.po_number === del.poNumber);
			const matchingInv = invoices.find((inv) => (inv.poNumber === del.poNumber || inv.po_number === del.poNumber) && inv.status === 'Paid');
			const vendorId = del.vendorId || del.vendor_id || matchingPo?.vendorId || matchingPo?.vendor_id || 'vendor-apex';
			const vendor = vendors.find((v) => v.id === vendorId || v.vendorId === vendorId);

			// Determine Payment Status: If matching invoice is Paid OR delivery has paymentId OR PO is Issued/Completed
			const isPaid = del.paymentStatus === 'Paid' || Boolean(matchingInv) || matchingPo?.status === 'Issued' || matchingPo?.status === 'Completed';
			const paymentId = del.paymentId || matchingInv?.paymentId || (isPaid ? 'pay_verified_gateway' : null);
			const totalAmount = del.totalAmount || matchingPo?.totalAmount || matchingInv?.amount || 0;

			// Resolve item manifests if missing
			let items = del.items || [];
			if (!items || items.length === 0) {
				const pr = requests.find((r) => r.id === matchingPo?.requestId || r.request_id === matchingPo?.requestId);
				if (pr && pr.items && pr.items.length > 0) {
					items = pr.items.map((it) => ({
						name: it.itemName || it.name || 'Deliverable Item',
						quantity: Number(it.quantity) || 1,
						unitPrice: Number(it.unitPrice) || 0
					}));
				}
			}

			return {
				...del,
				vendorId,
				vendorName: del.vendorName || vendor?.name || 'Authorized Supplier',
				vendorEmail: vendor?.email || 'vendor@procurement.com',
				vendorPhone: vendor?.phone || '+91-9876543210',
				totalAmount,
				paymentStatus: isPaid ? 'Paid' : 'Unpaid',
				paymentId,
				items
			};
		});

		// Auto-create delivery for any Issued/Completed PO that somehow doesn't have a delivery record
		pos.forEach((po) => {
			if ((po.status === 'Issued' || po.status === 'Completed') && po.poNumber) {
				const alreadyExists = list.some((d) => d.poNumber === po.poNumber || d.po_number === po.poNumber);
				if (!alreadyExists) {
					const vendor = vendors.find((v) => v.id === po.vendorId || v.vendorId === po.vendorId);
					const matchingInv = invoices.find((inv) => (inv.poNumber === po.poNumber || inv.po_number === po.poNumber) && inv.status === 'Paid');
					const trackingCode = 'TRK-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

					const autoDel = {
						id: 'del-' + Math.random().toString(36).substring(2, 8),
						poNumber: po.poNumber,
						po_number: po.poNumber,
						requestId: po.requestId,
						vendorId: po.vendorId || 'vendor-apex',
						vendor_id: po.vendorId || 'vendor-apex',
						vendorName: vendor?.name || 'Authorized Supplier',
						vendorEmail: vendor?.email || 'vendor@procurement.com',
						vendorPhone: vendor?.phone || '+91-9876543210',
						totalAmount: po.totalAmount,
						paymentStatus: 'Paid',
						paymentId: matchingInv?.paymentId || 'pay_sim_verified',
						status: po.status === 'Completed' ? 'Delivered' : 'Pending',
						carrier: 'BlueDart Express',
						trackingNumber: trackingCode,
						estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
						actualDeliveryDate: po.status === 'Completed' ? new Date().toISOString() : null,
						notes: `Order payment verified via Razorpay. Order dispatched to logistics tracking.`,
						items: [],
						createdAt: po.createdAt || new Date().toISOString()
					};
					list.unshift(autoDel);
					db.saveDeliveries(list);
				}
			}
		});

		// Role-based filtering
		if (isVendor) {
			const userVendorId = currentUser?.vendorId;
			const myPos = pos.filter((po) => po.vendorId === userVendorId || po.vendor_id === userVendorId);
			const myPoNumbers = new Set(myPos.map((po) => po.poNumber || po.po_number));

			list = list.filter((d) => {
				const vId = d.vendorId || d.vendor_id;
				if (vId && userVendorId && vId === userVendorId) return true;
				if (d.poNumber && myPoNumbers.has(d.poNumber)) return true;
				return false;
			});
		}

		// Status filter
		if (filterStatus !== 'All') {
			list = list.filter((d) => d.status === filterStatus);
		}

		// Carrier filter
		if (filterCarrier !== 'All') {
			list = list.filter((d) => d.carrier === filterCarrier);
		}

		// Search match
		const q = (globalStore.searchQuery || '').toLowerCase().trim();
		if (q) {
			list = list.filter(
				(d) =>
					(d.poNumber || '').toLowerCase().includes(q) ||
					(d.carrier || '').toLowerCase().includes(q) ||
					(d.trackingNumber || '').toLowerCase().includes(q) ||
					(d.vendorName || '').toLowerCase().includes(q)
			);
		}

		return list;
	});

	// Stats Calculation
	let stats = $derived.by(() => {
		const total = deliveries.length;
		const pendingCount = deliveries.filter((d) => d.status === 'Pending').length;
		const shippedCount = deliveries.filter((d) => d.status === 'Shipped').length;
		const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length;
		const totalPaidValue = deliveries
			.filter((d) => d.paymentStatus === 'Paid')
			.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

		return {
			total,
			pendingCount,
			shippedCount,
			deliveredCount,
			totalPaidValue
		};
	});

	// Open dispatch modal for vendor
	function openDispatchModal(del) {
		deliveryToDispatch = del;
		dispatchCarrier = del.carrier || 'BlueDart Express';
		dispatchTrackingNumber = del.trackingNumber || ('TRK-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase());
		dispatchNotes = 'Package dispatched from vendor warehouse. In transit to destination hub.';
		isDispatchModalOpen = true;
	}

	// Confirm dispatch shipment action
	async function handleConfirmDispatch(e) {
		e.preventDefault();
		if (!deliveryToDispatch) return;

		const list = db.getDeliveries() || [];
		const idx = list.findIndex((d) => d.id === deliveryToDispatch.id);
		if (idx === -1) return;

		const timestamp = new Date().toISOString();
		list[idx].status = 'Shipped';
		list[idx].carrier = dispatchCarrier;
		list[idx].trackingNumber = dispatchTrackingNumber || list[idx].trackingNumber;
		list[idx].notes = dispatchNotes || `Dispatched via ${dispatchCarrier}. Handed over to logistics carrier.`;
		list[idx].dispatchedAt = timestamp;
		db.saveDeliveries(list);

		// Non-blocking Supabase sync
		try {
			await withTimeout(
				supabase.from('deliveries').upsert({
					id: list[idx].id,
					po_number: list[idx].poNumber,
					status: 'Shipped',
					carrier: dispatchCarrier,
					tracking_number: list[idx].trackingNumber
				}),
				1200
			);
		} catch (supaErr) {
			console.warn('Supabase delivery update warning:', supaErr);
		}

		// Log audit
		db.logAction(
			currentUser?.id || '',
			'Ship Order Products',
			`Vendor dispatched carrier shipment for PO ${list[idx].poNumber} via ${dispatchCarrier} (Tracking: ${list[idx].trackingNumber})`
		);

		// Notify Managers and Requesters
		const users = db.getUsers() || [];
		const managers = users.filter((u) => u.role === 'Manager' || u.role === 'Admin');
		managers.forEach((mgr) => {
			db.addNotification(
				mgr.id,
				'Order Dispatched by Vendor',
				`Vendor has dispatched shipment for PO ${list[idx].poNumber} via ${dispatchCarrier}. Tracking: ${list[idx].trackingNumber}.`,
				'Info'
			);
		});

		globalStore.showToast(`Shipment for PO ${list[idx].poNumber} marked as In Transit / Shipped!`, 'success');
		if (selectedDeliveryForModal?.id === deliveryToDispatch.id) {
			selectedDeliveryForModal = list[idx];
		}
		isDispatchModalOpen = false;
		deliveryToDispatch = null;
	}

	// Confirm goods received action (for Employee or Manager)
	async function confirmDelivered(delId) {
		const list = db.getDeliveries() || [];
		const idx = list.findIndex((d) => d.id === delId);
		if (idx === -1) return;

		const timestamp = new Date().toISOString();
		list[idx].status = 'Delivered';
		list[idx].actualDeliveryDate = timestamp;
		list[idx].notes = 'All packages received and inspected in satisfactory condition.';
		db.saveDeliveries(list);

		// Update corresponding Purchase Order status to Completed
		const pos = db.getPurchaseOrders() || [];
		const poIdx = pos.findIndex((p) => p.poNumber === list[idx].poNumber || p.po_number === list[idx].poNumber);
		if (poIdx !== -1) {
			pos[poIdx].status = 'Completed';
			db.savePurchaseOrders(pos);

			try {
				await withTimeout(
					supabase.from('purchase_orders').update({ status: 'Completed' }).eq('id', pos[poIdx].id),
					1200
				);
			} catch (poErr) {
				console.warn('Supabase PO completion warning:', poErr);
			}
		}

		// Log audit
		db.logAction(
			currentUser?.id || '',
			'Receive Delivery',
			`Confirmed complete receiving and inspection for delivery PO ${list[idx].poNumber}. PO marked as Completed.`
		);

		// Notify Vendor
		const vendorId = list[idx].vendorId || (poIdx !== -1 ? pos[poIdx].vendorId : '');
		const vendorUsers = (db.getUsers() || []).filter((u) => u.vendorId === vendorId);
		vendorUsers.forEach((vu) => {
			db.addNotification(
				vu.id,
				'Delivery Confirmed by Client',
				`Your shipment for PO ${list[idx].poNumber} was successfully received and confirmed by the client. Purchase Order is marked Completed.`,
				'Success'
			);
		});

		if (selectedDeliveryForModal?.id === delId) {
			selectedDeliveryForModal = list[idx];
		}

		globalStore.showToast(`Shipment for PO ${list[idx].poNumber} successfully marked as Delivered! PO Completed.`, 'success');
	}

	function handleDownloadDeliveryPdf(del) {
		const targetDel = del || selectedDeliveryForModal;
		if (!targetDel) return;
		try {
			const po = (db.getPurchaseOrders() || []).find((p) => p.poNumber === targetDel.poNumber || p.po_number === targetDel.poNumber);
			downloadDeliveryChallanPdf(targetDel, po, currentUser);
			globalStore.showToast(`Delivery Challan ${targetDel.trackingNumber || targetDel.poNumber} PDF downloaded!`, 'success');
		} catch (e) {
			console.error('Delivery Challan PDF error:', e);
			globalStore.showToast('Failed to generate Delivery Challan PDF: ' + (e?.message || 'Error'), 'error');
		}
	}
</script>

<div class="space-y-6">
	<!-- Top Banner Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
					<Truck class="w-5 h-5" />
				</div>
				<div>
					<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
						Order Delivery & Shipment Tracking
					</h1>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
						Track real-time carrier telemetry, verify payment status, and register goods receipt confirmations.
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2.5">
			{#if isVendor}
				<div class="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center gap-1.5">
					<Building class="w-3.5 h-3.5" />
					<span>Vendor Portal (Dispatch Orders)</span>
				</div>
			{:else}
				<div class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
					<ShieldCheck class="w-3.5 h-3.5 text-sky-500" />
					<span>Buyer Receiving & Audit Console</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats Overview Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<!-- Total Shipments -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
				<Box class="w-4 h-4 text-sky-500" />
			</div>
			<p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
				{stats.total}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Tracked in Logistics
			</p>
		</div>

		<!-- Awaiting Dispatch -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Paid & Awaiting Dispatch</span>
				<Clock class="w-4 h-4 text-amber-500" />
			</div>
			<p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
				{stats.pendingCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Ready for vendor shipping
			</p>
		</div>

		<!-- In Transit / Shipped -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">In Transit / Shipped</span>
				<Truck class="w-4 h-4 text-sky-500" />
			</div>
			<p class="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
				{stats.shippedCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Carrier route active
			</p>
		</div>

		<!-- Delivered & Received -->
		<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md">
			<div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
				<span class="text-[11px] font-bold uppercase tracking-wider">Delivered & Closed</span>
				<CheckCircle2 class="w-4 h-4 text-emerald-500" />
			</div>
			<p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
				{stats.deliveredCount}
			</p>
			<p class="text-[10px] text-slate-400 mt-0.5">
				Inspected and closed
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
					<option value="All">All Statuses</option>
					<option value="Pending">Pending Dispatch</option>
					<option value="Shipped">In Transit (Shipped)</option>
					<option value="Delivered">Delivered & Completed</option>
				</select>
			</div>

			<!-- Carrier Filter -->
			<div class="flex items-center gap-1.5">
				<span class="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Carrier:</span>
				<select bind:value={filterCarrier} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
					<option value="All">All Carriers</option>
					<option value="BlueDart Express">BlueDart Express</option>
					<option value="DHL Express">DHL Express</option>
					<option value="FedEx">FedEx</option>
					<option value="Delhivery">Delhivery</option>
				</select>
			</div>
		</div>

		<div class="text-[11px] text-slate-400 font-semibold">
			Showing <span class="text-slate-800 dark:text-slate-200 font-bold">{deliveries.length}</span> tracked shipment{deliveries.length === 1 ? '' : 's'}
		</div>
	</div>

	<!-- Deliveries Data Table -->
	<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-100/80 dark:bg-slate-900/80 font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th>PO Number</th>
						<th>Vendor / Supplier</th>
						<th>Order Amount & Payment</th>
						<th>Logistics Carrier & Tracking</th>
						<th>Est. Delivery</th>
						<th>Progress & Status</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
					{#if deliveries.length === 0}
						<tr>
							<td colspan="7" class="text-center py-14 text-slate-400 font-semibold">
								<Truck class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
								No deliveries or shipments registered.
							</td>
						</tr>
					{/if}
					{#each deliveries as del}
						<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
							<!-- PO Number -->
							<td>
								<button
									onclick={() => (selectedDeliveryForModal = del)}
									class="font-black text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 text-left"
								>
									<FileText class="w-3.5 h-3.5" />
									<span>{del.poNumber}</span>
								</button>
							</td>

							<!-- Vendor -->
							<td>
								<div>
									<p class="font-extrabold text-slate-900 dark:text-slate-100">{del.vendorName}</p>
									<p class="text-[10px] text-slate-400">{del.vendorEmail}</p>
								</div>
							</td>

							<!-- Order Value & Payment Status -->
							<td>
								<div>
									<p class="font-black text-slate-900 dark:text-slate-100">
										₹{Number(del.totalAmount || 0).toLocaleString()}
									</p>
									{#if del.paymentStatus === 'Paid'}
										<span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
											<CheckCircle2 class="w-3 h-3" />
											Paid via Razorpay
										</span>
									{:else}
										<span class="text-[10px] text-slate-400">Awaiting Settlement</span>
									{/if}
								</div>
							</td>

							<!-- Carrier & Tracking -->
							<td>
								<button
									onclick={() => (selectedDeliveryForModal = del)}
									class="text-left group"
								>
									<p class="font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors flex items-center gap-1">
										<span>{del.carrier}</span>
									</p>
									<p class="font-mono text-[10px] text-slate-400 group-hover:underline">
										{del.trackingNumber}
									</p>
								</button>
							</td>

							<!-- Est Delivery Date -->
							<td>
								<div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
									<Calendar class="w-3.5 h-3.5 text-sky-500" />
									<span class="font-medium">
										{new Date(del.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
									</span>
								</div>
							</td>

							<!-- Progress & Status -->
							<td>
								<div class="space-y-1">
									<span
										class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {del.status === 'Pending' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : del.status === 'Shipped' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30' : del.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}"
									>
										{del.status === 'Pending' ? 'Pending Dispatch' : del.status === 'Shipped' ? 'In Transit' : 'Delivered'}
									</span>

									<!-- Visual Mini Progress Bar -->
									<div class="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
										<div
											class="h-full rounded-full transition-all duration-500 {del.status === 'Pending' ? 'w-1/3 bg-amber-500' : del.status === 'Shipped' ? 'w-2/3 bg-sky-500' : 'w-full bg-emerald-500'}"
										></div>
									</div>
								</div>
							</td>

							<!-- Actions -->
							<td class="text-right">
								<div class="flex items-center justify-end gap-1.5">
									<!-- Track Shipment Modal Trigger -->
									<button
										onclick={() => (selectedDeliveryForModal = del)}
										class="btn btn-ghost btn-xs text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-lg px-2 flex items-center gap-1"
										title="View Shipment Details & Timeline"
									>
										<Eye class="w-3.5 h-3.5" />
										<span>Track</span>
									</button>

									<!-- Download Challan PDF Button -->
									<button
										onclick={() => handleDownloadDeliveryPdf(del)}
										class="btn btn-ghost btn-xs text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-2 flex items-center gap-1"
										title="Download Delivery Challan & GRN PDF"
									>
										<Download class="w-3.5 h-3.5" />
										<span>Challan PDF</span>
									</button>

									<!-- Vendor Dispatch Action -->
									{#if del.status === 'Pending' && isVendor}
										<button
											onclick={() => openDispatchModal(del)}
											class="btn btn-gradient-primary btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-sky-600/20 flex items-center gap-1"
										>
											<Send class="w-3 h-3" />
											<span>Dispatch</span>
										</button>
									{/if}

									<!-- Buyer Confirm Receipt Action -->
									{#if del.status === 'Shipped' && isManagerOrEmployee}
										<button
											onclick={() => confirmDelivered(del.id)}
											class="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-emerald-600/20 flex items-center gap-1"
										>
											<Check class="w-3 h-3" />
											<span>Confirm Received</span>
										</button>
									{/if}

									<!-- Completed Badge -->
									{#if del.status === 'Delivered'}
										<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
											<CheckCircle2 class="w-3.5 h-3.5" />
											Closed
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

	<!-- VENDOR DISPATCH SHIPMENT MODAL -->
	{#if isDispatchModalOpen && deliveryToDispatch}
		<div class="modal modal-open z-50">
			<div class="modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs max-w-md">
				<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
							<Send class="w-4 h-4" />
						</div>
						<div>
							<h3 class="font-black text-sm text-slate-900 dark:text-slate-100">
								Dispatch Carrier Shipment
							</h3>
							<p class="text-[10px] text-slate-400">PO Reference: {deliveryToDispatch.poNumber}</p>
						</div>
					</div>
					<button onclick={() => (isDispatchModalOpen = false)} class="btn btn-ghost btn-circle btn-xs">
						<X class="w-4 h-4" />
					</button>
				</div>

				<form onsubmit={handleConfirmDispatch} class="space-y-4 mt-4">
					<!-- Logistics Carrier Selection -->
					<div class="form-control">
						<label class="label pb-1" for="disp-carrier">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Select Logistics Carrier</span>
						</label>
						<select
							id="disp-carrier"
							bind:value={dispatchCarrier}
							class="select text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
						>
							<option value="BlueDart Express">BlueDart Express (Air Priority)</option>
							<option value="DHL Express">DHL Express (Global Priority)</option>
							<option value="FedEx">FedEx Cargo Ground</option>
							<option value="Delhivery">Delhivery B2B Freight</option>
						</select>
					</div>

					<!-- Tracking Number Input -->
					<div class="form-control">
						<label class="label pb-1" for="disp-trk">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Carrier Waybill / Tracking Number</span>
						</label>
						<input
							id="disp-trk"
							type="text"
							bind:value={dispatchTrackingNumber}
							placeholder="e.g. TRK-2026-BLUEDART-8901"
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl font-mono"
							required
						/>
					</div>

					<!-- Dispatch Notes -->
					<div class="form-control">
						<label class="label pb-1" for="disp-notes">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Dispatch Notes / Hub Remarks</span>
						</label>
						<textarea
							id="disp-notes"
							bind:value={dispatchNotes}
							placeholder="e.g. Package inspected, secured with tamper seals, and handed over to carrier."
							class="textarea w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl h-20"
						></textarea>
					</div>

					<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onclick={() => (isDispatchModalOpen = false)}
							class="btn btn-ghost btn-sm text-xs font-bold rounded-xl"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-5 shadow-lg shadow-sky-600/25 flex items-center gap-1.5"
						>
							<Send class="w-3.5 h-3.5" />
							<span>Confirm Dispatch</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- COMPREHENSIVE SHIPMENT TRACKING & TIMELINE MODAL -->
	{#if selectedDeliveryForModal}
		{@const del = selectedDeliveryForModal}
		{@const isDelivered = del.status === 'Delivered'}
		{@const isShipped = del.status === 'Shipped'}
		{@const isPending = del.status === 'Pending'}

		<div class="modal modal-open z-50">
			<div class="modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs max-w-2xl max-h-[90vh] overflow-y-auto">
				<!-- Header Bar -->
				<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
					<div class="flex items-center gap-2.5">
						<div class="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
							<Truck class="w-5 h-5" />
						</div>
						<div>
							<h3 class="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
								Shipment Telemetry & Progress
							</h3>
							<p class="text-[11px] text-slate-400">
								PO: <span class="font-bold text-sky-600 dark:text-sky-400">{del.poNumber}</span> | Carrier: <span class="font-bold text-slate-700 dark:text-slate-300">{del.carrier}</span>
							</p>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button
							onclick={() => handleDownloadDeliveryPdf(selectedDeliveryForModal)}
							class="btn btn-gradient-primary btn-sm text-xs font-black rounded-xl shadow-lg shadow-sky-600/25 px-4 flex items-center gap-1.5"
						>
							<Download class="w-4 h-4" />
							Download Challan PDF
						</button>
						<button
							onclick={() => window.print()}
							class="btn btn-outline btn-sm text-xs font-bold rounded-xl border-slate-700 text-slate-300 hover:text-white px-3 flex items-center gap-1.5"
						>
							<Printer class="w-4 h-4" />
							Print Sheet
						</button>
						<button
							onclick={() => (selectedDeliveryForModal = null)}
							class="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-white"
							aria-label="Close"
						>
							<X class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Key Metrics Bar -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mt-4 text-center">
					<div class="p-1 border-r border-slate-200 dark:border-slate-800 last:border-none">
						<span class="text-[9px] font-black uppercase text-slate-400 block">WAYBILL / TRACKING</span>
						<p class="font-mono font-black text-xs text-slate-900 dark:text-slate-100 mt-0.5">{del.trackingNumber}</p>
					</div>
					<div class="p-1 border-r border-slate-200 dark:border-slate-800 last:border-none">
						<span class="text-[9px] font-black uppercase text-slate-400 block">PAYMENT SETTLEMENT</span>
						<p class="font-black text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
							<CheckCircle2 class="w-3 h-3" />
							<span>{del.paymentStatus || 'Paid'}</span>
						</p>
					</div>
					<div class="p-1 border-r border-slate-200 dark:border-slate-800 last:border-none">
						<span class="text-[9px] font-black uppercase text-slate-400 block">EST. ARRIVAL</span>
						<p class="font-black text-xs text-slate-900 dark:text-slate-100 mt-0.5">
							{new Date(del.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
						</p>
					</div>
					<div class="p-1">
						<span class="text-[9px] font-black uppercase text-slate-400 block">CURRENT STATUS</span>
						<span
							class="badge badge-xs font-black text-[9px] uppercase px-2 py-0.5 mt-0.5 {isDelivered ? 'bg-emerald-500/20 text-emerald-600' : isShipped ? 'bg-sky-500/20 text-sky-600' : 'bg-amber-500/20 text-amber-600'}"
						>
							{del.status === 'Pending' ? 'Pending Dispatch' : del.status === 'Shipped' ? 'In Transit' : 'Delivered'}
						</span>
					</div>
				</div>

				<!-- REAL-TIME VISUAL MILESTONE STEPPER -->
				<div class="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 mt-4 space-y-4">
					<h4 class="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
						<MapPin class="w-3.5 h-3.5 text-sky-500" />
						Delivery Progress Milestones
					</h4>

					<div class="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
						<!-- Milestone 1: Payment & PO Verified -->
						<div class="relative">
							<span class="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-white dark:ring-slate-900">
								<Check class="w-3 h-3 font-black" />
							</span>
							<div>
								<p class="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
									Payment Verified via Razorpay & Order Issued
								</p>
								<p class="text-[10px] text-slate-400 mt-0.5">
									Payment of ₹{Number(del.totalAmount || 0).toLocaleString()} confirmed ({del.paymentId || 'Settled'}). Purchase Order {del.poNumber} transmitted to vendor.
								</p>
							</div>
						</div>

						<!-- Milestone 2: Vendor Packaging & Dispatch -->
						<div class="relative">
							<span class="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full {isShipped || isDelivered ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} ring-4 ring-white dark:ring-slate-900">
								{#if isShipped || isDelivered}
									<Check class="w-3 h-3 font-black" />
								{:else}
									<Clock class="w-3 h-3" />
								{/if}
							</span>
							<div>
								<p class="font-extrabold text-xs {isShipped || isDelivered ? 'text-slate-900 dark:text-slate-100' : 'text-amber-600 dark:text-amber-400'}">
									Vendor Shipment Packaging & Carrier Dispatch
								</p>
								<p class="text-[10px] text-slate-400 mt-0.5">
									{isShipped || isDelivered
										? `Dispatched by ${del.vendorName} via ${del.carrier}. Waybill: ${del.trackingNumber}.`
										: 'Order acknowledged by vendor partner. Preparing item packing & courier pickup.'}
								</p>
							</div>
						</div>

						<!-- Milestone 3: In Transit -->
						<div class="relative">
							<span class="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full {isDelivered ? 'bg-emerald-500 text-white' : isShipped ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'} ring-4 ring-white dark:ring-slate-900">
								{#if isDelivered}
									<Check class="w-3 h-3 font-black" />
								{:else if isShipped}
									<Truck class="w-3 h-3" />
								{:else}
									<span class="w-2 h-2 rounded-full bg-slate-400"></span>
								{/if}
							</span>
							<div>
								<p class="font-extrabold text-xs {isDelivered ? 'text-slate-900 dark:text-slate-100' : isShipped ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}">
									Logistics Carrier Transit
								</p>
								<p class="text-[10px] text-slate-400 mt-0.5">
									{isDelivered
										? `Package arrived safely at destination tech facility.`
										: isShipped
											? `In transit with ${del.carrier}. Target delivery date: ${new Date(del.estimatedDeliveryDate).toLocaleDateString()}.`
											: 'Awaiting courier transit initiation.'}
								</p>
							</div>
						</div>

						<!-- Milestone 4: Goods Receipt & Verification -->
						<div class="relative">
							<span class="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full {isDelivered ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'} ring-4 ring-white dark:ring-slate-900">
								{#if isDelivered}
									<Check class="w-3 h-3 font-black" />
								{:else}
									<PackageCheck class="w-3 h-3" />
								{/if}
							</span>
							<div>
								<p class="font-extrabold text-xs {isDelivered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
									Goods Receiving & Inspection Sign-Off
								</p>
								<p class="text-[10px] text-slate-400 mt-0.5">
									{isDelivered
										? `Delivered & Verified on ${new Date(del.actualDeliveryDate || Date.now()).toLocaleString()}. Purchase order closed.`
										: 'Pending delivery arrival & goods inspection by client.'}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Package Items Manifest -->
				{#if del.items && del.items.length > 0}
					<div class="mt-4 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
						<div class="bg-slate-100 dark:bg-slate-950 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]">
							<span>Package Deliverables Manifest</span>
							<span>{del.items.length} Line Item{del.items.length === 1 ? '' : 's'}</span>
						</div>
						<div class="p-2 space-y-1 bg-white dark:bg-slate-900">
							{#each del.items as item, idx}
								<div class="flex items-center justify-between text-[11px] p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
									<div class="flex items-center gap-2">
										<span class="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
										<span class="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
									</div>
									<span class="font-black text-slate-700 dark:text-slate-300">
										Qty: {item.quantity || 1}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Modal Footer with Actions -->
				<div class="flex items-center justify-between pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
					<p class="text-[10px] text-slate-400">
						{del.notes || 'Carrier telemetry verified by ERP system.'}
					</p>

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => handleDownloadDeliveryPdf(selectedDeliveryForModal)}
							class="btn btn-gradient-primary btn-sm text-xs font-black rounded-xl px-4 flex items-center gap-1.5 shadow-md shadow-sky-600/20"
						>
							<Download class="w-3.5 h-3.5" />
							<span>Download Challan PDF</span>
						</button>

						<!-- Dispatch from inside modal -->
						{#if isPending && isVendor}
							<button
								onclick={() => openDispatchModal(del)}
								class="btn btn-gradient-primary btn-sm text-xs font-black rounded-xl px-4 flex items-center gap-1.5 shadow-md shadow-sky-600/20"
							>
								<Send class="w-3.5 h-3.5" />
								<span>Dispatch Shipment</span>
							</button>
						{/if}

						<!-- Confirm received from inside modal -->
						{#if isShipped && isManagerOrEmployee}
							<button
								onclick={() => confirmDelivered(del.id)}
								class="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white btn-sm text-xs font-black rounded-xl px-4 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
							>
								<Check class="w-3.5 h-3.5" />
								<span>Confirm Received</span>
							</button>
						{/if}

						<button
							type="button"
							onclick={() => (selectedDeliveryForModal = null)}
							class="btn btn-ghost btn-sm text-xs font-bold rounded-xl"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

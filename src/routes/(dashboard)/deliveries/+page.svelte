<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import {
		Truck,
		PackageCheck,
		Search,
		CheckCircle2,
		Calendar,
		ArrowRight,
		FileText
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// States
	let filterCarrier = $state('All');

	// Recalculate deliveries
	let deliveries = $derived.by(() => {
		let list = db.getDeliveries();

		// If vendor, filter by their PO list
		if (role === 'Vendor') {
			const myPos = db.getPurchaseOrders().filter((/** @type {any} */ po) => po.vendorId === currentUser?.vendorId);
			list = list.filter((/** @type {any} */ d) => myPos.some((/** @type {any} */ po) => po.poNumber === d.poNumber));
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(/** @type {any} */ d) =>
					d.poNumber.toLowerCase().includes(q) ||
					d.carrier.toLowerCase().includes(q) ||
					d.trackingNumber.toLowerCase().includes(q)
			);
		}

		return list;
	});

	function confirmDelivered(/** @type {string} */ delId) {
		const list = db.getDeliveries();
		const idx = list.findIndex((/** @type {any} */ d) => d.id === delId);
		if (idx === -1) return;

		list[idx].status = 'Delivered';
		list[idx].actualDeliveryDate = new Date().toISOString();
		db.saveDeliveries(list);

		// Log and notify
		db.logAction(
			currentUser?.id || '',
			'Receive Delivery',
			`Confirmed complete receiving for delivery PO ${list[idx].poNumber}`
		);

		// Update PO status to Completed if all items received
		const pos = db.getPurchaseOrders();
		const poIdx = pos.findIndex((/** @type {any} */ p) => p.poNumber === list[idx].poNumber);
		if (poIdx !== -1) {
			pos[poIdx].status = 'Completed';
			db.savePurchaseOrders(pos);
		}

		// Notify vendor
		const vendorUsers = db.getUsers().filter((/** @type {any} */ u) => u.vendorId === (poIdx !== -1 ? pos[poIdx].vendorId : ''));
		vendorUsers.forEach((/** @type {any} */ vu) => {
			db.addNotification(
				vu.id,
				'Delivery Confirmed by Client',
				`Your shipment for PO ${list[idx].poNumber} was marked as Delivered by the client.`,
				'Success'
			);
		});

		globalStore.showToast('Shipment successfully marked as Delivered!', 'success');
	}

	function dispatchShipment(/** @type {string} */ delId) {
		const list = db.getDeliveries();
		const idx = list.findIndex((/** @type {any} */ d) => d.id === delId);
		if (idx === -1) return;

		list[idx].status = 'Shipped';
		db.saveDeliveries(list);

		db.logAction(
			currentUser?.id || '',
			'Ship Order Products',
			`Vendor dispatched carrier shipment for PO ${list[idx].poNumber}`
		);

		// Notify manager
		const procurementUsers = db.getUsers().filter((/** @type {any} */ u) => u.role === 'Manager');
		procurementUsers.forEach((/** @type {any} */ po) => {
			db.addNotification(
				po.id,
				'Order Dispatched by Vendor',
				`Order ${list[idx].poNumber} has been shipped via ${list[idx].carrier}. Tracking: ${list[idx].trackingNumber}.`,
				'Info'
			);
		});

		globalStore.showToast('Shipment status updated to Shipped!', 'success');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Delivery & Logistics
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Track freight shipments, carrier routes, and register item receiving confirmations.
			</p>
		</div>
	</div>

	<!-- Deliveries list -->
	<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-100/80 dark:bg-slate-900/80 font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th>PO Number</th>
						<th>Tracking Details</th>
						<th>Logistics Carrier</th>
						<th>Est. Delivery Date</th>
						<th>Shipping Status</th>
						<th>Operation Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
					{#if deliveries.length === 0}
						<tr>
							<td colspan="6" class="text-center py-12 text-slate-400 font-semibold">
								No shipments registered for tracking.
							</td>
						</tr>
					{/if}
					{#each deliveries as del}
						<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
							<td class="font-black text-sky-600 dark:text-sky-400">{del.poNumber}</td>
							<td>
								<div>
									<p class="font-bold text-slate-900 dark:text-slate-100">{del.trackingNumber}</p>
									<p class="text-[10px] text-slate-400 mt-0.5 font-medium">{del.notes}</p>
								</div>
							</td>
							<td class="font-semibold text-slate-700 dark:text-slate-300">{del.carrier}</td>
							<td>
								<div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
									<Calendar class="w-3.5 h-3.5 text-sky-500" />
									<span class="font-medium">{new Date(del.estimatedDeliveryDate).toLocaleDateString()}</span>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {del.status === 'Pending' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : del.status === 'Shipped' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30' : del.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}"
								>
									{del.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if del.status === 'Pending' && role === 'Vendor'}
										<button
											onclick={() => dispatchShipment(del.id)}
											class="btn btn-gradient-primary btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-sky-600/20"
										>
											Dispatch Products
										</button>
									{/if}

									{#if del.status === 'Shipped' && (role === 'Employee' || role === 'Manager')}
										<button
											onclick={() => confirmDelivered(del.id)}
											class="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white btn-xs font-extrabold rounded-lg px-3 py-1 shadow-md shadow-emerald-600/20"
										>
											Confirm Received
										</button>
									{/if}

									{#if del.status === 'Delivered'}
										<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
											<CheckCircle2 class="w-4 h-4" />
											Received
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
</div>


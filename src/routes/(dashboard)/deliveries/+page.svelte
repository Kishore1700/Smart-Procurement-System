<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { Delivery, PurchaseOrder } from '$lib/db/types';
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
			const myPos = db.getPurchaseOrders().filter((po) => po.vendorId === currentUser?.vendorId);
			list = list.filter((d) => myPos.some((po) => po.poNumber === d.poNumber));
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(d) =>
					d.poNumber.toLowerCase().includes(q) ||
					d.carrier.toLowerCase().includes(q) ||
					d.trackingNumber.toLowerCase().includes(q)
			);
		}

		return list;
	});

	function confirmDelivered(delId: string) {
		const list = db.getDeliveries();
		const idx = list.findIndex((d) => d.id === delId);
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
		const poIdx = pos.findIndex((p) => p.poNumber === list[idx].poNumber);
		if (poIdx !== -1) {
			pos[poIdx].status = 'Completed';
			db.savePurchaseOrders(pos);
		}

		// Notify vendor
		const vendorUsers = db.getUsers().filter((u) => u.vendorId === (poIdx !== -1 ? pos[poIdx].vendorId : ''));
		vendorUsers.forEach((vu) => {
			db.addNotification(
				vu.id,
				'Delivery Confirmed by Client',
				`Your shipment for PO ${list[idx].poNumber} was marked as Delivered by the client.`,
				'Success'
			);
		});

		globalStore.showToast('Shipment successfully marked as Delivered!', 'success');
	}

	function dispatchShipment(delId: string) {
		const list = db.getDeliveries();
		const idx = list.findIndex((d) => d.id === delId);
		if (idx === -1) return;

		list[idx].status = 'Shipped';
		db.saveDeliveries(list);

		db.logAction(
			currentUser?.id || '',
			'Ship Order Products',
			`Vendor dispatched carrier shipment for PO ${list[idx].poNumber}`
		);

		// Notify manager
		const procurementUsers = db.getUsers().filter((u) => u.role === 'Manager');
		procurementUsers.forEach((po) => {
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
	<div>
		<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Delivery & Logistics</h1>
		<p class="text-xs text-slate-500 mt-1">
			Track active freight shipments, carrier codes, and register receiving approvals.
		</p>
	</div>

	<!-- Deliveries list -->
	<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm text-xs">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-50 font-bold text-slate-600 border-b border-slate-100">
					<tr>
						<th>PO Number</th>
						<th>Tracking Details</th>
						<th>Logistics Carrier</th>
						<th>Est. Delivery Date</th>
						<th>Shipping Status</th>
						<th>Operation Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100/60">
					{#if deliveries.length === 0}
						<tr>
							<td colspan="6" class="text-center py-8 text-slate-400">
								No shipments registered for tracking.
							</td>
						</tr>
					{/if}
					{#each deliveries as del}
						<tr class="hover:bg-slate-50/40">
							<td class="font-bold text-slate-900">{del.poNumber}</td>
							<td>
								<div>
									<p class="font-semibold text-slate-800">{del.trackingNumber}</p>
									<p class="text-[10px] text-slate-400 mt-0.5">{del.notes}</p>
								</div>
							</td>
							<td class="font-medium text-slate-700">{del.carrier}</td>
							<td>
								<div class="flex items-center gap-1.5 text-slate-600">
									<Calendar class="w-3.5 h-3.5 text-slate-400" />
									<span>{new Date(del.estimatedDeliveryDate).toLocaleDateString()}</span>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-bold text-[9px] uppercase px-2 py-0.5"
									class:badge-warning={del.status === 'Pending'}
									class:badge-info={del.status === 'Shipped'}
									class:badge-success={del.status === 'Delivered'}
									class:badge-error={del.status === 'Delayed'}
								>
									{del.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if del.status === 'Pending' && role === 'Vendor'}
										<button
											onclick={() => dispatchShipment(del.id)}
											class="btn btn-primary btn-xs font-bold rounded"
										>
											Dispatch Products
										</button>
									{/if}

									{#if del.status === 'Shipped' && (role === 'Employee' || role === 'Manager')}
										<button
											onclick={() => confirmDelivered(del.id)}
											class="btn btn-success text-white btn-xs font-bold rounded"
										>
											Confirm Received
										</button>
									{/if}

									{#if del.status === 'Delivered'}
										<span class="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
											<CheckCircle2 class="w-3.5 h-3.5" />
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

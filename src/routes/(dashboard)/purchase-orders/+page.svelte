<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { supabase, withTimeout } from '$lib/supabase';
	import { processRazorpayPayment } from '$lib/razorpay';
	import { createAndSendVendorInvoice } from '$lib/invoiceService';
	import { CreditCard, Printer, Download } from '@lucide/svelte';
	import { downloadPurchaseOrderPdf } from '$lib/pdfService';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	let selectedPoId = $state(null);
	let activeTab = $state('po');

	let purchaseOrders = $state([]);
	let vendors = $state([]);
	let purchaseRequests = $state([]);
	let loading = $state(false);
	let loadError = $state('');

	async function loadPurchaseOrders() {
		loadError = '';

		const localPOs = db.getPurchaseOrders().map((po) => ({
			id: po.id,
			requestId: po.requestId || po.request_id || null,
			poNumber: po.poNumber || po.po_number || `PO-${po.id}`,
			vendorId: po.vendorId || po.vendor_id || null,
			totalAmount: Number(po.totalAmount || po.total_amount || 0),
			termsAndConditions: po.termsAndConditions || po.terms_and_conditions || 'Standard terms and conditions apply.',
			status: po.status || 'Draft',
			createdById: po.createdById || po.created_by_id || null,
			createdAt: po.createdAt || po.created_at || new Date().toISOString()
		}));

		vendors = db.getVendors();
		purchaseRequests = db.getPurchaseRequests();

		let filteredList = localPOs;
		if (role === 'Vendor' && currentUser?.vendorId) {
			filteredList = filteredList.filter(
				(po) => String(po.vendorId) === String(currentUser.vendorId)
			);
		}
		purchaseOrders = filteredList;
		if (purchaseOrders.length > 0 && !selectedPoId) {
			selectedPoId = purchaseOrders[0].id;
		}

		// Asynchronously fetch Supabase POs with 800ms timeout
		try {
			const { data: poData } = await withTimeout(
				supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
				800
			);

			if (poData && poData.length > 0) {
				const remotePOs = poData.map((po) => ({
					id: po.id,
					requestId: po.request_id ?? null,
					poNumber: po.po_number || `PO-${po.id}`,
					vendorId: po.vendor_id ?? null,
					totalAmount: Number(po.total_amount || 0),
					termsAndConditions: po.terms_and_conditions || 'Standard terms and conditions apply.',
					status: po.status || 'Draft',
					createdById: po.created_by_id ?? null,
					createdAt: po.created_at || new Date().toISOString()
				}));

				const map = new Map();
				localPOs.forEach(p => map.set(p.id, p));
				remotePOs.forEach(p => map.set(p.id, p));
				let list = Array.from(map.values());
				if (role === 'Vendor' && currentUser?.vendorId) {
					list = list.filter((po) => String(po.vendorId) === String(currentUser.vendorId));
				}
				purchaseOrders = list;
			}
		} catch (e) {
			console.warn('Supabase PO load failed, using mockDb fallback:', e);
		}

		if (role === 'Vendor' && currentUser?.vendorId) {
			filteredList = filteredList.filter(
				(po) => String(po.vendorId) === String(currentUser.vendorId)
			);
		}

		const q = String(globalStore.searchQuery || '').toLowerCase().trim();
		if (q) {
			filteredList = filteredList.filter((po) => {
				const poNumber = String(po.poNumber || '').toLowerCase();
				const status = String(po.status || '').toLowerCase();
				return poNumber.includes(q) || status.includes(q);
			});
		}

		purchaseOrders = filteredList;
		loading = false;

		if (purchaseOrders.length > 0) {
			const selectedExists = purchaseOrders.some(
				(po) => po.id === selectedPoId
			);

			if (!selectedPoId || !selectedExists) {
				selectedPoId = purchaseOrders[0].id;
			}
		} else {
			selectedPoId = null;
		}
	}

	$effect(() => {
		if (purchaseOrders.length > 0) {
			const selectedExists = purchaseOrders.some(
				(po) => po.id === selectedPoId
			);

			if (!selectedPoId || !selectedExists) {
				selectedPoId = purchaseOrders[0].id;
			}
		} else {
			selectedPoId = null;
		}

		activeTab = 'po';
	});

	let selectedPo = $derived(
		purchaseOrders.find((po) => po.id === selectedPoId) || null
	);

	let poRequest = $derived.by(() => {
		if (!selectedPo) return null;

		const request = purchaseRequests.find(
			(item) =>
				String(item.id) === String(selectedPo.requestId)
		);

		if (request) return request;

		try {
			return db
				.getPurchaseRequests()
				.find(
					(item) =>
						String(item.id) === String(selectedPo.requestId)
				);
		} catch (error) {
			console.warn(
				'Could not load fallback purchase request:',
				error
			);
			return null;
		}
	});

	let poVendor = $derived.by(() => {
		if (!selectedPo) return null;

		return (
			vendors.find(
				(vendor) =>
					String(vendor.id) === String(selectedPo.vendorId)
			) || null
		);
	});

	async function handleAction(poId, action) {
		const po = purchaseOrders.find((item) => item.id === poId);

		if (!po) return;

		let newStatus = po.status;

		if (action === 'Approve') {
			newStatus = 'Approved';
		} else if (action === 'Issue') {
			globalStore.showToast(`Opening Razorpay modal for PO ${po.poNumber} payment (₹${po.totalAmount.toLocaleString()})...`, 'info');

			const paymentResult = await processRazorpayPayment({
				amount: po.totalAmount,
				title: 'Issue Purchase Order Payment',
				description: `Payment for PO ${po.poNumber}`,
				receipt: `po_${poId.substring(0, 10)}`,
				notes: {
					po_id: poId,
					po_number: po.poNumber
				},
				prefill: {
					name: currentUser?.fullName || currentUser?.username || 'Procurement Officer',
					email: currentUser?.email || 'officer@procurement.com'
				}
			});

			if (!paymentResult.success) {
				globalStore.showToast(`Payment Cancelled or Failed: ${paymentResult.error || 'PO not issued.'}`, 'error');
				return;
			}

			globalStore.showToast(`Payment Verified! Txn ID: ${paymentResult.paymentId}`, 'success');
			newStatus = 'Issued';
			var issuedPaymentId = paymentResult.paymentId;
		} else {
			return;
		}

		try {
			await supabase
				.from('purchase_orders')
				.update({ status: newStatus })
				.eq('id', poId);
		} catch (e) {
			console.warn('Supabase PO update failed:', e);
		}

		// Local DB update
		const localPOs = db.getPurchaseOrders();
		const poIdx = localPOs.findIndex((p) => p.id === poId || p.poNumber === po.poNumber);
		if (poIdx !== -1) {
			localPOs[poIdx].status = newStatus;
			db.savePurchaseOrders(localPOs);
		}

		purchaseOrders = purchaseOrders.map((item) =>
			item.id === poId
				? { ...item, status: newStatus }
				: item
		);

		if (action === 'Approve') {
			try {
				db.logAction(
					currentUser?.id || '',
					'Approve PO',
					`Approved Purchase Order ${po.poNumber}`
				);

				if (po.createdById) {
					db.addNotification(
						po.createdById,
						'Purchase Order Approved',
						`Purchase Order ${po.poNumber} has been approved. You can now issue it to the vendor.`,
						'Success'
					);
				}
			} catch (error) {
				console.warn('Approval notification failed:', error);
			}
		}

		if (action === 'Issue') {
			try {
				db.logAction(
					currentUser?.id || '',
					'Issue PO',
					`Issued Purchase Order ${po.poNumber} to vendor.`
				);

				const vendorUsers = db
					.getUsers()
					.filter((user) => user.vendorId === po.vendorId);

				vendorUsers.forEach((vendorUser) => {
					db.addNotification(
						vendorUser.id,
						'New Purchase Order Issued',
						`A new Purchase Order ${po.poNumber} (₹${po.totalAmount}) was issued to you. Please dispatch products.`,
						'Alert'
					);
				});

				const deliveries = db.getDeliveries() || [];
				const vendor = (db.getVendors() || []).find((v) => v.id === po.vendorId || v.vendorId === po.vendorId);
				const pr = (db.getPurchaseRequests() || []).find((r) => r.id === po.requestId || r.request_id === po.requestId);

				const newDelivery = {
					id: 'del-' + Math.random().toString(36).substring(2, 8),
					poNumber: po.poNumber,
					po_number: po.poNumber,
					requestId: po.requestId,
					vendorId: po.vendorId,
					vendor_id: po.vendorId,
					vendorName: vendor?.name || 'Authorized Supplier',
					totalAmount: po.totalAmount,
					paymentStatus: 'Paid',
					paymentId: issuedPaymentId || `pay_verified_${Date.now()}`,
					status: 'Pending',
					trackingNumber:
						'TRK-' +
						new Date().getFullYear() +
						'-' +
						Math.random().toString(36).substring(2, 8).toUpperCase(),
					carrier: 'BlueDart Express',
					estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
					actualDeliveryDate: null,
					notes: `Order payment verified via Razorpay (${issuedPaymentId || 'Verified'}). Awaiting vendor shipping dispatch.`,
					items: (pr?.items || []).map((it) => ({
						name: it.itemName || it.name || 'Deliverable Item',
						quantity: Number(it.quantity) || 1,
						unitPrice: Number(it.unitPrice) || 0
					})),
					itemsReceived: [],
					createdAt: new Date().toISOString()
				};

				deliveries.unshift(newDelivery);
				db.saveDeliveries(deliveries);

				// Generate automated vendor tax invoice and dispatch to admin
				await createAndSendVendorInvoice({
					poNumber: po.poNumber,
					vendorId: po.vendorId,
					amount: po.totalAmount,
					paymentId: issuedPaymentId || `pay_${Date.now()}`,
					requestId: po.requestId,
					description: `Purchase order supply for ${po.poNumber}`,
					currentUser: currentUser
				});
			} catch (error) {
				console.warn(
					'Delivery/invoice creation failed:',
					error
				);
			}
		}

		globalStore.showToast(
			`Purchase Order ${
				action === 'Approve' ? 'approved' : 'issued'
			} successfully.`,
			'success'
		);
	}

	function handleDownloadPoPdf(targetPo) {
		const po = targetPo || selectedPo;
		if (!po) {
			globalStore.showToast('Please select a Purchase Order first.', 'info');
			return;
		}
		try {
			const vendor = vendors.find((v) => String(v.id) === String(po.vendorId) || String(v.vendorId) === String(po.vendorId));
			const request = purchaseRequests.find((r) => String(r.id) === String(po.requestId) || String(r.request_number) === String(po.requestId) || String(r.requestNumber) === String(po.requestId));
			downloadPurchaseOrderPdf(po, vendor, request, currentUser);
			globalStore.showToast(`Purchase Order ${po.poNumber} PDF downloaded!`, 'success');
		} catch (e) {
			console.error('PO PDF download error:', e);
			globalStore.showToast('Failed to generate PO PDF: ' + (e?.message || 'Error'), 'error');
		}
	}

	function handlePrintPo() {
		window.print();
	}

	function simulatePrint() {
		handleDownloadPoPdf(selectedPo);
	}

	onMount(() => {
		loadPurchaseOrders();
	});
</script>

{#if loading}
	<div class="flex min-h-[500px] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
			></div>
			<p class="text-sm text-gray-500">Loading Purchase Orders...</p>
		</div>
	</div>
{:else if loadError}
	<div class="m-6 rounded-lg border border-red-200 bg-red-50 p-6">
		<h3 class="text-lg font-semibold text-red-700">
			Unable to Load Purchase Orders
		</h3>

		<p class="mt-2 text-sm text-red-600">{loadError}</p>

		<button
			class="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
			onclick={loadPurchaseOrders}
		>
			Retry
		</button>
	</div>
{:else}
	<div class="p-6">
		<div
			class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					Purchase Orders
				</h1>

				<p class="mt-1 text-sm text-gray-500">
					Manage purchase orders created from approved purchase requests.
				</p>
			</div>

			<div class="flex items-center gap-3">
				<div
					class="rounded-lg border border-gray-200 bg-white px-4 py-2"
				>
					<span class="text-xs text-gray-500">Total POs</span>
					<div class="text-lg font-semibold text-gray-900">
						{purchaseOrders.length}
					</div>
				</div>

				<button
					class="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 shadow-sm transition-colors"
					onclick={() => handleDownloadPoPdf(selectedPo)}
				>
					<Download size={16} />
					Download PO PDF
				</button>
			</div>
		</div>

		{#if purchaseOrders.length === 0}
			<div
				class="rounded-xl border border-gray-200 bg-white p-12 text-center"
			>
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100"
				>
					<CreditCard size={26} class="text-gray-500" />
				</div>

				<h2 class="text-lg font-semibold text-gray-900">
					No Purchase Orders Found
				</h2>

				<p class="mx-auto mt-2 max-w-md text-sm text-gray-500">
					There are currently no Purchase Orders available for this account.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div
					class="overflow-hidden rounded-xl border border-gray-200 bg-white lg:col-span-1"
				>
					<div class="border-b border-gray-200 px-5 py-4">
						<h2 class="font-semibold text-gray-900">
							Purchase Orders
						</h2>

						<p class="mt-1 text-xs text-gray-500">
							Select an order to view details.
						</p>
					</div>

					<div class="divide-y divide-gray-100">
						{#each purchaseOrders as po}
							<button
								class="w-full text-left transition hover:bg-gray-50 {selectedPoId ===
								po.id
									? 'bg-blue-50'
									: 'bg-white'}"
								onclick={() => (selectedPoId = po.id)}
							>
								<div class="px-5 py-4">
									<div
										class="flex items-start justify-between gap-3"
									>
										<div>
											<p class="font-semibold text-gray-900">
												{po.poNumber}
											</p>

											<p class="mt-1 text-xs text-gray-500">
												{po.createdAt
													? new Date(
															po.createdAt
														).toLocaleDateString()
													: 'Date unavailable'}
											</p>
										</div>

										<span
											class="rounded-full px-2.5 py-1 text-xs font-medium {po.status ===
											'Approved'
												? 'bg-green-100 text-green-700'
												: po.status === 'Issued'
													? 'bg-blue-100 text-blue-700'
													: po.status === 'Draft'
														? 'bg-gray-100 text-gray-700'
														: 'bg-yellow-100 text-yellow-700'}"
										>
											{po.status}
										</span>
									</div>

									<div
										class="mt-3 flex items-center justify-between"
									>
										<span class="text-xs text-gray-500">
											Total Amount
										</span>

										<span class="font-semibold text-gray-900">
											₹{po.totalAmount.toLocaleString('en-IN')}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div
					class="rounded-xl border border-gray-200 bg-white lg:col-span-2"
				>
					{#if selectedPo}
						<div class="border-b border-gray-200 px-6 py-5">
							<div
								class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
							>
								<div>
									<p
										class="text-xs font-medium uppercase tracking-wide text-gray-500"
									>
										Purchase Order
									</p>

									<h2 class="mt-1 text-2xl font-bold text-gray-900">
										{selectedPo.poNumber}
									</h2>
								</div>

								<span
									class="w-fit rounded-full px-3 py-1.5 text-sm font-medium {selectedPo.status ===
									'Approved'
										? 'bg-green-100 text-green-700'
										: selectedPo.status === 'Issued'
											? 'bg-blue-100 text-blue-700'
											: selectedPo.status === 'Draft'
												? 'bg-gray-100 text-gray-700'
												: 'bg-yellow-100 text-yellow-700'}"
								>
									{selectedPo.status}
								</span>
							</div>
						</div>

						<div class="space-y-6 p-6">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div class="rounded-lg border border-gray-200 p-4">
									<p class="text-xs text-gray-500">Vendor</p>

									<p class="mt-1 font-semibold text-gray-900">
										{poVendor?.name ||
											poVendor?.vendor_name ||
											poVendor?.company_name ||
											'Vendor information unavailable'}
									</p>
								</div>

								<div class="rounded-lg border border-gray-200 p-4">
									<p class="text-xs text-gray-500">
										Total Amount
									</p>

									<p class="mt-1 text-xl font-bold text-gray-900">
										₹{selectedPo.totalAmount.toLocaleString('en-IN')}
									</p>
								</div>

								<div class="rounded-lg border border-gray-200 p-4">
									<p class="text-xs text-gray-500">
										Purchase Request
									</p>

									<p class="mt-1 font-medium text-gray-900">
										{poRequest?.request_number ||
											poRequest?.requestNumber ||
											poRequest?.title ||
											selectedPo.requestId ||
											'Not linked'}
									</p>
								</div>

								<div class="rounded-lg border border-gray-200 p-4">
									<p class="text-xs text-gray-500">
										Created On
									</p>

									<p class="mt-1 font-medium text-gray-900">
										{selectedPo.createdAt
											? new Date(
													selectedPo.createdAt
												).toLocaleString('en-IN')
											: 'Not available'}
									</p>
								</div>
							</div>

							<div>
								<h3
									class="mb-3 text-base font-semibold text-gray-900"
								>
									Purchase Order Information
								</h3>

								<div
									class="overflow-hidden rounded-lg border border-gray-200"
								>
									<div
										class="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0"
									>
										<div class="p-4">
											<p class="text-xs text-gray-500">
												PO Number
											</p>

											<p class="mt-1 font-medium text-gray-900">
												{selectedPo.poNumber}
											</p>
										</div>

										<div class="p-4">
											<p class="text-xs text-gray-500">
												Status
											</p>

											<p class="mt-1 font-medium text-gray-900">
												{selectedPo.status}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div>
								<h3
									class="mb-3 text-base font-semibold text-gray-900"
								>
									Terms & Conditions
								</h3>

								<div
									class="rounded-lg border border-gray-200 bg-gray-50 p-4"
								>
									<p class="text-sm leading-6 text-gray-600">
										{selectedPo.termsAndConditions}
									</p>
								</div>
							</div>

							<div
								class="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5"
							>
								{#if selectedPo.status !== 'Approved' &&
									selectedPo.status !== 'Issued'}
									<button
										class="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
										onclick={() =>
											handleAction(
												selectedPo.id,
												'Approve'
											)}
									>
										Approve Purchase Order
									</button>
								{/if}

								{#if selectedPo.status === 'Approved'}
									<button
										class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
										onclick={() =>
											handleAction(
												selectedPo.id,
												'Issue'
											)}
									>
										Issue to Vendor
									</button>
								{/if}

								<button
									class="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 shadow-sm transition-colors"
									onclick={() => handleDownloadPoPdf(selectedPo)}
								>
									<Download size={17} />
									Download PO PDF
								</button>

								<button
									class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
									onclick={handlePrintPo}
								>
									<Printer size={17} />
									Print Sheet
								</button>
							</div>
						</div>
					{:else}
						<div class="p-12 text-center">
							<p class="text-sm text-gray-500">
								Select a Purchase Order to view its details.
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

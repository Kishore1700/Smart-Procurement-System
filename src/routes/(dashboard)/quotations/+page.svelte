<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { PurchaseRequest, Quotation, Vendor } from '$lib/db/types';
	import { z } from 'zod';
	import {
		TrendingUp,
		Zap,
		Award,
		DollarSign,
		Clock,
		ShieldAlert,
		ClipboardList,
		Plus,
		CheckCircle2
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Compare states
	let selectedRequestId = $state('pr-001');

	// Create Quote state (for Vendor Role)
	let isNewQuoteModalOpen = $state(false);
	let bidPrice = $state<number>(0);
	let deliveryTime = $state<number>(5);
	let warranty = $state<number>(12);
	let termsInput = $state('');

	// Load active approved requests that need quotes
	let approvedRequests = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		return prs.filter((p) => p.status === 'Approved' || p.status === 'Pending Approval');
	});

	// Currently compared request details
	let comparedPr = $derived.by(() => {
		return db.getPurchaseRequests().find((p) => p.id === selectedRequestId);
	});

	// Load quotes for selected PR
	let quotations = $derived.by(() => {
		let list = db.getQuotations().filter((q) => q.requestId === selectedRequestId);

		// Find the lowest price
		if (list.length > 0) {
			const minPrice = Math.min(...list.map((q) => q.price));
			list = list.map((q) => ({
				...q,
				isLowestPrice: q.price === minPrice
			}));
		}

		// Calculate smart score (price: 50%, delivery: 25%, vendor performance: 25%)
		list = list.map((q) => {
			const vendor = db.getVendors().find((v) => v.id === q.vendorId);
			const performanceFactor = vendor ? vendor.performanceScore : 80;

			// Base formulas
			const priceScore = (comparedPr ? comparedPr.estimatedCost / q.price : 1) * 50;
			const deliveryScore = (10 / q.deliveryTimeDays) * 25;
			const ratingScore = (performanceFactor / 100) * 25;

			const totalScore = Math.min(Math.round(priceScore + deliveryScore + ratingScore), 100);

			return {
				...q,
				recommendationScore: totalScore
			};
		});

		return list.sort((a, b) => b.recommendationScore - a.recommendationScore);
	});

	// Smart recommendation target (top score)
	let recommendedQuote = $derived(
		quotations.length > 0 ? quotations[0] : null
	);

	let lowestQuote = $derived(
		quotations.find((q) => q.isLowestPrice)
	);

	function submitVendorQuote(e: Event) {
		e.preventDefault();

		if (!currentUser?.vendorId) {
			globalStore.showToast('Only vendor profiles can submit bids.', 'error');
			return;
		}

		if (bidPrice <= 0) {
			globalStore.showToast('Please enter a valid price', 'error');
			return;
		}

		const list = db.getQuotations();
		const newQuote: Quotation = {
			id: 'q-' + Math.random().toString(36).substring(2, 6),
			requestId: selectedRequestId,
			vendorId: currentUser.vendorId,
			price: Number(bidPrice),
			deliveryTimeDays: Number(deliveryTime),
			warrantyMonths: Number(warranty),
			attachmentUrl: null,
			terms: termsInput || 'Standard delivery terms apply.',
			status: 'Submitted',
			recommendationScore: 0,
			isLowestPrice: false,
			createdAt: new Date().toISOString()
		};

		list.push(newQuote);
		db.saveQuotations(list);
		db.logAction(
			currentUser.id,
			'Submit Bid Quotation',
			`Submitted quote of ₹${newQuote.price} for request "${comparedPr?.title}".`
		);

		// Notify manager
		const procurementUsers = db.getUsers().filter((u) => u.role === 'Manager');
		procurementUsers.forEach((po) => {
			db.addNotification(
				po.id,
				'New Quotation Received',
				`Vendor submitted bid of ₹${newQuote.price} for PR "${comparedPr?.title}".`,
				'Info'
			);
		});

		globalStore.showToast('Quotation submitted successfully!', 'success');
		isNewQuoteModalOpen = false;
		bidPrice = 0;
		deliveryTime = 5;
		warranty = 12;
		termsInput = '';
	}

	function acceptQuote(quoteId: string) {
		const quotes = db.getQuotations();
		const qIdx = quotes.findIndex((q) => q.id === quoteId);
		if (qIdx === -1) return;

		// Mark selected quote as accepted
		quotes.forEach((q) => {
			if (q.requestId === selectedRequestId) {
				q.status = q.id === quoteId ? 'Accepted' : 'Rejected';
			}
		});
		db.saveQuotations(quotes);

		const targetQuote = quotes[qIdx];
		const vendor = db.getVendors().find((v) => v.id === targetQuote.vendorId);

		db.logAction(
			currentUser?.id || '',
			'Accept Vendor Quotation',
			`Accepted quote from ${vendor?.name} (₹${targetQuote.price}) for request ${selectedRequestId}`
		);

		// Create purchase order dynamically from the accepted quote details
		const pos = db.getPurchaseOrders();
		const nextPoNumber = 'PO-' + new Date().getFullYear() + '-' + String(pos.length + 1).padStart(4, '0');
		const newPo = {
			id: 'po-' + Math.random().toString(36).substring(2, 6),
			requestId: selectedRequestId,
			poNumber: nextPoNumber,
			vendorId: targetQuote.vendorId,
			totalAmount: targetQuote.price,
			termsAndConditions: targetQuote.terms,
			status: 'Draft' as const,
			createdById: currentUser?.id || 'user-pro1',
			createdAt: new Date().toISOString()
		};
		pos.push(newPo);
		db.savePurchaseOrders(pos);

		// Notify vendor user
		const vendorUsers = db.getUsers().filter((u) => u.vendorId === targetQuote.vendorId);
		vendorUsers.forEach((vu) => {
			db.addNotification(
				vu.id,
				'Bid Awarded / Draft PO Created',
				`Your bid of ₹${targetQuote.price} for "${comparedPr?.title}" was accepted! Draft PO generated.`,
				'Success'
			);
		});

		globalStore.showToast(`Bid awarded! Purchase Order ${nextPoNumber} generated as Draft.`, 'success');
	}
</script>

<div class="space-y-6 text-xs md:text-sm">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Quotation Comparison & Bidding</h1>
			<p class="text-xs text-slate-500 mt-1">
				Analyze multiple supplier proposals side-by-side, highlight lowest pricing and smart scoring.
			</p>
		</div>
		<div>
			{#if role === 'Vendor'}
				<button
					onclick={() => (isNewQuoteModalOpen = true)}
					class="btn btn-primary btn-sm text-xs font-semibold rounded-lg"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Submit Quote
				</button>
			{/if}
		</div>
	</div>

	<!-- Selector Toolbar -->
	<div class="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
		<div class="flex items-center gap-3">
			<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Compare Bids for Request:</span>
			<select bind:value={selectedRequestId} class="select select-bordered select-xs text-[11px] rounded-lg w-72">
				{#each approvedRequests as pr}
					<option value={pr.id}>{pr.id} - {pr.title} (₹{pr.estimatedCost.toLocaleString()})</option>
				{/each}
			</select>
		</div>
	</div>

	{#if quotations.length === 0}
		<div class="card bg-white border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-sm rounded-xl">
			No vendor quotations have been submitted for this request yet.
		</div>
	{:else}
		<!-- Smart Cards Highlights -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Best Score Recommendation Card -->
			{#if recommendedQuote}
				{@const recVendor = db.getVendors().find((v) => v.id === recommendedQuote.vendorId)}
				<div class="card bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-row items-start gap-4">
					<div class="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
						<Award class="w-6 h-6" />
					</div>
					<div>
						<span class="text-[9px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full">ProcureSmart Choice</span>
						<h3 class="font-extrabold text-slate-800 text-sm mt-1.5">{recVendor?.name}</h3>
						<p class="text-[11px] text-slate-500 mt-0.5">Scored <b class="text-emerald-700 font-bold">{recommendedQuote.recommendationScore}/100</b> based on delivery velocity, pricing and vendor history.</p>
						<p class="text-xs font-extrabold text-slate-700 mt-2">Bid: ₹{recommendedQuote.price.toLocaleString()} • Delivery: {recommendedQuote.deliveryTimeDays} Days</p>
					</div>
				</div>
			{/if}

			<!-- Lowest Price Highlight Card -->
			{#if lowestQuote}
				{@const lowVendor = db.getVendors().find((v) => v.id === lowestQuote.vendorId)}
				<div class="card bg-blue-50/50 border border-blue-100 p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-row items-start gap-4">
					<div class="p-3 bg-blue-100 text-blue-600 rounded-xl">
						<DollarSign class="w-6 h-6" />
					</div>
					<div>
						<span class="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded-full">Lowest Price Bid</span>
						<h3 class="font-extrabold text-slate-800 text-sm mt-1.5">{lowVendor?.name}</h3>
						<p class="text-[11px] text-slate-500 mt-0.5">Lowest offered cost, saving <b class="text-blue-700 font-bold">₹{((comparedPr?.estimatedCost || 0) - lowestQuote.price).toLocaleString()}</b> against original estimates.</p>
						<p class="text-xs font-extrabold text-slate-700 mt-2">Bid: ₹{lowestQuote.price.toLocaleString()} • Warranty: {lowestQuote.warrantyMonths} Months</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Comparison Table -->
		<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
			<div class="overflow-x-auto">
				<table class="table table-md w-full text-xs">
					<thead class="bg-slate-50 font-bold text-slate-600">
						<tr>
							<th>Vendor</th>
							<th>Offered Bid</th>
							<th>Delivery</th>
							<th>Warranty</th>
							<th>Terms & Conditions</th>
							<th>Score</th>
							<th>Status</th>
							{#if role === 'Manager'}
								<th>Award Action</th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100/60">
						{#each quotations as q}
							{@const vendor = db.getVendors().find((v) => v.id === q.vendorId)}
							<tr class="hover:bg-slate-50/30" class:bg-emerald-50={q.recommendationScore >= 90}>
								<td>
									<div>
										<p class="font-bold text-slate-800 leading-tight">{vendor?.name}</p>
										<p class="text-[10px] text-slate-400 mt-0.5">Rating: {vendor?.rating} ★</p>
									</div>
								</td>
								<td class="font-extrabold text-slate-800">
									<div class="flex items-center gap-1">
										<span>₹{q.price.toLocaleString()}</span>
										{#if q.isLowestPrice}
											<span class="badge badge-success text-[8px] font-bold px-1.5 uppercase leading-none">Lowest</span>
										{/if}
									</div>
								</td>
								<td>{q.deliveryTimeDays} Days</td>
								<td>{q.warrantyMonths} Months</td>
								<td class="max-w-xs truncate text-[11px] text-slate-500">{q.terms}</td>
								<td>
									<div class="flex items-center gap-1.5">
										<div class="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
											<div class="bg-emerald-500 h-full" style="width: {q.recommendationScore}%"></div>
										</div>
										<span class="font-extrabold text-slate-800">{q.recommendationScore}</span>
									</div>
								</td>
								<td>
									<span class="badge badge-sm font-bold text-[9px] uppercase px-2"
										class:badge-success={q.status === 'Accepted'}
										class:badge-error={q.status === 'Rejected'}
										class:badge-ghost={q.status === 'Submitted'}
									>
										{q.status}
									</span>
								</td>
								{#if role === 'Manager'}
									<td>
										{#if q.status === 'Submitted'}
											<button
												onclick={() => acceptQuote(q.id)}
												class="btn btn-primary btn-xs text-[10px] font-bold rounded-md px-2.5 py-1"
											>
												Award Bid
											</button>
										{:else}
											<span class="text-[10px] text-slate-400 font-medium">Bidding Closed</span>
										{/if}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Create Quotation Modal (Vendor view) -->
	{#if isNewQuoteModalOpen}
		<div class="modal modal-open z-50">
			<div class="modal-box bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-6 text-xs max-w-sm">
				<h3 class="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">
					Submit Bid Quotation
				</h3>

				<form onsubmit={submitVendorQuote} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="q-price">
							<span class="label-text font-bold text-slate-700">Bid Price ($)</span>
						</label>
						<input
							id="q-price"
							type="number"
							placeholder="Enter total bid price"
							bind:value={bidPrice}
							class="input w-full border-slate-200 text-xs"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="q-del">
								<span class="label-text font-bold text-slate-700">Delivery Period (Days)</span>
							</label>
							<input
								id="q-del"
								type="number"
								bind:value={deliveryTime}
								class="input w-full border-slate-200 text-xs"
							/>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="q-war">
								<span class="label-text font-bold text-slate-700">Warranty (Months)</span>
							</label>
							<input
								id="q-war"
								type="number"
								bind:value={warranty}
								class="input w-full border-slate-200 text-xs"
							/>
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="q-terms">
							<span class="label-text font-bold text-slate-700">Terms & Conditions</span>
						</label>
						<textarea
							id="q-terms"
							rows="2"
							placeholder="Net payment, shipping logistics details..."
							bind:value={termsInput}
							class="textarea textarea-bordered text-xs w-full"
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
						<button type="button" onclick={() => (isNewQuoteModalOpen = false)} class="btn btn-ghost btn-sm text-xs rounded-lg">
							Cancel
						</button>
						<button type="submit" class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-6">
							Submit Quote
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

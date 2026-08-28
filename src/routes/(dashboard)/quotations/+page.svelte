<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
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
	let bidPrice = $state(0);
	let deliveryTime = $state(5);
	let warranty = $state(12);
	let termsInput = $state('');

	// Load active approved requests that need quotes
	let approvedRequests = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		return prs.filter((/** @type {any} */ p) => p.status === 'Approved' || p.status === 'Pending Approval');
	});

	$effect(() => {
		if (approvedRequests.length > 0 && !approvedRequests.some((/** @type {any} */ p) => p.id === selectedRequestId)) {
			selectedRequestId = approvedRequests[0].id;
		}
	});

	// Currently compared request details
	let comparedPr = $derived.by(() => {
		return db.getPurchaseRequests().find((/** @type {any} */ p) => p.id === selectedRequestId);
	});

	// Load quotes for selected PR
	let quotations = $derived.by(() => {
		let list = db.getQuotations().filter((/** @type {any} */ q) => q.requestId === selectedRequestId);

		// Find the lowest price
		if (list.length > 0) {
			const minPrice = Math.min(...list.map((/** @type {any} */ q) => q.price));
			list = list.map((/** @type {any} */ q) => ({
				...q,
				isLowestPrice: q.price === minPrice
			}));
		}

		// Calculate smart score (price: 50%, delivery: 25%, vendor performance: 25%)
		list = list.map((/** @type {any} */ q) => {
			const vendor = db.getVendors().find((/** @type {any} */ v) => v.id === q.vendorId);
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

		return list.sort((/** @type {any} */ a, /** @type {any} */ b) => b.recommendationScore - a.recommendationScore);
	});

	// Smart recommendation target (top score)
	let recommendedQuote = $derived(
		quotations.length > 0 ? quotations[0] : null
	);

	let lowestQuote = $derived(
		quotations.find((/** @type {any} */ q) => q.isLowestPrice)
	);

	function submitVendorQuote(/** @type {SubmitEvent} */ e) {
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
		const newQuote = {
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
		const procurementUsers = db.getUsers().filter((/** @type {any} */ u) => u.role === 'Manager');
		procurementUsers.forEach((/** @type {any} */ po) => {
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

	function acceptQuote(/** @type {string} */ quoteId) {
		const quotes = db.getQuotations();
		const qIdx = quotes.findIndex((/** @type {any} */ q) => q.id === quoteId);
		if (qIdx === -1) return;

		// Mark selected quote as accepted
		quotes.forEach((/** @type {any} */ q) => {
			if (q.requestId === selectedRequestId) {
				q.status = q.id === quoteId ? 'Accepted' : 'Rejected';
			}
		});
		db.saveQuotations(quotes);

		const targetQuote = quotes[qIdx];
		const vendor = db.getVendors().find((/** @type {any} */ v) => v.id === targetQuote.vendorId);

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
			status: 'Draft',
			createdById: currentUser?.id || 'user-pro1',
			createdAt: new Date().toISOString()
		};
		pos.push(newPo);
		db.savePurchaseOrders(pos);

		// Notify vendor user
		const vendorUsers = db.getUsers().filter((/** @type {any} */ u) => u.vendorId === targetQuote.vendorId);
		vendorUsers.forEach((/** @type {any} */ vu) => {
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
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Quotation Comparison & Bidding
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Analyze supplier proposals side-by-side with smart recommendation scoring and price savings.
			</p>
		</div>
		<div>
			{#if role === 'Vendor'}
				<button
					onclick={() => (isNewQuoteModalOpen = true)}
					class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/25 px-4 py-2 flex items-center"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Submit Quote
				</button>
			{/if}
		</div>
	</div>

	<!-- Selector Toolbar -->
	<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
		<div class="flex items-center gap-3">
			<span class="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Compare Bids for Request:</span>
			<select bind:value={selectedRequestId} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-72">
				{#each approvedRequests as pr}
					<option value={pr.id}>{pr.id} - {pr.title} (₹{pr.estimatedCost.toLocaleString()})</option>
				{/each}
			</select>
		</div>
	</div>

	{#if quotations.length === 0}
		<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 text-xs font-semibold shadow-lg rounded-2xl">
			No vendor quotations have been submitted for this request yet.
		</div>
	{:else}
		<!-- Smart Cards Highlights -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Best Score Recommendation Card -->
			{#if recommendedQuote}
				{@const recVendor = db.getVendors().find((/** @type {any} */ v) => v.id === recommendedQuote.vendorId)}
				<div class="glass-card border border-emerald-500/30 bg-emerald-500/10 p-5 rounded-2xl shadow-xl relative overflow-hidden flex flex-row items-start gap-4">
					<div class="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30">
						<Award class="w-6 h-6" />
					</div>
					<div>
						<span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">ProcureSmart Recommendation</span>
						<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm mt-2">{recVendor?.name}</h3>
						<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scored <b class="text-emerald-600 dark:text-emerald-400 font-extrabold">{recommendedQuote.recommendationScore}/100</b> based on delivery speed, price point, and vendor performance history.</p>
						<p class="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-2">Bid: ₹{recommendedQuote.price.toLocaleString()} • Delivery: {recommendedQuote.deliveryTimeDays} Days</p>
					</div>
				</div>
			{/if}

			<!-- Lowest Price Highlight Card -->
			{#if lowestQuote}
				{@const lowVendor = db.getVendors().find((/** @type {any} */ v) => v.id === lowestQuote.vendorId)}
				<div class="glass-card border border-sky-500/30 bg-sky-500/10 p-5 rounded-2xl shadow-xl relative overflow-hidden flex flex-row items-start gap-4">
					<div class="p-3 bg-sky-500/20 text-sky-500 rounded-xl border border-sky-500/30">
						<DollarSign class="w-6 h-6" />
					</div>
					<div>
						<span class="text-[9px] font-black text-sky-400 uppercase tracking-widest bg-sky-500/20 border border-sky-500/30 px-2.5 py-0.5 rounded-full">Lowest Cost Proposal</span>
						<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm mt-2">{lowVendor?.name}</h3>
						<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Lowest offered cost, saving <b class="text-sky-600 dark:text-sky-400 font-extrabold">₹{((comparedPr?.estimatedCost || 0) - lowestQuote.price).toLocaleString()}</b> against baseline budget.</p>
						<p class="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-2">Bid: ₹{lowestQuote.price.toLocaleString()} • Warranty: {lowestQuote.warrantyMonths} Months</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Comparison Table -->
		<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl">
			<div class="overflow-x-auto">
				<table class="table table-md w-full text-xs">
					<thead class="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-700 dark:text-slate-300">
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
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
						{#each quotations as q}
							{@const vendor = db.getVendors().find((/** @type {any} */ v) => v.id === q.vendorId)}
							<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors {q.recommendationScore >= 90 ? 'bg-emerald-500/5' : ''}">
								<td>
									<div>
										<p class="font-bold text-slate-900 dark:text-slate-100 leading-tight">{vendor?.name}</p>
										<p class="text-[10px] text-slate-400 mt-0.5 font-medium">Rating: {vendor?.rating} ★</p>
									</div>
								</td>
								<td class="font-black text-slate-800 dark:text-slate-200">
									<div class="flex items-center gap-1.5">
										<span>₹{q.price.toLocaleString()}</span>
										{#if q.isLowestPrice}
											<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase">Lowest</span>
										{/if}
									</div>
								</td>
								<td class="font-semibold text-slate-700 dark:text-slate-300">{q.deliveryTimeDays} Days</td>
								<td class="font-semibold text-slate-700 dark:text-slate-300">{q.warrantyMonths} Months</td>
								<td class="max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400">{q.terms}</td>
								<td>
									<div class="flex items-center gap-2">
										<div class="w-14 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
											<div class="bg-gradient-to-r from-sky-500 to-emerald-500 h-full" style="width: {q.recommendationScore}%"></div>
										</div>
										<span class="font-black text-slate-900 dark:text-slate-100">{q.recommendationScore}</span>
									</div>
								</td>
								<td>
									<span class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {q.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : q.status === 'Rejected' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-slate-500/20 text-slate-400'}">
										{q.status}
									</span>
								</td>
								{#if role === 'Manager'}
									<td>
										{#if q.status === 'Submitted'}
											<button
												onclick={() => acceptQuote(q.id)}
												class="btn btn-gradient-primary btn-xs text-[10px] font-extrabold rounded-lg px-3 py-1 shadow-md shadow-sky-600/20"
											>
												Award Bid
											</button>
										{:else}
											<span class="text-[10px] text-slate-400 font-semibold">Bidding Closed</span>
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
			<div class="modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs max-w-sm">
				<h3 class="font-black text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
					Submit Bid Quotation
				</h3>

				<form onsubmit={submitVendorQuote} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="q-price">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Bid Price (₹)</span>
						</label>
						<input
							id="q-price"
							type="number"
							placeholder="Enter total bid price"
							bind:value={bidPrice}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="q-del">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Delivery Period (Days)</span>
							</label>
							<input
								id="q-del"
								type="number"
								bind:value={deliveryTime}
								class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
							/>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="q-war">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Warranty (Months)</span>
							</label>
							<input
								id="q-war"
								type="number"
								bind:value={warranty}
								class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
							/>
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="q-terms">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Terms & Conditions</span>
						</label>
						<textarea
							id="q-terms"
							rows="2"
							placeholder="Net payment, shipping logistics details..."
							bind:value={termsInput}
							class="textarea text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
						<button type="button" onclick={() => (isNewQuoteModalOpen = false)} class="btn btn-ghost btn-sm text-xs font-bold rounded-xl">
							Cancel
						</button>
						<button type="submit" class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-6 shadow-lg shadow-sky-600/25">
							Submit Quote
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>


<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import {
		CheckSquare,
		XCircle,
		Clock,
		User,
		AlertTriangle,
		MessageSquare,
		ArrowRight,
		FileText,
		DollarSign
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Grid states
	let selectedRequestId = $state(/** @type {string | null} */ (null));
	let approvalComments = $state('');

	$effect(() => {
		if (pendingApprovals.length > 0 && (!selectedRequestId || !pendingApprovals.some((/** @type {any} */ p) => p.id === selectedRequestId))) {
			selectedRequestId = pendingApprovals[0].id;
		}
	});

		// Load list of requests that require current user's approval
	let pendingApprovals = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		return prs.filter((/** @type {any} */ p) => {
			// Must be pending approval
			if (p.status !== 'Pending Approval') return false;

			if (role === 'Manager') {
				const dept = db.getDepartments().find((/** @type {any} */ d) => d.id === p.departmentId);
				// If it is their department and assigned to them:
				if (dept?.managerId === currentUser?.id && p.currentApproverId === currentUser?.id) {
					return true;
				}
				// Or if it requires a budget exception approval:
				if (p.budgetStatus === 'Over Budget') {
					return true;
				}
			}

			return false;
		});
	});

	// Currently selected request
	let selectedRequest = $derived.by(() => {
		if (!selectedRequestId) return null;
		return db.getPurchaseRequests().find((/** @type {any} */ p) => p.id === selectedRequestId);
	});

	// Requester object
	let requester = $derived.by(() => {
		if (!selectedRequest) return null;
		return db.getUsers().find((/** @type {any} */ u) => u.id === selectedRequest.requesterId);
	});

	// Requester's Department object
	let department = $derived.by(() => {
		if (!selectedRequest) return null;
		return db.getDepartments().find((/** @type {any} */ d) => d.id === selectedRequest.departmentId);
	});

	// Historical approvals for selected request
	let approvalHistory = $derived.by(() => {
		if (!selectedRequestId) return [];
		return db.getApprovals().filter((/** @type {any} */ a) => a.requestId === selectedRequestId);
	});

	function handleAction(/** @type {string} */ status) {
		if (!selectedRequest || !currentUser) return;

		const prs = db.getPurchaseRequests();
		const idx = prs.findIndex((/** @type {any} */ p) => p.id === selectedRequest.id);
		if (idx === -1) return;

		// Create approval record
		const approvals = db.getApprovals();
		const newApproval = {
			id: 'app-' + Math.random().toString(36).substring(2, 9),
			requestId: selectedRequest.id,
			approverId: currentUser.id,
			approverRole: currentUser.role,
			status,
			comments: approvalComments || `${status} at department level.`,
			actionDate: new Date().toISOString()
		};
		approvals.push(newApproval);
		db.saveApprovals(approvals);

		// Determine next state
		if (status === 'Rejected') {
			prs[idx].status = 'Rejected';
			prs[idx].currentApproverId = null;
			db.addNotification(
				prs[idx].requesterId,
				'Purchase Request Rejected',
				`Your request "${prs[idx].title}" was rejected by ${currentUser.fullName}.`,
				'Alert'
			);
		} else {
			// Approval flow logic
			if (role === 'Manager') {
				// Approved completely
				prs[idx].status = 'Approved';
				prs[idx].currentApproverId = null;
				// Deduct from department budget
				const depts = db.getDepartments();
				const dIdx = depts.findIndex((/** @type {any} */ d) => d.id === prs[idx].departmentId);
				if (dIdx !== -1) {
					depts[dIdx].utilizedBudget += prs[idx].estimatedCost;
					db.saveDepartments(depts);
				}
				db.addNotification(
					prs[idx].requesterId,
					'Purchase Request Approved',
					`Your request "${prs[idx].title}" has been approved!`,
					'Success'
				);
			}
		}

		prs[idx].updatedAt = new Date().toISOString();
		db.savePurchaseRequests(prs);
		db.logAction(
			currentUser.id,
			`${status} Request`,
			`${status} Purchase Request "${selectedRequest.title}" (₹${selectedRequest.estimatedCost.toLocaleString()}).`
		);

		globalStore.showToast(`Request ${status} successfully.`, 'success');
		selectedRequestId = null;
		approvalComments = '';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Workflow Approvals — <span class="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">{currentUser?.fullName || 'Manager'}</span>
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Review pending expenditures, department budgets, and approve purchase requisitions.
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Pending List -->
		<div class="lg:col-span-5 space-y-3">
			<h2 class="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pending Approvals ({pendingApprovals.length})</h2>
			{#if pendingApprovals.length === 0}
				<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-10 text-center text-slate-400 text-xs font-semibold shadow-lg rounded-2xl">
					No pending requests awaiting your approval action.
				</div>
			{:else}
				<div class="space-y-3">
					{#each pendingApprovals as pr}
						<button
							onclick={() => (selectedRequestId = pr.id)}
							class="w-full text-left glass-card border rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group {selectedRequestId === pr.id ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/80 dark:border-slate-800'}"
						>
							<div class="flex justify-between items-start">
								<span class="text-[10px] font-black text-sky-600 dark:text-sky-400">{pr.id}</span>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {pr.priority === 'Urgent' ? 'bg-rose-500 text-white' : pr.priority === 'High' ? 'bg-amber-500 text-white' : pr.priority === 'Medium' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-200'}"
								>
									{pr.priority}
								</span>
							</div>
							<div>
								<h3 class="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight group-hover:text-sky-500 transition-colors">{pr.title}</h3>
								<p class="text-[10px] text-slate-400 mt-0.5 font-medium">{pr.category} • Submitted {new Date(pr.createdAt).toLocaleDateString()}</p>
							</div>
							<div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-1">
								<span class="font-black text-slate-900 dark:text-slate-100 text-xs">₹{pr.estimatedCost.toLocaleString()}</span>
								{#if pr.budgetStatus === 'Over Budget'}
									<span class="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold">Over Budget</span>
								{:else}
									<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold">Within Budget</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right: Details & Decision Pane -->
		<div class="lg:col-span-7">
			{#if !selectedRequest}
				<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 text-xs font-semibold shadow-lg rounded-2xl h-full flex flex-col items-center justify-center">
					<CheckSquare class="w-10 h-10 text-slate-400 mb-3" />
					Select a purchase request from the list to view specifications, timeline, and issue approvals.
				</div>
			{:else}
				<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
					<!-- Request Header -->
					<div class="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-4">
						<div>
							<span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Purchase Request Details</span>
							<h2 class="text-base font-black text-slate-900 dark:text-slate-100 leading-tight mt-0.5">{selectedRequest.title}</h2>
							<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{selectedRequest.category} • Estimated Cost: <b class="text-sky-600 dark:text-sky-400 font-black">₹{selectedRequest.estimatedCost.toLocaleString()}</b></p>
						</div>
						<span class="badge bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold text-[9px] uppercase px-3 py-1.5 rounded-full">Awaiting decision</span>
					</div>

					<!-- Department & Budget Status -->
					{#if department}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 dark:bg-slate-950/60 p-4 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs">
							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Requester</span>
								<p class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{requester?.fullName || 'Alice Johnson'}</p>
								<p class="text-[10px] text-slate-400 font-medium">{department.name}</p>
							</div>
							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Dept Remaining Budget</span>
								<p class="font-black text-sky-600 dark:text-sky-400 mt-0.5">₹{department.remainingBudget.toLocaleString()}</p>
							</div>
							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Budget Status</span>
								{#if selectedRequest.budgetStatus === 'Over Budget'}
									<span class="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold mt-1">Budget Exceeded</span>
								{:else}
									<span class="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold mt-1">Approved Budget</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Description & Items -->
					<div class="space-y-3">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">Request Description</h3>
						<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">{selectedRequest.description}</p>
					</div>

					<!-- Items List -->
					<div class="space-y-2 text-xs">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">Required Items ({selectedRequest.items.length})</h3>
						<div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
							<table class="table table-xs w-full text-slate-700 dark:text-slate-300">
								<thead class="bg-slate-100 dark:bg-slate-900 font-extrabold">
									<tr>
										<th>Item</th>
										<th class="text-center">Qty</th>
										<th class="text-right">Unit Price</th>
										<th class="text-right">Total</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
									{#each selectedRequest.items as item}
										<tr>
											<td class="font-bold text-slate-800 dark:text-slate-200">{item.itemName}</td>
											<td class="text-center">{item.quantity}</td>
											<td class="text-right">₹{item.unitPrice.toLocaleString()}</td>
											<td class="text-right font-black text-slate-900 dark:text-slate-100">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Approval Steps Timeline -->
					<div class="space-y-3">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">Approval Steps & Timeline</h3>
						<div class="space-y-3 text-xs">
							<!-- Start node -->
							<div class="flex gap-3 items-start">
								<div class="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-0.5 border border-emerald-500/20">
									<User class="w-3.5 h-3.5" />
								</div>
								<div>
									<p class="font-extrabold text-slate-800 dark:text-slate-200">Submitted by Requester</p>
									<p class="text-[10px] text-slate-400 font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
								</div>
							</div>

							<!-- Approvals nodes -->
							{#each approvalHistory as app}
								<div class="flex gap-3 items-start">
									<div class="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-0.5 border border-emerald-500/20">
										<CheckSquare class="w-3.5 h-3.5" />
									</div>
									<div>
										<p class="font-extrabold text-slate-800 dark:text-slate-200">{app.approverRole} Approved ({db.getUsers().find((/** @type {any} */ u) => u.id === app.approverId)?.fullName})</p>
										<p class="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">"{app.comments}"</p>
										<p class="text-[9px] text-slate-400 font-semibold">{new Date(app.actionDate).toLocaleString()}</p>
									</div>
								</div>
							{/each}

							<!-- Current state -->
							<div class="flex gap-3 items-start">
								<div class="p-1.5 bg-amber-500/10 text-amber-500 rounded-full mt-0.5 border border-amber-500/20">
									<Clock class="w-3.5 h-3.5 animate-pulse" />
								</div>
								<div>
									<p class="font-extrabold text-slate-800 dark:text-slate-200">Awaiting Decision</p>
									<p class="text-[10px] text-slate-400 font-medium">Current Queue: {role}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Decision Form -->
					<div class="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
						<div class="form-control">
							<label class="label pb-1.5" for="app-comment">
								<span class="label-text font-extrabold text-slate-800 dark:text-slate-200">Decision Comments / Rationale</span>
							</label>
							<textarea
								id="app-comment"
								rows="2"
								placeholder="Provide justification notes for approval or detailed comments for rejection..."
								bind:value={approvalComments}
								class="textarea text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
							></textarea>
						</div>

						<div class="flex justify-end gap-3">
							<button
								onclick={() => handleAction('Rejected')}
								class="btn btn-ghost hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 btn-sm text-xs font-extrabold rounded-xl flex items-center"
							>
								<XCircle class="w-4 h-4 mr-1" />
								Reject Request
							</button>
							<button
								onclick={() => handleAction('Approved')}
								class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-6 flex items-center shadow-lg shadow-sky-600/25"
							>
								<CheckSquare class="w-4 h-4 mr-1" />
								Approve Request
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>


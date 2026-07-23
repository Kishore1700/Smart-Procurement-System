<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { PurchaseRequest, Approval, Department } from '$lib/db/types';
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
	let selectedRequestId = $state<string | null>(null);
	let approvalComments = $state('');

		// Load list of requests that require current user's approval
	let pendingApprovals = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		return prs.filter((p) => {
			// Must be pending approval
			if (p.status !== 'Pending Approval') return false;

			if (role === 'Manager') {
				const dept = db.getDepartments().find((d) => d.id === p.departmentId);
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
		return db.getPurchaseRequests().find((p) => p.id === selectedRequestId);
	});

	// Requester object
	let requester = $derived.by(() => {
		if (!selectedRequest) return null;
		return db.getUsers().find((u) => u.id === selectedRequest.requesterId);
	});

	// Requester's Department object
	let department = $derived.by(() => {
		if (!selectedRequest) return null;
		return db.getDepartments().find((d) => d.id === selectedRequest.departmentId);
	});

	// Historical approvals for selected request
	let approvalHistory = $derived.by(() => {
		if (!selectedRequestId) return [];
		return db.getApprovals().filter((a) => a.requestId === selectedRequestId);
	});

	function handleAction(status: 'Approved' | 'Rejected') {
		if (!selectedRequest || !currentUser) return;

		const prs = db.getPurchaseRequests();
		const idx = prs.findIndex((p) => p.id === selectedRequest.id);
		if (idx === -1) return;

		// Create approval record
		const approvals = db.getApprovals();
		const newApproval: Approval = {
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
				const dIdx = depts.findIndex((d) => d.id === prs[idx].departmentId);
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
			status === 'Approved' ? 'Approve Request' : 'Reject Request',
			`PR "${selectedRequest.title}" marked as ${status}. Comments: "${approvalComments}"`
		);

		globalStore.showToast(`Request ${selectedRequest.id} ${status.toLowerCase()} successfully.`, 'success');
		selectedRequestId = null;
		approvalComments = '';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Workflow Approvals</h1>
		<p class="text-xs text-slate-500 mt-1">
			Review pending expenditures, budget utilization, and make approval actions.
		</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Pending List -->
		<div class="lg:col-span-5 space-y-3">
			<h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Pending Approvals ({pendingApprovals.length})</h2>
			{#if pendingApprovals.length === 0}
				<div class="card bg-white border border-slate-200/80 p-8 text-center text-slate-400 text-xs shadow-sm rounded-xl">
					No pending requests awaiting your approval action.
				</div>
			{:else}
				<div class="space-y-3">
					{#each pendingApprovals as pr}
						<button
							onclick={() => (selectedRequestId = pr.id)}
							class="w-full text-left card bg-white hover:bg-slate-50/50 border rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col gap-2"
							class:border-primary={selectedRequestId === pr.id}
							class:border-slate-200={selectedRequestId !== pr.id}
						>
							<div class="flex justify-between items-start">
								<span class="text-[10px] font-bold text-slate-400">{pr.id}</span>
								<span
									class="badge badge-sm font-bold text-[9px] uppercase px-2 py-0.5"
									class:badge-error={pr.priority === 'Urgent'}
									class:badge-warning={pr.priority === 'High'}
									class:badge-info={pr.priority === 'Medium'}
									class:badge-neutral={pr.priority === 'Low'}
								>
									{pr.priority}
								</span>
							</div>
							<div>
								<h3 class="font-bold text-xs text-slate-800 leading-tight">{pr.title}</h3>
								<p class="text-[10px] text-slate-400 mt-0.5">{pr.category} • Submitted {new Date(pr.createdAt).toLocaleDateString()}</p>
							</div>
							<div class="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1">
								<span class="font-extrabold text-slate-800 text-xs">₹{pr.estimatedCost.toLocaleString()}</span>
								{#if pr.budgetStatus === 'Over Budget'}
									<span class="badge badge-soft badge-error text-[9px] font-bold">Over Budget</span>
								{:else}
									<span class="badge badge-soft badge-success text-[9px] font-bold">Within Budget</span>
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
				<div class="card bg-white border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-sm rounded-xl h-full flex flex-col items-center justify-center">
					<CheckSquare class="w-8 h-8 text-slate-300 mb-2" />
					Select a purchase request from the list to view specifications, timeline, and issue approvals.
				</div>
			{:else}
				<div class="card bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm space-y-6">
					<!-- Request Header -->
					<div class="flex justify-between items-start border-b border-slate-100 pb-4">
						<div>
							<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Purchase Request Details</span>
							<h2 class="text-base font-extrabold text-slate-800 leading-tight mt-0.5">{selectedRequest.title}</h2>
							<p class="text-[11px] text-slate-500 mt-1">{selectedRequest.category} • Estimated Cost: <b class="text-slate-800 font-extrabold">₹{selectedRequest.estimatedCost.toLocaleString()}</b></p>
						</div>
						<span class="badge badge-warning font-bold text-[9px] uppercase px-2">Awaiting decision</span>
					</div>

					<!-- Department & Budget Status -->
					{#if department}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl text-xs">
							<div>
								<span class="text-[10px] text-slate-400 font-bold uppercase block">Requester</span>
								<p class="font-bold text-slate-700 mt-0.5">{requester?.fullName || 'Alice Johnson'}</p>
								<p class="text-[10px] text-slate-400">{department.name}</p>
							</div>
							<div>
								<span class="text-[10px] text-slate-400 font-bold uppercase block">Dept Remaining Budget</span>
								<p class="font-bold text-slate-700 mt-0.5">₹{department.remainingBudget.toLocaleString()}</p>
							</div>
							<div>
								<span class="text-[10px] text-slate-400 font-bold uppercase block">Budget Status</span>
								{#if selectedRequest.budgetStatus === 'Over Budget'}
									<span class="badge badge-soft badge-error text-[10px] font-bold mt-0.5">Budget Exceeded</span>
								{:else}
									<span class="badge badge-soft badge-success text-[10px] font-bold mt-0.5">Approved Budget</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Description & Items -->
					<div class="space-y-3">
						<h3 class="text-xs font-bold text-slate-700">Request Description</h3>
						<p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100/50">{selectedRequest.description}</p>
					</div>

					<!-- Items List -->
					<div class="space-y-2 text-xs">
						<h3 class="text-xs font-bold text-slate-700">Required Items ({selectedRequest.items.length})</h3>
						<div class="border border-slate-100 rounded-lg overflow-hidden">
							<table class="table table-xs w-full text-slate-700">
								<thead class="bg-slate-50 font-bold">
									<tr>
										<th>Item</th>
										<th class="text-center">Qty</th>
										<th class="text-right">Unit Price</th>
										<th class="text-right">Total</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-100/60">
									{#each selectedRequest.items as item}
										<tr>
											<td class="font-medium text-slate-800">{item.itemName}</td>
											<td class="text-center">{item.quantity}</td>
											<td class="text-right">₹{item.unitPrice.toLocaleString()}</td>
											<td class="text-right font-bold text-slate-900">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Approval Steps Timeline -->
					<div class="space-y-3">
						<h3 class="text-xs font-bold text-slate-700">Approval Steps & Timeline</h3>
						<div class="space-y-3 text-xs">
							<!-- Start node -->
							<div class="flex gap-2.5 items-start">
								<div class="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5">
									<User class="w-3.5 h-3.5" />
								</div>
								<div>
									<p class="font-bold text-slate-800">Submitted by Requester</p>
									<p class="text-[10px] text-slate-400">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
								</div>
							</div>

							<!-- Approvals nodes -->
							{#each approvalHistory as app}
								<div class="flex gap-2.5 items-start">
									<div class="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5">
										<CheckSquare class="w-3.5 h-3.5" />
									</div>
									<div>
										<p class="font-bold text-slate-800">{app.approverRole} Approved ({db.getUsers().find(u => u.id === app.approverId)?.fullName})</p>
										<p class="text-[10px] text-slate-500 italic mt-0.5">"{app.comments}"</p>
										<p class="text-[9px] text-slate-400">{new Date(app.actionDate).toLocaleString()}</p>
									</div>
								</div>
							{/each}

							<!-- Current state -->
							<div class="flex gap-2.5 items-start">
								<div class="p-1 bg-amber-50 text-amber-600 rounded-full mt-0.5">
									<Clock class="w-3.5 h-3.5 animate-pulse" />
								</div>
								<div>
									<p class="font-bold text-slate-800">Awaiting Decision</p>
									<p class="text-[10px] text-slate-400">Current Queue: {role}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Decision Form -->
					<div class="border-t border-slate-100 pt-4 space-y-4">
						<div class="form-control">
							<label class="label pb-1.5" for="app-comment">
								<span class="label-text font-bold text-slate-700">Decision Comments / Rationale</span>
							</label>
							<textarea
								id="app-comment"
								rows="2"
								placeholder="Provide justification notes for approval or detailed comments for rejection..."
								bind:value={approvalComments}
								class="textarea textarea-bordered text-xs w-full"
							></textarea>
						</div>

						<div class="flex justify-end gap-3">
							<button
								onclick={() => handleAction('Rejected')}
								class="btn btn-ghost hover:bg-red-50 text-red-600 btn-sm text-xs rounded-lg flex items-center"
							>
								<XCircle class="w-4 h-4 mr-1" />
								Reject Request
							</button>
							<button
								onclick={() => handleAction('Approved')}
								class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-6 flex items-center"
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

```svelte
<script>
	import { onMount } from 'svelte';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { supabase } from '$lib/supabase';
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

	let selectedRequestId = $state(/** @type {string | null} */ (null));
	let approvalComments = $state('');

	let pendingApprovals = $state([]);
	let selectedRequest = $state(null);
	let requester = $state(null);
	let department = $state(null);
	let approvalHistory = $state([]);

	let procurementUser = $state(null);

	async function loadCurrentProcurementUser() {
		if (!globalStore.currentUser?.email) return;

		const { data, error } = await supabase
			.from('users')
			.select('id, username, email, role, department_id, full_name, status')
			.eq('email', globalStore.currentUser.email)
			.single();

		if (error) {
			console.error('Failed to load procurement user:', error);
			return;
		}

		procurementUser = data;
	}

	async function loadPendingApprovals() {
		const { data, error } = await supabase
			.from('purchase_requests')
			.select(`
				*,
				purchase_request_items (*)
			`)
			.eq('status', 'Pending Approval')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Failed to load pending approvals:', error);
			globalStore.showToast('Failed to load pending approvals.', 'error');
			return;
		}

		const mappedRequests = (data || []).map((pr) => ({
			...pr,
			requesterId: pr.requester_id,
			departmentId: pr.department_id,
			estimatedCost: Number(pr.estimated_cost),
			currentApproverId: pr.current_approver_id,
			budgetStatus: pr.budget_status,
			createdAt: pr.created_at,
			updatedAt: pr.updated_at,
			items: (pr.purchase_request_items || []).map((item) => ({
				...item,
				itemName: item.item_name,
				unitPrice: Number(item.unit_price),
				quantity: Number(item.quantity),
				estimatedCost: Number(item.estimated_cost)
			}))
		}));

		if (procurementUser?.department_id) {
			pendingApprovals = mappedRequests.filter(
				(pr) => pr.departmentId === procurementUser.department_id
			);
		} else {
			pendingApprovals = mappedRequests;
		}

		if (
			pendingApprovals.length > 0 &&
			(!selectedRequestId ||
				!pendingApprovals.some((p) => p.id === selectedRequestId))
		) {
			selectedRequestId = pendingApprovals[0].id;
		}

		if (pendingApprovals.length === 0) {
			selectedRequestId = null;
		}
	}

	async function loadSelectedRequestDetails() {
		if (!selectedRequestId) {
			selectedRequest = null;
			requester = null;
			department = null;
			approvalHistory = [];
			return;
		}

		const request = pendingApprovals.find((pr) => pr.id === selectedRequestId);

		if (!request) {
			selectedRequest = null;
			requester = null;
			department = null;
			approvalHistory = [];
			return;
		}

		selectedRequest = request;

		const { data: requesterData, error: requesterError } = await supabase
			.from('users')
			.select('id, full_name, email, role')
			.eq('id', request.requesterId)
			.single();

		if (requesterError) {
			console.error('Failed to load requester:', requesterError);
			requester = null;
		} else {
			requester = requesterData;
		}

		const { data: departmentData, error: departmentError } = await supabase
			.from('departments')
			.select('*')
			.eq('id', request.departmentId)
			.single();

		if (departmentError) {
			console.error('Failed to load department:', departmentError);
			department = null;
		} else {
			department = departmentData;
		}

		const { data: approvalsData, error: approvalsError } = await supabase
			.from('approvals')
			.select('*')
			.eq('request_id', request.id)
			.order('action_date', { ascending: true });

		if (approvalsError) {
			console.error('Failed to load approval history:', approvalsError);
			approvalHistory = [];
		} else {
			approvalHistory = approvalsData || [];
		}
	}

	async function handleAction(status) {
		if (!selectedRequest || !currentUser || !procurementUser) return;

		if (status !== 'Approved' && status !== 'Rejected') return;

		const approvalId =
			'app-' + Math.random().toString(36).substring(2, 9);

		const approvalRecord = {
			id: approvalId,
			request_id: selectedRequest.id,
			approver_id: procurementUser.id,
			approver_role: procurementUser.role,
			status,
			comments:
				approvalComments ||
				`${status} at department level.`,
			action_date: new Date().toISOString()
		};

		const { error: approvalError } = await supabase
			.from('approvals')
			.insert(approvalRecord);

		if (approvalError) {
			console.error('Failed to save approval:', approvalError);
			globalStore.showToast('Failed to save approval decision.', 'error');
			return;
		}

		if (status === 'Rejected') {
			const { error: updateError } = await supabase
				.from('purchase_requests')
				.update({
					status: 'Rejected',
					current_approver_id: null,
					updated_at: new Date().toISOString()
				})
				.eq('id', selectedRequest.id);

			if (updateError) {
				console.error('Failed to reject request:', updateError);
				globalStore.showToast('Approval was saved, but request status could not be updated.', 'error');
				return;
			}

			await supabase.from('notifications').insert({
				id: 'notif-' + Math.random().toString(36).substring(2, 9),
				user_id: selectedRequest.requesterId,
				title: 'Purchase Request Rejected',
				message: `Your request "${selectedRequest.title}" was rejected by ${procurementUser.full_name}.`,
				type: 'Alert'
			});
		} else {
			const { error: updateError } = await supabase
				.from('purchase_requests')
				.update({
					status: 'Approved',
					current_approver_id: null,
					updated_at: new Date().toISOString()
				})
				.eq('id', selectedRequest.id);

			if (updateError) {
				console.error('Failed to approve request:', updateError);
				globalStore.showToast('Approval was saved, but request status could not be updated.', 'error');
				return;
			}

			if (department) {
				const currentUtilizedBudget = Number(department.utilized_budget || 0);
				const newUtilizedBudget =
					currentUtilizedBudget + Number(selectedRequest.estimatedCost);

				const { error: budgetError } = await supabase
					.from('departments')
					.update({
						utilized_budget: newUtilizedBudget
					})
					.eq('id', department.id);

				if (budgetError) {
					console.error('Failed to update department budget:', budgetError);
				}
			}

			await supabase.from('notifications').insert({
				id: 'notif-' + Math.random().toString(36).substring(2, 9),
				user_id: selectedRequest.requesterId,
				title: 'Purchase Request Approved',
				message: `Your request "${selectedRequest.title}" has been approved.`,
				type: 'Success'
			});
		}

		globalStore.showToast(`Request ${status} successfully.`, 'success');

		approvalComments = '';
		selectedRequestId = null;

		await loadPendingApprovals();
		await loadSelectedRequestDetails();
	}

	onMount(async () => {
		await loadCurrentProcurementUser();

		if (role === 'Manager') {
			await loadPendingApprovals();
			await loadSelectedRequestDetails();
		}
	});

	$effect(() => {
		if (selectedRequestId && pendingApprovals.length > 0) {
			loadSelectedRequestDetails();
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Workflow Approvals —
				<span class="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
					{currentUser?.fullName || 'Manager'}
				</span>
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Review pending expenditures, department budgets, and approve purchase requisitions.
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Pending List -->
		<div class="lg:col-span-5 space-y-3">
			<h2 class="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
				Pending Approvals ({pendingApprovals.length})
			</h2>

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
								<h3 class="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-tight group-hover:text-sky-500 transition-colors">
									{pr.title}
								</h3>
								<p class="text-[10px] text-slate-400 mt-0.5 font-medium">
									{pr.category} • Submitted {new Date(pr.createdAt).toLocaleDateString()}
								</p>
							</div>

							<div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-1">
								<span class="font-black text-slate-900 dark:text-slate-100 text-xs">
									₹{Number(pr.estimatedCost).toLocaleString()}
								</span>

								{#if pr.budgetStatus === 'Over Budget'}
									<span class="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold">
										Over Budget
									</span>
								{:else}
									<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold">
										Within Budget
									</span>
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
							<span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
								Purchase Request Details
							</span>
							<h2 class="text-base font-black text-slate-900 dark:text-slate-100 leading-tight mt-0.5">
								{selectedRequest.title}
							</h2>
							<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
								{selectedRequest.category} • Estimated Cost:
								<b class="text-sky-600 dark:text-sky-400 font-black">
									₹{Number(selectedRequest.estimatedCost).toLocaleString()}
								</b>
							</p>
						</div>

						<span class="badge bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold text-[9px] uppercase px-3 py-1.5 rounded-full">
							Awaiting decision
						</span>
					</div>

					<!-- Department & Budget Status -->
					{#if department}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 dark:bg-slate-950/60 p-4 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs">
							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
									Requester
								</span>
								<p class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
									{requester?.full_name || 'Requester'}
								</p>
								<p class="text-[10px] text-slate-400 font-medium">{department.name}</p>
							</div>

							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
									Dept Remaining Budget
								</span>
								<p class="font-black text-sky-600 dark:text-sky-400 mt-0.5">
									₹{Number(
										department.remaining_budget ??
											(Number(department.annual_budget || 0) -
												Number(department.utilized_budget || 0))
									).toLocaleString()}
								</p>
							</div>

							<div>
								<span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
									Budget Status
								</span>

								{#if selectedRequest.budgetStatus === 'Over Budget'}
									<span class="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold mt-1">
										Budget Exceeded
									</span>
								{:else}
									<span class="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold mt-1">
										Approved Budget
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Description & Items -->
					<div class="space-y-3">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">
							Request Description
						</h3>

						<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
							{selectedRequest.description}
						</p>
					</div>

					<!-- Items List -->
					<div class="space-y-2 text-xs">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">
							Required Items ({selectedRequest.items.length})
						</h3>

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
											<td class="font-bold text-slate-800 dark:text-slate-200">
												{item.itemName}
											</td>
											<td class="text-center">{item.quantity}</td>
											<td class="text-right">
												₹{Number(item.unitPrice).toLocaleString()}
											</td>
											<td class="text-right font-black text-slate-900 dark:text-slate-100">
												₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Approval Steps Timeline -->
					<div class="space-y-3">
						<h3 class="text-xs font-extrabold text-slate-800 dark:text-slate-200">
							Approval Steps & Timeline
						</h3>

						<div class="space-y-3 text-xs">
							<div class="flex gap-3 items-start">
								<div class="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-0.5 border border-emerald-500/20">
									<User class="w-3.5 h-3.5" />
								</div>

								<div>
									<p class="font-extrabold text-slate-800 dark:text-slate-200">
										Submitted by Requester
									</p>
									<p class="text-[10px] text-slate-400 font-medium">
										{new Date(selectedRequest.createdAt).toLocaleString()}
									</p>
								</div>
							</div>

							{#each approvalHistory as app}
								<div class="flex gap-3 items-start">
									<div class="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-0.5 border border-emerald-500/20">
										<CheckSquare class="w-3.5 h-3.5" />
									</div>

									<div>
										<p class="font-extrabold text-slate-800 dark:text-slate-200">
											{app.approver_role} {app.status}
										</p>

										<p class="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
											"{app.comments}"
										</p>

										<p class="text-[9px] text-slate-400 font-semibold">
											{new Date(app.action_date).toLocaleString()}
										</p>
									</div>
								</div>
							{/each}

							<div class="flex gap-3 items-start">
								<div class="p-1.5 bg-amber-500/10 text-amber-500 rounded-full mt-0.5 border border-amber-500/20">
									<Clock class="w-3.5 h-3.5 animate-pulse" />
								</div>

								<div>
									<p class="font-extrabold text-slate-800 dark:text-slate-200">
										Awaiting Decision
									</p>
									<p class="text-[10px] text-slate-400 font-medium">
										Current Queue: {role}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Decision Form -->
					<div class="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
						<div class="form-control">
							<label class="label pb-1.5" for="app-comment">
								<span class="label-text font-extrabold text-slate-800 dark:text-slate-200">
									Decision Comments / Rationale
								</span>
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
```

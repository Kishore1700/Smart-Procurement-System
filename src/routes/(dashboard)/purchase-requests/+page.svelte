<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { PurchaseRequest, PurchaseRequestItem } from '$lib/db/types';
	import { z } from 'zod';
	import {
		Plus,
		Trash2,
		AlertTriangle,
		Paperclip,
		ChevronDown,
		Search,
		Filter,
		Info,
		CheckCircle2
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Grid states
	let filterStatus = $state('All');
	let sortPriority = $state('All');

	// Modal states
	let isCreateModalOpen = $state(false);
	let prTitle = $state('');
	let prDescription = $state('');
	let prCategory = $state('Computer Hardware');
	let prPriority = $state<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
	let attachmentFile = $state<File | null>(null);
	let attachmentName = $state<string | null>(null);

	// PR Items list in form
	let formItems = $state<PurchaseRequestItem[]>([
		{ id: 'item-1', itemName: '', quantity: 1, unitPrice: 0, estimatedCost: 0 }
	]);

	// Validation Errors
	let errors = $state<{ [key: string]: string }>({});

	// Safe read department budget
	let departmentBudget = $derived.by(() => {
		if (!currentUser?.departmentId) return null;
		return db.getDepartments().find((d) => d.id === currentUser.departmentId);
	});

	// Dynamic calculation of total cost in form
	let formTotalCost = $derived(
		formItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
	);

	// Budget Check
	let isOverBudget = $derived.by(() => {
		if (!departmentBudget) return false;
		return formTotalCost > departmentBudget.remainingBudget;
	});

	// List purchase requests
	let purchaseRequests = $derived.by(() => {
		let list = db.getPurchaseRequests();
		// If normal employee, show only own requests
		if (role === 'Employee') {
			list = list.filter((pr) => pr.requesterId === currentUser?.id);
		} else if (role === 'Manager') {
			// Managers see department requests
			list = list.filter((pr) => pr.departmentId === currentUser?.departmentId);
		}

		// Filter
		if (filterStatus !== 'All') {
			list = list.filter((pr) => pr.status === filterStatus);
		}
		if (sortPriority !== 'All') {
			list = list.filter((pr) => pr.priority === sortPriority);
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(pr) =>
					pr.title.toLowerCase().includes(q) ||
					pr.category.toLowerCase().includes(q) ||
					pr.status.toLowerCase().includes(q)
			);
		}

		return list;
	});

	// Form item actions
	function addFormItem() {
		formItems.push({
			id: 'item-' + Math.random().toString(36).substring(2, 9),
			itemName: '',
			quantity: 1,
			unitPrice: 0,
			estimatedCost: 0
		});
	}

	function removeFormItem(id: string) {
		if (formItems.length > 1) {
			formItems = formItems.filter((i) => i.id !== id);
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			attachmentFile = target.files[0];
			attachmentName = target.files[0].name;
		}
	}

	function validateAndSubmit(e: Event) {
		e.preventDefault();
		if (role !== 'Employee') {
			globalStore.showToast('Only employees can submit purchase requests.', 'error');
			return;
		}
		errors = {};

		// Zod verification
		const prItemSchema = z.object({
			itemName: z.string().min(2, { message: 'Item name is required' }),
			quantity: z.number().int().positive({ message: 'Quantity must be positive' }),
			unitPrice: z.number().positive({ message: 'Price must be positive' })
		});

		const prSchema = z.object({
			title: z.string().min(5, { message: 'Title must be at least 5 characters' }),
			description: z.string().min(10, { message: 'Provide a thorough description' }),
			category: z.string(),
			priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
			items: z.array(prItemSchema)
		});

		const checkItems = formItems.map((item) => ({
			itemName: item.itemName,
			quantity: Number(item.quantity),
			unitPrice: Number(item.unitPrice)
		}));

		const result = prSchema.safeParse({
			title: prTitle,
			description: prDescription,
			category: prCategory,
			priority: prPriority,
			items: checkItems
		});

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = issue.path.join('.');
				errors[path] = issue.message;
			});
			globalStore.showToast('Please fix validation errors in the form', 'error');
			return;
		}

		// Save request
		const requests = db.getPurchaseRequests();
		const newRequest: PurchaseRequest = {
			id: 'pr-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
			title: prTitle,
			description: prDescription,
			departmentId: currentUser?.departmentId || 'dept-electronics',
			requesterId: currentUser?.id || '',
			category: prCategory,
			priority: prPriority,
			estimatedCost: formTotalCost,
			attachmentUrl: attachmentName ? '/uploads/' + attachmentName : null,
			attachmentName,
			status: 'Pending Approval',
			currentApproverId: db.getDepartments().find((d) => d.id === currentUser?.departmentId)?.managerId || 'user-mgr1',
			items: formItems.map((item, idx) => ({
				...item,
				itemName: checkItems[idx].itemName,
				quantity: checkItems[idx].quantity,
				unitPrice: checkItems[idx].unitPrice,
				estimatedCost: checkItems[idx].quantity * checkItems[idx].unitPrice
			})),
			budgetStatus: isOverBudget ? 'Over Budget' : 'Valid',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		requests.push(newRequest);
		db.savePurchaseRequests(requests);
		db.logAction(
			currentUser?.id || '',
			'Create Purchase Request',
			`Submitted PR "${newRequest.title}" totaling ₹${newRequest.estimatedCost}.`
		);

		// Add notification to department manager
		const managerId = db.getDepartments().find((d) => d.id === currentUser?.departmentId)?.managerId;
		if (managerId) {
			db.addNotification(
				managerId,
				'New Purchase Request Pending',
				`${currentUser?.fullName} submitted a request: "${newRequest.title}" (₹${newRequest.estimatedCost}).`,
				'Alert'
			);
		}

		globalStore.showToast(`Purchase Request ${newRequest.id} submitted successfully!`, 'success');
		resetForm();
	}

	function resetForm() {
		prTitle = '';
		prDescription = '';
		prCategory = 'Computer Hardware';
		prPriority = 'Medium';
		attachmentFile = null;
		attachmentName = null;
		formItems = [{ id: 'item-1', itemName: '', quantity: 1, unitPrice: 0, estimatedCost: 0 }];
		errors = {};
		isCreateModalOpen = false;
	}

	function deletePR(id: string) {
		const prs = db.getPurchaseRequests();
		const filtered = prs.filter((p) => p.id !== id);
		db.savePurchaseRequests(filtered);
		db.logAction(currentUser?.id || '', 'Delete Purchase Request', `Deleted PR request: ${id}`);
		globalStore.showToast(`Request ${id} deleted successfully.`, 'info');
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Requests</h1>
			<p class="text-xs text-slate-500 mt-1">
				Submit, edit, and track capital purchase requests for your business division.
			</p>
		</div>
		<div>
			{#if role === 'Employee'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-primary btn-sm text-xs font-semibold rounded-lg"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					New Request
				</button>
			{/if}
		</div>
	</div>

	<!-- Filter & Operations Toolbar -->
	<div class="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
		<div class="flex flex-wrap gap-2.5 items-center">
			<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filters:</span>

			<select bind:value={filterStatus} class="select select-bordered select-xs text-[11px] rounded-lg">
				<option value="All">All Statuses</option>
				<option value="Draft">Draft</option>
				<option value="Pending Approval">Pending Approval</option>
				<option value="Approved">Approved</option>
				<option value="Rejected">Rejected</option>
				<option value="Cancelled">Cancelled</option>
			</select>

			<select bind:value={sortPriority} class="select select-bordered select-xs text-[11px] rounded-lg">
				<option value="All">All Priorities</option>
				<option value="Low">Low</option>
				<option value="Medium">Medium</option>
				<option value="High">High</option>
				<option value="Urgent">Urgent</option>
			</select>
		</div>

		{#if departmentBudget}
			<div class="flex items-center gap-2 text-xs">
				<div class="text-left">
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Budget</span>
					<p class="font-extrabold text-slate-800">₹{departmentBudget.remainingBudget.toLocaleString()}</p>
				</div>
				<div class="radial-progress text-primary" style="--value:{(departmentBudget.utilizedBudget / departmentBudget.allocatedBudget) * 100}; --size: 2.2rem; --thickness: 4px;" role="progressbar"></div>
			</div>
		{/if}
	</div>

	<!-- Data Table -->
	<div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-xs">
					<tr>
						<th>Request ID</th>
						<th>PR Details</th>
						<th>Priority</th>
						<th>Cost</th>
						<th>Budget Status</th>
						<th>Approval Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100/60 text-xs">
					{#if purchaseRequests.length === 0}
						<tr>
							<td colspan="7" class="text-center py-12 text-slate-400">
								No purchase requests found matching filters.
							</td>
						</tr>
					{/if}
					{#each purchaseRequests as pr}
						<tr class="hover:bg-slate-50/40">
							<td class="font-bold text-slate-900">{pr.id}</td>
							<td>
								<div>
									<p class="font-bold text-slate-800 leading-tight">{pr.title}</p>
									<p class="text-[10px] text-slate-400 mt-0.5">{pr.category} • Submitted {new Date(pr.createdAt).toLocaleDateString()}</p>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-bold text-[9px] uppercase px-2 py-0.5"
									class:badge-error={pr.priority === 'Urgent'}
									class:badge-warning={pr.priority === 'High'}
									class:badge-info={pr.priority === 'Medium'}
									class:badge-neutral={pr.priority === 'Low'}
								>
									{pr.priority}
								</span>
							</td>
							<td class="font-bold text-slate-800">₹{pr.estimatedCost.toLocaleString()}</td>
							<td>
								{#if pr.budgetStatus === 'Over Budget'}
									<span class="badge badge-soft badge-error text-[10px] font-bold">Over Limit</span>
								{:else}
									<span class="badge badge-soft badge-success text-[10px] font-bold">Within Budget</span>
								{/if}
							</td>
							<td>
								<span
									class="badge badge-sm font-bold text-[9px] uppercase px-2"
									class:badge-warning={pr.status === 'Pending Approval'}
									class:badge-success={pr.status === 'Approved'}
									class:badge-error={pr.status === 'Rejected'}
									class:badge-neutral={pr.status === 'Draft' || pr.status === 'Cancelled'}
								>
									{pr.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if pr.attachmentName}
										<span class="btn btn-ghost btn-xs text-slate-500" title={pr.attachmentName}>
											<Paperclip class="w-3.5 h-3.5" />
										</span>
									{/if}
									{#if pr.status === 'Pending Approval' && (role === 'Employee' || role === 'Manager')}
										<button
											onclick={() => deletePR(pr.id)}
											class="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
										>
											<Trash2 class="w-3.5 h-3.5" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Create PR Modal -->
	{#if isCreateModalOpen}
		<div class="modal modal-open z-50">
			<div class="modal-box max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-6">
				<h3 class="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
					Create New Purchase Request
				</h3>

				<form onsubmit={validateAndSubmit} class="space-y-4 mt-4 text-xs">
					<div class="form-control">
						<label class="label pb-1.5" for="pr-title">
							<span class="label-text font-bold text-slate-700">Request Title</span>
						</label>
						<input
							id="pr-title"
							type="text"
							placeholder="e.g. Developer Laptops Upgrade"
							bind:value={prTitle}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.title}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.title}</span>
						{/if}
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div class="form-control">
							<label class="label pb-1.5" for="pr-cat">
								<span class="label-text font-bold text-slate-700">Category</span>
							</label>
							<select id="pr-cat" bind:value={prCategory} class="select select-bordered text-xs w-full">
								<option value="Computer Hardware">Computer Hardware</option>
								<option value="Software Licenses">Software Licenses</option>
								<option value="Office Furniture">Office Furniture</option>
								<option value="Stationery">Stationery</option>
								<option value="Facility Maintenance">Facility Maintenance</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-1.5" for="pr-pri">
								<span class="label-text font-bold text-slate-700">Priority Level</span>
							</label>
							<select id="pr-pri" bind:value={prPriority} class="select select-bordered text-xs w-full">
								<option value="Low">Low</option>
								<option value="Medium">Medium</option>
								<option value="High">High</option>
								<option value="Urgent">Urgent</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-1.5" for="pr-file">
								<span class="label-text font-bold text-slate-700">Upload Specs (PDF)</span>
							</label>
							<div class="relative">
								<input
									id="pr-file"
									type="file"
									accept=".pdf,.doc,.docx,.xls,.xlsx"
									onchange={handleFileChange}
									class="file-input file-input-bordered file-input-xs text-xs w-full"
								/>
							</div>
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1.5" for="pr-desc">
							<span class="label-text font-bold text-slate-700">Detailed Description</span>
						</label>
						<textarea
							id="pr-desc"
							rows="2"
							placeholder="Provide detailed information regarding specifications, requirements and context."
							bind:value={prDescription}
							class="textarea textarea-bordered text-xs w-full"
						></textarea>
						{#if errors.description}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.description}</span>
						{/if}
					</div>

					<!-- Dynamic Items Sub-Form -->
					<div class="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
						<div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
							<h4 class="font-bold text-slate-700">Items List</h4>
							<button
								type="button"
								onclick={addFormItem}
								class="btn btn-ghost btn-xs text-primary font-bold flex items-center"
							>
								<Plus class="w-3.5 h-3.5 mr-0.5" /> Add Row
							</button>
						</div>

						<div class="space-y-2">
							{#each formItems as item, index}
								<div class="flex gap-2.5 items-center">
									<input
										type="text"
										placeholder="Item Name / Specs"
										bind:value={item.itemName}
										class="input input-xs border-slate-200 flex-1 text-xs"
									/>
									<input
										type="number"
										placeholder="Qty"
										bind:value={item.quantity}
										class="input input-xs border-slate-200 w-16 text-xs"
									/>
									<input
										type="number"
										placeholder="Price (₹)"
										bind:value={item.unitPrice}
										class="input input-xs border-slate-200 w-24 text-xs"
									/>
									<div class="w-24 font-bold text-right text-slate-700 pr-1">
										₹{(item.quantity * item.unitPrice).toLocaleString()}
									</div>
									<button
										type="button"
										onclick={() => removeFormItem(item.id)}
										disabled={formItems.length === 1}
										class="btn btn-ghost btn-xs text-red-500"
									>
										<Trash2 class="w-3.5 h-3.5" />
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Bottom Cost & Budget Warning -->
					<div class="flex items-center justify-between pt-3 border-t border-slate-100">
						<div>
							<p class="text-[10px] text-slate-400 font-bold uppercase">Estimated Request Total</p>
							<p class="text-lg font-black text-slate-900">₹{formTotalCost.toLocaleString()}</p>
						</div>

						<div class="flex items-center gap-3">
							{#if isOverBudget}
								<div class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[10px] font-bold">
									<AlertTriangle class="w-3.5 h-3.5 shrink-0" />
									Warning: Budget limit exceeded! Requires Finance exceptions.
								</div>
							{/if}

							<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs rounded-lg">
								Cancel
							</button>
							<button type="submit" class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-4">
								Submit Request
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

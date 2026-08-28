<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
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
	let prPriority = $state('Medium');
	let attachmentFile = $state(/** @type {File | null} */ (null));
	let attachmentName = $state(/** @type {string | null} */ (null));

	// PR Items list in form
	let formItems = $state([
		{ id: 'item-1', itemName: '', quantity: 1, unitPrice: 0, estimatedCost: 0 }
	]);

	// Validation Errors
	let errors = $state(/** @type {Record<string, string>} */ ({}));

	// Safe read department budget
	let departmentBudget = $derived.by(() => {
		if (!currentUser?.departmentId) return null;
		return db.getDepartments().find((/** @type {any} */ d) => d.id === currentUser.departmentId);
	});

	// Dynamic calculation of total cost in form
	let formTotalCost = $derived(
		formItems.reduce((/** @type {number} */ sum, /** @type {any} */ item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
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
			list = list.filter((/** @type {any} */ pr) => pr.requesterId === currentUser?.id);
		} else if (role === 'Manager') {
			// Managers see department requests
			list = list.filter((/** @type {any} */ pr) => pr.departmentId === currentUser?.departmentId);
		}

		// Filter
		if (filterStatus !== 'All') {
			list = list.filter((/** @type {any} */ pr) => pr.status === filterStatus);
		}
		if (sortPriority !== 'All') {
			list = list.filter((/** @type {any} */ pr) => pr.priority === sortPriority);
		}

		// Search match
		const q = globalStore.searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(/** @type {any} */ pr) =>
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

	function removeFormItem(/** @type {string} */ id) {
		if (formItems.length > 1) {
			formItems = formItems.filter((i) => i.id !== id);
		}
	}

	function handleFileChange(/** @type {Event} */ e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		if (target.files && target.files.length > 0) {
			attachmentFile = target.files[0];
			attachmentName = target.files[0].name;
		}
	}

	function validateAndSubmit(/** @type {SubmitEvent} */ e) {
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
		const newRequest = {
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
			currentApproverId: db.getDepartments().find((/** @type {any} */ d) => d.id === currentUser?.departmentId)?.managerId || 'user-mgr1',
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
		const managerId = db.getDepartments().find((/** @type {any} */ d) => d.id === currentUser?.departmentId)?.managerId;
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

	function deletePR(/** @type {string} */ id) {
		const prs = db.getPurchaseRequests();
		const filtered = prs.filter((/** @type {any} */ p) => p.id !== id);
		db.savePurchaseRequests(filtered);
		db.logAction(currentUser?.id || '', 'Delete Purchase Request', `Deleted PR request: ${id}`);
		globalStore.showToast(`Request ${id} deleted successfully.`, 'info');
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Purchase Requests — <span class="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">{currentUser?.fullName || 'User'}</span>
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Submit, review, and manage division purchase requisitions in real-time.
			</p>
		</div>
		<div>
			{#if role === 'Employee'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/25 px-4 py-2 flex items-center"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					New Request
				</button>
			{/if}
		</div>
	</div>

	<!-- Filter & Operations Toolbar -->
	<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
		<div class="flex flex-wrap gap-3 items-center">
			<span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Filters:</span>

			<select bind:value={filterStatus} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
				<option value="All">All Statuses</option>
				<option value="Draft">Draft</option>
				<option value="Pending Approval">Pending Approval</option>
				<option value="Approved">Approved</option>
				<option value="Rejected">Rejected</option>
				<option value="Cancelled">Cancelled</option>
			</select>

			<select bind:value={sortPriority} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
				<option value="All">All Priorities</option>
				<option value="Low">Low</option>
				<option value="Medium">Medium</option>
				<option value="High">High</option>
				<option value="Urgent">Urgent</option>
			</select>
		</div>

		{#if departmentBudget}
			<div class="flex items-center gap-3 text-xs bg-slate-100/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
				<div class="text-left">
					<span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Remaining Budget</span>
					<p class="font-black text-sky-600 dark:text-sky-400">₹{departmentBudget.remainingBudget.toLocaleString()}</p>
				</div>
				<div class="radial-progress text-sky-500" style="--value:{(departmentBudget.utilizedBudget / departmentBudget.allocatedBudget) * 100}; --size: 2.2rem; --thickness: 4px;" role="progressbar"></div>
			</div>
		{/if}
	</div>

	<!-- Data Table -->
	<div class="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl">
		<div class="overflow-x-auto">
			<table class="table table-md w-full">
				<thead class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs">
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
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
					{#if purchaseRequests.length === 0}
						<tr>
							<td colspan="7" class="text-center py-12 text-slate-400 font-semibold">
								No purchase requests found matching filters.
							</td>
						</tr>
					{/if}
					{#each purchaseRequests as pr}
						<tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
							<td class="font-black text-sky-600 dark:text-sky-400">{pr.id}</td>
							<td>
								<div>
									<p class="font-bold text-slate-900 dark:text-slate-100 leading-tight">{pr.title}</p>
									<p class="text-[10px] text-slate-400 mt-0.5 font-medium">{pr.category} • Submitted {new Date(pr.createdAt).toLocaleDateString()}</p>
								</div>
							</td>
							<td>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {pr.priority === 'Urgent' ? 'bg-rose-500 text-white' : pr.priority === 'High' ? 'bg-amber-500 text-white' : pr.priority === 'Medium' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-200'}"
								>
									{pr.priority}
								</span>
							</td>
							<td class="font-black text-slate-800 dark:text-slate-200">₹{pr.estimatedCost.toLocaleString()}</td>
							<td>
								{#if pr.budgetStatus === 'Over Budget'}
									<span class="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold">Over Limit</span>
								{:else}
									<span class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">Within Budget</span>
								{/if}
							</td>
							<td>
								<span
									class="badge badge-sm font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full border-none {pr.status === 'Pending Approval' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : pr.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : pr.status === 'Rejected' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-slate-500/20 text-slate-400'}"
								>
									{pr.status}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									{#if pr.attachmentName}
										<span class="btn btn-ghost btn-xs text-slate-400 hover:text-sky-500" title={pr.attachmentName}>
											<Paperclip class="w-3.5 h-3.5" />
										</span>
									{/if}
									{#if pr.status === 'Pending Approval' && (role === 'Employee' || role === 'Manager')}
										<button
											onclick={() => deletePR(pr.id)}
											class="btn btn-ghost btn-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
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
			<div class="modal-box max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
				<h3 class="font-black text-base text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
					Create New Purchase Request
				</h3>

				<form onsubmit={validateAndSubmit} class="space-y-4 mt-4 text-xs">
					<div class="form-control">
						<label class="label pb-1.5" for="pr-title">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Request Title</span>
						</label>
						<input
							id="pr-title"
							type="text"
							placeholder="e.g. Developer Laptops Upgrade"
							bind:value={prTitle}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.title}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.title}</span>
						{/if}
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div class="form-control">
							<label class="label pb-1.5" for="pr-cat">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Category</span>
							</label>
							<select id="pr-cat" bind:value={prCategory} class="select text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl">
								<option value="Computer Hardware">Computer Hardware</option>
								<option value="Software Licenses">Software Licenses</option>
								<option value="Office Furniture">Office Furniture</option>
								<option value="Stationery">Stationery</option>
								<option value="Facility Maintenance">Facility Maintenance</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-1.5" for="pr-pri">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Priority Level</span>
							</label>
							<select id="pr-pri" bind:value={prPriority} class="select text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl">
								<option value="Low">Low</option>
								<option value="Medium">Medium</option>
								<option value="High">High</option>
								<option value="Urgent">Urgent</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-1.5" for="pr-file">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Upload Specs</span>
							</label>
							<div class="relative">
								<input
									id="pr-file"
									type="file"
									accept=".pdf,.doc,.docx,.xls,.xlsx"
									onchange={handleFileChange}
									class="file-input file-input-bordered file-input-xs text-xs w-full rounded-xl"
								/>
							</div>
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1.5" for="pr-desc">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Detailed Description</span>
						</label>
						<textarea
							id="pr-desc"
							rows="2"
							placeholder="Provide detailed specifications and rationale."
							bind:value={prDescription}
							class="textarea text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
						></textarea>
						{#if errors.description}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.description}</span>
						{/if}
					</div>

					<!-- Dynamic Items Sub-Form -->
					<div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/50">
						<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
							<h4 class="font-bold text-slate-800 dark:text-slate-200">Items List</h4>
							<button
								type="button"
								onclick={addFormItem}
								class="btn btn-ghost btn-xs text-sky-600 dark:text-sky-400 font-extrabold flex items-center"
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
										class="input input-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-1 text-xs rounded-lg"
									/>
									<input
										type="number"
										placeholder="Qty"
										bind:value={item.quantity}
										class="input input-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-16 text-xs rounded-lg"
									/>
									<input
										type="number"
										placeholder="Price (₹)"
										bind:value={item.unitPrice}
										class="input input-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-24 text-xs rounded-lg"
									/>
									<div class="w-24 font-black text-right text-slate-800 dark:text-slate-200 pr-1">
										₹{(item.quantity * item.unitPrice).toLocaleString()}
									</div>
									<button
										type="button"
										onclick={() => removeFormItem(item.id)}
										disabled={formItems.length === 1}
										class="btn btn-ghost btn-xs text-rose-500"
									>
										<Trash2 class="w-3.5 h-3.5" />
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Bottom Cost & Budget Warning -->
					<div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
						<div>
							<p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Estimated Total</p>
							<p class="text-lg font-black text-slate-900 dark:text-slate-100">₹{formTotalCost.toLocaleString()}</p>
						</div>

						<div class="flex items-center gap-3">
							{#if isOverBudget}
								<div class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-[10px] font-bold">
									<AlertTriangle class="w-3.5 h-3.5 shrink-0" />
									Budget Exceeded
								</div>
							{/if}

							<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs font-bold rounded-xl">
								Cancel
							</button>
							<button type="submit" class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-4 shadow-lg shadow-sky-600/25">
								Submit Request
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>


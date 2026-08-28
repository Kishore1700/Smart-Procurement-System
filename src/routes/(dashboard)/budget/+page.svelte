<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { z } from 'zod';
	import {
		DollarSign,
		TrendingUp,
		AlertTriangle,
		Save,
		Building,
		ArrowUpRight,
		CheckCircle2
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Load departments
	let departments = $derived.by(() => {
		return db.getDepartments();
	});

	// Budget adjustment states
	let selectedDeptId = $state('');
	let newAllocatedBudget = $state(0);

	function updateBudget(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		if (role !== 'Manager') {
			globalStore.showToast('Permissions restricted. Only Managers can reallocate budgets.', 'error');
			return;
		}

		if (!selectedDeptId) {
			globalStore.showToast('Please select a department', 'error');
			return;
		}

		const list = db.getDepartments();
		const idx = list.findIndex((/** @type {any} */ d) => d.id === selectedDeptId);
		if (idx === -1) return;

		const target = list[idx];
		const prev = target.allocatedBudget;
		target.allocatedBudget = Number(newAllocatedBudget);
		target.remainingBudget = target.allocatedBudget - target.utilizedBudget;
		db.saveDepartments(list);

		db.logAction(
			currentUser?.id || '',
			'Update Department Budget',
			`Adjusted budget for ${target.name} from ₹${prev.toLocaleString()} to ₹${target.allocatedBudget.toLocaleString()}`
		);

		globalStore.showToast(`Budget for ${target.name} reallocated successfully!`, 'success');
		selectedDeptId = '';
		newAllocatedBudget = 0;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Budget Management
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Coordinate, track, and configure department fiscal limits and capital allocations.
			</p>
		</div>
	</div>

	<!-- Budget Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
		{#each departments as dept}
			{@const pct = Math.round((dept.utilizedBudget / dept.allocatedBudget) * 100)}
			<div class="glass-card border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:-translate-y-1">
				<div class="flex justify-between items-start">
					<div class="flex items-center gap-2.5">
						<div class="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
							<Building class="w-4 h-4" />
						</div>
						<h3 class="font-black text-slate-900 dark:text-slate-100">{dept.name}</h3>
					</div>
					{#if pct > 90}
						<span class="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-black uppercase border border-rose-500/30">High Usage</span>
					{:else}
						<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase border border-emerald-500/30">Good Standing</span>
					{/if}
				</div>

				<div class="space-y-2 bg-slate-50/60 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
					<div class="flex justify-between text-slate-600 dark:text-slate-400">
						<span>Allocated Limit:</span>
						<span class="font-black text-slate-800 dark:text-slate-200">₹{dept.allocatedBudget.toLocaleString()}</span>
					</div>
					<div class="flex justify-between text-slate-600 dark:text-slate-400">
						<span>Utilized Capital:</span>
						<span class="font-black text-slate-800 dark:text-slate-200">₹{dept.utilizedBudget.toLocaleString()}</span>
					</div>
					<div class="flex justify-between text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800/80 pt-2 font-bold">
						<span>Remaining Budget:</span>
						<span class="text-sky-600 dark:text-sky-400 font-black">₹{dept.remainingBudget.toLocaleString()}</span>
					</div>
				</div>

				<!-- Utilization progress bar -->
				<div class="space-y-1.5">
					<div class="flex justify-between text-[10px] text-slate-400 font-extrabold tracking-wider">
						<span>UTILIZATION RATE</span>
						<span class="font-black text-slate-800 dark:text-slate-200">{pct}%</span>
					</div>
					<div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-300 {pct <= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : pct <= 90 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-600'}"
							style="width: {Math.min(pct, 100)}%"
						></div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Reallocate Form -->
	{#if role === 'Manager'}
		<div class="glass-card border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-2xl p-6 text-xs max-w-md">
			<h3 class="font-black text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
				Adjust Department Allocations
			</h3>

			<form onsubmit={updateBudget} class="space-y-4 mt-4">
				<div class="form-control">
					<label class="label pb-1" for="b-dept">
						<span class="label-text font-bold text-slate-700 dark:text-slate-300">Select Department</span>
					</label>
					<select id="b-dept" bind:value={selectedDeptId} class="select text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl font-semibold">
						<option value="">-- Choose Division --</option>
						{#each departments as d}
							<option value={d.id}>{d.name} (₹{d.allocatedBudget.toLocaleString()})</option>
						{/each}
					</select>
				</div>

				<div class="form-control">
					<label class="label pb-1" for="b-val">
						<span class="label-text font-bold text-slate-700 dark:text-slate-300">New Allocated Limit (₹)</span>
					</label>
					<input
						id="b-val"
						type="number"
						placeholder="Enter target rupee amount"
						bind:value={newAllocatedBudget}
						class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
					/>
				</div>

				<div class="flex justify-end pt-2">
					<button type="submit" class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-6 flex items-center shadow-lg shadow-sky-600/25">
						<Save class="w-4 h-4 mr-1.5" />
						Save Adjustment
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>


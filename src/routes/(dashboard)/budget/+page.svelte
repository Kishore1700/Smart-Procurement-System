<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { Department } from '$lib/db/types';
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
	let newAllocatedBudget = $state<number>(0);

	function updateBudget(e: Event) {
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
		const idx = list.findIndex((d) => d.id === selectedDeptId);
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
	<div>
		<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Budget Management</h1>
		<p class="text-xs text-slate-500 mt-1">
			Coordinate, track, and configure department fiscal limits and capital allocations.
		</p>
	</div>

	<!-- Budget Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
		{#each departments as dept}
			{@const pct = Math.round((dept.utilizedBudget / dept.allocatedBudget) * 100)}
			<div class="card bg-white border border-slate-200/80 shadow-sm rounded-xl p-5 space-y-4">
				<div class="flex justify-between items-start">
					<div class="flex items-center gap-2">
						<Building class="w-4 h-4 text-slate-400" />
						<h3 class="font-extrabold text-slate-800">{dept.name}</h3>
					</div>
					{#if pct > 90}
						<span class="badge badge-soft badge-error text-[8px] font-black uppercase px-2 py-0.5">High Usage</span>
					{:else}
						<span class="badge badge-soft badge-success text-[8px] font-black uppercase px-2 py-0.5">Good Standing</span>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex justify-between text-slate-600">
						<span>Allocated Limit:</span>
						<span class="font-bold text-slate-800">₹{dept.allocatedBudget.toLocaleString()}</span>
					</div>
					<div class="flex justify-between text-slate-600">
						<span>Utilized Capital:</span>
						<span class="font-bold text-slate-800">₹{dept.utilizedBudget.toLocaleString()}</span>
					</div>
					<div class="flex justify-between text-slate-600 border-t border-slate-100 pt-2 font-bold">
						<span>Remaining Budget:</span>
						<span class="text-primary">₹{dept.remainingBudget.toLocaleString()}</span>
					</div>
				</div>

				<!-- Utilization progress bar -->
				<div class="space-y-1">
					<div class="flex justify-between text-[10px] text-slate-400 font-bold">
						<span>UTILIZATION RATE</span>
						<span>{pct}%</span>
					</div>
					<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-300"
							class:bg-emerald-500={pct <= 75}
							class:bg-warning={pct > 75 && pct <= 90}
							class:bg-error={pct > 90}
							style="width: {Math.min(pct, 100)}%"
						></div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Reallocate Form -->
	{#if role === 'Manager'}
		<div class="card bg-white border border-slate-200/80 shadow-sm rounded-xl p-6 text-xs max-w-md">
			<h3 class="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-3">
				Adjust Department Allocations
			</h3>

			<form onsubmit={updateBudget} class="space-y-4 mt-4">
				<div class="form-control">
					<label class="label pb-1" for="b-dept">
						<span class="label-text font-bold text-slate-700">Select Department</span>
					</label>
					<select id="b-dept" bind:value={selectedDeptId} class="select select-bordered text-xs w-full">
						<option value="">-- Choose Division --</option>
						{#each departments as d}
							<option value={d.id}>{d.name} (₹{d.allocatedBudget.toLocaleString()})</option>
						{/each}
					</select>
				</div>

				<div class="form-control">
					<label class="label pb-1" for="b-val">
						<span class="label-text font-bold text-slate-700">New Allocated Limit (₹)</span>
					</label>
					<input
						id="b-val"
						type="number"
						placeholder="Enter target rupee amount"
						bind:value={newAllocatedBudget}
						class="input w-full border-slate-200 text-xs"
					/>
				</div>

				<div class="flex justify-end pt-2">
					<button type="submit" class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-6 flex items-center">
						<Save class="w-3.5 h-3.5 mr-1.5" />
						Save Adjustment
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

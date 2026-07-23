<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { User, AuditLog } from '$lib/db/types';
	import {
		Users,
		ShieldAlert,
		Settings,
		RefreshCw,
		CheckCircle2,
		Activity,
		Trash2
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Load users and logs
	let usersList = $derived(db.getUsers());
	let auditLogs = $derived(db.getAuditLogs());

	function toggleUserStatus(userId: string) {
		const list = db.getUsers();
		const idx = list.findIndex((u) => u.id === userId);
		if (idx === -1) return;

		const currentStatus = list[idx].status;
		list[idx].status = currentStatus === 'Active' ? 'Inactive' : 'Active';
		db.saveUsers(list);

		db.logAction(
			currentUser?.id || '',
			'Toggle User Status',
			`Updated user status for "${list[idx].fullName}" to ${list[idx].status}`
		);

		globalStore.showToast(`User ${list[idx].fullName} status updated!`, 'success');
	}

	function systemReset() {
		db.reset();
		if (currentUser) {
			globalStore.login(currentUser);
		}
		globalStore.showToast('Demo Database Reset to Initial Seeds!', 'info');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">System Administration</h1>
			<p class="text-xs text-slate-500 mt-1">
				Manage employee roles, review audit events, and configure workspace settings.
			</p>
		</div>
		<div>
			<button onclick={systemReset} class="btn btn-warning text-slate-900 btn-sm text-xs font-semibold rounded-lg flex items-center">
				<RefreshCw class="w-4 h-4 mr-1.5" />
				Reset Database
			</button>
		</div>
	</div>

	<!-- Admin Control Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs md:text-sm">
		<!-- User Management -->
		<div class="lg:col-span-6 card bg-white border border-slate-200/80 p-6 shadow-sm rounded-xl space-y-4">
			<h3 class="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
				<Users class="w-4.5 h-4.5 text-primary" />
				User Directory & Roles
			</h3>

			<div class="divide-y divide-slate-100 overflow-y-auto max-h-[400px] space-y-3">
				{#each usersList as user}
					<div class="flex items-center justify-between pt-3 first:pt-0">
						<div class="flex items-center gap-2.5">
							<img src={user.avatarUrl} alt="" class="w-8 h-8 rounded-full ring-2 ring-slate-100 shrink-0" />
							<div>
								<h4 class="font-bold text-slate-800 leading-tight">{user.fullName}</h4>
								<p class="text-[10px] text-slate-400 mt-0.5">{user.email} • <b class="uppercase text-primary font-bold">{user.role}</b></p>
							</div>
						</div>

						<div class="flex gap-2">
							<button
								onclick={() => toggleUserStatus(user.id)}
								class="btn btn-ghost btn-xs font-bold rounded"
								class:text-red-500={user.status === 'Active'}
								class:text-emerald-500={user.status === 'Inactive'}
							>
								{user.status === 'Active' ? 'Deactivate' : 'Activate'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Audit Event Trail -->
		<div class="lg:col-span-6 card bg-white border border-slate-200/80 p-6 shadow-sm rounded-xl space-y-4">
			<h3 class="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
				<Activity class="w-4.5 h-4.5 text-primary" />
				Audit Compliance Trails
			</h3>

			<div class="divide-y divide-slate-100 overflow-y-auto max-h-[400px] space-y-3">
				{#each auditLogs as log}
					<div class="pt-3 first:pt-0">
						<div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
							<span>{log.username} ({log.role})</span>
							<span>{new Date(log.timestamp).toLocaleDateString()}</span>
						</div>
						<p class="font-bold text-slate-800 mt-1 leading-snug">{log.action}</p>
						<p class="text-[11px] text-slate-500 mt-0.5 leading-snug">{log.details}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

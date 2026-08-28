<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import {
		Users,
		User,
		ShieldAlert,
		Settings,
		RefreshCw,
		CheckCircle2,
		Activity,
		Trash2
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	let usersList = $derived(db.getUsers());
	let auditLogs = $derived(db.getAuditLogs());

	function toggleUserStatus(/** @type {string} */ userId) {
		const list = db.getUsers();
		const idx = list.findIndex((/** @type {any} */ u) => u.id === userId);
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
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				System Administration
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Manage user access, review security audit trails, and reseed mock state data.
			</p>
		</div>
		<div>
			<button onclick={systemReset} class="btn bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-amber-500/20 px-4 py-2 flex items-center">
				<RefreshCw class="w-4 h-4 mr-1.5" />
				Reset Database
			</button>
		</div>
	</div>

	<!-- Admin Control Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs md:text-sm">
		<!-- User Management -->
		<div class="lg:col-span-6 glass-card border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl rounded-2xl space-y-4">
			<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
				<div class="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
					<Users class="w-4 h-4" />
				</div>
				User Directory & Roles
			</h3>

			<div class="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[400px] space-y-3">
				{#each usersList as user}
					<div class="flex items-center justify-between pt-3 first:pt-0">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-500 flex items-center justify-center border border-sky-500/30 shrink-0">
								<User class="w-4 h-4" />
							</div>
							<div>
								<h4 class="font-black text-slate-900 dark:text-slate-100 leading-tight">{user.fullName}</h4>
								<p class="text-[10px] text-slate-400 mt-0.5 font-medium">{user.email} • <b class="uppercase text-sky-500 font-extrabold">{user.role}</b></p>
							</div>
						</div>

						<div class="flex gap-2">
							<button
								onclick={() => toggleUserStatus(user.id)}
								class="btn btn-ghost btn-xs font-extrabold rounded-lg px-2.5 py-1 {user.status === 'Active' ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}"
							>
								{user.status === 'Active' ? 'Deactivate' : 'Activate'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Audit Event Trail -->
		<div class="lg:col-span-6 glass-card border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl rounded-2xl space-y-4">
			<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
				<div class="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
					<Activity class="w-4 h-4" />
				</div>
				Audit Compliance Trails
			</h3>

			<div class="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[400px] space-y-3">
				{#each auditLogs as log}
					<div class="pt-3 first:pt-0">
						<div class="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase">
							<span>{log.username} ({log.role})</span>
							<span>{new Date(log.timestamp).toLocaleDateString()}</span>
						</div>
						<p class="font-bold text-slate-900 dark:text-slate-100 mt-1 leading-snug">{log.action}</p>
						<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{log.details}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>


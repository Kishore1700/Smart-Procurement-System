<script>
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import Sidebar from '$lib/components/navigation/Sidebar.svelte';
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import Breadcrumbs from '$lib/components/navigation/Breadcrumbs.svelte';
	import { LogOut } from '@lucide/svelte';

	let { children } = $props();

	// Client-side authentication guard
	$effect(() => {
		if (typeof window !== 'undefined' && !globalStore.currentUser) {
			goto('/login');
		}
	});
</script>

{#if globalStore.currentUser}
	<div class="flex h-screen w-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors overflow-hidden">
		<!-- Sidebar Collapsible (Independent Scrollable Container) -->
		<Sidebar />

		<!-- Main Page Frame -->
		<div class="flex-1 flex flex-col h-screen min-w-0 min-h-0 overflow-hidden">
			<!-- Top Navigation (Fixed Header) -->
			<TopNav />

			<!-- Scrolling Main Content Area (Independent Scroll Container) -->
			<main class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-8">
				<div class="max-w-7xl mx-auto w-full">
					<!-- Breadcrumbs Navigation -->
					<Breadcrumbs />

					<!-- Main Route Render -->
					{@render children()}
				</div>
			</main>
		</div>
	</div>

	<!-- Global Logout Confirmation Modal Popup -->
	{#if globalStore.isLogoutModalOpen}
		<div
			class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
			role="dialog"
			aria-modal="true"
		>
			<div class="glass-card rounded-2xl w-full max-w-sm sm:max-w-md border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl p-6 text-slate-900 dark:text-slate-100 flex flex-col gap-4 animate-scale-in">
				<div class="flex items-center gap-3.5">
					<div class="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-md shadow-rose-500/10">
						<LogOut class="w-6 h-6" />
					</div>
					<div>
						<h3 class="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
							Confirm Sign Out
						</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
							Are you sure you want to end your ERP session?
						</p>
					</div>
				</div>

				<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
					Currently logged in as <b class="font-bold text-slate-900 dark:text-white">{globalStore.currentUser?.fullName}</b> ({globalStore.currentUser?.role}). Any unsaved edits will be lost upon logout.
				</p>

				<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
					<button
						onclick={() => globalStore.cancelLogout()}
						class="btn btn-sm btn-ghost rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						Cancel
					</button>
					<button
						onclick={() => globalStore.confirmLogout()}
						class="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-4 border-none shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
					>
						<LogOut class="w-3.5 h-3.5" />
						<span>Logout</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Temporary Loading State while executing Guard -->
	<div class="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center">
		<div class="flex flex-col items-center gap-3">
			<span class="loading loading-spinner loading-lg text-primary"></span>
			<p class="text-xs font-semibold text-slate-500 tracking-wide uppercase">Verifying ERP Session...</p>
		</div>
	</div>
{/if}

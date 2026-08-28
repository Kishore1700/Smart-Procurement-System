<script>
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import Sidebar from '$lib/components/navigation/Sidebar.svelte';
	import TopNav from '$lib/components/navigation/TopNav.svelte';
	import Breadcrumbs from '$lib/components/navigation/Breadcrumbs.svelte';

	let { children } = $props();

	// Client-side authentication guard
	$effect(() => {
		if (typeof window !== 'undefined' && !globalStore.currentUser) {
			goto('/login');
		}
	});
</script>

{#if globalStore.currentUser}
	<div class="flex h-screen bg-slate-50/50 text-slate-800 font-sans transition-colors overflow-hidden">
		<!-- Sidebar Collapsible -->
		<Sidebar />

		<!-- Main Page Frame -->
		<div class="flex-1 flex flex-col h-screen overflow-hidden">
			<!-- Top Navigation -->
			<TopNav />

			<!-- Scrolling Main Content Area -->
			<main class="flex-1 overflow-y-auto p-6 md:p-8">
				<div class="max-w-7xl mx-auto w-full">
					<!-- Breadcrumbs Navigation -->
					<Breadcrumbs />

					<!-- Main Route Render -->
					{@render children()}
				</div>
			</main>
		</div>
	</div>
{:else}
	<!-- Temporary Loading State while executing Guard -->
	<div class="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center">
		<div class="flex flex-col items-center gap-3">
			<span class="loading loading-spinner loading-lg text-primary"></span>
			<p class="text-xs font-semibold text-slate-500 tracking-wide uppercase">Verifying ERP Session...</p>
		</div>
	</div>
{/if}

<script>
	import { page } from '$app/state';
	import { Home, ChevronRight } from '@lucide/svelte';

	// Compute breadcrumbs reactively from url path
	let items = $derived.by(() => {
		const path = page.url.pathname;
		if (path === '/') return [];
		const segments = path.split('/').filter(Boolean);
		return segments.map((seg, idx) => {
			const label = seg
				.split('-')
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			const href = '/' + segments.slice(0, idx + 1).join('/');
			return { label, href };
		});
	});
</script>

{#if items.length > 0}
	<nav class="flex items-center gap-2 text-xs mb-6 px-1 py-1" aria-label="Breadcrumbs">
		<a
			href="/dashboard"
			class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-colors shadow-xs"
		>
			<Home class="w-3.5 h-3.5" />
			<span class="text-[11px]">Home</span>
		</a>

		{#each items as item, idx}
			<ChevronRight class="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
			{#if idx === items.length - 1}
				<span class="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold border border-sky-200/60 dark:border-sky-800/60 text-[11px] shadow-xs">
					{item.label}
				</span>
			{:else}
				<a href={item.href} class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-colors text-[11px]">
					{item.label}
				</a>
			{/if}
		{/each}
	</nav>
{/if}


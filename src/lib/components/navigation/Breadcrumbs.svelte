<script lang="ts">
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
	<nav class="flex items-center gap-1.5 text-xs text-slate-500 mb-4 px-1" aria-label="Breadcrumbs">
		<a
			href="/dashboard"
			class="flex items-center gap-1 hover:text-primary transition-colors font-medium"
		>
			<Home class="w-3.5 h-3.5" />
			<span>Home</span>
		</a>

		{#each items as item, idx}
			<ChevronRight class="w-3 h-3 text-slate-400" />
			{#if idx === items.length - 1}
				<span class="text-slate-800 font-semibold">{item.label}</span>
			{:else}
				<a href={item.href} class="hover:text-primary transition-colors font-medium">
					{item.label}
				</a>
			{/if}
		{/each}
	</nav>
{/if}

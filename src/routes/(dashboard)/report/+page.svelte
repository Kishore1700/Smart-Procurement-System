<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/reports', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center min-h-[400px]">
	<div class="text-center">
		<div class="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-sky-500 border-t-transparent mb-3"></div>
		<p class="text-xs text-slate-500 font-medium">Redirecting to Reports & Analytics...</p>
	</div>
</div>

<script>
	import './layout.css';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { globalStore } from '$lib/stores/globalStore.svelte';

	let { children } = $props();

	$effect(() => {
		if (typeof window !== 'undefined') {
			document.documentElement.setAttribute('data-theme', globalStore.theme);
		}
	});
</script>

<svelte:head>
	<title>ProcureSmart Enterprise | Procurement Management System</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
	<style>
		body {
			font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
			text-rendering: optimizeLegibility;
		}
	</style>
</svelte:head>

{@render children()}

<Toast />

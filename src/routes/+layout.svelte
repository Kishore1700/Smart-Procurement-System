<script lang="ts">
	import './layout.css';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>ProcureSmart Enterprise | Procurement Management System</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<style>
		body {
			font-family: 'Inter', sans-serif;
		}
	</style>
</svelte:head>

{@render children()}

<Toast />

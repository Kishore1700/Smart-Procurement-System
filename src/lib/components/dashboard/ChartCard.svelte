<script>
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';

	let {
		title = 'Chart Title',
		type = 'bar',
		data = { labels: [], datasets: [] },
		options = {}
	} = $props();

	let canvasElement = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let chartInstance = /** @type {any} */ (null);

	// In Svelte 5, we use $effect to re-render the chart whenever data or configuration changes
	$effect(() => {
		if (canvasElement && data) {
			if (chartInstance) {
				chartInstance.destroy();
			}
			chartInstance = new Chart(canvasElement, {
				type: /** @type {any} */ (type),
				data: /** @type {any} */ (data),
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: type === 'doughnut' || type === 'pie'
						}
					},
					...options
				}
			});
		}
	});

	onMount(() => {
		return () => {
			if (chartInstance) {
				chartInstance.destroy();
			}
		};
	});
</script>

<div class="card glass-card rounded-2xl p-5 flex flex-col h-80 border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all duration-300 hover:shadow-2xl relative overflow-hidden">
	<div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-400"></div>
	<div class="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
		<h3 class="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
		<span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
	</div>
	<div class="flex-1 relative min-h-0 w-full">
		<canvas bind:this={canvasElement}></canvas>
	</div>
</div>


<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';

	let {
		title = 'Chart Title',
		type = 'bar',
		data = {},
		options = {}
	}: {
		title?: string;
		type?: 'bar' | 'line' | 'doughnut' | 'pie';
		data: any;
		options?: any;
	} = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chartInstance: Chart | null = null;

	// In Svelte 5, we can use $effect to re-render the chart whenever data or configuration changes
	$effect(() => {
		if (canvasElement && data) {
			if (chartInstance) {
				chartInstance.destroy();
			}
			chartInstance = new Chart(canvasElement, {
				type,
				data,
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

<div class="card bg-white border border-slate-200/80 shadow-sm rounded-xl p-5 flex flex-col h-80">
	<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
	<div class="flex-1 relative min-h-0 w-full">
		<canvas bind:this={canvasElement}></canvas>
	</div>
</div>

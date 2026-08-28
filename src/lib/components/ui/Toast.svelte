<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { CheckCircle2, AlertTriangle, Info, XCircle, X } from '@lucide/svelte';
</script>

<div class="toast toast-end toast-bottom z-[9999] p-4 space-y-2">
	{#each globalStore.toasts as toast (toast.id)}
		<div
			class="alert border shadow-lg flex items-start gap-3 backdrop-blur-md rounded-xl transition-all duration-300 max-w-sm {toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : toast.type === 'warning' ? 'alert-warning' : 'alert-info'}"
		>
			{#if toast.type === 'success'}
				<CheckCircle2 class="w-5 h-5 text-success-content mt-0.5 shrink-0" />
			{:else if toast.type === 'error'}
				<XCircle class="w-5 h-5 text-error-content mt-0.5 shrink-0" />
			{:else if toast.type === 'warning'}
				<AlertTriangle class="w-5 h-5 text-warning-content mt-0.5 shrink-0" />
			{:else}
				<Info class="w-5 h-5 text-info-content mt-0.5 shrink-0" />
			{/if}

			<div class="flex-1">
				<p class="text-sm font-medium text-current leading-tight">{toast.message}</p>
			</div>

			<button
				onclick={() => globalStore.removeToast(toast.id)}
				class="btn btn-ghost btn-xs btn-circle text-current hover:bg-black/10 shrink-0"
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	{/each}
</div>

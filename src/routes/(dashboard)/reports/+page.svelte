<script lang="ts">
	import { db } from '$lib/db/mockDb';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import ChartCard from '$lib/components/dashboard/ChartCard.svelte';
	import {
		FileSpreadsheet,
		FileDown,
		Printer,
		TrendingUp,
		BarChart3,
		CheckCircle2
	} from '@lucide/svelte';

	// Load data
	let prs = $derived(db.getPurchaseRequests());
	let depts = $derived(db.getDepartments());
	let invoices = $derived(db.getInvoices());

	// Export functions
	function exportCSV(type: 'requests' | 'budgets' | 'invoices') {
		let headers = '';
		let rows: string[] = [];

		if (type === 'requests') {
			headers = 'Request ID,Title,Category,Cost,Status,Priority,Created Date\n';
			rows = prs.map(
				(p) =>
					`"${p.id}","${p.title}","${p.category}",${p.estimatedCost},"${p.status}","${p.priority}","${p.createdAt}"`
			);
		} else if (type === 'budgets') {
			headers = 'Division ID,Division Name,Allocated Budget,Utilized Budget,Remaining Budget\n';
			rows = depts.map(
				(d) =>
					`"${d.id}","${d.name}",${d.allocatedBudget},${d.utilizedBudget},${d.remainingBudget}`
			);
		} else {
			headers = 'Invoice Number,PO Link,Amount,Status,Submission Date\n';
			rows = invoices.map(
				(i) => `"${i.invoiceNumber}","${i.poNumber}",${i.amount},"${i.status}","${i.submittedAt}"`
			);
		}

		const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `procurement_${type}_report.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		globalStore.showToast(`CSV Export for ${type} triggered successfully.`, 'success');
	}

	// Chart options
	let categorySpendingChart = $derived.by(() => {
		const cats = Array.from(new Set(prs.map((p) => p.category)));
		return {
			labels: cats,
			datasets: [
				{
					label: 'Billed Value (₹)',
					data: cats.map((cat) =>
						prs.filter((p) => p.category === cat).reduce((sum, p) => sum + p.estimatedCost, 0)
					),
					backgroundColor: 'rgba(59, 130, 246, 0.6)',
					borderWidth: 0
				}
			]
		};
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Analytics & Reports</h1>
			<p class="text-xs text-slate-500 mt-1">
				Export core data tables or review visual category distributions and budget allocations.
			</p>
		</div>
	</div>

	<!-- Export Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
		<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-col justify-between gap-4">
			<div>
				<h3 class="font-extrabold text-slate-800">Purchase Requests Ledger</h3>
				<p class="text-slate-500 text-[11px] mt-1">Detailed list of request categories, approvals, and cost estimates.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('requests')} class="btn btn-ghost border-slate-200 hover:bg-slate-50 btn-xs font-bold rounded flex items-center">
					<FileSpreadsheet class="w-3.5 h-3.5 mr-1" /> CSV
				</button>
			</div>
		</div>

		<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-col justify-between gap-4">
			<div>
				<h3 class="font-extrabold text-slate-800">Department Budget Metrics</h3>
				<p class="text-slate-500 text-[11px] mt-1">Allocated annual thresholds, current utilized sums, and remainders.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('budgets')} class="btn btn-ghost border-slate-200 hover:bg-slate-50 btn-xs font-bold rounded flex items-center">
					<FileSpreadsheet class="w-3.5 h-3.5 mr-1" /> CSV
				</button>
			</div>
		</div>

		<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-col justify-between gap-4">
			<div>
				<h3 class="font-extrabold text-slate-800">Invoices & Financial Auditing</h3>
				<p class="text-slate-500 text-[11px] mt-1">Verified payouts, submitted billings, and payment settlements status.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('invoices')} class="btn btn-ghost border-slate-200 hover:bg-slate-50 btn-xs font-bold rounded flex items-center">
					<FileSpreadsheet class="w-3.5 h-3.5 mr-1" /> CSV
				</button>
			</div>
		</div>
	</div>

	<!-- Visual charts -->
	<div class="grid grid-cols-1 lg:grid-cols-1 gap-6">
		<ChartCard
			title="Expenditure Distribution by Product Category"
			type="bar"
			data={categorySpendingChart}
		/>
	</div>
</div>

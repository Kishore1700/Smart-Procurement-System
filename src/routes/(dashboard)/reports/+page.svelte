<script>
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
	function exportCSV(/** @type {string} */ type) {
		let headers = '';
		let rows = [];

		if (type === 'requests') {
			headers = 'Request ID,Title,Category,Cost,Status,Priority,Created Date\n';
			rows = prs.map(
				(/** @type {any} */ p) =>
					`"${p.id}","${p.title}","${p.category}",${p.estimatedCost},"${p.status}","${p.priority}","${p.createdAt}"`
			);
		} else if (type === 'budgets') {
			headers = 'Division ID,Division Name,Allocated Budget,Utilized Budget,Remaining Budget\n';
			rows = depts.map(
				(/** @type {any} */ d) =>
					`"${d.id}","${d.name}",${d.allocatedBudget},${d.utilizedBudget},${d.remainingBudget}`
			);
		} else {
			headers = 'Invoice Number,PO Link,Amount,Status,Submission Date\n';
			rows = invoices.map(
				(/** @type {any} */ i) => `"${i.invoiceNumber}","${i.poNumber}",${i.amount},"${i.status}","${i.submittedAt}"`
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
		const cats = Array.from(new Set(prs.map((/** @type {any} */ p) => p.category)));
		return {
			labels: cats,
			datasets: [
				{
					label: 'Billed Value (₹)',
					data: cats.map((cat) =>
						prs.filter((/** @type {any} */ p) => p.category === cat).reduce((/** @type {number} */ sum, /** @type {any} */ p) => sum + p.estimatedCost, 0)
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
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Analytics & Reports
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Export core data tables or review visual category distributions and budget allocations.
			</p>
		</div>
	</div>

	<!-- Export Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
		<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-5 group hover:-translate-y-1 transition-all duration-300">
			<div>
				<div class="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 w-fit mb-3">
					<FileSpreadsheet class="w-5 h-5" />
				</div>
				<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm">Purchase Requests Ledger</h3>
				<p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1 font-medium leading-relaxed">Detailed list of request categories, approvals, and cost estimates.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('requests')} class="btn btn-gradient-primary btn-xs font-extrabold rounded-xl px-4 py-2 flex items-center shadow-md shadow-sky-600/20">
					<FileDown class="w-3.5 h-3.5 mr-1.5" /> Export CSV
				</button>
			</div>
		</div>

		<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-5 group hover:-translate-y-1 transition-all duration-300">
			<div>
				<div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit mb-3">
					<BarChart3 class="w-5 h-5" />
				</div>
				<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm">Department Budget Metrics</h3>
				<p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1 font-medium leading-relaxed">Allocated annual thresholds, current utilized sums, and remainders.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('budgets')} class="btn btn-gradient-primary btn-xs font-extrabold rounded-xl px-4 py-2 flex items-center shadow-md shadow-sky-600/20">
					<FileDown class="w-3.5 h-3.5 mr-1.5" /> Export CSV
				</button>
			</div>
		</div>

		<div class="glass-card border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-5 group hover:-translate-y-1 transition-all duration-300">
			<div>
				<div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 w-fit mb-3">
					<TrendingUp class="w-5 h-5" />
				</div>
				<h3 class="font-black text-slate-900 dark:text-slate-100 text-sm">Invoices & Financial Auditing</h3>
				<p class="text-slate-500 dark:text-slate-400 text-[11px] mt-1 font-medium leading-relaxed">Verified payouts, submitted billings, and payment settlements status.</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => exportCSV('invoices')} class="btn btn-gradient-primary btn-xs font-extrabold rounded-xl px-4 py-2 flex items-center shadow-md shadow-sky-600/20">
					<FileDown class="w-3.5 h-3.5 mr-1.5" /> Export CSV
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


<script>
	// @ts-nocheck
	import { db } from '$lib/db/mockDb';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import ChartCard from '$lib/components/dashboard/ChartCard.svelte';
	import {
		FileSpreadsheet,
		FileDown,
		FileText,
		Printer,
		TrendingUp,
		BarChart3,
		CheckCircle2,
		ShieldCheck,
		Download
	} from '@lucide/svelte';
	import {
		downloadPurchaseRequestsReport,
		downloadDepartmentBudgetsReport,
		downloadInvoicesReport,
		downloadExecutiveSummaryReport
	} from '$lib/pdfService';

	// Load data
	let prs = $derived(db.getPurchaseRequests() || []);
	let depts = $derived(db.getDepartments() || []);
	let invoices = $derived(db.getInvoices() || []);
	let pos = $derived(db.getPurchaseOrders() || []);
	let currentUser = $derived(globalStore.currentUser);

	// Export functions
	function exportCSV(/** @type {string} */ type) {
		let headers = '';
		let rows = [];

		if (type === 'requests') {
			headers = 'Request ID,Title,Category,Cost,Status,Priority,Created Date\n';
			rows = (prs || []).map(
				(/** @type {any} */ p) =>
					`"${p.id || ''}","${p.title || ''}","${p.category || ''}",${Number(p.estimatedCost || 0)},"${p.status || ''}","${p.priority || ''}","${p.createdAt || ''}"`
			);
		} else if (type === 'budgets') {
			headers = 'Division ID,Division Name,Allocated Budget,Utilized Budget,Remaining Budget\n';
			rows = (depts || []).map(
				(/** @type {any} */ d) =>
					`"${d.id || ''}","${d.name || ''}",${Number(d.allocatedBudget || 0)},${Number(d.utilizedBudget || 0)},${Number(d.remainingBudget !== undefined ? d.remainingBudget : (Number(d.allocatedBudget || 0) - Number(d.utilizedBudget || 0)))}`
			);
		} else {
			headers = 'Invoice Number,PO Link,Amount,Status,Submission Date\n';
			rows = (invoices || []).map(
				(/** @type {any} */ i) => `"${i.invoiceNumber || ''}","${i.poNumber || ''}",${Number(i.amount || 0)},"${i.status || ''}","${i.submittedAt || ''}"`
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

	function handleDownloadPdf(/** @type {string} */ type) {
		try {
			if (type === 'requests') {
				downloadPurchaseRequestsReport(prs || [], currentUser);
				globalStore.showToast('Purchase Requests PDF Ledger downloaded!', 'success');
			} else if (type === 'budgets') {
				downloadDepartmentBudgetsReport(depts || [], currentUser);
				globalStore.showToast('Department Budgets PDF Report downloaded!', 'success');
			} else if (type === 'invoices') {
				downloadInvoicesReport(invoices || [], currentUser);
				globalStore.showToast('Invoices Financial Audit PDF Report downloaded!', 'success');
			} else if (type === 'executive') {
				downloadExecutiveSummaryReport(prs || [], depts || [], invoices || [], pos || [], currentUser);
				globalStore.showToast('Executive Master Audit PDF Report downloaded!', 'success');
			}
		} catch (e) {
			console.error('PDF generation error:', e);
			const err = /** @type {any} */ (e);
			globalStore.showToast('Failed to generate PDF: ' + (err?.message || 'Unknown error'), 'error');
		}
	}

	// Chart options
	let categorySpendingChart = $derived.by(() => {
		const safePrs = prs || [];
		if (safePrs.length === 0) {
			return {
				labels: ['General'],
				datasets: [
					{
						label: 'Billed Value (₹)',
						data: [0],
						backgroundColor: 'rgba(59, 130, 246, 0.6)',
						borderWidth: 0
					}
				]
			};
		}
		const rawCats = safePrs.map((p) => p.category || 'General');
		const cats = Array.from(new Set(rawCats));
		return {
			labels: cats,
			datasets: [
				{
					label: 'Billed Value (₹)',
					data: cats.map((cat) =>
						safePrs
							.filter((p) => (p.category || 'General') === cat)
							.reduce((sum, p) => sum + Number(p.estimatedCost || 0), 0)
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
				Export verified audit PDFs, core ledger spreadsheets, and review real-time budget metrics.
			</p>
		</div>
		<div>
			<button
				onclick={() => handleDownloadPdf('executive')}
				class="btn btn-gradient-primary btn-sm font-black rounded-xl px-4 py-2 flex items-center shadow-lg shadow-sky-600/25 text-xs hover:scale-102 transition-transform"
			>
				<Download class="w-4 h-4 mr-2" />
				Executive Master Audit PDF
			</button>
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
			<div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
				<button onclick={() => handleDownloadPdf('requests')} class="btn btn-gradient-primary btn-xs font-black rounded-xl px-3 py-2 flex items-center shadow-md shadow-sky-600/20">
					<FileText class="w-3.5 h-3.5 mr-1.5" /> Download PDF
				</button>
				<button onclick={() => exportCSV('requests')} class="btn btn-outline btn-xs font-bold rounded-xl px-3 py-2 flex items-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
					<FileDown class="w-3.5 h-3.5 mr-1" /> CSV
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
			<div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
				<button onclick={() => handleDownloadPdf('budgets')} class="btn btn-gradient-primary btn-xs font-black rounded-xl px-3 py-2 flex items-center shadow-md shadow-emerald-600/20">
					<FileText class="w-3.5 h-3.5 mr-1.5" /> Download PDF
				</button>
				<button onclick={() => exportCSV('budgets')} class="btn btn-outline btn-xs font-bold rounded-xl px-3 py-2 flex items-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
					<FileDown class="w-3.5 h-3.5 mr-1" /> CSV
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
			<div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
				<button onclick={() => handleDownloadPdf('invoices')} class="btn btn-gradient-primary btn-xs font-black rounded-xl px-3 py-2 flex items-center shadow-md shadow-purple-600/20">
					<FileText class="w-3.5 h-3.5 mr-1.5" /> Download PDF
				</button>
				<button onclick={() => exportCSV('invoices')} class="btn btn-outline btn-xs font-bold rounded-xl px-3 py-2 flex items-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
					<FileDown class="w-3.5 h-3.5 mr-1" /> CSV
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


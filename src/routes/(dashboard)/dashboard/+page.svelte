<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import ChartCard from '$lib/components/dashboard/ChartCard.svelte';
	import {
		FileText,
		CheckSquare,
		TrendingUp,
		DollarSign,
		Users,
		CreditCard,
		Truck,
		PlusCircle,
		ShieldAlert,
		ListTodo,
		Activity,
		ChevronRight,
		ThumbsUp,
		Building
	} from '@lucide/svelte';

	let currentUser = $derived(globalStore.currentUser);
	let role = $derived(globalStore.currentUser?.role || 'Employee');

	// Recalculate stats dynamically from mock DB reactively
	let stats = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		const pos = db.getPurchaseOrders();
		const depts = db.getDepartments();
		const invoices = db.getInvoices();
		const vendors = db.getVendors();
		const quotes = db.getQuotations();
		const deliveries = db.getDeliveries();

		const myPrs = prs.filter((/** @type {any} */ p) => p.requesterId === currentUser?.id);
		const myDeptPrs = prs.filter((/** @type {any} */ p) => p.departmentId === currentUser?.departmentId);

		switch (role) {
			case 'Employee':
				return {
					totalPrs: myPrs.length,
					approvedPrs: myPrs.filter((/** @type {any} */ p) => p.status === 'Approved').length,
					pendingPrs: myPrs.filter((/** @type {any} */ p) => p.status === 'Pending Approval').length,
					estimatedCost: myPrs.reduce((/** @type {number} */ sum, /** @type {any} */ p) => sum + p.estimatedCost, 0)
				};
			case 'Manager':
				const myDept = depts.find((/** @type {any} */ d) => d.id === currentUser?.departmentId);
				return {
					budgetUtilized: myDept?.utilizedBudget || 0,
					budgetRemaining: myDept?.remainingBudget || 0,
					pendingApprovals: prs.filter(
						(/** @type {any} */ p) => (p.departmentId === currentUser?.departmentId || p.budgetStatus === 'Over Budget') && p.status === 'Pending Approval'
					).length,
					totalDeptValue: myDeptPrs.reduce((/** @type {number} */ sum, /** @type {any} */ p) => sum + p.estimatedCost, 0)
				};
			case 'Vendor':
				const myQuotes = quotes.filter((/** @type {any} */ q) => q.vendorId === currentUser?.vendorId);
				const myPos = pos.filter((/** @type {any} */ p) => p.vendorId === currentUser?.vendorId);
				return {
					submittedQuotes: myQuotes.length,
					acceptedQuotes: myQuotes.filter((/** @type {any} */ q) => q.status === 'Accepted').length,
					pendingDeliveries: myPos.filter((/** @type {any} */ p) => p.status === 'Issued').length,
					invoiceCount: invoices.filter((/** @type {any} */ i) => pos.find((/** @type {any} */ p) => p.poNumber === i.poNumber && p.vendorId === currentUser?.vendorId)).length
				};
			default:
				return {};
		}
	});

	// Tasks lists
	let pendingTasks = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		const invoices = db.getInvoices();
		const pos = db.getPurchaseOrders();
		const myPrs = prs.filter((/** @type {any} */ p) => p.requesterId === currentUser?.id);

		if (role === 'Employee') {
			return myPrs
				.filter((/** @type {any} */ p) => p.status === 'Pending Approval')
				.map((/** @type {any} */ p) => ({
					id: p.id,
					title: `Track Request: ${p.title}`,
					desc: `Awaiting approval from Manager | ₹${p.estimatedCost}`,
					link: '/purchase-requests'
				}));
		}
		if (role === 'Manager') {
			const deptPrs = prs
				.filter(
					(/** @type {any} */ p) => p.status === 'Pending Approval' && p.departmentId === currentUser?.departmentId
				)
				.map((/** @type {any} */ p) => ({
					id: p.id,
					title: `Approve Request: ${p.title}`,
					desc: `Submitted by Staff | ₹${p.estimatedCost}`,
					link: '/approvals'
				}));
			const overBudget = prs
				.filter((/** @type {any} */ p) => p.status === 'Pending Approval' && p.budgetStatus === 'Over Budget' && p.departmentId !== currentUser?.departmentId)
				.map((/** @type {any} */ p) => ({
					id: p.id,
					title: `Budget Exception: ${p.title}`,
					desc: `Cost: ₹${p.estimatedCost} exceeds department budget!`,
					link: '/approvals'
				}));
			const invs = invoices
				.filter((/** @type {any} */ i) => i.status === 'Unverified')
				.map((/** @type {any} */ i) => ({
					id: i.id,
					title: `Verify Invoice: ${i.invoiceNumber}`,
					desc: `Amount: ₹${i.amount} | PO: ${i.poNumber}`,
					link: '/invoices'
				}));
			return [...deptPrs, ...overBudget, ...invs];
		}
		if (role === 'Vendor') {
			return pos
				.filter((/** @type {any} */ p) => p.status === 'Issued')
				.map((/** @type {any} */ p) => ({
					id: p.id,
					title: `Process Delivery: ${p.poNumber}`,
					desc: `Value: ₹${p.totalAmount} | Needs packing & dispatch confirmation.`,
					link: '/deliveries'
				}));
		}
		return [];
	});

	// Charts configs
	let departmentBudgetChartData = $derived.by(() => {
		const depts = db.getDepartments();
		return {
			labels: depts.map((/** @type {any} */ d) => d.name),
			datasets: [
				{
					label: 'Allocated ($)',
					data: depts.map((/** @type {any} */ d) => d.allocatedBudget),
					backgroundColor: 'rgba(59, 130, 246, 0.5)',
					borderColor: 'rgb(59, 130, 246)',
					borderWidth: 1
				},
				{
					label: 'Utilized ($)',
					data: depts.map((/** @type {any} */ d) => d.utilizedBudget),
					backgroundColor: 'rgba(16, 185, 129, 0.5)',
					borderColor: 'rgb(16, 185, 129)',
					borderWidth: 1
				}
			]
		};
	});

	let requestStatusChartData = $derived.by(() => {
		const prs = db.getPurchaseRequests();
		const statuses = ['Pending Approval', 'Approved', 'Rejected', 'Draft'];
		return {
			labels: statuses,
			datasets: [
				{
					data: statuses.map((s) => prs.filter((/** @type {any} */ p) => p.status === s).length),
					backgroundColor: [
						'rgba(245, 158, 11, 0.7)',
						'rgba(16, 185, 129, 0.7)',
						'rgba(239, 68, 68, 0.7)',
						'rgba(107, 114, 128, 0.7)'
					],
					borderWidth: 0
				}
			]
		};
	});
</script>

<div class="space-y-6">
	<!-- Top Greeting with Context Role banner -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
		<div class="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Welcome back, <span class="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">{currentUser?.fullName || currentUser?.username || 'User'}</span>!
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				You are logged in as <b class="text-sky-600 dark:text-sky-400 font-bold uppercase">{role}</b>. Here is your operational control center.
			</p>
		</div>
		<div class="flex items-center gap-3 shrink-0">
			{#if role === 'Employee'}
				<a href="/purchase-requests" class="btn btn-gradient-primary btn-sm text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 px-4 py-2 flex items-center">
					<PlusCircle class="w-4 h-4 mr-1.5" />
					New Request
				</a>
			{/if}
			<button onclick={() => db.reset()} class="btn btn-ghost btn-sm text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
				Reset Mock Data
			</button>
		</div>
	</div>

	<!-- Dynamic KPI Metric Grid based on Role -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		{#if role === 'Employee'}
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">My Requests</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.totalPrs}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-blue-600 to-sky-500 text-white rounded-xl shadow-md shadow-blue-500/20"><FileText class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Approved Requests</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.approvedPrs}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-500/20"><ThumbsUp class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Pending Approvals</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.pendingPrs}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-md shadow-amber-500/20"><CheckSquare class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Estimated Value</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">₹{stats.estimatedCost?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-cyan-600 to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/20"><DollarSign class="w-5 h-5" /></div>
			</div>
		{:else if role === 'Manager'}
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Budget Utilized</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">₹{stats.budgetUtilized?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-blue-600 to-sky-500 text-white rounded-xl shadow-md shadow-blue-500/20"><DollarSign class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Budget Remaining</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">₹{stats.budgetRemaining?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-500/20"><TrendingUp class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Awaiting Approval</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.pendingApprovals}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-md shadow-amber-500/20"><CheckSquare class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Department PR Value</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">₹{stats.totalDeptValue?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-indigo-600 to-purple-500 text-white rounded-xl shadow-md shadow-indigo-500/20"><FileText class="w-5 h-5" /></div>
			</div>
		{:else if role === 'Vendor'}
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Submitted Quotes</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.submittedQuotes}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-blue-600 to-sky-500 text-white rounded-xl shadow-md shadow-blue-500/20"><FileText class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Orders Won</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.acceptedQuotes}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-500/20"><ThumbsUp class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Pending Deliveries</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.pendingDeliveries}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-md shadow-amber-500/20"><Truck class="w-5 h-5" /></div>
			</div>
			<div class="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex flex-row items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
				<div>
					<span class="text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">Invoiced Total</span>
					<h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.invoiceCount}</h3>
				</div>
				<div class="p-3 bg-gradient-to-tr from-purple-600 to-pink-500 text-white rounded-xl shadow-md shadow-purple-500/20"><DollarSign class="w-5 h-5" /></div>
			</div>
		{/if}
	</div>

	<!-- Analytics Charts Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<div class="lg:col-span-8">
			<ChartCard
				title="Department Budget Utilization"
				type="bar"
				data={departmentBudgetChartData}
				options={{
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: (/** @type {any} */ val) => '₹' + Number(val).toLocaleString()
							}
						}
					}
				}}
			/>
		</div>
		<div class="lg:col-span-4">
			<ChartCard
				title="Purchase Requests status distribution"
				type="doughnut"
				data={requestStatusChartData}
			/>
		</div>
	</div>

	<!-- Task & Recent Activity Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Task Checklist -->
		<div class="lg:col-span-7 glass-card border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 rounded-2xl flex flex-col">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
				<h3 class="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<ListTodo class="w-4.5 h-4.5 text-sky-500" />
					Action Items & Pending Tasks
				</h3>
				<span class="badge bg-sky-500 text-white font-extrabold text-[10px] tracking-wider uppercase border-none px-2.5 py-1 rounded-full">
					{pendingTasks.length} Active
				</span>
			</div>
			<div class="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1 overflow-y-auto space-y-3">
				{#if pendingTasks.length === 0}
					<div class="p-8 text-center text-slate-400 text-xs font-semibold">
						No pending action items!
					</div>
				{:else}
					{#each pendingTasks as task}
						<div class="flex items-center justify-between pt-3.5 first:pt-0 group">
							<div>
								<h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors">{task.title}</h4>
								<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{task.desc}</p>
							</div>
							<a
								href={task.link}
								class="btn btn-ghost btn-xs text-sky-600 dark:text-sky-400 font-extrabold flex items-center gap-1 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-3 py-1 rounded-lg transition-all"
							>
								View
								<ChevronRight class="w-3.5 h-3.5" />
							</a>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right: Recent Activities (Audit Log) -->
		<div class="lg:col-span-5 glass-card border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 rounded-2xl flex flex-col">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
				<h3 class="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<Activity class="w-4.5 h-4.5 text-sky-500" />
					Recent Activity Log
				</h3>
			</div>
			<div class="space-y-4 overflow-y-auto max-h-75 flex-1">
				{#each db.getAuditLogs().slice(0, 5) as log}
					<div class="flex items-start gap-3">
						<div class="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sky-500 shrink-0 mt-0.5 shadow-xs">
							<TrendingUp class="w-3.5 h-3.5" />
						</div>
						<div>
							<p class="text-xs font-bold text-slate-800 dark:text-slate-200">
								{log.username}
								<span class="font-medium text-slate-400">({log.role})</span>
							</p>
							<p class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{log.action}: {log.details}</p>
							<span class="text-[9px] text-slate-400 font-extrabold uppercase mt-1 block">
								{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>


<script lang="ts">
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

		const myPrs = prs.filter((p) => p.requesterId === currentUser?.id);
		const myDeptPrs = prs.filter((p) => p.departmentId === currentUser?.departmentId);

		switch (role) {
			case 'Employee':
				return {
					totalPrs: myPrs.length,
					approvedPrs: myPrs.filter((p) => p.status === 'Approved').length,
					pendingPrs: myPrs.filter((p) => p.status === 'Pending Approval').length,
					estimatedCost: myPrs.reduce((sum, p) => sum + p.estimatedCost, 0)
				};
			case 'Manager':
				const myDept = depts.find((d) => d.id === currentUser?.departmentId);
				return {
					budgetUtilized: myDept?.utilizedBudget || 0,
					budgetRemaining: myDept?.remainingBudget || 0,
					pendingApprovals: prs.filter(
						(p) => (p.departmentId === currentUser?.departmentId || p.budgetStatus === 'Over Budget') && p.status === 'Pending Approval'
					).length,
					totalDeptValue: myDeptPrs.reduce((sum, p) => sum + p.estimatedCost, 0)
				};
			case 'Vendor':
				const myQuotes = quotes.filter((q) => q.vendorId === currentUser?.vendorId);
				const myPos = pos.filter((p) => p.vendorId === currentUser?.vendorId);
				return {
					submittedQuotes: myQuotes.length,
					acceptedQuotes: myQuotes.filter((q) => q.status === 'Accepted').length,
					pendingDeliveries: myPos.filter((p) => p.status === 'Issued').length,
					invoiceCount: invoices.filter((i) => pos.find((p) => p.poNumber === i.poNumber && p.vendorId === currentUser?.vendorId)).length
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
		const myPrs = prs.filter((p) => p.requesterId === currentUser?.id);

		if (role === 'Employee') {
			return myPrs
				.filter((p) => p.status === 'Pending Approval')
				.map((p) => ({
					id: p.id,
					title: `Track Request: ${p.title}`,
					desc: `Awaiting approval from Manager | ₹${p.estimatedCost}`,
					link: '/purchase-requests'
				}));
		}
		if (role === 'Manager') {
			const deptPrs = prs
				.filter(
					(p) => p.status === 'Pending Approval' && p.departmentId === currentUser?.departmentId
				)
				.map((p) => ({
					id: p.id,
					title: `Approve Request: ${p.title}`,
					desc: `Submitted by Staff | ₹${p.estimatedCost}`,
					link: '/approvals'
				}));
			const overBudget = prs
				.filter((p) => p.status === 'Pending Approval' && p.budgetStatus === 'Over Budget' && p.departmentId !== currentUser?.departmentId)
				.map((p) => ({
					id: p.id,
					title: `Budget Exception: ${p.title}`,
					desc: `Cost: ₹${p.estimatedCost} exceeds department budget!`,
					link: '/approvals'
				}));
			const invs = invoices
				.filter((i) => i.status === 'Unverified')
				.map((i) => ({
					id: i.id,
					title: `Verify Invoice: ${i.invoiceNumber}`,
					desc: `Amount: ₹${i.amount} | PO: ${i.poNumber}`,
					link: '/invoices'
				}));
			return [...deptPrs, ...overBudget, ...invs];
		}
		if (role === 'Vendor') {
			return pos
				.filter((p) => p.status === 'Issued')
				.map((p) => ({
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
			labels: depts.map((d) => d.name),
			datasets: [
				{
					label: 'Allocated ($)',
					data: depts.map((d) => d.allocatedBudget),
					backgroundColor: 'rgba(59, 130, 246, 0.5)',
					borderColor: 'rgb(59, 130, 246)',
					borderWidth: 1
				},
				{
					label: 'Utilized ($)',
					data: depts.map((d) => d.utilizedBudget),
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
					data: statuses.map((s) => prs.filter((p) => p.status === s).length),
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
	<div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
				Welcome back, {currentUser?.fullName}!
			</h1>
			<p class="text-xs text-slate-500 mt-1 font-medium">
				You are signed in as a <b class="text-primary font-bold uppercase">{role}</b>. Here is your operations overview.
			</p>
		</div>
		<div class="flex gap-2">
			{#if role === 'Employee'}
				<a href="/purchase-requests" class="btn btn-primary btn-sm text-xs font-semibold rounded-lg">
					<PlusCircle class="w-4 h-4 mr-1.5" />
					New Request
				</a>
			{/if}
			<button onclick={() => db.reset()} class="btn btn-ghost border-slate-200 hover:bg-slate-50 btn-sm text-xs font-semibold rounded-lg text-slate-600">
				Reset Mock Data
			</button>
		</div>
	</div>

	<!-- Dynamic KPI Metric Grid based on Role -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		{#if role === 'Employee'}
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">My Requests</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalPrs}</h3>
				</div>
				<div class="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Approved requests</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.approvedPrs}</h3>
				</div>
				<div class="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><ThumbsUp class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Pending Approvals</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.pendingPrs}</h3>
				</div>
				<div class="p-3 bg-amber-50 text-amber-600 rounded-lg"><CheckSquare class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Estimated Value</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">₹{stats.estimatedCost?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-slate-50 text-slate-600 rounded-lg"><DollarSign class="w-5 h-5" /></div>
			</div>
		{:else if role === 'Manager'}
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Budget Utilized</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">₹{stats.budgetUtilized?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Budget Remaining</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">₹{stats.budgetRemaining?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Awaiting Approval</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.pendingApprovals}</h3>
				</div>
				<div class="p-3 bg-amber-50 text-amber-600 rounded-lg"><CheckSquare class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Total Department PRs</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">₹{stats.totalDeptValue?.toLocaleString()}</h3>
				</div>
				<div class="p-3 bg-slate-50 text-slate-600 rounded-lg"><FileText class="w-5 h-5" /></div>
			</div>
		{:else if role === 'Vendor'}
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Submitted Quotes</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.submittedQuotes}</h3>
				</div>
				<div class="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Orders Won</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.acceptedQuotes}</h3>
				</div>
				<div class="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><ThumbsUp class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Pending Deliveries</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.pendingDeliveries}</h3>
				</div>
				<div class="p-3 bg-amber-50 text-amber-600 rounded-lg"><Truck class="w-5 h-5" /></div>
			</div>
			<div class="card bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
				<div>
					<span class="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Invoiced Total</span>
					<h3 class="text-2xl font-extrabold text-slate-800 mt-1">{stats.invoiceCount}</h3>
				</div>
				<div class="p-3 bg-slate-50 text-slate-600 rounded-lg"><DollarSign class="w-5 h-5" /></div>
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
								callback: (val: any) => '₹' + Number(val).toLocaleString()
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
		<div class="lg:col-span-7 card bg-white border border-slate-200/80 shadow-sm p-6 rounded-xl flex flex-col">
			<div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
				<h3 class="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
					<ListTodo class="w-4.5 h-4.5 text-primary" />
					Action Items & Pending Tasks
				</h3>
				<span class="badge badge-primary font-bold text-[10px] tracking-wider uppercase px-2">
					{pendingTasks.length} Active
				</span>
			</div>
			<div class="divide-y divide-slate-100/80 flex-1 overflow-y-auto space-y-3">
				{#each pendingTasks as task}
					<div class="flex items-center justify-between pt-3 first:pt-0">
						<div>
							<h4 class="text-xs font-bold text-slate-800">{task.title}</h4>
							<p class="text-[11px] text-slate-500 mt-0.5">{task.desc}</p>
						</div>
						<a
							href={task.link}
							class="btn btn-ghost btn-xs text-primary font-bold flex items-center gap-0.5 hover:bg-slate-50 px-2 py-1 rounded"
						>
							View
							<ChevronRight class="w-3.5 h-3.5" />
						</a>
					</div>
				{/each}
			</div>
		</div>

		<!-- Right: Recent Activities (Audit Log) -->
		<div class="lg:col-span-5 card bg-white border border-slate-200/80 shadow-sm p-6 rounded-xl flex flex-col">
			<div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
				<h3 class="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
					<Activity class="w-4.5 h-4.5 text-primary" />
					Recent Activity Log
				</h3>
			</div>
			<div class="space-y-4 overflow-y-auto max-h-[300px] flex-1">
				{#each db.getAuditLogs().slice(0, 5) as log}
					<div class="flex items-start gap-3">
						<div class="p-1.5 bg-slate-50 rounded-lg text-slate-600 mt-0.5">
							<TrendingUp class="w-3.5 h-3.5" />
						</div>
						<div>
							<p class="text-xs font-bold text-slate-800">
								{log.username}
								<span class="font-normal text-slate-500">({log.role})</span>
							</p>
							<p class="text-[10px] text-slate-600 mt-0.5 leading-snug">{log.action}: {log.details}</p>
							<span class="text-[8px] text-slate-400 font-semibold uppercase mt-1 block">
								{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

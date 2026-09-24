<script>
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import {
		ShieldCheck,
		ArrowRight,
		Layers,
		CheckCircle,
		FileText,
		Truck,
		Globe,
		Mail,
		Send,
		CheckCircle2,
		Sun,
		Moon,
		Sparkles,
		TrendingUp,
		Zap,
		Sliders,
		Building2,
		Search,
		Filter,
		Check,
		Clock,
		AlertCircle,
		Lock,
		Database,
		Server,
		ExternalLink
	} from '@lucide/svelte';

	function handleEnterPortal() {
		if (globalStore.currentUser) {
			if (globalStore.currentUser.role === 'Employee') {
				goto('/purchase-requests');
			} else {
				goto('/dashboard');
			}
		} else {
			goto('/login');
		}
	}

	let newsletterEmail = $state('');

	function handleNewsletterSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (newsletterEmail) {
			globalStore.showToast('Thank you for subscribing to ProcureSmart Enterprise updates.', 'success');
			newsletterEmail = '';
		}
	}

	// Interactive App Shell State
	let activeTab = $state('pr'); // 'pr' | 'rfq' | 'grn' | 'invoice'
	let statusFilter = $state('ALL'); // 'ALL' | 'APPROVED' | 'PENDING'
	let searchQuery = $state('');

	let mockPRs = $state([
		{
			id: 'PR-2026-104',
			item: 'Dell PowerEdge R760 Rack Server',
			dept: 'IT Infrastructure',
			qty: 2,
			amount: 18500,
			tax: 3330,
			status: 'AUTO_APPROVED',
			requester: 'Alex Mercer'
		},
		{
			id: 'PR-2026-108',
			item: 'Apple MacBook Pro 16" M3 Max (32GB)',
			dept: 'Product Engineering',
			qty: 5,
			amount: 17495,
			tax: 3149,
			status: 'PENDING_MANAGER',
			requester: 'Sarah Jenkins'
		},
		{
			id: 'PR-2026-112',
			item: 'Cisco Catalyst 9300 48-Port Switch',
			dept: 'Network Operations',
			qty: 3,
			amount: 12600,
			tax: 2268,
			status: 'AUTO_APPROVED',
			requester: 'David Chen'
		},
		{
			id: 'PR-2026-119',
			item: 'Ergonomic Standing Desks & Chairs',
			dept: 'Facilities & Ops',
			qty: 12,
			amount: 8400,
			tax: 1512,
			status: 'GRN_VERIFIED',
			requester: 'Priya Sharma'
		}
	]);

	function approvePR(/** @type {string} */ id) {
		mockPRs = mockPRs.map((pr) => (pr.id === id ? { ...pr, status: 'AUTO_APPROVED' } : pr));
		globalStore.showToast(`Request ${id} approved & synchronized with budget pool.`, 'success');
	}

	let filteredPRs = $derived(
		mockPRs.filter((pr) => {
			const matchesStatus =
				statusFilter === 'ALL' ||
				(statusFilter === 'APPROVED' && (pr.status === 'AUTO_APPROVED' || pr.status === 'GRN_VERIFIED')) ||
				(statusFilter === 'PENDING' && pr.status === 'PENDING_MANAGER');

			const matchesSearch =
				searchQuery === '' ||
				pr.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
				pr.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				pr.dept.toLowerCase().includes(searchQuery.toLowerCase());

			return matchesStatus && matchesSearch;
		})
	);
</script>

<svelte:head>
	<title>ProcureSmart Enterprise ERP | Automated 3-Way Matching & Procurement</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col font-sans transition-colors duration-300 {globalStore.theme ===
	'dark'
		? 'bg-slate-950 text-slate-100'
		: 'bg-slate-50 text-slate-900'}"
>
	<!-- Subtle Ambient Grid Background -->
	<div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"></div>

	<!-- Top Navigation Header -->
	<header
		class="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20 border-b transition-colors {globalStore.theme ===
		'dark'
			? 'border-slate-800/80 bg-slate-950/80 backdrop-blur-md'
			: 'border-slate-200/80 bg-slate-50/80 backdrop-blur-md'}"
	>
		<!-- Brand Logo -->
		<div class="flex items-center gap-3">
			<div
				class="p-2 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20 flex items-center justify-center"
			>
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span
						class="font-extrabold text-base tracking-tight uppercase block {globalStore.theme ===
						'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						ProcureSmart
					</span>
					<span
						class="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20"
					>
						Enterprise
					</span>
				</div>
				<span class="text-[10px] text-slate-400 font-semibold tracking-wider block"
					>Unified ERP & Supply Audit</span
				>
			</div>
		</div>

		<!-- Nav Links -->
		<nav class="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
			<a
				href="#app-preview"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Platform Shell</a
			>
			<a
				href="#modules"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Core Modules</a
			>
			<a
				href="#compliance"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Security & Compliance</a
			>
		</nav>

		<!-- Right Actions -->
		<div class="flex items-center gap-3">
			<!-- Theme Switcher -->
			<button
				onclick={() => globalStore.toggleTheme()}
				class="p-2 rounded-xl border text-xs font-semibold shadow-sm transition-all group {globalStore.theme ===
				'dark'
					? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
					: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}"
				aria-label="Toggle theme"
				title="Toggle Theme"
			>
				{#if globalStore.theme === 'dark'}
					<Sun class="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
				{:else}
					<Moon class="w-4 h-4 text-slate-700 transition-transform group-hover:-rotate-12" />
				{/if}
			</button>

			<button
				onclick={handleEnterPortal}
				class="btn btn-gradient-primary text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
			>
				Access Console
				<ArrowRight class="w-4 h-4" />
			</button>
		</div>
	</header>

	<!-- Main Body -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16 space-y-20 relative z-10">
		<!-- Hero Section -->
		<section class="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6 pt-4">
			<!-- Enterprise Badge -->
			<div
				class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/90 text-sky-400 border-slate-800'
					: 'bg-white text-sky-700 border-slate-200 shadow-sm'}"
			>
				<span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
				<span>Automated 3-Way Invoice Matching & Budget Validation</span>
			</div>

			<h1
				class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] {globalStore.theme ===
				'dark'
					? 'text-white'
					: 'text-slate-900'}"
			>
				Enterprise Procurement <br class="hidden sm:inline" />
				<span class="bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent"
					>Engineered for Precision</span
				>
			</h1>

			<p
				class="text-sm md:text-base leading-relaxed max-w-2xl font-normal mx-auto {globalStore.theme ===
				'dark'
					? 'text-slate-300'
					: 'text-slate-600'}"
			>
				Unify itemized purchase requisitions, competitive RFQ bidding, Goods Receipt Notes (GRN),
				and pro-forma GST tax reconciliation in one auditable platform.
			</p>

			<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
				<button
					onclick={handleEnterPortal}
					class="btn btn-gradient-primary text-sm font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
				>
					Launch Enterprise Console
					<ArrowRight class="w-4 h-4" />
				</button>
				<a
					href="#app-preview"
					class="btn border text-sm font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] {globalStore.theme ===
					'dark'
						? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-850'
						: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'}"
				>
					View Live App Shell
				</a>
			</div>

			<!-- Enterprise Trust Badges Bar -->
			<div class="pt-6 border-t w-full max-w-3xl flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400 border-slate-800/40">
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="w-4 h-4 text-sky-500" />
					<span>SOC 2 Type II Certified</span>
				</div>
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="w-4 h-4 text-sky-500" />
					<span>Automated GSTIN Verification</span>
				</div>
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="w-4 h-4 text-sky-500" />
					<span>SAP & Tally Integration Ready</span>
				</div>
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="w-4 h-4 text-sky-500" />
					<span>256-bit AES Encryption</span>
				</div>
			</div>
		</section>

		<!-- Real Interactive App Shell Preview Section -->
		<section id="app-preview" class="space-y-6 pt-4">
			<div class="text-center max-w-xl mx-auto space-y-2">
				<span class="text-xs font-black uppercase tracking-widest text-sky-500">Live Operating System Shell</span>
				<h2 class="text-2xl sm:text-3xl font-black {globalStore.theme === 'dark' ? 'text-white' : 'text-slate-900'}">
					ProcureSmart ERP Workspace
				</h2>
				<p class="text-xs sm:text-sm text-slate-400">
					Explore real-time requisitions, status filters, and one-click manager approval workflows.
				</p>
			</div>

			<!-- Browser Window Shell Frame -->
			<div
				class="rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 {globalStore.theme ===
				'dark'
					? 'bg-slate-900/90 border-slate-800/90 shadow-slate-950/80'
					: 'bg-white border-slate-200/90 shadow-slate-300/60'}"
			>
				<!-- Window Header Bar -->
				<div
					class="px-5 py-3 border-b flex items-center justify-between gap-4 {globalStore.theme ===
					'dark'
						? 'bg-slate-950 border-slate-800'
						: 'bg-slate-100/90 border-slate-200'}"
				>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full bg-rose-500/80"></div>
						<div class="w-3 h-3 rounded-full bg-amber-500/80"></div>
						<div class="w-3 h-3 rounded-full bg-emerald-500/80"></div>
					</div>

					<!-- URL / Location Bar -->
					<div
						class="flex-1 max-w-md mx-auto px-4 py-1 rounded-lg text-[11px] font-mono text-center truncate border {globalStore.theme ===
						'dark'
							? 'bg-slate-900 border-slate-800 text-slate-400'
							: 'bg-white border-slate-200 text-slate-600'}"
					>
						procuresmart.internal/enterprise/purchase-requests
					</div>

					<div class="flex items-center gap-2 text-xs font-bold text-emerald-500">
						<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						<span class="hidden sm:inline">LIVE DB CONNECTED</span>
					</div>
				</div>

				<!-- App Navigation Tabs Bar -->
				<div
					class="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 {globalStore.theme ===
					'dark'
						? 'bg-slate-900/60 border-slate-800'
						: 'bg-slate-50 border-slate-200'}"
				>
					<!-- Module Selector Pills -->
					<div class="flex flex-wrap items-center gap-2">
						<button
							onclick={() => (activeTab = 'pr')}
							class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab ===
							'pr'
								? 'bg-sky-600 text-white shadow'
								: 'text-slate-400 hover:text-slate-200'}"
						>
							<Layers class="w-3.5 h-3.5" />
							Purchase Requisitions ({mockPRs.length})
						</button>
						<button
							onclick={() => (activeTab = 'rfq')}
							class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab ===
							'rfq'
								? 'bg-sky-600 text-white shadow'
								: 'text-slate-400 hover:text-slate-200'}"
						>
							<FileText class="w-3.5 h-3.5" />
							RFQ Vendor Quotes
						</button>
						<button
							onclick={() => (activeTab = 'grn')}
							class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab ===
							'grn'
								? 'bg-sky-600 text-white shadow'
								: 'text-slate-400 hover:text-slate-200'}"
						>
							<Truck class="w-3.5 h-3.5" />
							GRN Logistics Logs
						</button>
					</div>

					<!-- Filter Buttons -->
					<div class="flex items-center gap-2 text-xs">
						<span class="text-slate-400 font-semibold hidden sm:inline">Status:</span>
						<button
							onclick={() => (statusFilter = 'ALL')}
							class="px-2.5 py-1 rounded text-[11px] font-bold border transition-all {statusFilter ===
							'ALL'
								? 'bg-slate-700 text-white border-slate-600'
								: 'border-transparent text-slate-400 hover:text-slate-200'}"
						>
							All
						</button>
						<button
							onclick={() => (statusFilter = 'PENDING')}
							class="px-2.5 py-1 rounded text-[11px] font-bold border transition-all {statusFilter ===
							'PENDING'
								? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
								: 'border-transparent text-slate-400 hover:text-slate-200'}"
						>
							Pending Review
						</button>
						<button
							onclick={() => (statusFilter = 'APPROVED')}
							class="px-2.5 py-1 rounded text-[11px] font-bold border transition-all {statusFilter ===
							'APPROVED'
								? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
								: 'border-transparent text-slate-400 hover:text-slate-200'}"
						>
							Approved
						</button>
					</div>
				</div>

				<!-- App Shell Content Table -->
				<div class="p-6 overflow-x-auto">
					{#if activeTab === 'pr'}
						<table class="w-full text-left border-collapse text-xs">
							<thead>
								<tr
									class="border-b font-bold uppercase tracking-wider text-slate-400 {globalStore.theme ===
									'dark'
										? 'border-slate-800'
										: 'border-slate-200'}"
								>
									<th class="py-3 px-4">Req ID</th>
									<th class="py-3 px-4">Item Description</th>
									<th class="py-3 px-4">Department</th>
									<th class="py-3 px-4">Qty</th>
									<th class="py-3 px-4">Est. Subtotal</th>
									<th class="py-3 px-4">GST (18%)</th>
									<th class="py-3 px-4">Audit Status</th>
									<th class="py-3 px-4 text-right">Quick Action</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-800/40">
								{#each filteredPRs as pr}
									<tr
										class="transition-colors hover:bg-slate-800/30 {globalStore.theme === 'dark'
											? 'text-slate-200'
											: 'text-slate-800'}"
									>
										<td class="py-3.5 px-4 font-mono font-bold text-sky-500">{pr.id}</td>
										<td class="py-3.5 px-4 font-semibold">{pr.item}</td>
										<td class="py-3.5 px-4 text-slate-400">{pr.dept}</td>
										<td class="py-3.5 px-4 font-mono">{pr.qty}</td>
										<td class="py-3.5 px-4 font-mono font-bold">${pr.amount.toLocaleString()}</td>
										<td class="py-3.5 px-4 font-mono text-emerald-500">+${pr.tax.toLocaleString()}</td>
										<td class="py-3.5 px-4">
											{#if pr.status === 'AUTO_APPROVED'}
												<span
													class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit"
												>
													<CheckCircle class="w-3 h-3" /> Auto-Approved
												</span>
											{:else if pr.status === 'GRN_VERIFIED'}
												<span
													class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1 w-fit"
												>
													<Truck class="w-3 h-3" /> GRN Received
												</span>
											{:else}
												<span
													class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit"
												>
													<Clock class="w-3 h-3" /> Manager Review
												</span>
											{/if}
										</td>
										<td class="py-3.5 px-4 text-right">
											{#if pr.status === 'PENDING_MANAGER'}
												<button
													onclick={() => approvePR(pr.id)}
													class="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all"
												>
													Approve PR
												</button>
											{:else}
												<button
													onclick={handleEnterPortal}
													class="px-3 py-1 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] font-bold transition-all"
												>
													View PO #
												</button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else if activeTab === 'rfq'}
						<!-- RFQ Tab Preview -->
						<div class="space-y-4">
							<div class="flex items-center justify-between text-xs font-bold">
								<span class="text-slate-400">Competitive Bids for PR-2026-104 (Rack Server)</span>
								<span class="text-sky-500">2 Vendor Responses Received</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
								<div
									class="p-4 rounded-xl border space-y-3 {globalStore.theme === 'dark'
										? 'bg-slate-950/60 border-slate-800'
										: 'bg-slate-50 border-slate-200'}"
								>
									<div class="flex justify-between items-center">
										<span class="font-extrabold text-sm text-sky-400"
											>TechCorp Enterprise Ltd</span
										>
										<span
											class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
											>RANK #1 BID</span
										>
									</div>
									<div class="space-y-1 text-slate-300">
										<div class="flex justify-between">
											<span>Unit Price:</span>
											<span class="font-mono font-bold">$9,250 / unit</span>
										</div>
										<div class="flex justify-between">
											<span>Delivery SLA:</span>
											<span>2 Business Days</span>
										</div>
										<div class="flex justify-between">
											<span>GST Compliance Status:</span>
											<span class="text-emerald-400 font-bold">Verified GSTIN</span>
										</div>
									</div>
								</div>

								<div
									class="p-4 rounded-xl border space-y-3 {globalStore.theme === 'dark'
										? 'bg-slate-950/60 border-slate-800'
										: 'bg-slate-50 border-slate-200'}"
								>
									<div class="flex justify-between items-center">
										<span class="font-extrabold text-sm text-slate-300"
											>Global Logistics & Hardware</span
										>
										<span
											class="px-2 py-0.5 rounded text-[10px] font-black bg-slate-700 text-slate-300"
											>RANK #2 BID</span
										>
									</div>
									<div class="space-y-1 text-slate-300">
										<div class="flex justify-between">
											<span>Unit Price:</span>
											<span class="font-mono font-bold">$9,600 / unit</span>
										</div>
										<div class="flex justify-between">
											<span>Delivery SLA:</span>
											<span>5 Business Days</span>
										</div>
										<div class="flex justify-between">
											<span>GST Compliance Status:</span>
											<span class="text-emerald-400 font-bold">Verified GSTIN</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					{:else}
						<!-- GRN Tab Preview -->
						<div
							class="p-6 text-center space-y-3 border rounded-xl {globalStore.theme === 'dark'
								? 'bg-slate-950/40 border-slate-800'
								: 'bg-slate-50 border-slate-200'}"
						>
							<Truck class="w-8 h-8 text-sky-500 mx-auto" />
							<div class="font-extrabold text-sm">Goods Receipt Note (GRN) Live Audit Trail</div>
							<p class="text-xs text-slate-400 max-w-md mx-auto">
								All received shipments are matched against Purchase Order specifications before pro-forma invoices are released for 3-Way Matching.
							</p>
							<button
								onclick={handleEnterPortal}
								class="btn btn-gradient-primary text-xs px-4 py-2 rounded-lg"
							>
								Open Deliveries Console
							</button>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Core Enterprise Modules Section -->
		<section id="modules" class="space-y-10 pt-8 border-t border-slate-800/40">
			<div class="text-center max-w-2xl mx-auto space-y-2">
				<span class="text-xs font-black uppercase tracking-widest text-sky-500"
					>Architecture Overview</span
				>
				<h2
					class="text-3xl font-extrabold {globalStore.theme === 'dark'
						? 'text-white'
						: 'text-slate-900'}"
				>
					End-to-End Enterprise Procurement Modules
				</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Module 1 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 {globalStore.theme ===
					'dark'
						? 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40'
						: 'bg-white border-slate-200 shadow-md hover:border-sky-500/40'}"
				>
					<div class="p-3 bg-sky-500/10 text-sky-500 rounded-xl w-fit">
						<Layers class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						Automated Requisition & Budgeting
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Pre-validates departmental cap limits before submission. Route requests automatically based on threshold rules ($5,000 auto-approve vs multi-level manager approvals).
					</p>
				</div>

				<!-- Module 2 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 {globalStore.theme ===
					'dark'
						? 'bg-slate-900/80 border-slate-800 hover:border-blue-500/40'
						: 'bg-white border-slate-200 shadow-md hover:border-blue-500/40'}"
				>
					<div class="p-3 bg-blue-500/10 text-blue-500 rounded-xl w-fit">
						<FileText class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						RFQ Bidding & Vendor Scoring
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Invite vendors to submit competitive quotes. Smart scoring algorithms rank bids by unit price, SLA lead time, GST compliance, and historical performance score.
					</p>
				</div>

				<!-- Module 3 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 {globalStore.theme ===
					'dark'
						? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
						: 'bg-white border-slate-200 shadow-md hover:border-emerald-500/40'}"
				>
					<div class="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit">
						<Truck class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						3-Way Audit Matching & Invoicing
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Reconcile line items between Purchase Orders, Goods Receipt Notes (GRN), and supplier pro-forma invoices with automated CGST, SGST, and TDS tax breakdowns.
					</p>
				</div>
			</div>
		</section>

		<!-- Security & Compliance Section -->
		<section id="compliance" class="space-y-8 pt-8 border-t border-slate-800/40">
			<div class="text-center max-w-xl mx-auto space-y-2">
				<span class="text-xs font-black uppercase tracking-widest text-sky-500">Security & Trust</span>
				<h2
					class="text-2xl sm:text-3xl font-extrabold {globalStore.theme === 'dark'
						? 'text-white'
						: 'text-slate-900'}"
				>
					Enterprise Auditability & Controls
				</h2>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div
					class="p-5 rounded-xl border space-y-2 {globalStore.theme === 'dark'
						? 'bg-slate-900/60 border-slate-800'
						: 'bg-white border-slate-200 shadow-sm'}"
				>
					<Lock class="w-5 h-5 text-sky-500" />
					<div class="font-bold text-xs">Role-Based Access (RBAC)</div>
					<p class="text-[11px] text-slate-400">Strict scoping for Employees, Managers, Vendors & Financial Auditors.</p>
				</div>

				<div
					class="p-5 rounded-xl border space-y-2 {globalStore.theme === 'dark'
						? 'bg-slate-900/60 border-slate-800'
						: 'bg-white border-slate-200 shadow-sm'}"
				>
					<Database class="w-5 h-5 text-emerald-500" />
					<div class="font-bold text-xs">Immutable Audit Logs</div>
					<p class="text-[11px] text-slate-400">Every requisition edit, quote submission, and approval is timestamped.</p>
				</div>

				<div
					class="p-5 rounded-xl border space-y-2 {globalStore.theme === 'dark'
						? 'bg-slate-900/60 border-slate-800'
						: 'bg-white border-slate-200 shadow-sm'}"
				>
					<Server class="w-5 h-5 text-blue-500" />
					<div class="font-bold text-xs">ERP Integration Pipeline</div>
					<p class="text-[11px] text-slate-400">Two-way REST API connector for SAP, Tally, and Oracle NetSuite ERPs.</p>
				</div>

				<div
					class="p-5 rounded-xl border space-y-2 {globalStore.theme === 'dark'
						? 'bg-slate-900/60 border-slate-800'
						: 'bg-white border-slate-200 shadow-sm'}"
				>
					<ShieldCheck class="w-5 h-5 text-cyan-500" />
					<div class="font-bold text-xs">Automated Tax Verification</div>
					<p class="text-[11px] text-slate-400">Real-time GSTIN validation and tax slab calculation engine.</p>
				</div>
			</div>
		</section>

		<!-- Pre-Footer CTA -->
		<section
			class="rounded-2xl p-8 sm:p-12 text-center space-y-5 border transition-all {globalStore.theme ===
			'dark'
				? 'bg-gradient-to-r from-sky-950/60 via-slate-900 to-blue-950/60 border-sky-500/30'
				: 'bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white border-sky-400/30 shadow-xl'}"
		>
			<h3 class="text-2xl sm:text-3xl font-black text-white">
				Ready to Upgrade Your Enterprise Procurement Workflow?
			</h3>
			<p class="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
				Join organizational procurement leads running seamless requisitions, supplier bidding, and financial auditing.
			</p>
			<div class="pt-2">
				<button
					onclick={handleEnterPortal}
					class="btn bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
				>
					Access ProcureSmart Console
				</button>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer
		class="pt-12 pb-10 px-6 border-t text-xs transition-colors {globalStore.theme === 'dark'
			? 'bg-slate-950/90 border-slate-800 text-slate-400'
			: 'bg-white border-slate-200 text-slate-600'}"
	>
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-sky-600 text-white">
					<ShieldCheck class="w-4 h-4" />
				</div>
				<div>
					<span class="font-extrabold text-sm uppercase tracking-tight block text-sky-500"
						>ProcureSmart ERP</span
					>
					<span class="text-[10px] text-slate-500">© 2026 Enterprise Supply Operations Inc.</span>
				</div>
			</div>

			<div class="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span class="text-[10px] uppercase tracking-wider">All Systems Operational - 99.99% Uptime</span>
			</div>
		</div>
	</footer>
</div>

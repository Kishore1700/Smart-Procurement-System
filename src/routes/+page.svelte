<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import {
		ShieldCheck,
		ArrowRight,
		Layers,
		CheckCircle2,
		FileText,
		Truck,
		Sun,
		Moon,
		Sparkles,
		TrendingUp,
		Zap,
		Lock,
		Check
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
</script>

<svelte:head>
	<title>ProcureSmart | Enterprise Procurement System</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden {globalStore.theme ===
	'dark'
		? 'bg-slate-950 text-slate-100'
		: 'bg-slate-50 text-slate-900'}"
>
	<!-- Ambient Background Glow & Subtle Grid -->
	<div
		class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-sky-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none rounded-full"
	></div>
	<div
		class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
	></div>

	<!-- Navigation Header -->
	<header
		class="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20"
	>
		<!-- Logo -->
		<div class="flex items-center gap-3 cursor-pointer" onclick={handleEnterPortal} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && handleEnterPortal()}>
			<div
				class="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/20 flex items-center justify-center"
			>
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<span
					class="font-extrabold text-lg tracking-tight uppercase block {globalStore.theme === 'dark'
						? 'text-white'
						: 'text-slate-900'}"
				>
					Procure<span class="text-sky-500">Smart</span>
				</span>
				<span class="text-[10px] text-slate-400 font-medium tracking-wider block -mt-1"
					>Smart Procurement System</span
				>
			</div>
		</div>

		<!-- Nav Links -->
		<nav class="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
			<a
				href="#features"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Key Features</a
			>
			<a
				href="#modules"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Modules</a
			>
			<a
				href="#security"
				class="hover:text-sky-500 transition-colors {globalStore.theme === 'dark'
					? 'hover:text-white'
					: 'hover:text-slate-900'}">Security</a
			>
		</nav>

		<!-- Right Actions -->
		<div class="flex items-center gap-3">
			<!-- Theme Toggle -->
			<button
				onclick={() => globalStore.toggleTheme()}
				class="p-2.5 rounded-xl border text-xs font-semibold shadow-sm transition-all group {globalStore.theme ===
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
				class="btn bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
			>
				Enter Console
				<ArrowRight class="w-4 h-4" />
			</button>
		</div>
	</header>

	<!-- Main Body -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16 space-y-24 relative z-10">
		<!-- Hero Section -->
		<section class="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 pt-4">
			<!-- Pill Badge -->
			<div
				class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/80 text-sky-400 border-sky-500/30'
					: 'bg-white text-sky-700 border-sky-200 shadow-sm'}"
			>
				<Sparkles class="w-3.5 h-3.5 text-sky-500 animate-pulse" />
				<span>Automated 3-Way Invoice Matching & Procurement</span>
			</div>

			<!-- Headline -->
			<h1
				class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] {globalStore.theme ===
				'dark'
					? 'text-white'
					: 'text-slate-900'}"
			>
				Streamline Enterprise <br class="hidden sm:inline" />
				<span class="bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent"
					>Procurement Effortlessly</span
				>
			</h1>

			<!-- Subtitle -->
			<p
				class="text-sm md:text-base leading-relaxed max-w-2xl text-slate-400 font-normal mx-auto"
			>
				Manage purchase requisitions, RFQ vendor quotes, goods receipts, and budget validation seamlessly in one unified platform.
			</p>

			<!-- CTA Buttons -->
			<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
				<button
					onclick={handleEnterPortal}
					class="btn bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 shadow-xl shadow-sky-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
				>
					Launch Console
					<ArrowRight class="w-4 h-4" />
				</button>
				<a
					href="#features"
					class="btn border text-sm font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] {globalStore.theme ===
					'dark'
						? 'border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800'
						: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'}"
				>
					Explore Features
				</a>
			</div>
		</section>

		<!-- Metrics Highlights Bar -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
			<div
				class="p-5 rounded-2xl border text-center space-y-1 transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/40 border-slate-800/80'
					: 'bg-white border-slate-200 shadow-sm'}"
			>
				<div class="text-2xl font-black text-sky-500">100%</div>
				<div class="text-xs font-semibold text-slate-400">Automated 3-Way Match</div>
			</div>
			<div
				class="p-5 rounded-2xl border text-center space-y-1 transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/40 border-slate-800/80'
					: 'bg-white border-slate-200 shadow-sm'}"
			>
				<div class="text-2xl font-black text-sky-500">&lt; 24h</div>
				<div class="text-xs font-semibold text-slate-400">Approval Cycle</div>
			</div>
			<div
				class="p-5 rounded-2xl border text-center space-y-1 transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/40 border-slate-800/80'
					: 'bg-white border-slate-200 shadow-sm'}"
			>
				<div class="text-2xl font-black text-sky-500">Real-Time</div>
				<div class="text-xs font-semibold text-slate-400">Budget Pool Tracking</div>
			</div>
			<div
				class="p-5 rounded-2xl border text-center space-y-1 transition-all {globalStore.theme ===
				'dark'
					? 'bg-slate-900/40 border-slate-800/80'
					: 'bg-white border-slate-200 shadow-sm'}"
			>
				<div class="text-2xl font-black text-sky-500">GST</div>
				<div class="text-xs font-semibold text-slate-400">Audit Compliant</div>
			</div>
		</section>

		<!-- Core Modules Section -->
		<section id="modules" class="space-y-8">
			<div class="text-center max-w-xl mx-auto space-y-2">
				<span class="text-xs font-bold uppercase tracking-widest text-sky-500"
					>Unified Workflow</span
				>
				<h2
					class="text-2xl sm:text-3xl font-black {globalStore.theme === 'dark'
						? 'text-white'
						: 'text-slate-900'}"
				>
					End-to-End Procurement Modules
				</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Card 1 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 group {globalStore.theme ===
					'dark'
						? 'bg-slate-900/60 border-slate-800 hover:border-sky-500/40'
						: 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-sky-500/40'}"
				>
					<div class="p-3 bg-sky-500/10 text-sky-500 rounded-xl w-fit group-hover:bg-sky-500 group-hover:text-white transition-colors">
						<Layers class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						Purchase Requisitions
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Create and manage itemized requisitions with automated budget checks and manager approval routing.
					</p>
				</div>

				<!-- Card 2 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 group {globalStore.theme ===
					'dark'
						? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40'
						: 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500/40'}"
				>
					<div class="p-3 bg-blue-500/10 text-blue-500 rounded-xl w-fit group-hover:bg-blue-500 group-hover:text-white transition-colors">
						<FileText class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						RFQ & Vendor Quotes
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Compare competitive vendor bids, analyze lead times, and award purchase orders with full transparency.
					</p>
				</div>

				<!-- Card 3 -->
				<div
					class="p-7 rounded-2xl border transition-all duration-300 space-y-4 hover:-translate-y-1 group {globalStore.theme ===
					'dark'
						? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
						: 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500/40'}"
				>
					<div class="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit group-hover:bg-emerald-500 group-hover:text-white transition-colors">
						<Truck class="w-5 h-5" />
					</div>
					<h3
						class="font-extrabold text-base {globalStore.theme === 'dark'
							? 'text-white'
							: 'text-slate-900'}"
					>
						GRN & 3-Way Matching
					</h3>
					<p class="text-xs text-slate-400 leading-relaxed">
						Verify received shipments against Purchase Orders and pro-forma invoices before payment release.
					</p>
				</div>
			</div>
		</section>

		<!-- Features & Security Section -->
		<section id="features" class="space-y-8">
			<div
				class="p-8 md:p-12 rounded-3xl border transition-all {globalStore.theme === 'dark'
					? 'bg-slate-900/60 border-slate-800'
					: 'bg-white border-slate-200 shadow-sm'}"
			>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
					<div class="space-y-4">
						<span class="text-xs font-bold uppercase tracking-widest text-sky-500">Why ProcureSmart?</span>
						<h2
							class="text-2xl sm:text-3xl font-black {globalStore.theme === 'dark'
								? 'text-white'
								: 'text-slate-900'}"
						>
							Built for Compliance & Financial Accuracy
						</h2>
						<p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
							Eliminate manual entry errors, rogue spending, and invoice discrepancies with strict role-based controls and live audit logs.
						</p>
						<div class="space-y-2 pt-2 text-xs font-semibold">
							<div class="flex items-center gap-2.5 text-slate-300">
								<CheckCircle2 class="w-4 h-4 text-sky-500" />
								<span>Role-Based Access Control (Employee, Manager, Vendor, Admin)</span>
							</div>
							<div class="flex items-center gap-2.5 text-slate-300">
								<CheckCircle2 class="w-4 h-4 text-sky-500" />
								<span>Real-time Departmental Budget Validation</span>
							</div>
							<div class="flex items-center gap-2.5 text-slate-300">
								<CheckCircle2 class="w-4 h-4 text-sky-500" />
								<span>Automated Tax Breakdown & Pro-Forma Reconciliation</span>
							</div>
						</div>
					</div>

					<div
						class="p-6 rounded-2xl border space-y-4 {globalStore.theme === 'dark'
							? 'bg-slate-950/80 border-slate-800'
							: 'bg-slate-50 border-slate-200'}"
					>
						<div class="flex items-center justify-between border-b pb-3 border-slate-800/60">
							<div class="flex items-center gap-2 text-xs font-bold">
								<Zap class="w-4 h-4 text-amber-400" />
								<span>System Status</span>
							</div>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
						</div>

						<div class="space-y-3 text-xs">
							<div class="flex justify-between items-center">
								<span class="text-slate-400">Database Engine:</span>
								<span class="font-mono text-sky-400 font-semibold">Supabase PostgreSQL</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-slate-400">Audit Logging:</span>
								<span class="font-mono text-emerald-400 font-semibold">Enabled</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-slate-400">Encryption:</span>
								<span class="font-mono text-slate-300">256-bit AES</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- CTA Banner Section -->
		<section
			class="rounded-3xl p-8 sm:p-12 text-center space-y-6 border transition-all {globalStore.theme ===
			'dark'
				? 'bg-gradient-to-r from-sky-950/60 via-slate-900 to-blue-950/60 border-sky-500/30'
				: 'bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white border-sky-400/30 shadow-xl'}"
		>
			<h3 class="text-2xl sm:text-3xl font-black text-white">
				Ready to Manage Procurement Smarter?
			</h3>
			<p class="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
				Access your enterprise dashboard to oversee purchase requests, approvals, and supplier quotes.
			</p>
			<div class="pt-2">
				<button
					onclick={handleEnterPortal}
					class="btn bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-7 py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2"
				>
					Enter ProcureSmart Console
					<ArrowRight class="w-4 h-4" />
				</button>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer
		class="py-8 px-6 border-t text-xs transition-colors {globalStore.theme === 'dark'
			? 'bg-slate-950/90 border-slate-800 text-slate-400'
			: 'bg-white border-slate-200 text-slate-600'}"
	>
		<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<div class="p-1.5 rounded-lg bg-sky-600 text-white">
					<ShieldCheck class="w-4 h-4" />
				</div>
				<span class="font-extrabold text-sm uppercase tracking-tight text-sky-500"
					>ProcureSmart ERP</span
				>
			</div>
			<span class="text-[11px] text-slate-500">© 2026 ProcureSmart Enterprise. All rights reserved.</span>
		</div>
	</footer>
</div>

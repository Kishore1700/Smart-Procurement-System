<script lang="ts">
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import {
		ShieldCheck,
		ArrowRight,
		Layers,
		CheckCircle,
		FileText,
		Truck,
		TrendingUp,
		Sparkles,
		Grid
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
	<title>ProcureSmart Enterprise | Next-Gen ERP & Procurement</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
	<!-- Background Ambient Glows -->
	<div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"></div>
	<div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>

	<!-- Top Sticky Glassmorphic Navbar -->
	<header class="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
		<div class="max-w-7xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
					<ShieldCheck class="w-6 h-6" />
				</div>
				<div>
					<span class="font-extrabold text-base tracking-wide text-white uppercase block">PROCURERSMART</span>
					<span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Enterprise Hub</span>
				</div>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-xs font-bold text-slate-400 hover:text-emerald-400 cursor-pointer hidden md:inline transition-colors">Features</span>
				<span class="text-xs font-bold text-slate-400 hover:text-emerald-400 cursor-pointer hidden md:inline transition-colors">System Status</span>
				<button 
					onclick={handleEnterPortal} 
					class="btn btn-primary btn-sm text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
				>
					Enter Portal
					<ArrowRight class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	</header>

	<!-- Main Landing Body -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-24 flex flex-col justify-center gap-16 md:gap-24 relative z-10">
		
		<!-- Hero Section -->
		<section class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
			<div class="lg:col-span-7 space-y-6 text-left">
				<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
					<Sparkles class="w-3 h-3" />
					Smart Auto-Verification Enabled
				</div>
				<h1 class="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white">
					Next-Gen Digital <span class="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Procurement</span> System
				</h1>
				<p class="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl">
					Manage enterprise requisitions, budget validations, supply quotations, and draft pro-forma invoicing seamlessly. Designed to unite employees, managers, and vendors in a single, high-fidelity ERP portal.
				</p>
				<div class="flex flex-wrap gap-4 pt-2">
					<button 
						onclick={handleEnterPortal} 
						class="btn btn-primary text-xs font-bold px-8 py-3.5 h-auto rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
					>
						Access Enterprise Console
						<ArrowRight class="w-4 h-4" />
					</button>
					<a 
						href="#features" 
						class="btn btn-outline border-slate-700 hover:bg-slate-800 text-xs font-bold px-8 py-3.5 h-auto rounded-xl text-slate-300"
					>
						Explore Features
					</a>
				</div>
			</div>
			
			<!-- Visual Dashboard Mockup Display -->
			<div class="lg:col-span-5 relative group">
				<div class="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-2xl group-hover:bg-emerald-500/20 transition-all duration-300"></div>
				<div class="relative bg-slate-950/90 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
					<!-- Window Header -->
					<div class="flex items-center justify-between border-b border-slate-800 pb-4">
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
							<span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<span class="text-[10px] text-slate-500 font-bold ml-2">PRO-FORMA INVOICE PREVIEW</span>
						</div>
						<span class="badge badge-success text-[8px] font-extrabold uppercase tracking-wide">Ready</span>
					</div>
					
					<!-- Mock Invoice Details -->
					<div class="space-y-4 text-xs">
						<div class="flex justify-between">
							<div>
								<h4 class="font-extrabold text-white text-xs">ProcurerSmart Ltd.</h4>
								<p class="text-[10px] text-slate-500 mt-0.5">Automated Invoice INV-ROUGH-04</p>
							</div>
							<div class="text-right">
								<span class="text-[10px] text-emerald-400 font-extrabold">₹1,18,000</span>
								<p class="text-[9px] text-slate-500">18% GST Incl.</p>
							</div>
						</div>
						
						<!-- Progress Tracker -->
						<div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<CheckCircle class="w-4 h-4 text-emerald-400" />
								<span class="text-[11px] text-slate-300 font-medium">Auto-approved budget</span>
							</div>
							<span class="text-[10px] text-slate-500 font-bold">100% Limit Available</span>
						</div>
						
						<!-- Features Mini Cards -->
						<div class="grid grid-cols-2 gap-2.5">
							<div class="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
								<span class="text-[10px] text-slate-400 font-bold block">REQUISITION</span>
								<span class="text-xs text-white font-extrabold block mt-0.5">Active Logs</span>
							</div>
							<div class="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
								<span class="text-[10px] text-slate-400 font-bold block">ROUTING STATUS</span>
								<span class="text-xs text-emerald-400 font-extrabold block mt-0.5">Auto-Redirect</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Features Grid Section -->
		<section id="features" class="space-y-10 pt-10 border-t border-slate-800/80">
			<div class="text-center max-w-2xl mx-auto space-y-3">
				<h2 class="text-xs font-black tracking-widest uppercase text-emerald-400">Integrated Capabilities</h2>
				<h3 class="text-2xl md:text-4xl font-extrabold text-white">Full-Suite Procurement Pipeline</h3>
				<p class="text-slate-400 text-xs md:text-sm">
					Empower your enterprise teams with modern, auto-validated workflows across all key stages of the procurement lifecycle.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Card 1 -->
				<div class="p-6 bg-slate-950/40 border border-slate-800/60 rounded-3xl space-y-4 hover:border-emerald-500/20 transition-all duration-300">
					<div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
						<FileText class="w-5 h-5" />
					</div>
					<h4 class="font-bold text-white text-base">Purchase Requests</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Dedicated employee workspace to draft and submit requisitions. Validates estimated costs, inventory needs, and budget thresholds in real-time.
					</p>
				</div>

				<!-- Card 2 -->
				<div class="p-6 bg-slate-950/40 border border-slate-800/60 rounded-3xl space-y-4 hover:border-emerald-500/20 transition-all duration-300">
					<div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
						<Layers class="w-5 h-5" />
					</div>
					<h4 class="font-bold text-white text-base">Manager Approvals</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Unified console for Manager/Admin roles. Approve requests, assess budget utilization, review bids, and issue official Purchase Orders.
					</p>
				</div>

				<!-- Card 3 -->
				<div class="p-6 bg-slate-950/40 border border-slate-800/60 rounded-3xl space-y-4 hover:border-emerald-500/20 transition-all duration-300">
					<div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
						<Truck class="w-5 h-5" />
					</div>
					<h4 class="font-bold text-white text-base">Delivery & Invoicing</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Monitor vendor carrier routes, tracking numbers, and receive items. Auto-generates pro-forma rough invoices with structured GST breakdowns.
					</p>
				</div>
			</div>
		</section>

		<!-- Statistics Section -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-slate-950/50 border border-slate-800/60 rounded-3xl text-center">
			<div>
				<span class="text-2xl md:text-3xl font-black text-white block">₹8L+</span>
				<span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Max Division Limit</span>
			</div>
			<div>
				<span class="text-2xl md:text-3xl font-black text-emerald-400 block">7+</span>
				<span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Integrated Divisions</span>
			</div>
			<div>
				<span class="text-2xl md:text-3xl font-black text-white block">100%</span>
				<span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Audit Trail Logging</span>
			</div>
			<div>
				<span class="text-2xl md:text-3xl font-black text-emerald-400 block">Instant</span>
				<span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Quotation Comparison</span>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
			<p>© 2026 ProcureSmart Enterprise. All corporate divisions integrated.</p>
			<p class="font-medium text-slate-400">Secure AES-256 Portal Connection</p>
		</div>
	</footer>
</div>

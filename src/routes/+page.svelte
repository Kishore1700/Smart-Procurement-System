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
		CheckCircle2
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

	function handleNewsletterSubmit(e) {
		e.preventDefault();
		if (newsletterEmail) {
			globalStore.showToast('Thank you for subscribing to ProcureSmart updates!', 'success');
			newsletterEmail = '';
		}
	}
</script>

<svelte:head>
	<title>ProcureSmart Enterprise | Next-Gen ERP & Procurement</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
	<!-- Background Mesh Gradients -->
	<div class="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none"></div>
	<div class="absolute top-1/3 right-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none"></div>
	<div class="absolute bottom-10 left-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>

	<!-- Top Navigation Bar -->
	<header class="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
		<div class="flex items-center gap-3">
			<div class="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-cyan-400 text-white shadow-lg shadow-sky-500/30">
				<ShieldCheck class="w-6 h-6" />
			</div>
			<div>
				<span class="font-black text-lg tracking-wider bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent uppercase block">ProcureSmart</span>
				<span class="text-[9px] text-sky-400 font-extrabold uppercase tracking-widest block">Enterprise ERP</span>
			</div>
		</div>

		<div class="flex items-center gap-6">
			<button 
				onclick={handleEnterPortal} 
				class="btn btn-gradient-primary text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/25"
			>
				Enter Portal
				<ArrowRight class="w-4 h-4" />
			</button>
		</div>
	</header>

	<!-- Main Landing Body -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-16 md:py-24 flex flex-col justify-center gap-20 md:gap-32 relative z-10">
		
		<!-- Hero Section -->
		<section class="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
			<h1 class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
				Next-Gen Digital <span class="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Procurement</span> System
			</h1>
			<p class="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl font-normal mx-auto">
				Streamline enterprise requisitions, real-time budget validations, supply quotation scoring, and pro-forma invoicing. Designed to connect employees, managers, and vendors in one high-precision platform.
			</p>
			<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
				<button 
					onclick={handleEnterPortal} 
					class="btn btn-gradient-primary text-sm sm:text-base font-semibold px-8 py-3.5 h-auto rounded-2xl flex items-center gap-2.5 shadow-xl shadow-sky-600/30"
				>
					Access Enterprise Console
					<ArrowRight class="w-4 h-4" />
				</button>
				<a 
					href="#features" 
					class="btn btn-ghost border border-slate-800 hover:bg-slate-900 text-sm sm:text-base font-semibold px-8 py-3.5 h-auto rounded-2xl text-slate-200 transition-colors"
				>
					Explore Features
				</a>
			</div>
		</section>

		<!-- Features Grid Section -->
		<section id="features" class="space-y-12 pt-12 border-t border-slate-800/80">
			<div class="text-center max-w-2xl mx-auto space-y-3">
				<h2 class="text-xs font-black tracking-widest uppercase text-sky-400">Integrated Platform Features</h2>
				<h3 class="text-3xl md:text-4xl font-extrabold text-white">Full-Lifecycle Procurement Pipeline</h3>
				<p class="text-slate-400 text-xs md:text-sm">
					Empower your enterprise teams with modern, auto-validated workflows across all key procurement stages.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="p-8 glass-card border border-slate-800 rounded-3xl space-y-5 hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300">
					<div class="p-3.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl w-fit">
						<Layers class="w-6 h-6" />
					</div>
					<h4 class="font-extrabold text-white text-lg">Requisitions & Budgeting</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Employees submit item requisitions with automated budget checks against departmental limits to prevent over-allocation.
					</p>
				</div>

				<div class="p-8 glass-card border border-slate-800 rounded-3xl space-y-5 hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300">
					<div class="p-3.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl w-fit">
						<FileText class="w-6 h-6" />
					</div>
					<h4 class="font-extrabold text-white text-lg">Supplier Quotations</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Vendors submit competitive proposals. Smart scoring algorithms rank bids by price, speed, and past performance history.
					</p>
				</div>

				<div class="p-8 glass-card border border-slate-800 rounded-3xl space-y-5 hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300">
					<div class="p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl w-fit">
						<Truck class="w-6 h-6" />
					</div>
					<h4 class="font-extrabold text-white text-lg">Delivery & Invoicing</h4>
					<p class="text-slate-400 text-xs leading-relaxed">
						Monitor vendor carrier routes, tracking numbers, and receive items. Auto-generates pro-forma rough invoices with structured GST breakdowns.
					</p>
				</div>
			</div>
		</section>

		<!-- Pre-Footer CTA Banner Section -->
		<section class="relative overflow-hidden glass-card border border-sky-500/30 rounded-3xl p-10 md:p-14 text-center space-y-6 shadow-2xl bg-gradient-to-br from-sky-950/40 via-slate-900/80 to-blue-950/40">
			<div class="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
			<div class="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

			<div class="max-w-2xl mx-auto space-y-4">
				<span class="px-3.5 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-widest">
					Transform Your Procurement
				</span>
				<h3 class="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
					Ready to Upgrade Enterprise Supply Operations?
				</h3>
				<p class="text-slate-400 text-xs md:text-sm leading-relaxed max-w-lg mx-auto">
					Join thousands of organizational procurement leads running seamless requisitions, supplier bidding, and automated financial auditing.
				</p>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
				<button 
					onclick={handleEnterPortal} 
					class="btn btn-gradient-primary text-sm sm:text-base font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2"
				>
					Launch Interactive Demo
					<ArrowRight class="w-4 h-4" />
				</button>
			</div>
		</section>
	</main>

	<!-- Footer Section -->
	<footer class="bg-slate-950/90 border-t border-slate-800/80 pt-16 pb-12 px-6 relative z-10 text-slate-300 backdrop-blur-xl">
		<div class="max-w-7xl mx-auto space-y-12">
			<!-- Main Links Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
				<!-- Brand Column -->
				<div class="lg:col-span-2 space-y-5">
					<div class="flex items-center gap-3">
						<div class="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
							<ShieldCheck class="w-6 h-6" />
						</div>
						<div>
							<span class="font-black text-base tracking-wider bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent uppercase block">ProcureSmart</span>
							<span class="text-[9px] text-sky-400 font-extrabold uppercase tracking-widest block">Enterprise ERP System</span>
						</div>
					</div>

					<p class="text-slate-400 text-xs leading-relaxed max-w-sm font-normal">
						Next-generation procurement management software delivering end-to-end requisition workflows, automated budget checks, smart supplier scoring, and financial auditing.
					</p>

					<!-- Live Operational Status Tag -->
					<div class="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3.5 py-2 w-fit text-emerald-400">
						<span class="relative flex h-2 w-2">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
						</span>
						<span class="text-[10px] font-extrabold uppercase tracking-widest">All Core Systems Operational</span>
					</div>

					<!-- Newsletter Subscription Box -->
					<div class="pt-2">
						<span class="text-[11px] font-extrabold text-slate-300 block mb-2">Subscribe to Enterprise Updates</span>
						<form onsubmit={handleNewsletterSubmit} class="flex items-center gap-2 max-w-sm">
							<div class="relative w-full">
								<Mail class="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
								<input 
									type="email" 
									placeholder="enter your work email..." 
									bind:value={newsletterEmail}
									class="input input-sm w-full pl-9 pr-3 py-4 text-xs bg-slate-900 border-slate-800 text-slate-100 focus:border-sky-500 rounded-xl"
								/>
							</div>
							<button type="submit" class="btn btn-gradient-primary btn-sm px-4 rounded-xl flex items-center justify-center shrink-0">
								<Send class="w-3.5 h-3.5" />
							</button>
						</form>
					</div>
				</div>

				<!-- Column 1: Core Modules -->
				<div class="space-y-4">
					<h4 class="text-xs font-black uppercase text-white tracking-widest">Features</h4>
					<ul class="space-y-2.5 text-xs font-medium text-slate-400">
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Purchase Requisitions</a>
						</li>
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Manager Approvals</a>
						</li>
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Supplier Quotation Bidding</a>
						</li>
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Contract Purchase Orders</a>
						</li>
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Delivery Logistics Logs</a>
						</li>
						<li>
							<a href="#features" class="hover:text-sky-400 transition-colors">Pro-Forma Invoices</a>
						</li>
					</ul>
				</div>

				<!-- Column 2: Role Portals -->
				<div class="space-y-4">
					<h4 class="text-xs font-black uppercase text-white tracking-widest">Role Portals</h4>
					<ul class="space-y-2.5 text-xs font-medium text-slate-400">
						<li>
							<button onclick={handleEnterPortal} class="hover:text-sky-400 transition-colors text-left">Employee Console</button>
						</li>
						<li>
							<button onclick={handleEnterPortal} class="hover:text-sky-400 transition-colors text-left">Procurement Manager Hub</button>
						</li>
						<li>
							<button onclick={handleEnterPortal} class="hover:text-sky-400 transition-colors text-left">Vendor Partner Portal</button>
						</li>
						<li>
							<button onclick={handleEnterPortal} class="hover:text-sky-400 transition-colors text-left">System Administration</button>
						</li>
						<li>
							<button onclick={handleEnterPortal} class="hover:text-sky-400 transition-colors text-left">Budget Controller</button>
						</li>
					</ul>
				</div>

				<!-- Column 3: Platform & Security -->
				<div class="space-y-4">
					<h4 class="text-xs font-black uppercase text-white tracking-widest">Security & Trust</h4>
					<ul class="space-y-2.5 text-xs font-medium text-slate-400">
						<li class="flex items-center gap-1.5">
							<CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
							<span>AES-256 Data Encryption</span>
						</li>
						<li class="flex items-center gap-1.5">
							<CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
							<span>Immutable Audit Trail</span>
						</li>
						<li class="flex items-center gap-1.5">
							<CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
							<span>Role-Based Access Control</span>
						</li>
						<li class="flex items-center gap-1.5">
							<CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
							<span>Real-Time GST Verification</span>
						</li>
						<li class="flex items-center gap-1.5">
							<CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
							<span>ISO 27001 Compliant</span>
						</li>
					</ul>
				</div>
			</div>

			<!-- Bottom Bar -->
			<div class="border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
				<div class="flex items-center gap-2 text-slate-400">
					<span>© 2026 ProcureSmart Enterprise. All rights reserved.</span>
				</div>
				
				<div class="flex items-center gap-6 text-slate-400">
					<span class="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer">
						<Globe class="w-3.5 h-3.5 text-sky-400" />
						Asia-Pacific Regional Hub
					</span>
					<span class="font-semibold text-slate-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
						Secure Enterprise Cloud
					</span>
				</div>
			</div>
		</div>
	</footer>
</div>

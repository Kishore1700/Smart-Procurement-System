<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		FileText,
		CheckSquare,
		Users,
		ClipboardList,
		CreditCard,
		Truck,
		DollarSign,
		BarChart3,
		Settings,
		ChevronLeft,
		ChevronRight,
		User,
		Briefcase,
		ShieldAlert
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Guest');
	let isExpanded = $derived(globalStore.sidebarExpanded);

	// Sidebar menu config mapping
	let menuItems = $derived.by(() => {
		const items = [
			{
				label: 'Dashboard',
				href: '/dashboard',
				icon: LayoutDashboard,
				roles: ['Employee', 'Manager', 'Vendor']
			},
			{
				label: 'Purchase Requests',
				href: '/purchase-requests',
				icon: FileText,
				roles: ['Employee', 'Manager']
			},
			{
				label: 'Workflow Approvals',
				href: '/approvals',
				icon: CheckSquare,
				roles: ['Manager']
			},
			{
				label: 'Vendor Management',
				href: '/vendors',
				icon: Users,
				roles: ['Manager']
			},
			{
				label: 'Quotations & Bids',
				href: '/quotations',
				icon: ClipboardList,
				roles: ['Manager']
			},
			{
				label: 'Purchase Orders',
				href: '/purchase-orders',
				icon: CreditCard,
				roles: ['Manager', 'Vendor']
			},
			{
				label: 'Delivery Tracking',
				href: '/deliveries',
				icon: Truck,
				roles: ['Employee', 'Vendor', 'Manager']
			},
			{
				label: 'Invoices',
				href: '/invoices',
				icon: DollarSign,
				roles: ['Manager', 'Vendor']
			},
			{
				label: 'Budget Management',
				href: '/budget',
				icon: Briefcase,
				roles: ['Manager']
			},
			{
				label: 'Analytics & Reports',
				href: '/reports',
				icon: BarChart3,
				roles: ['Manager']
			},
			{
				label: 'System Admin',
				href: '/admin',
				icon: Settings,
				roles: ['Manager']
			}
		];

		return items.filter((item) => item.roles.includes(role));
	});

	function toggleSidebar() {
		globalStore.sidebarExpanded = !globalStore.sidebarExpanded;
	}
</script>

<aside
	class="h-screen flex flex-col transition-all duration-300 shrink-0 relative z-30 shadow-2xl border-r border-slate-800/80 bg-slate-900 text-slate-100"
	style="width: {isExpanded ? '264px' : '76px'};"
>
	<!-- Brand Header -->
	<div class="h-16 flex items-center justify-between px-4.5 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
		<div class="flex items-center gap-3 overflow-hidden">
			<div class="p-2 rounded-xl text-white bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/20">
				<ShieldAlert class="w-5 h-5 shrink-0" />
			</div>
			{#if isExpanded}
				<div class="flex flex-col whitespace-nowrap animate-fade-in">
					<span class="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent uppercase">ProcureSmart</span>
					<span class="text-[9px] text-sky-400 font-bold tracking-widest uppercase">Enterprise ERP</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Menu List -->
	<nav class="flex-1 py-4 overflow-y-auto px-2.5 space-y-1">
		{#if isExpanded}
			<div class="px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
				Main Menu
			</div>
		{/if}
		{#each menuItems as item}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-3.5 py-2.5 px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative
					{active 
						? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/25 font-bold' 
						: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}"
				title={!isExpanded ? item.label : ''}
			>
				<item.icon class="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 {active ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'}" />
				{#if isExpanded}
					<span class="whitespace-nowrap truncate">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User Quick Tag / Collapse Trigger -->
	<div class="p-3 border-t border-slate-800/80 bg-slate-950/60 flex flex-col gap-2">
		{#if isExpanded && globalStore.currentUser}
			<div class="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
				<div class="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
					<User class="w-4 h-4" />
				</div>
				<div class="overflow-hidden">
					<p class="text-xs font-bold text-slate-100 truncate">
						{globalStore.currentUser.fullName}
					</p>
					<p class="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">
						{globalStore.currentUser.role === 'Manager' ? 'Manager / Admin' : globalStore.currentUser.role}
					</p>
				</div>
			</div>
		{/if}

		<button
			onclick={toggleSidebar}
			class="btn btn-ghost btn-xs text-slate-400 hover:text-white hover:bg-slate-800/80 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
		>
			{#if isExpanded}
				<ChevronLeft class="w-4 h-4" />
				<span class="text-[10px] font-bold tracking-wider uppercase">Collapse Sidebar</span>
			{:else}
				<ChevronRight class="w-4 h-4" />
			{/if}
		</button>
	</div>
</aside>

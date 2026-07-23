<script lang="ts">
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
				roles: ['Manager', 'Vendor']
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
	class="h-screen bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 border-r border-slate-800 shrink-0 relative z-30"
	style="width: {isExpanded ? '260px' : '72px'}"
>
	<!-- Brand Header -->
	<div class="h-16 flex items-center justify-between px-4 border-b border-slate-800">
		<div class="flex items-center gap-2 overflow-hidden">
			<div class="p-2 bg-primary rounded-lg text-primary-content">
				<ShieldAlert class="w-5 h-5 shrink-0" />
			</div>
			{#if isExpanded}
				<div class="flex flex-col whitespace-nowrap animate-fade-in">
					<span class="font-bold text-sm tracking-wide text-white uppercase">ProcureSmart</span>
					<span class="text-[10px] text-slate-400 font-semibold tracking-wider">ENTERPRISE ERP</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Menu List -->
	<nav class="flex-1 py-4 overflow-y-auto px-3 space-y-1">
		{#each menuItems as item}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-3.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200"
				class:bg-primary={active}
				class:text-primary-content={active}
				class:text-slate-300={!active}
				class:hover:bg-slate-800={!active}
				class:hover:text-white={!active}
				title={!isExpanded ? item.label : ''}
			>
				<item.icon class="w-5 h-5 shrink-0" />
				{#if isExpanded}
					<span class="whitespace-nowrap">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User Quick Tag / Collapse Trigger -->
	<div class="p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
		{#if isExpanded && globalStore.currentUser}
			<div class="flex items-center gap-2.5 px-2 py-1">
				<img
					src={globalStore.currentUser.avatarUrl}
					alt={globalStore.currentUser.fullName}
					class="w-8 h-8 rounded-full ring-2 ring-slate-800 shrink-0"
				/>
				<div class="overflow-hidden">
					<p class="text-xs font-semibold text-white truncate">
						{globalStore.currentUser.fullName}
					</p>
					<p class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
						{globalStore.currentUser.role === 'Manager' ? 'Manager / Admin' : globalStore.currentUser.role}
					</p>
				</div>
			</div>
		{/if}

		<button
			onclick={toggleSidebar}
			class="btn btn-ghost btn-xs text-slate-400 hover:text-white hover:bg-slate-800 w-full flex items-center justify-center gap-1 mt-1"
		>
			{#if isExpanded}
				<ChevronLeft class="w-4 h-4" />
				<span class="text-[10px]">Collapse</span>
			{:else}
				<ChevronRight class="w-4 h-4" />
			{/if}
		</button>
	</div>
</aside>

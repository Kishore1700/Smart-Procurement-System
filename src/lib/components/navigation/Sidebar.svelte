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
		LogOut,
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
</script>

<aside
	class="h-screen max-h-screen flex flex-col min-h-0 transition-all duration-300 shrink-0 relative z-30 shadow-2xl border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden"
	style="width: {isExpanded ? '264px' : '76px'};"
>
	<!-- Brand Header -->
	<div class="h-16 shrink-0 flex items-center justify-between px-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-md">
		<div class="flex items-center gap-3 overflow-hidden">
			<div class="p-2 rounded-xl text-white bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/20">
				<ShieldAlert class="w-5 h-5 shrink-0" />
			</div>
			{#if isExpanded}
				<div class="flex flex-col whitespace-nowrap animate-fade-in">
					<span class="font-extrabold text-sm tracking-wide bg-gradient-to-r from-slate-900 via-slate-800 to-sky-600 dark:from-white dark:via-slate-100 dark:to-sky-200 bg-clip-text text-transparent uppercase">ProcureSmart</span>
					<span class="text-[9px] text-sky-600 dark:text-sky-400 font-bold tracking-widest uppercase">Enterprise ERP</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Menu List (Independent Scroll Area) -->
	<nav class="flex-1 min-h-0 py-4 overflow-y-auto px-2.5 space-y-1">
		{#if isExpanded}
			<div class="px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-slate-400 uppercase">
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
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
				title={!isExpanded ? item.label : ''}
			>
				<item.icon class="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 {active ? 'text-white' : 'text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'}" />
				{#if isExpanded}
					<span class="whitespace-nowrap truncate">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User Profile & Logout Bottom Card -->
	<div class="p-3 shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col gap-2.5">
		{#if globalStore.currentUser}
			<div class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
				<div class="flex items-center gap-2.5 overflow-hidden">
					<div class="w-9 h-9 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
						<User class="w-4.5 h-4.5" />
					</div>
					{#if isExpanded}
						<div class="overflow-hidden">
							<p class="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate leading-snug">
								{globalStore.currentUser.fullName}
							</p>
							<p class="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate">
								{globalStore.currentUser.role === 'Manager' ? 'Manager / Admin' : globalStore.currentUser.role}
							</p>
						</div>
					{/if}
				</div>

				<!-- Icon Logout Trigger -->
				<button
					onclick={() => globalStore.logout()}
					class="btn btn-ghost btn-sm btn-circle text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 hover:scale-105 transition-all shrink-0"
					title="Sign Out / Logout"
					aria-label="Logout"
				>
					<LogOut class="w-4.5 h-4.5" />
				</button>
			</div>

			<!-- Full Prominent Logout Button -->
			<button
				onclick={() => globalStore.logout()}
				class="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs group"
			>
				<LogOut class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
				{#if isExpanded}
					<span class="tracking-wide uppercase text-[11px] font-extrabold">Logout Account</span>
				{/if}
			</button>
		{/if}
	</div>
</aside>

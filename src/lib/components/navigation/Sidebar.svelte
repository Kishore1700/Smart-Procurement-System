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
		User,
		Briefcase,
		ShieldAlert,
		LogOut,
		ChevronLeft,
		X
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Guest');
	let isExpanded = $derived(globalStore.sidebarExpanded);
	let isMobileOpen = $derived(globalStore.mobileMenuOpen);

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
				roles: ['Manager', 'Vendor']
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

<!-- Mobile Drawer Backdrop Overlay -->
{#if isMobileOpen}
	<div
		role="button"
		tabindex="0"
		aria-label="Close Navigation Menu"
		onclick={() => globalStore.closeMobileMenu()}
		onkeydown={(e) => { if (e.key === 'Escape') globalStore.closeMobileMenu(); }}
		class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fade-in"
	></div>
{/if}

<!-- Sidebar Container: Desktop Collapsible + Mobile Slide-over Drawer -->
<aside
	class="fixed md:static inset-y-0 left-0 z-50 h-screen max-h-screen flex flex-col min-h-0 transition-all duration-300 shrink-0 shadow-2xl md:shadow-lg border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 relative
	{isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
	{isExpanded ? 'md:w-64' : 'md:w-20'}"
>
	<!-- Header Brand Section -->
	<div class="h-16 shrink-0 flex items-center {isExpanded || isMobileOpen ? 'justify-between px-4' : 'justify-center px-2'} border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md">
		{#if isExpanded || isMobileOpen}
			<div class="flex items-center gap-3 overflow-hidden">
				<div class="w-9 h-9 rounded-xl text-white bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/20 flex items-center justify-center shrink-0">
					<ShieldAlert class="w-5 h-5" />
				</div>

				<div class="flex flex-col whitespace-nowrap animate-fade-in">
					<span class="font-black text-sm tracking-wide bg-gradient-to-r from-slate-900 via-slate-800 to-sky-600 dark:from-white dark:via-slate-100 dark:to-sky-300 bg-clip-text text-transparent uppercase">
						ProcureSmart
					</span>
					<span class="text-[9px] text-sky-600 dark:text-sky-400 font-extrabold tracking-widest uppercase">
						Enterprise ERP
					</span>
				</div>
			</div>

			<!-- Desktop Collapse Button (cleanly positioned inside expanded header on the right) -->
			<button
				onclick={() => globalStore.toggleSidebar()}
				class="hidden md:flex btn btn-ghost btn-xs btn-circle text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
				title="Collapse Sidebar"
				aria-label="Collapse Sidebar"
			>
				<ChevronLeft class="w-4 h-4" />
			</button>
		{:else}
			<!-- Collapsed Header: Perfectly Centered Brand Icon with Generous Margins, Never Cut in Half -->
			<button
				onclick={() => globalStore.toggleSidebar()}
				class="w-10 h-10 rounded-xl text-white bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/20 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer"
				title="Click to Expand Sidebar"
				aria-label="Expand Sidebar"
			>
				<ShieldAlert class="w-5 h-5" />
			</button>
		{/if}

		<!-- Mobile Close Button -->
		<button
			onclick={() => globalStore.closeMobileMenu()}
			class="btn btn-ghost btn-sm btn-circle md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
			aria-label="Close Menu"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<!-- Navigation Menu -->
	<nav class="flex-1 min-h-0 py-3 overflow-y-auto px-2 space-y-1">
		{#if isExpanded || isMobileOpen}
			<div class="px-3 py-1 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
				Main Menu
			</div>
		{/if}

		{#each menuItems as item (item.href)}
			{@const active = page.url.pathname.startsWith(item.href)}

			<a
				href={item.href}
				onclick={() => globalStore.closeMobileMenu()}
				class="flex items-center rounded-xl text-[13px] font-semibold transition-all duration-150 group relative
					{isExpanded || isMobileOpen ? 'gap-3 py-2.5 px-3' : 'justify-center w-11 h-11 mx-auto'}
					{active
						? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30 font-bold'
						: 'text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'}"
				title={item.label}
			>
				<item.icon
					class="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 {active
						? 'text-white'
						: 'text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-300'}"
				/>

				{#if isExpanded || isMobileOpen}
					<span class="whitespace-nowrap truncate">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Footer Profile / Logout Section -->
	<div class="p-2.5 shrink-0 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex flex-col gap-2">
		{#if globalStore.currentUser}
			{#if isExpanded || isMobileOpen}
				<div class="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm animate-fade-in">
					<div class="flex items-center gap-2.5 overflow-hidden">
						<div class="w-8 h-8 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
							<User class="w-4 h-4" />
						</div>

						<div class="overflow-hidden">
							<p class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
								{globalStore.currentUser.fullName}
							</p>

							<p class="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate">
								{globalStore.currentUser.role === 'Manager'
									? 'Manager / Admin'
									: globalStore.currentUser.role}
							</p>
						</div>
					</div>

					<button
						onclick={() => globalStore.promptLogout()}
						class="btn btn-ghost btn-xs btn-circle text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:scale-105 transition-all shrink-0"
						title="Sign Out / Logout"
						aria-label="Logout"
					>
						<LogOut class="w-4 h-4" />
					</button>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-2 py-1">
					<div
						class="w-9 h-9 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30"
						title="{globalStore.currentUser.fullName} ({globalStore.currentUser.role})"
					>
						<User class="w-4 h-4" />
					</div>
					<button
						onclick={() => globalStore.promptLogout()}
						class="btn btn-ghost btn-xs btn-circle text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:scale-105 transition-all"
						title="Sign Out / Logout"
						aria-label="Logout"
					>
						<LogOut class="w-4 h-4" />
					</button>
				</div>
			{/if}
		{/if}
	</div>
</aside>

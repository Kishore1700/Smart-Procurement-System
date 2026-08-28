<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import {
		Search,
		Bell,
		LogOut,
		User,
		Sun,
		Moon,
		UserSquare,
		X,
		Shield
	} from '@lucide/svelte';

	let currentUser = $derived(globalStore.currentUser);
	let unreadCount = $derived(globalStore.notifications.filter((/** @type {any} */ n) => !n.isRead).length);

	function handleSearch(/** @type {Event} */ e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		globalStore.searchQuery = target.value;
	}

	function clearSearch() {
		globalStore.searchQuery = '';
	}
</script>

<header
	class="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm transition-colors"
>
	<!-- Left: Global Search -->
	<div class="flex-1 max-w-md">
		<div class="relative w-full group">
			<Search class="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
			<input
				type="text"
				placeholder="Search requests, invoices, orders, vendors..."
				value={globalStore.searchQuery}
				oninput={handleSearch}
				class="input input-sm pl-10 pr-9 py-4 w-full border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-slate-100/50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl transition-all text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
			/>
			{#if globalStore.searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
				>
					<X class="w-4 h-4" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Right: Role Switcher & Utilities & Profile -->
	<div class="flex items-center gap-3">
		<!-- Role Badge / Quick Switcher -->
		{#if currentUser}
			<div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-semibold">
				<Shield class="w-3.5 h-3.5 text-sky-500" />
				<span class="text-[11px] font-bold tracking-wide uppercase">{currentUser.role} View</span>
			</div>
		{/if}

		<!-- Theme Toggle -->
		<button
			onclick={() => globalStore.toggleTheme()}
			class="btn btn-ghost btn-sm btn-circle text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
			title="Toggle Dark / Light Theme"
		>
			{#if globalStore.theme === 'light'}
				<Moon class="w-4 h-4" />
			{:else}
				<Sun class="w-4 h-4 text-amber-400" />
			{/if}
		</button>

		<!-- Notifications Dropdown -->
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 relative">
				<Bell class="w-4 h-4" />
				{#if unreadCount > 0}
					<span class="absolute top-1 right-1 flex h-2.5 w-2.5">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
					</span>
				{/if}
			</div>
			<div
				class="dropdown-content card card-compact shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl w-80 mt-3 z-50 overflow-hidden"
			>
				<div class="bg-slate-50/80 dark:bg-slate-950/80 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
					<h3 class="font-bold text-xs text-slate-800 dark:text-slate-100">Notifications</h3>
					{#if unreadCount > 0}
						<span class="badge badge-sky badge-sm font-bold text-[10px] bg-sky-500 text-white border-none">
							{unreadCount} Unread
						</span>
					{/if}
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
					{#if globalStore.notifications.length === 0}
						<div class="p-8 text-center text-slate-400 text-xs font-medium">No notifications.</div>
					{:else}
						{#each globalStore.notifications as notif (notif.id)}
							<div
								class="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex gap-2.5 transition-colors {!notif.isRead ? 'bg-sky-50/30 dark:bg-sky-950/20' : ''}"
							>
								<div class="flex-1 text-left">
									<p class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{notif.title}</p>
									<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{notif.message}</p>
									<span class="text-[9px] font-semibold text-slate-400 mt-1.5 block">
										{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								{#if !notif.isRead}
									<button
										onclick={() => globalStore.markNotificationRead(notif.id)}
										class="btn btn-ghost btn-xs text-sky-600 dark:text-sky-400 self-center px-1 font-bold text-[10px]"
									>
										Read
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<!-- User Dropdown Menu -->
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar ring-2 ring-slate-200 dark:ring-slate-800 hover:ring-sky-500 transition-all shrink-0">
				<div class="w-9 h-9 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/30">
					<User class="w-5 h-5" />
				</div>
			</div>
			{#if currentUser}
				<ul
					class="menu dropdown-content p-2 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl w-60 mt-3 text-xs text-slate-700 dark:text-slate-200 z-50 space-y-1"
				>
					<li class="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
						<p class="font-bold text-slate-900 dark:text-slate-100 truncate text-xs leading-tight">{currentUser.fullName}</p>
						<p class="text-[11px] text-slate-400 font-medium truncate mt-0.5">{currentUser.email}</p>
						<span class="inline-block badge badge-sm bg-gradient-to-r from-sky-500 to-blue-600 text-white border-none text-[9px] font-extrabold mt-2 uppercase tracking-wider">
							{currentUser.role === 'Manager' ? 'Manager / Admin' : currentUser.role}
						</span>
					</li>
					<li>
						<a href="/dashboard" class="flex items-center gap-2 py-2 font-medium rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
							<UserSquare class="w-4 h-4 text-sky-500" />
							<span>Dashboard Profile</span>
						</a>
					</li>
					<li>
						<button
							onclick={() => globalStore.logout()}
							class="flex items-center gap-2 py-2 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
						>
							<LogOut class="w-4 h-4" />
							<span>Sign Out</span>
						</button>
					</li>
				</ul>
			{:else}
				<ul
					class="menu dropdown-content p-2 shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-44 mt-3 text-xs z-50"
				>
					<li><a href="/login" class="font-bold text-sky-600 dark:text-sky-400">Sign In / Register</a></li>
				</ul>
			{/if}
		</div>
	</div>
</header>


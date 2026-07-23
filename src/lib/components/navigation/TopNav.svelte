<script lang="ts">
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
		RefreshCw
	} from '@lucide/svelte';

	let currentUser = $derived(globalStore.currentUser);
	let unreadCount = $derived(globalStore.notifications.filter((n) => !n.isRead).length);

	// Quick switcher list of seed users
	const testUsers = db.getUsers();

	function switchRole(userId: string) {
		const user = testUsers.find((u) => u.id === userId);
		if (user) {
			globalStore.login(user);
		}
	}

	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		globalStore.searchQuery = target.value;
	}

	function clearSearch() {
		globalStore.searchQuery = '';
	}
</script>

<header
	class="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm"
>
	<!-- Left: Global Search -->
	<div class="flex-1 max-w-md">
		<div class="relative w-full">
			<Search class="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
			<input
				type="text"
				placeholder="Search requests, invoices, orders, vendors..."
				value={globalStore.searchQuery}
				oninput={handleSearch}
				class="input input-sm pl-9 pr-4 py-4 w-full border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all text-xs"
			/>
		</div>
	</div>

	<!-- Right: Utilities & Profile -->
	<div class="flex items-center gap-4">
		<!-- Quick Demo Role Switcher -->
		<div class="dropdown dropdown-end">
			<div
				tabindex="0"
				role="button"
				class="btn btn-xs border-slate-200/80 hover:bg-slate-50 flex items-center gap-1.5 rounded-lg text-slate-600 bg-white font-medium"
			>
				<RefreshCw class="w-3 h-3 text-slate-500" />
				<span class="text-[10px]">Switch Role: <b class="text-primary uppercase">{globalStore.activeRole === 'Manager' ? 'Manager / Admin' : globalStore.activeRole}</b></span>
			</div>
			<ul
				class="dropdown-content menu p-2 shadow-xl bg-white border border-slate-100 rounded-xl w-56 mt-2 text-xs text-slate-700"
			>
				<li class="menu-title text-[9px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Quick Role Switcher</li>
				{#each testUsers as u}
					<li>
						<button
							onclick={() => switchRole(u.id)}
							class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg text-left"
							class:font-bold={globalStore.currentUser?.id === u.id}
							class:text-primary={globalStore.currentUser?.id === u.id}
						>
							<div class="flex items-center gap-2">
								<img src={u.avatarUrl} alt="" class="w-5 h-5 rounded-full shrink-0" />
								<div>
									<p class="font-medium text-slate-800 leading-tight">{u.fullName}</p>
									<p class="text-[9px] text-slate-500 uppercase leading-none font-bold mt-0.5">{u.role === 'Manager' ? 'Manager / Admin' : u.role}</p>
								</div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Theme Toggle -->
		<button
			onclick={() => globalStore.toggleTheme()}
			class="btn btn-ghost btn-sm btn-circle text-slate-500 hover:bg-slate-100"
			title="Toggle Theme"
		>
			{#if globalStore.theme === 'light'}
				<Moon class="w-4.5 h-4.5" />
			{:else}
				<Sun class="w-4.5 h-4.5 text-amber-500" />
			{/if}
		</button>

		<!-- Notifications Dropdown -->
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle text-slate-500 hover:bg-slate-100 relative">
				<Bell class="w-4.5 h-4.5" />
				{#if unreadCount > 0}
					<span class="badge badge-primary badge-xs absolute top-1.5 right-1.5 px-1 py-0.5 text-[8px] font-bold">
						{unreadCount}
					</span>
				{/if}
			</div>
			<div
				class="dropdown-content card card-compact shadow-xl bg-white border border-slate-100 rounded-xl w-80 mt-2 z-50 overflow-hidden"
			>
				<div class="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
					<h3 class="font-bold text-xs text-slate-700">Notifications ({unreadCount} unread)</h3>
				</div>
				<div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
					{#if globalStore.notifications.length === 0}
						<div class="p-6 text-center text-slate-400 text-xs">No notifications.</div>
					{:else}
						{#each globalStore.notifications as notif (notif.id)}
							<div
								class="p-3 hover:bg-slate-50/50 flex gap-2 transition-colors"
								class:bg-slate-50={!notif.isRead}
							>
								<div class="flex-1 text-left">
									<p class="text-xs font-semibold text-slate-800 leading-tight">{notif.title}</p>
									<p class="text-[11px] text-slate-500 mt-1 leading-snug">{notif.message}</p>
									<span class="text-[9px] text-slate-400 mt-1 block">
										{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								{#if !notif.isRead}
									<button
										onclick={() => globalStore.markNotificationRead(notif.id)}
										class="btn btn-ghost btn-xs text-primary self-center px-1 font-bold"
									>
										Mark Read
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
			<div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar border border-slate-200 shadow-sm shrink-0">
				<div class="w-9 rounded-full">
					{#if currentUser}
						<img src={currentUser.avatarUrl} alt={currentUser.fullName} />
					{:else}
						<User class="w-5 h-5 m-2 text-slate-400" />
					{/if}
				</div>
			</div>
			{#if currentUser}
				<ul
					class="menu dropdown-content p-2 shadow-xl bg-white border border-slate-100 rounded-xl w-56 mt-2 text-xs text-slate-700 z-50"
				>
					<li class="px-2 py-2 border-b border-slate-100 mb-1">
						<p class="font-bold text-slate-800 truncate leading-tight">{currentUser.fullName}</p>
						<p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">{currentUser.email}</p>
						<span class="badge badge-sm badge-success text-[10px] font-bold mt-1.5 uppercase tracking-wide">
							{currentUser.role === 'Manager' ? 'Manager / Admin' : currentUser.role}
						</span>
					</li>
					<li>
						<a href="/dashboard" class="flex items-center gap-2 py-2 text-slate-600 hover:text-slate-900 rounded-lg">
							<UserSquare class="w-4 h-4 text-slate-500" />
							<span>My Profile</span>
						</a>
					</li>
					<li>
						<button
							onclick={() => globalStore.logout()}
							class="flex items-center gap-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
						>
							<LogOut class="w-4 h-4" />
							<span>Sign Out</span>
						</button>
					</li>
				</ul>
			{:else}
				<ul
					class="menu dropdown-content p-2 shadow-xl bg-white border border-slate-100 rounded-xl w-40 mt-2 text-xs text-slate-700 z-50"
				>
					<li><a href="/">Login</a></li>
				</ul>
			{/if}
		</div>
	</div>
</header>

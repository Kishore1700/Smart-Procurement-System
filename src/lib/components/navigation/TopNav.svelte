<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import {
		Search,
		Bell,
		User,
		Sun,
		Moon,
		UserSquare,
		X,
		Shield,
		Menu
	} from '@lucide/svelte';

	let currentUser = $derived(globalStore.currentUser);
	let unreadCount = $derived(globalStore.notifications.filter((/** @type {any} */ n) => !n.isRead).length);

	// Profile Modal state & editable fields
	let isProfileModalOpen = $state(false);
	let editName = $state('');
	let editPhone = $state('');

	function openProfileModal() {
		if (!currentUser) return;
		editName = currentUser.fullName || currentUser.username || '';
		editPhone = currentUser.phone || '+91 98765 43210';
		isProfileModalOpen = true;
	}

	function saveProfileChanges(e) {
		e.preventDefault();
		if (!currentUser) return;
		if (!editName.trim()) {
			globalStore.showToast('Full name cannot be blank', 'error');
			return;
		}

		const updatedUser = {
			...currentUser,
			fullName: editName.trim(),
			phone: editPhone.trim()
		};

		globalStore.currentUser = updatedUser;
		if (typeof window !== 'undefined') {
			localStorage.setItem('currentUser', JSON.stringify(updatedUser));
		}

		const users = db.getUsers() || [];
		const idx = users.findIndex((u) => u.id === currentUser.id || u.email === currentUser.email);
		if (idx !== -1) {
			users[idx] = { ...users[idx], fullName: updatedUser.fullName, phone: updatedUser.phone };
			db.saveUsers(users);
		}

		db.logAction(currentUser.id, 'Update Profile', `User updated profile name to "${updatedUser.fullName}".`);
		globalStore.showToast('Profile updated successfully!', 'success');
		isProfileModalOpen = false;
	}

	let userStats = $derived.by(() => {
		if (!currentUser) return null;
		const prs = db.getPurchaseRequests() || [];
		const depts = db.getDepartments() || [];
		const pos = db.getPurchaseOrders() || [];
		const logs = db.getAuditLogs() || [];

		const userLogs = logs
			.filter((l) => l.userId === currentUser.id || l.user_id === currentUser.id)
			.slice(0, 4);

		if (currentUser.role === 'Manager') {
			const myDept = depts.find((d) => d.id === currentUser.departmentId) || depts[0];
			return {
				title: 'Executive Management Scope',
				metric1Label: 'Department Allocation',
				metric1Value: `₹${(myDept?.allocatedBudget || 500000).toLocaleString()}`,
				metric2Label: 'Pending Approvals',
				metric2Value: prs.filter((p) => p.status === 'Pending Approval').length,
				metric3Label: 'Total Department PRs',
				metric3Value: prs.filter((p) => p.departmentId === currentUser.departmentId).length,
				departmentName: myDept?.name || 'Central Operations',
				recentLogs: userLogs
			};
		} else if (currentUser.role === 'Vendor') {
			const myPos = pos.filter((p) => p.vendorId === currentUser.vendorId);
			return {
				title: 'Vendor Partner Metrics',
				metric1Label: 'Purchase Orders',
				metric1Value: myPos.length,
				metric2Label: 'Active Deliveries',
				metric2Value: myPos.filter((p) => p.status === 'Issued' || p.status === 'In Transit').length,
				metric3Label: 'Reliability Score',
				metric3Value: '98.5% (A+)',
				departmentName: 'Authorized Supplier Network',
				recentLogs: userLogs
			};
		} else {
			const myPrs = prs.filter((p) => p.requesterId === currentUser.id);
			return {
				title: 'Employee Procurement Stats',
				metric1Label: 'My Purchase Requests',
				metric1Value: myPrs.length,
				metric2Label: 'Approved Requests',
				metric2Value: myPrs.filter((p) => p.status === 'Approved').length,
				metric3Label: 'Total Requested Value',
				metric3Value: `₹${myPrs.reduce((sum, p) => sum + (Number(p.estimatedCost) || 0), 0).toLocaleString()}`,
				departmentName: depts.find((d) => d.id === currentUser.departmentId)?.name || 'General Operations',
				recentLogs: userLogs
			};
		}
	});

	function handleSearch(/** @type {Event} */ e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		globalStore.searchQuery = target.value;
	}

	function clearSearch() {
		globalStore.searchQuery = '';
	}
</script>

<header
	class="h-16 shrink-0 border-b border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 shadow-sm transition-colors gap-2"
>
	<!-- Left: Hamburger (Mobile) + Desktop Sidebar Toggle + Global Search -->
	<div class="flex items-center gap-2 flex-1 max-w-md min-w-0">
		<button
			onclick={() => globalStore.toggleMobileMenu()}
			class="btn btn-ghost btn-sm btn-circle md:hidden text-slate-700 dark:text-slate-200 shrink-0"
			aria-label="Open Navigation"
		>
			<Menu class="w-5 h-5" />
		</button>

		<button
			onclick={() => globalStore.toggleSidebar()}
			class="hidden md:flex btn btn-ghost btn-sm btn-circle text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
			title={globalStore.sidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
			aria-label="Toggle Sidebar"
		>
			<Menu class="w-4 h-4" />
		</button>

		<div class="relative w-full group min-w-0">
			<Search class="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
			<input
				type="text"
				placeholder="Search requests, POs, vendors..."
				value={globalStore.searchQuery}
				oninput={handleSearch}
				class="input input-sm pl-9 pr-8 py-2 w-full border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/90 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl transition-all text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
			/>
			{#if globalStore.searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
					aria-label="Clear Search"
				>
					<X class="w-4 h-4" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Right: Role Switcher & Utilities & Profile -->
	<div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
		<!-- Role Badge -->
		{#if currentUser}
			<div class="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold">
				<Shield class="w-3.5 h-3.5 text-sky-500" />
				<span class="text-[11px] font-bold tracking-wide uppercase">{currentUser.role} View</span>
			</div>
		{/if}

		<!-- Theme Toggle -->
		<button
			onclick={() => globalStore.toggleTheme()}
			class="btn btn-ghost btn-sm btn-circle text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-all duration-300 relative overflow-hidden group"
			title="Toggle Dark / Light Theme"
			aria-label="Toggle theme"
		>
			<div class="relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-45">
				{#if globalStore.theme === 'light'}
					<Moon class="w-4 h-4 text-slate-700 transition-all duration-300" />
				{:else}
					<Sun class="w-4 h-4 text-amber-400 transition-all duration-300" />
				{/if}
			</div>
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
						<button
							onclick={openProfileModal}
							class="flex items-center gap-2 py-2 font-medium rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 w-full text-left"
						>
							<UserSquare class="w-4 h-4 text-sky-500" />
							<span>Dashboard Profile</span>
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

<!-- Dashboard Profile & User Account Settings Modal -->
{#if isProfileModalOpen && currentUser}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
		role="dialog"
		aria-modal="true"
	>
		<div class="glass-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl p-6 text-slate-900 dark:text-slate-100 flex flex-col gap-6">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 font-black text-lg">
						{currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
					</div>
					<div>
						<h3 class="font-black text-lg text-slate-900 dark:text-slate-100 leading-tight">
							{currentUser.fullName}
						</h3>
						<div class="flex items-center gap-2 mt-0.5">
							<span class="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser.email}</span>
							<span class="badge badge-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5">
								Active ERP User
							</span>
						</div>
					</div>
				</div>
				<button
					onclick={() => isProfileModalOpen = false}
					class="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
					aria-label="Close Profile Modal"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Role & Division Overview -->
			<div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs">
				<div>
					<span class="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">ERP Role & Authorization</span>
					<p class="font-extrabold text-sky-600 dark:text-sky-400 text-sm mt-0.5">
						{currentUser.role === 'Manager' ? 'Manager / Administrator' : currentUser.role}
					</p>
				</div>
				<div>
					<span class="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">Assigned Division / Unit</span>
					<p class="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 truncate">
						{userStats?.departmentName || 'Enterprise Operations'}
					</p>
				</div>
			</div>

			<!-- Dynamic Role Metrics -->
			{#if userStats}
				<div>
					<h4 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
						{userStats.title}
					</h4>
					<div class="grid grid-cols-3 gap-3">
						<div class="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40">
							<span class="text-[10px] font-bold text-sky-700 dark:text-sky-300 block truncate">{userStats.metric1Label}</span>
							<p class="text-base font-black text-slate-900 dark:text-white mt-0.5">{userStats.metric1Value}</p>
						</div>
						<div class="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
							<span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block truncate">{userStats.metric2Label}</span>
							<p class="text-base font-black text-slate-900 dark:text-white mt-0.5">{userStats.metric2Value}</p>
						</div>
						<div class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
							<span class="text-[10px] font-bold text-teal-700 dark:text-teal-300 block truncate">{userStats.metric3Label}</span>
							<p class="text-base font-black text-slate-900 dark:text-white mt-0.5">{userStats.metric3Value}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Editable Profile Settings -->
			<form onsubmit={saveProfileChanges} class="space-y-4">
				<h4 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
					Account & Contact Settings
				</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="form-control">
						<label for="prof-name" class="label pb-1">
							<span class="label-text text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</span>
						</label>
						<input
							id="prof-name"
							type="text"
							bind:value={editName}
							placeholder="Your Full Name"
							class="input input-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-semibold w-full focus:border-sky-500"
						/>
					</div>

					<div class="form-control">
						<label for="prof-phone" class="label pb-1">
							<span class="label-text text-xs font-bold text-slate-700 dark:text-slate-300">Contact Number</span>
						</label>
						<input
							id="prof-phone"
							type="text"
							bind:value={editPhone}
							placeholder="+91 98765 43210"
							class="input input-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-semibold w-full focus:border-sky-500"
						/>
					</div>
				</div>

				<div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
					<div class="text-[11px] text-slate-400 font-medium">
						ERP Permissions managed by Administrator
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => isProfileModalOpen = false}
							class="btn btn-sm btn-ghost rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="btn btn-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs px-4 border-none shadow-md shadow-sky-600/20"
						>
							Save Profile
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}


<script>
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { z } from 'zod';
	import {
		Plus,
		Search,
		Star,
		Users,
		Phone,
		Mail,
		MapPin,
		Trash2,
		Briefcase,
		ShieldCheck
	} from '@lucide/svelte';

	let role = $derived(globalStore.currentUser?.role || 'Employee');
	let currentUser = $derived(globalStore.currentUser);

	// Grid states
	let filterCategory = $state('All');
	let searchQuery = $state('');

	// Modal states
	let isCreateModalOpen = $state(false);
	let vendorName = $state('');
	let vendorEmail = $state('');
	let vendorPhone = $state('');
	let vendorAddress = $state('');
	let vendorContact = $state('');
	let vendorCategoriesInput = $state('');

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	// Load vendors
	let vendors = $derived.by(() => {
		let list = db.getVendors();

		// Category filter
		if (filterCategory !== 'All') {
			list = list.filter((/** @type {any} */ v) => v.categories.includes(filterCategory));
		}

		// Search match
		const q = searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(/** @type {any} */ v) =>
					v.name.toLowerCase().includes(q) ||
					v.contactPerson.toLowerCase().includes(q) ||
					v.email.toLowerCase().includes(q)
			);
		}

		return list;
	});

	// Get all distinct categories
	let allCategories = $derived.by(() => {
		const cats = new Set();
		db.getVendors().forEach((/** @type {any} */ v) => v.categories.forEach((/** @type {any} */ c) => cats.add(c)));
		return ['All', ...Array.from(cats)];
	});

	function validateAndSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};

		const vendorSchema = z.object({
			name: z.string().min(3, { message: 'Vendor name must be at least 3 characters' }),
			email: z.string().email({ message: 'Invalid email address' }),
			phone: z.string().min(5, { message: 'Phone number is required' }),
			address: z.string().min(5, { message: 'Address is required' }),
			contactPerson: z.string().min(3, { message: 'Contact person is required' }),
			categories: z.string().min(2, { message: 'Provide at least one category (comma separated)' })
		});

		const result = vendorSchema.safeParse({
			name: vendorName,
			email: vendorEmail,
			phone: vendorPhone,
			address: vendorAddress,
			contactPerson: vendorContact,
			categories: vendorCategoriesInput
		});

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		// Save vendor
		const currentVendors = db.getVendors();
		const categoriesArray = vendorCategoriesInput
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);

		const newVendor = {
			id: 'vendor-' + Math.random().toString(36).substring(2, 6),
			name: vendorName,
			email: vendorEmail,
			phone: vendorPhone,
			address: vendorAddress,
			categories: categoriesArray,
			rating: 5.0,
			performanceScore: 100,
			status: 'Active',
			contactPerson: vendorContact,
			createdAt: new Date().toISOString()
		};

		currentVendors.push(newVendor);
		db.saveVendors(currentVendors);
		db.logAction(
			currentUser?.id || '',
			'Add Vendor',
			`Created vendor profile for "${newVendor.name}".`
		);

		globalStore.showToast(`Vendor ${newVendor.name} added successfully!`, 'success');
		resetForm();
	}

	function resetForm() {
		vendorName = '';
		vendorEmail = '';
		vendorPhone = '';
		vendorAddress = '';
		vendorContact = '';
		vendorCategoriesInput = '';
		errors = {};
		isCreateModalOpen = false;
	}

	function deleteVendor(/** @type {string} */ id) {
		const list = db.getVendors();
		const filtered = list.filter((/** @type {any} */ v) => v.id !== id);
		db.saveVendors(filtered);
		db.logAction(currentUser?.id || '', 'Delete Vendor', `Removed vendor profile: ${id}`);
		globalStore.showToast('Vendor deleted successfully.', 'info');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="glass-card rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
				Vendor Management
			</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
				Maintain approved suppliers, track performance scores, and manage contact directories.
			</p>
		</div>
		<div>
			{#if role === 'Manager'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/25 px-4 py-2 flex items-center"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Add Vendor
				</button>
			{/if}
		</div>
	</div>

	<!-- Toolbar -->
	<div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
		<div class="flex-1 max-w-sm">
			<div class="relative w-full group">
				<Search class="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
				<input
					type="text"
					placeholder="Search vendor name, email or contact..."
					bind:value={searchQuery}
					class="input input-sm pl-10 pr-4 py-4 w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-sky-500 text-xs text-slate-800 dark:text-slate-100 rounded-xl"
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Category:</span>
			<select bind:value={filterCategory} class="select select-bordered select-xs text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
				{#each allCategories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Vendor Deck Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#if vendors.length === 0}
			<div class="col-span-full glass-card border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 text-xs font-semibold shadow-lg rounded-2xl">
				No vendors match the search parameters.
			</div>
		{/if}
		{#each vendors as vendor}
			<div class="glass-card border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1">
				<!-- Ribbon Status -->
				<span class="absolute top-4 right-4 badge font-extrabold px-2.5 py-1 text-[9px] uppercase border-none rounded-full {vendor.status === 'Active' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}">
					{vendor.status}
				</span>

				<div>
					<h3 class="font-black text-sm text-slate-900 dark:text-slate-100 leading-tight group-hover:text-sky-500 transition-colors">{vendor.name}</h3>
					<p class="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-extrabold">Contact: {vendor.contactPerson}</p>
				</div>

				<!-- Rating / Performance -->
				<div class="flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
					<div class="flex items-center gap-1.5">
						<Star class="w-4 h-4 text-amber-400 fill-amber-400" />
						<span class="text-xs font-black text-slate-800 dark:text-slate-200">{vendor.rating}</span>
						<span class="text-[10px] text-slate-400 font-semibold">/ 5</span>
					</div>
					<div class="text-right">
						<p class="text-[9px] text-slate-400 font-extrabold uppercase leading-none">Performance</p>
						<p class="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{vendor.performanceScore}%</p>
					</div>
				</div>

				<!-- Contact Details -->
				<div class="space-y-2 text-xs text-slate-600 dark:text-slate-300 flex-1">
					<div class="flex items-center gap-2.5">
						<Mail class="w-4 h-4 text-sky-500 shrink-0" />
						<span class="truncate">{vendor.email}</span>
					</div>
					<div class="flex items-center gap-2.5">
						<Phone class="w-4 h-4 text-sky-500 shrink-0" />
						<span>{vendor.phone}</span>
					</div>
					<div class="flex items-start gap-2.5">
						<MapPin class="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
						<span class="leading-snug line-clamp-2">{vendor.address}</span>
					</div>
				</div>

				<!-- Category tags -->
				<div class="flex flex-wrap gap-1.5">
					{#each vendor.categories as cat}
						<span class="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[9px] font-extrabold">{cat}</span>
					{/each}
				</div>

				<!-- Action Buttons -->
				{#if role === 'Manager'}
					<div class="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-end">
						<button
							onclick={() => deleteVendor(vendor.id)}
							class="btn btn-ghost btn-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Create Vendor Modal -->
	{#if isCreateModalOpen}
		<div class="modal modal-open z-50">
			<div class="modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-xs max-w-md">
				<h3 class="font-black text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
					Register Approved Vendor Profile
				</h3>

				<form onsubmit={validateAndSubmit} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="v-name">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Vendor Corporate Name</span>
						</label>
						<input
							id="v-name"
							type="text"
							placeholder="e.g. Acme Supplies Ltd"
							bind:value={vendorName}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.name}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.name}</span>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="v-contact">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Contact Person</span>
							</label>
							<input
								id="v-contact"
								type="text"
								placeholder="e.g. John Acme"
								bind:value={vendorContact}
								class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
							/>
							{#if errors.contactPerson}
								<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.contactPerson}</span>
							{/if}
						</div>

						<div class="form-control">
							<label class="label pb-1" for="v-phone">
								<span class="label-text font-bold text-slate-700 dark:text-slate-300">Phone Number</span>
							</label>
							<input
								id="v-phone"
								type="text"
								placeholder="+1-555-0199"
								bind:value={vendorPhone}
								class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
							/>
							{#if errors.phone}
								<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.phone}</span>
							{/if}
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-email">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Corporate Email Address</span>
						</label>
						<input
							id="v-email"
							type="email"
							placeholder="sales@acme.com"
							bind:value={vendorEmail}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.email}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-cats">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Supplier Categories</span>
						</label>
						<input
							id="v-cats"
							type="text"
							placeholder="Office Furniture, Tech Hardware, Stationery"
							bind:value={vendorCategoriesInput}
							class="input w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl"
						/>
						{#if errors.categories}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.categories}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-addr">
							<span class="label-text font-bold text-slate-700 dark:text-slate-300">Physical Address</span>
						</label>
						<textarea
							id="v-addr"
							rows="2"
							placeholder="Enter standard corporate HQ mailing details..."
							bind:value={vendorAddress}
							class="textarea text-xs w-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl"
						></textarea>
						{#if errors.address}
							<span class="text-rose-500 text-[10px] mt-1 font-bold">{errors.address}</span>
						{/if}
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
						<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs font-bold rounded-xl">
							Cancel
						</button>
						<button type="submit" class="btn btn-gradient-primary btn-sm text-xs font-extrabold rounded-xl px-6 shadow-lg shadow-sky-600/25">
							Save Vendor
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>


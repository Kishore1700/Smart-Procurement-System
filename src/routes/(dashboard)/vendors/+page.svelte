<script lang="ts">
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import type { Vendor } from '$lib/db/types';
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

	let errors = $state<{ [key: string]: string }>({});

	// Load vendors
	let vendors = $derived.by(() => {
		let list = db.getVendors();

		// Category filter
		if (filterCategory !== 'All') {
			list = list.filter((v) => v.categories.includes(filterCategory));
		}

		// Search match
		const q = searchQuery.toLowerCase();
		if (q) {
			list = list.filter(
				(v) =>
					v.name.toLowerCase().includes(q) ||
					v.contactPerson.toLowerCase().includes(q) ||
					v.email.toLowerCase().includes(q)
			);
		}

		return list;
	});

	// Get all distinct categories
	let allCategories = $derived.by(() => {
		const cats = new Set<string>();
		db.getVendors().forEach((v) => v.categories.forEach((c) => cats.add(c)));
		return ['All', ...Array.from(cats)];
	});

	function validateAndSubmit(e: Event) {
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
				const path = issue.path[0] as string;
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

		const newVendor: Vendor = {
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

	function deleteVendor(id: string) {
		const list = db.getVendors();
		const filtered = list.filter((v) => v.id !== id);
		db.saveVendors(filtered);
		db.logAction(currentUser?.id || '', 'Delete Vendor', `Removed vendor profile: ${id}`);
		globalStore.showToast('Vendor deleted successfully.', 'info');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h1>
			<p class="text-xs text-slate-500 mt-1">
				Maintain the database of approved suppliers, review rating performance, and add profiles.
			</p>
		</div>
		<div>
			{#if role === 'Manager'}
				<button
					onclick={() => (isCreateModalOpen = true)}
					class="btn btn-primary btn-sm text-xs font-semibold rounded-lg"
				>
					<Plus class="w-4 h-4 mr-1.5" />
					Add Vendor
				</button>
			{/if}
		</div>
	</div>

	<!-- Toolbar -->
	<div class="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
		<div class="flex-1 max-w-sm">
			<div class="relative w-full">
				<Search class="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
				<input
					type="text"
					placeholder="Search vendor name, email or contact..."
					bind:value={searchQuery}
					class="input input-sm pl-9 pr-4 py-4 w-full border-slate-200 focus:border-primary rounded-lg text-xs"
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category:</span>
			<select bind:value={filterCategory} class="select select-bordered select-xs text-[11px] rounded-lg">
				{#each allCategories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Vendor Deck Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#if vendors.length === 0}
			<div class="col-span-full card bg-white border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-sm rounded-xl">
				No vendors match the search parameters.
			</div>
		{/if}
		{#each vendors as vendor}
			<div class="card bg-white border border-slate-200/80 shadow-sm hover:shadow transition-all rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
				<!-- Ribbon Status -->
				<span class="absolute top-4 right-4 badge badge-xs font-bold px-2 py-1.5 text-[9px] uppercase"
					class:badge-success={vendor.status === 'Active'}
					class:badge-ghost={vendor.status === 'Inactive'}
				>
					{vendor.status}
				</span>

				<div>
					<h3 class="font-extrabold text-sm text-slate-800 leading-tight">{vendor.name}</h3>
					<p class="text-[10px] text-slate-400 mt-1 uppercase tracking-wide font-bold">Contact: {vendor.contactPerson}</p>
				</div>

				<!-- Rating / Performance -->
				<div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
					<div class="flex items-center gap-1">
						<Star class="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
						<span class="text-xs font-extrabold text-slate-700">{vendor.rating}</span>
						<span class="text-[10px] text-slate-400">/ 5</span>
					</div>
					<div class="text-right">
						<p class="text-[9px] text-slate-400 font-bold uppercase leading-none">Performance</p>
						<p class="text-xs font-extrabold text-emerald-600 mt-0.5">{vendor.performanceScore}%</p>
					</div>
				</div>

				<!-- Contact Details -->
				<div class="space-y-1.5 text-xs text-slate-600 flex-1">
					<div class="flex items-center gap-2">
						<Mail class="w-3.5 h-3.5 text-slate-400" />
						<span class="truncate">{vendor.email}</span>
					</div>
					<div class="flex items-center gap-2">
						<Phone class="w-3.5 h-3.5 text-slate-400" />
						<span>{vendor.phone}</span>
					</div>
					<div class="flex items-start gap-2">
						<MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
						<span class="leading-tight line-clamp-2">{vendor.address}</span>
					</div>
				</div>

				<!-- Category tags -->
				<div class="flex flex-wrap gap-1">
					{#each vendor.categories as cat}
						<span class="badge badge-soft badge-primary text-[9px] font-bold px-1.5">{cat}</span>
					{/each}
				</div>

				<!-- Action Buttons -->
				{#if role === 'Manager'}
					<div class="border-t border-slate-100 pt-3 flex justify-end">
						<button
							onclick={() => deleteVendor(vendor.id)}
							class="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
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
			<div class="modal-box bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-6 text-xs max-w-md">
				<h3 class="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">
					Register Approved Vendor Profile
				</h3>

				<form onsubmit={validateAndSubmit} class="space-y-4 mt-4">
					<div class="form-control">
						<label class="label pb-1" for="v-name">
							<span class="label-text font-bold text-slate-700">Vendor Corporate Name</span>
						</label>
						<input
							id="v-name"
							type="text"
							placeholder="e.g. Acme Supplies Ltd"
							bind:value={vendorName}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.name}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.name}</span>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="v-contact">
								<span class="label-text font-bold text-slate-700">Contact Person</span>
							</label>
							<input
								id="v-contact"
								type="text"
								placeholder="e.g. John Acme"
								bind:value={vendorContact}
								class="input w-full border-slate-200 text-xs"
							/>
							{#if errors.contactPerson}
								<span class="text-error text-[10px] mt-1 font-semibold">{errors.contactPerson}</span>
							{/if}
						</div>

						<div class="form-control">
							<label class="label pb-1" for="v-phone">
								<span class="label-text font-bold text-slate-700">Phone Number</span>
							</label>
							<input
								id="v-phone"
								type="text"
								placeholder="+1-555-0199"
								bind:value={vendorPhone}
								class="input w-full border-slate-200 text-xs"
							/>
							{#if errors.phone}
								<span class="text-error text-[10px] mt-1 font-semibold">{errors.phone}</span>
							{/if}
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-email">
							<span class="label-text font-bold text-slate-700">Corporate Email Address</span>
						</label>
						<input
							id="v-email"
							type="email"
							placeholder="sales@acme.com"
							bind:value={vendorEmail}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.email}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-cats">
							<span class="label-text font-bold text-slate-700">Supplier Categories</span>
						</label>
						<input
							id="v-cats"
							type="text"
							placeholder="Office Furniture, Tech Hardware, Stationery"
							bind:value={vendorCategoriesInput}
							class="input w-full border-slate-200 text-xs"
						/>
						{#if errors.categories}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.categories}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="v-addr">
							<span class="label-text font-bold text-slate-700">Physical Address</span>
						</label>
						<textarea
							id="v-addr"
							rows="2"
							placeholder="Enter standard corporate HQ mailing details..."
							bind:value={vendorAddress}
							class="textarea textarea-bordered text-xs w-full"
						></textarea>
						{#if errors.address}
							<span class="text-error text-[10px] mt-1 font-semibold">{errors.address}</span>
						{/if}
					</div>

					<div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
						<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm text-xs rounded-lg">
							Cancel
						</button>
						<button type="submit" class="btn btn-primary btn-sm text-xs font-bold rounded-lg px-6">
							Save Vendor
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

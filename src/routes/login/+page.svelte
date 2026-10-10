<script>
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { supabase, withTimeout } from '$lib/supabase';
	import { z } from 'zod';
	import {
		Eye,
		EyeOff,
		Lock,
		Mail,
		User as UserIcon,
		ShieldCheck,
		ArrowRight,
		Sun,
		Moon,
		Building2,
		Phone,
		FileText,
		MapPin,
		Tag,
		Layers
	} from '@lucide/svelte';

	let mode = $state('login'); // 'login' | 'register' | 'forgot'
	let showPassword = $state(false);
	let authInitialized = $state(false);
	let isSubmitting = $state(false);

	// Form fields
	let email = $state('');
	let username = $state('');
	let password = $state('');
	let fullName = $state('');
	let role = $state('Employee'); // 'Employee' | 'Vendor'
	let departmentId = $state('dept-electronics');
	let rememberMe = $state(true);

	// Vendor onboarding fields
	let vendorCompanyName = $state('');
	let vendorPhone = $state('');
	let vendorGstin = $state('');
	let vendorCategory = $state('Computer Hardware & IT');
	let vendorAddress = $state('');

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	const roleSchema = z.enum(['Employee', 'Vendor']);

	const loginSchema = z.object({
		email: z.string().email({ message: 'Valid email address is required' }),
		password: z.string().min(6, { message: 'Password must be at least 6 characters' })
	});

	const registerSchema = z.object({
		fullName: z.string().min(2, { message: 'Full name is required' }),
		email: z.string().email({ message: 'Valid email address is required' }),
		password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
		role: roleSchema
	});

	function redirectForRole(/** @type {any} */ user) {
		if (user?.role === 'Employee') {
			goto('/purchase-requests');
		} else {
			goto('/dashboard');
		}
	}

	async function getProfile(/** @type {any} */ user) {
		try {
			const { data: procurementUser } = await withTimeout(
				supabase
					.from('users')
					.select('id, username, email, role, department_id, vendor_id, full_name, status, avatar_url, created_at')
					.eq('email', user.email)
					.maybeSingle(),
				800
			);

			if (procurementUser) {
				return {
					id: procurementUser.id,
					username: procurementUser.username || user.email,
					email: procurementUser.email || user.email,
					role: procurementUser.role || 'Employee',
					departmentId: procurementUser.department_id,
					vendorId: procurementUser.vendor_id,
					fullName: procurementUser.full_name || user.email,
					status: procurementUser.status,
					avatarUrl: procurementUser.avatar_url,
					createdAt: procurementUser.created_at,
					updatedAt: null
				};
			}
		} catch (err) {}

		return {
			id: user.id || 'user-1',
			username: user.email || 'user',
			email: user.email,
			role: 'Employee',
			departmentId: 'dept-electronics',
			vendorId: null,
			fullName: user.email || 'User',
			status: 'Active',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: null
		};
	}

	async function initializeAuth() {
		if (globalStore.currentUser) {
			authInitialized = true;
			return;
		}

		const { data, error } = await withTimeout(supabase.auth.getSession(), 800);

		if (error && error.message !== 'Request timeout') {
			globalStore.showToast(error.message, 'error');
		} else if (data?.session) {
			try {
				const profile = await getProfile(data.session.user);
				await globalStore.login(profile);
				redirectForRole(profile);
			} catch (/** @type {any} */ profileError) {
				globalStore.clearSession();
			}
		}

		authInitialized = true;
	}

	$effect(() => {
		if (typeof window !== 'undefined' && !authInitialized) {
			void initializeAuth();
		}
	});

	async function handleLogin(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};

		const result = loginSchema.safeParse({ email, password });

		if (!result.success) {
			result.error.issues.forEach((/** @type {any} */ issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		isSubmitting = true;
		const cleanEmail = email.trim().toLowerCase();
		const mockUsers = db.getUsers();
		const matchedUser = mockUsers.find(
			(/** @type {any} */ u) => u.email.toLowerCase() === cleanEmail
		);

		if (matchedUser) {
			if (matchedUser.password && password !== matchedUser.password) {
				isSubmitting = false;
				globalStore.showToast('Invalid email or password', 'error');
				errors.password = 'Incorrect password';
				return;
			}
			await globalStore.login(matchedUser);
			globalStore.showToast(`Welcome back, ${matchedUser.fullName}!`, 'success');
			redirectForRole(matchedUser);
			isSubmitting = false;
			return;
		}

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: cleanEmail,
				password
			});

			if (error) {
				isSubmitting = false;
				globalStore.showToast(error.message || 'Invalid login credentials', 'error');
				return;
			}

			const profile = await getProfile(data.user);
			await globalStore.login(profile);
			globalStore.showToast(`Welcome back, ${profile.fullName}!`, 'success');
			redirectForRole(profile);
		} catch (err) {
			globalStore.showToast('Invalid login credentials', 'error');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRegister(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};

		if (role === 'Manager' || role === 'Admin') {
			globalStore.showToast('Admin registration is restricted.', 'error');
			return;
		}

		if (!fullName.trim() || fullName.trim().length < 2) {
			errors.fullName = role === 'Vendor' ? 'Authorized contact person name is required' : 'Full name is required';
		}

		if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Valid corporate email address is required';
		}

		if (!password || password.length < 6) {
			errors.password = 'Password must be at least 6 characters';
		}

		if (role === 'Vendor') {
			if (!vendorCompanyName.trim() || vendorCompanyName.trim().length < 2) {
				errors.vendorCompanyName = 'Company or Entity Name is required';
			}
			if (!vendorPhone.trim() || vendorPhone.trim().length < 7) {
				errors.vendorPhone = 'Valid business phone number is required';
			}
			if (!vendorGstin.trim() || vendorGstin.trim().length < 5) {
				errors.vendorGstin = 'Valid GSTIN or Tax Identification is required';
			}
			if (!vendorAddress.trim() || vendorAddress.trim().length < 3) {
				errors.vendorAddress = 'Business address/city is required';
			}
		}

		if (Object.keys(errors).length > 0) {
			globalStore.showToast('Please fill in all required registration details.', 'error');
			return;
		}

		isSubmitting = true;
		const cleanEmail = email.trim().toLowerCase();
		const generatedUsername = username.trim() || cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
		const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`;

		const users = db.getUsers() || [];
		const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
		if (existingUser) {
			isSubmitting = false;
			errors.email = 'An account with this email already exists';
			globalStore.showToast('An account with this email already exists', 'error');
			return;
		}

		let assignedVendorId = null;

		// If Vendor Partner, create and register the official Vendor profile
		if (role === 'Vendor') {
			assignedVendorId = 'vendor-' + Math.random().toString(36).substring(2, 8);
			const newVendor = {
				id: assignedVendorId,
				name: vendorCompanyName.trim(),
				contactPerson: fullName.trim(),
				email: cleanEmail,
				phone: vendorPhone.trim(),
				address: vendorAddress.trim(),
				gstin: vendorGstin.trim().toUpperCase(),
				categories: [vendorCategory || 'Computer Hardware & IT'],
				rating: 5.0,
				performanceScore: 95,
				status: 'Active',
				createdAt: new Date().toISOString()
			};

			const vendors = db.getVendors() || [];
			vendors.unshift(newVendor);
			db.saveVendors(vendors);

			// Non-blocking Supabase vendor sync
			try {
				await withTimeout(
					supabase.from('vendors').insert([
						{
							id: assignedVendorId,
							name: newVendor.name,
							contact_person: newVendor.contactPerson,
							email: newVendor.email,
							phone: newVendor.phone,
							address: newVendor.address,
							gstin: newVendor.gstin,
							rating: 5.0,
							status: 'Active'
						}
					]),
					1000
				);
			} catch (supaVenErr) {
				console.warn('Supabase vendor sync note:', supaVenErr);
			}
		}

		const newUser = {
			id: 'user-' + Math.random().toString(36).substring(2, 8),
			username: generatedUsername,
			email: cleanEmail,
			password,
			role,
			departmentId: role === 'Employee' ? departmentId : null,
			vendorId: assignedVendorId,
			fullName: fullName.trim(),
			status: 'Active',
			avatarUrl,
			createdAt: new Date().toISOString()
		};

		users.push(newUser);
		db.saveUsers(users);

		// Non-blocking Supabase sync
		try {
			await supabase.auth.signUp({
				email: cleanEmail,
				password,
				options: {
					data: {
						username: generatedUsername,
						fullName: fullName.trim(),
						role,
						departmentId: role === 'Employee' ? departmentId : null,
						vendorId: assignedVendorId,
						avatarUrl
					}
				}
			});
		} catch (supaErr) {
			console.warn('Supabase register sync note:', supaErr);
		}

		await globalStore.login(newUser);
		if (role === 'Vendor') {
			globalStore.showToast(`Vendor Partner registered! Welcome, ${vendorCompanyName.trim()}!`, 'success');
		} else {
			globalStore.showToast(`Account created! Welcome, ${newUser.fullName}!`, 'success');
		}
		redirectForRole(newUser);
		isSubmitting = false;
	}

	async function handleForgot(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		if (!email) {
			globalStore.showToast('Please enter your email', 'error');
			return;
		}

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/login`
		});

		if (error) {
			globalStore.showToast(error.message, 'error');
			return;
		}

		globalStore.showToast('Password reset link sent to your email!', 'success');
		mode = 'login';
	}
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden transition-colors selection:bg-sky-500 selection:text-white">
	<!-- Background Ambient Glow Accents -->
	<div class="fixed inset-0 pointer-events-none z-0">
		<div class="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-sky-500/10 dark:bg-sky-600/15 blur-[140px]"></div>
		<div class="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[150px]"></div>
		<div class="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
	</div>

	<!-- Top Header Nav -->
	<header class="w-full max-w-5xl mx-auto flex items-center justify-between relative z-20 py-2">
		<a href="/" class="flex items-center gap-2 group">
			<div class="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-all">
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<span class="font-black text-base tracking-tight text-slate-900 dark:text-white block uppercase">
					Procure<span class="text-sky-600 dark:text-sky-400">Smart</span>
				</span>
				<span class="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-widest block -mt-1 uppercase">
					Enterprise ERP
				</span>
			</div>
		</a>

		<button
			onclick={() => globalStore.toggleTheme()}
			class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all shadow-sm hover:scale-105 active:scale-95"
			title="Toggle Theme"
			aria-label="Toggle Theme"
		>
			{#if globalStore.theme === 'light'}
				<Moon class="w-4 h-4 text-slate-600" />
			{:else}
				<Sun class="w-4 h-4 text-amber-400" />
			{/if}
		</button>
	</header>

	<!-- Centered Auth Card -->
	<main class="w-full {mode === 'register' && role === 'Vendor' ? 'max-w-xl' : 'max-w-md'} mx-auto my-auto relative z-10 py-6 transition-all duration-300">
		<div class="p-[1px] rounded-3xl bg-gradient-to-b from-sky-500/30 via-slate-200 dark:via-slate-800/60 to-indigo-500/20 shadow-xl dark:shadow-2xl dark:shadow-sky-950/60">
			<div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[23px] space-y-5 border border-slate-200/80 dark:border-slate-800/80">
				
				<!-- Brand Header -->
				<div class="text-left space-y-1.5">
					<div class="inline-flex items-center justify-center p-2.5 bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-sky-500/25 mb-1">
						<ShieldCheck class="w-6 h-6" />
					</div>
					<h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
						{mode === 'login'
							? 'ProcureSmart Portal'
							: mode === 'register'
								? 'Create Portal Account'
								: 'Reset Password'}
					</h1>
					<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
						{mode === 'login'
							? 'Enter your credentials to access your procurement dashboard.'
							: mode === 'register'
								? 'Join ProcureSmart to manage requisitions or vendor bidding.'
								: 'Enter your registered email to receive a password reset link.'}
					</p>
				</div>

				<!-- Mode Switcher Tabs (Login vs Register) -->
				{#if mode !== 'forgot'}
					<div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
						<button
							type="button"
							onclick={() => { mode = 'login'; errors = {}; }}
							class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center {mode === 'login'
								? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
								: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
						>
							Sign In
						</button>

						<button
							type="button"
							onclick={() => { mode = 'register'; errors = {}; }}
							class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center {mode === 'register'
								? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
								: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
						>
							Create Account
						</button>
					</div>
				{/if}

				<!-- FORM VIEWS -->
				{#if mode === 'login'}
					<!-- SIGN IN FORM -->
					<form onsubmit={handleLogin} class="space-y-4 pt-1">
						<!-- Email Field -->
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="login-email">
								Email Address
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500' : ''}">
								<Mail class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="login-email"
									type="email"
									placeholder="name@enterprise.com"
									bind:value={email}
									autocomplete="username"
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
								/>
							</div>
							{#if errors.email}
								<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.email}</p>
							{/if}
						</div>

						<!-- Password Field -->
						<div class="space-y-1.5">
							<div class="flex justify-between items-center">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="login-password">
									Password
								</label>
								<button
									type="button"
									onclick={() => (mode = 'forgot')}
									class="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline"
								>
									Forgot password?
								</button>
							</div>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500' : ''}">
								<Lock class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="login-password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									bind:value={password}
									autocomplete="current-password"
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1"
									aria-label="Toggle password visibility"
								>
									{#if showPassword}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							</div>
							{#if errors.password}
								<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.password}</p>
							{/if}
						</div>

						<!-- Remember Me Checkbox -->
						<div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-0.5">
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={rememberMe}
									class="checkbox checkbox-xs checkbox-primary rounded"
								/>
								<span>Keep me signed in</span>
							</label>
						</div>

						<!-- Submit Button -->
						<button
							type="submit"
							disabled={isSubmitting}
							class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-60"
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								<span>Signing In...</span>
							{:else}
								<span>Sign In</span>
								<ArrowRight class="w-4 h-4" />
							{/if}
						</button>
					</form>

				{:else if mode === 'register'}
					<!-- REGISTRATION FORM -->
					<form onsubmit={handleRegister} class="space-y-3.5 pt-1">
						
						<!-- Role Selection (Clean Pill Switcher) -->
						<div class="space-y-1.5">
							<span class="block font-bold text-xs text-slate-700 dark:text-slate-300">
								Account Type
							</span>
							<div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
								<button
									type="button"
									onclick={() => { role = 'Employee'; errors = {}; }}
									class="py-2 rounded-lg transition-all text-center {role === 'Employee'
										? 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 dark:border-sky-500/40 font-black shadow-xs'
										: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
								>
									Staff Employee
								</button>
								<button
									type="button"
									onclick={() => { role = 'Vendor'; errors = {}; }}
									class="py-2 rounded-lg transition-all text-center {role === 'Vendor'
										? 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 dark:border-sky-500/40 font-black shadow-xs'
										: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
								>
									Vendor Partner
								</button>
							</div>
						</div>

						<!-- VENDOR PARTNER ONBOARDING SPECIFIC FIELDS -->
						{#if role === 'Vendor'}
							<!-- Vendor Info Banner -->
							<div class="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs flex items-start gap-2.5">
								<Building2 class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
								<div class="leading-relaxed">
									<span class="font-black text-sky-700 dark:text-sky-400 block">Vendor Partner Onboarding</span>
									<span class="text-[11px] text-slate-600 dark:text-slate-400">Register your company details to receive RFP quotations, supply PO orders, and invoice settlements.</span>
								</div>
							</div>

							<!-- Company Name -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-vendor-company">
									Company / Legal Business Name <span class="text-rose-500">*</span>
								</label>
								<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.vendorCompanyName ? 'border-rose-500' : ''}">
									<Building2 class="w-4 h-4 text-slate-400 shrink-0" />
									<input
										id="reg-vendor-company"
										type="text"
										placeholder="e.g. Apex Global Tech Solutions Pvt Ltd"
										bind:value={vendorCompanyName}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
									/>
								</div>
								{#if errors.vendorCompanyName}
									<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.vendorCompanyName}</p>
								{/if}
							</div>

							<!-- Authorized Contact Person & Phone (2-col grid) -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<!-- Contact Person -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-name">
										Contact Person Name <span class="text-rose-500">*</span>
									</label>
									<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.fullName ? 'border-rose-500' : ''}">
										<UserIcon class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="reg-name"
											type="text"
											placeholder="e.g. Alice Johnson"
											bind:value={fullName}
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
										/>
									</div>
									{#if errors.fullName}
										<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.fullName}</p>
									{/if}
								</div>

								<!-- Business Phone -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-vendor-phone">
										Business Phone Number <span class="text-rose-500">*</span>
									</label>
									<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.vendorPhone ? 'border-rose-500' : ''}">
										<Phone class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="reg-vendor-phone"
											type="tel"
											placeholder="e.g. +91 98765 43210"
											bind:value={vendorPhone}
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
										/>
									</div>
									{#if errors.vendorPhone}
										<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.vendorPhone}</p>
									{/if}
								</div>
							</div>

							<!-- Official Email -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-email">
									Official Business Email <span class="text-rose-500">*</span>
								</label>
								<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500' : ''}">
									<Mail class="w-4 h-4 text-slate-400 shrink-0" />
									<input
										id="reg-email"
										type="email"
										placeholder="sales@apextech.com"
										bind:value={email}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
									/>
								</div>
								{#if errors.email}
									<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.email}</p>
								{/if}
							</div>

							<!-- GSTIN & Supply Category (2-col grid) -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<!-- GSTIN -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-vendor-gstin">
										GSTIN / Tax ID <span class="text-rose-500">*</span>
									</label>
									<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.vendorGstin ? 'border-rose-500' : ''}">
										<FileText class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="reg-vendor-gstin"
											type="text"
											placeholder="e.g. 33AABCA5678G1Z9"
											bind:value={vendorGstin}
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white uppercase placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
										/>
									</div>
									{#if errors.vendorGstin}
										<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.vendorGstin}</p>
									{/if}
								</div>

								<!-- Supply Category -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-vendor-cat">
										Primary Supply Category
									</label>
									<div class="w-full flex items-center px-3 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 rounded-xl">
										<Tag class="w-4 h-4 text-slate-400 mr-2 shrink-0" />
										<select
											id="reg-vendor-cat"
											bind:value={vendorCategory}
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
										>
											<option value="Computer Hardware & IT" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Computer Hardware & IT</option>
											<option value="Office Furniture & Equipment" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Office Furniture & Equipment</option>
											<option value="Electrical & Industrial Goods" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Electrical & Industrial Goods</option>
											<option value="Software Licenses & Cloud" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Software Licenses & Cloud</option>
											<option value="Logistics & Freight Services" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Logistics & Freight Services</option>
											<option value="Stationery & Printing Supplies" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Stationery & Printing Supplies</option>
											<option value="Facility & Maintenance Services" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Facility & Maintenance Services</option>
											<option value="General Commercial Supplies" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">General Commercial Supplies</option>
										</select>
									</div>
								</div>
							</div>

							<!-- Business Address -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-vendor-address">
									Operating Business Address & City <span class="text-rose-500">*</span>
								</label>
								<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.vendorAddress ? 'border-rose-500' : ''}">
									<MapPin class="w-4 h-4 text-slate-400 shrink-0" />
									<input
										id="reg-vendor-address"
										type="text"
										placeholder="e.g. Plot 14, Industrial Estate, Guindy, Chennai"
										bind:value={vendorAddress}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
									/>
								</div>
								{#if errors.vendorAddress}
									<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.vendorAddress}</p>
								{/if}
							</div>

						{:else}
							<!-- STAFF EMPLOYEE FIELDS -->
							<!-- Full Name -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-name">
									Full Name
								</label>
								<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.fullName ? 'border-rose-500' : ''}">
									<UserIcon class="w-4 h-4 text-slate-400 shrink-0" />
									<input
										id="reg-name"
										type="text"
										placeholder="e.g. Alice Johnson"
										bind:value={fullName}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
									/>
								</div>
								{#if errors.fullName}
									<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.fullName}</p>
								{/if}
							</div>

							<!-- Department Dropdown -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-dept">
									Department
								</label>
								<div class="w-full flex items-center px-3 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 rounded-xl">
									<select
										id="reg-dept"
										bind:value={departmentId}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
									>
										<option value="dept-electronics" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Electronics</option>
										<option value="dept-kitchen" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Kitchen Appliances</option>
										<option value="dept-clothes" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Clothes</option>
										<option value="dept-toys" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Kids Toys</option>
										<option value="dept-deptstore" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Departmental Store</option>
										<option value="dept-footwear" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Footwear</option>
										<option value="dept-furniture" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Furnitures</option>
										<option value="dept-others" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Others</option>
									</select>
								</div>
							</div>

							<!-- Email Address -->
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-email">
									Corporate Email Address
								</label>
								<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500' : ''}">
									<Mail class="w-4 h-4 text-slate-400 shrink-0" />
									<input
										id="reg-email"
										type="email"
										placeholder="name@enterprise.com"
										bind:value={email}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
									/>
								</div>
								{#if errors.email}
									<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.email}</p>
								{/if}
							</div>
						{/if}

						<!-- Password Field (Shared for both roles) -->
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="reg-password">
								Create Password
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500' : ''}">
								<Lock class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="reg-password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Min. 6 characters"
									bind:value={password}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1"
									aria-label="Toggle password visibility"
								>
									{#if showPassword}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							</div>
							{#if errors.password}
								<p class="text-rose-500 text-[10px] font-bold mt-1">• {errors.password}</p>
							{/if}
						</div>

						<!-- Submit Register Button -->
						<button
							type="submit"
							disabled={isSubmitting}
							class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-60 mt-1"
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								<span>Registering Vendor Profile...</span>
							{:else}
								<span>{role === 'Vendor' ? 'Register Vendor Partner' : 'Create Account'}</span>
								<ArrowRight class="w-4 h-4" />
							{/if}
						</button>
					</form>

				{:else if mode === 'forgot'}
					<!-- FORGOT PASSWORD FORM -->
					<form onsubmit={handleForgot} class="space-y-4 pt-1">
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-700 dark:text-slate-300" for="forgot-email">
								Email Address
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all">
								<Mail class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="forgot-email"
									type="email"
									placeholder="name@enterprise.com"
									bind:value={email}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 custom-autofill"
								/>
							</div>
						</div>

						<button
							type="submit"
							class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none"
						>
							Send Reset Link
						</button>

						<div class="text-center pt-1">
							<button
								type="button"
								onclick={() => (mode = 'login')}
								class="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline"
							>
								Back to Sign In
							</button>
						</div>
					</form>
				{/if}

				<!-- Bottom Toggle Link -->
				<div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 text-center">
					{#if mode === 'login'}
						<span class="text-slate-500 dark:text-slate-400 text-xs">
							Don't have an account?
						</span>
						<button
							type="button"
							onclick={() => { mode = 'register'; errors = {}; }}
							class="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline ml-1"
						>
							Create an account
						</button>
					{:else if mode === 'register'}
						<span class="text-slate-500 dark:text-slate-400 text-xs">
							Already registered?
						</span>
						<button
							type="button"
							onclick={() => { mode = 'login'; errors = {}; }}
							class="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline ml-1"
						>
							Sign In
						</button>
					{/if}
				</div>

			</div>
		</div>
	</main>

	<!-- Clean Footer -->
	<footer class="w-full max-w-5xl mx-auto py-3 text-center text-[11px] text-slate-500 dark:text-slate-500 relative z-20">
		<p>© 2026 ProcureSmart Enterprise ERP. All rights reserved.</p>
	</footer>
</div>

<style>
	/* Fix ugly autofill background in WebKit browsers (Chrome, Edge, Safari) */
	:global([data-theme="dark"] .custom-autofill:-webkit-autofill),
	:global([data-theme="dark"] .custom-autofill:-webkit-autofill:hover),
	:global([data-theme="dark"] .custom-autofill:-webkit-autofill:focus),
	:global([data-theme="dark"] .custom-autofill:-webkit-autofill:active),
	:global(.dark .custom-autofill:-webkit-autofill),
	:global(.dark .custom-autofill:-webkit-autofill:hover),
	:global(.dark .custom-autofill:-webkit-autofill:focus),
	:global(.dark .custom-autofill:-webkit-autofill:active) {
		-webkit-box-shadow: 0 0 0 1000px #020617 inset !important;
		-webkit-text-fill-color: #f8fafc !important;
		transition: background-color 5000s ease-in-out 0s;
		caret-color: #f8fafc !important;
	}

	:global([data-theme="light"] .custom-autofill:-webkit-autofill),
	:global([data-theme="light"] .custom-autofill:-webkit-autofill:hover),
	:global([data-theme="light"] .custom-autofill:-webkit-autofill:focus),
	:global([data-theme="light"] .custom-autofill:-webkit-autofill:active),
	:global(:not(.dark) .custom-autofill:-webkit-autofill) {
		-webkit-box-shadow: 0 0 0 1000px #f8fafc inset !important;
		-webkit-text-fill-color: #0f172a !important;
		transition: background-color 5000s ease-in-out 0s;
		caret-color: #0f172a !important;
	}
</style>

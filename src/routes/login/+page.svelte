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
		Moon
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

		const result = registerSchema.safeParse({
			fullName,
			email,
			password,
			role
		});

		if (!result.success) {
			result.error.issues.forEach((/** @type {any} */ issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		isSubmitting = true;
		const generatedUsername = username.trim() || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
		const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`;
		const assignedVendorId = role === 'Vendor' ? 'vendor-acme' : null;

		const users = db.getUsers();
		const existingUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
		if (existingUser) {
			isSubmitting = false;
			errors.email = 'An account with this email already exists';
			globalStore.showToast('An account with this email already exists', 'error');
			return;
		}

		const newUser = {
			id: 'user-' + Math.random().toString(36).substring(2, 8),
			username: generatedUsername,
			email: email.trim().toLowerCase(),
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
				email,
				password,
				options: {
					data: {
						username: generatedUsername,
						fullName,
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
		globalStore.showToast(`Account created! Welcome, ${newUser.fullName}!`, 'success');
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

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden transition-colors selection:bg-sky-500 selection:text-white">
	<!-- Background Ambient Glow Accents -->
	<div class="fixed inset-0 pointer-events-none z-0">
		<div class="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-sky-600/15 blur-[140px]"></div>
		<div class="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[150px]"></div>
		<div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
	</div>

	<!-- Top Header Nav -->
	<header class="w-full max-w-5xl mx-auto flex items-center justify-between relative z-20 py-2">
		<a href="/" class="flex items-center gap-2 group">
			<div class="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-all">
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<span class="font-black text-base tracking-tight text-white block uppercase">
					Procure<span class="text-sky-400">Smart</span>
				</span>
				<span class="text-[9px] text-slate-400 font-bold tracking-widest block -mt-1 uppercase">
					Enterprise ERP
				</span>
			</div>
		</a>

		<button
			onclick={() => globalStore.toggleTheme()}
			class="p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-all shadow-sm"
			title="Toggle Theme"
			aria-label="Toggle Theme"
		>
			{#if globalStore.theme === 'light'}
				<Moon class="w-4 h-4 text-slate-300" />
			{:else}
				<Sun class="w-4 h-4 text-amber-400" />
			{/if}
		</button>
	</header>

	<!-- Centered Auth Card -->
	<main class="w-full max-w-md mx-auto my-auto relative z-10 py-6">
		<div class="p-[1px] rounded-3xl bg-gradient-to-b from-sky-500/35 via-slate-800/60 to-indigo-500/25 shadow-2xl shadow-sky-950/60">
			<div class="bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[23px] space-y-5">
				
				<!-- Brand Header -->
				<div class="text-left space-y-1.5">
					<div class="inline-flex items-center justify-center p-2.5 bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-sky-500/25 mb-1">
						<ShieldCheck class="w-6 h-6" />
					</div>
					<h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
						{mode === 'login'
							? 'ProcureSmart Portal'
							: mode === 'register'
								? 'Create Portal Account'
								: 'Reset Password'}
					</h1>
					<p class="text-xs text-slate-400 font-medium">
						{mode === 'login'
							? 'Enter your credentials to access your procurement dashboard.'
							: mode === 'register'
								? 'Join ProcureSmart to manage requisitions or vendor bidding.'
								: 'Enter your registered email to receive a password reset link.'}
					</p>
				</div>

				<!-- Mode Switcher Tabs (Login vs Register) -->
				{#if mode !== 'forgot'}
					<div class="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
						<button
							type="button"
							onclick={() => { mode = 'login'; errors = {}; }}
							class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center {mode === 'login'
								? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
								: 'text-slate-400 hover:text-white'}"
						>
							Sign In
						</button>

						<button
							type="button"
							onclick={() => { mode = 'register'; errors = {}; }}
							class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center {mode === 'register'
								? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
								: 'text-slate-400 hover:text-white'}"
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
							<label class="block font-bold text-xs text-slate-300" for="login-email">
								Email Address
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500' : ''}">
								<Mail class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="login-email"
									type="email"
									placeholder="name@enterprise.com"
									bind:value={email}
									autocomplete="username"
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
								/>
							</div>
							{#if errors.email}
								<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.email}</p>
							{/if}
						</div>

						<!-- Password Field -->
						<div class="space-y-1.5">
							<div class="flex justify-between items-center">
								<label class="block font-bold text-xs text-slate-300" for="login-password">
									Password
								</label>
								<button
									type="button"
									onclick={() => (mode = 'forgot')}
									class="text-[11px] font-extrabold text-sky-400 hover:underline"
								>
									Forgot password?
								</button>
							</div>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500' : ''}">
								<Lock class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="login-password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									bind:value={password}
									autocomplete="current-password"
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="text-slate-400 hover:text-white p-1"
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
								<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.password}</p>
							{/if}
						</div>

						<!-- Remember Me Checkbox -->
						<div class="flex items-center justify-between text-xs text-slate-400 pt-0.5">
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
							<label class="block font-bold text-xs text-slate-300">
								Account Type
							</label>
							<div class="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
								<button
									type="button"
									onclick={() => (role = 'Employee')}
									class="py-2 rounded-lg transition-all text-center {role === 'Employee'
										? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-black'
										: 'text-slate-400 hover:text-white'}"
								>
									Staff Employee
								</button>
								<button
									type="button"
									onclick={() => (role = 'Vendor')}
									class="py-2 rounded-lg transition-all text-center {role === 'Vendor'
										? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-black'
										: 'text-slate-400 hover:text-white'}"
								>
									Vendor Partner
								</button>
							</div>
						</div>

						<!-- Full Name -->
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-300" for="reg-name">
								Full Name
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.fullName ? 'border-rose-500' : ''}">
								<UserIcon class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="reg-name"
									type="text"
									placeholder="e.g. Alice Johnson"
									bind:value={fullName}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
								/>
							</div>
							{#if errors.fullName}
								<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.fullName}</p>
							{/if}
						</div>

						<!-- If Employee: Department Dropdown -->
						{#if role === 'Employee'}
							<div class="space-y-1.5">
								<label class="block font-bold text-xs text-slate-300" for="reg-dept">
									Department
								</label>
								<div class="w-full flex items-center px-3 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 rounded-xl">
									<select
										id="reg-dept"
										bind:value={departmentId}
										class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs font-bold text-white cursor-pointer"
									>
										<option value="dept-electronics" class="bg-slate-900 text-white">Electronics</option>
										<option value="dept-kitchen" class="bg-slate-900 text-white">Kitchen Appliances</option>
										<option value="dept-clothes" class="bg-slate-900 text-white">Clothes</option>
										<option value="dept-toys" class="bg-slate-900 text-white">Kids Toys</option>
										<option value="dept-deptstore" class="bg-slate-900 text-white">Departmental Store</option>
										<option value="dept-footwear" class="bg-slate-900 text-white">Footwear</option>
										<option value="dept-furniture" class="bg-slate-900 text-white">Furnitures</option>
										<option value="dept-others" class="bg-slate-900 text-white">Others</option>
									</select>
								</div>
							</div>
						{/if}

						<!-- Email Address -->
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-300" for="reg-email">
								Corporate Email Address
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500' : ''}">
								<Mail class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="reg-email"
									type="email"
									placeholder="name@enterprise.com"
									bind:value={email}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
								/>
							</div>
							{#if errors.email}
								<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.email}</p>
							{/if}
						</div>

						<!-- Password -->
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-300" for="reg-password">
								Create Password
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500' : ''}">
								<Lock class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="reg-password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Min. 6 characters"
									bind:value={password}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="text-slate-400 hover:text-white p-1"
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
								<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.password}</p>
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
								<span>Creating Account...</span>
							{:else}
								<span>Create Account</span>
								<ArrowRight class="w-4 h-4" />
							{/if}
						</button>
					</form>

				{:else if mode === 'forgot'}
					<!-- FORGOT PASSWORD FORM -->
					<form onsubmit={handleForgot} class="space-y-4 pt-1">
						<div class="space-y-1.5">
							<label class="block font-bold text-xs text-slate-300" for="forgot-email">
								Email Address
							</label>
							<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all">
								<Mail class="w-4 h-4 text-slate-400 shrink-0" />
								<input
									id="forgot-email"
									type="email"
									placeholder="name@enterprise.com"
									bind:value={email}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
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
								class="text-xs font-extrabold text-sky-400 hover:underline"
							>
								Back to Sign In
							</button>
						</div>
					</form>
				{/if}

				<!-- Bottom Toggle Link -->
				<div class="pt-3 border-t border-slate-800/80 text-center">
					{#if mode === 'login'}
						<span class="text-slate-400 text-xs">
							Don't have an account?
						</span>
						<button
							type="button"
							onclick={() => { mode = 'register'; errors = {}; }}
							class="text-xs font-extrabold text-sky-400 hover:underline ml-1"
						>
							Create an account
						</button>
					{:else if mode === 'register'}
						<span class="text-slate-400 text-xs">
							Already registered?
						</span>
						<button
							type="button"
							onclick={() => { mode = 'login'; errors = {}; }}
							class="text-xs font-extrabold text-sky-400 hover:underline ml-1"
						>
							Sign In
						</button>
					{/if}
				</div>

			</div>
		</div>
	</main>

	<!-- Clean Footer -->
	<footer class="w-full max-w-5xl mx-auto py-3 text-center text-[11px] text-slate-500 relative z-20">
		<p>© 2026 ProcureSmart Enterprise ERP. All rights reserved.</p>
	</footer>
</div>

<style>
	/* Fix ugly white autofill background in WebKit browsers (Chrome, Edge, Safari) */
	:global(.custom-autofill:-webkit-autofill),
	:global(.custom-autofill:-webkit-autofill:hover),
	:global(.custom-autofill:-webkit-autofill:focus),
	:global(.custom-autofill:-webkit-autofill:active) {
		-webkit-box-shadow: 0 0 0 1000px #020617 inset !important;
		-webkit-text-fill-color: #f8fafc !important;
		transition: background-color 5000s ease-in-out 0s;
		caret-color: #f8fafc !important;
	}
</style>

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
		Building,
		CheckCircle2,
		Zap,
		Check,
		Briefcase,
		Sparkles,
		Package,
		Truck,
		Info,
		ChevronRight,
		FileText
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
	let vendorCompanyName = $state('');
	let rememberMe = $state(true);
	let termsAccepted = $state(true);

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	// Demo Accounts for 1-Click Fast Access
	const demoAccounts = [
		{
			id: 'admin',
			label: 'Head Admin',
			sublabel: 'Central Finance',
			email: 'head@gmail.com',
			password: 'Head@123',
			role: 'Manager / Admin',
			dotColor: 'bg-amber-400',
			badge: 'Admin'
		},
		{
			id: 'emp',
			label: 'Staff Employee',
			sublabel: 'Electronics Dept',
			email: 'employee@gmail.com',
			password: 'Employee@123',
			role: 'Employee',
			dotColor: 'bg-sky-400',
			badge: 'Staff'
		},
		{
			id: 'v1',
			label: 'Apex IT Solutions',
			sublabel: 'Hardware Vendor',
			email: 'vendor1@gmail.com',
			password: 'Vendor1@123',
			role: 'Vendor',
			dotColor: 'bg-emerald-400',
			badge: 'Vendor'
		},
		{
			id: 'v2',
			label: 'ACME Supplies',
			sublabel: 'Office & Furniture',
			email: 'vendor2@gmail.com',
			password: 'Vendor2@123',
			role: 'Vendor',
			dotColor: 'bg-purple-400',
			badge: 'Vendor'
		},
		{
			id: 'v3',
			label: 'Global Logistics',
			sublabel: 'Freight & Supply',
			email: 'vendor3@gmail.com',
			password: 'Vendor3@123',
			role: 'Vendor',
			dotColor: 'bg-cyan-400',
			badge: 'Vendor'
		}
	];

	function fillDemoAccount(acc) {
		email = acc.email;
		password = acc.password;
		errors = {};
		globalStore.showToast(`Selected demo credentials for ${acc.label} (${acc.badge})`, 'info');
	}

	// Password strength calculation
	let passwordStrength = $derived.by(() => {
		if (!password) return 0;
		let score = 0;
		if (password.length >= 6) score += 30;
		if (password.length >= 8) score += 20;
		if (/[A-Z]/.test(password)) score += 20;
		if (/[0-9]/.test(password)) score += 15;
		if (/[^A-Za-z0-9]/.test(password)) score += 15;
		return Math.min(score, 100);
	});

	let passwordStrengthLabel = $derived.by(() => {
		if (passwordStrength < 30) return { label: 'Weak', color: 'text-rose-400', barColor: 'bg-rose-500' };
		if (passwordStrength < 70) return { label: 'Medium', color: 'text-amber-400', barColor: 'bg-amber-500' };
		return { label: 'Strong', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
	});

	const roleSchema = z.enum(['Employee', 'Vendor']);

	const loginSchema = z.object({
		email: z.string().email({ message: 'Valid email address is required' }),
		password: z.string().min(6, { message: 'Password must be at least 6 characters' })
	});

	const registerSchema = z.object({
		username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
		email: z.string().email({ message: 'Valid corporate email address required' }),
		fullName: z.string().min(2, { message: 'Full name is required' }),
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
			globalStore.showToast('Admin registration is restricted. Only authorized staff can join.', 'error');
			return;
		}

		if (!termsAccepted) {
			globalStore.showToast('Please agree to terms and privacy policy to continue', 'error');
			errors.terms = 'Must agree to terms';
			return;
		}

		const result = registerSchema.safeParse({
			username,
			email,
			fullName,
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
		const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;
		const assignedVendorId = role === 'Vendor' ? 'vendor-acme' : null;

		// Save to mock database for instant persistence
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
			username: username.trim(),
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
						username,
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
		globalStore.showToast(`Account created successfully! Welcome, ${newUser.fullName}!`, 'success');
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

		globalStore.showToast('Password reset link dispatched to your email!', 'success');
		mode = 'login';
	}
</script>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden transition-colors selection:bg-sky-500 selection:text-white">
	<!-- Background Ambient Glow & Grid Pattern -->
	<div class="fixed inset-0 pointer-events-none z-0">
		<div class="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-sky-600/15 blur-[160px]"></div>
		<div class="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full bg-indigo-600/15 blur-[170px]"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-700/10 blur-[180px]"></div>
		<div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
	</div>

	<!-- Top Header Utility Bar -->
	<header class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-20">
		<a href="/" class="flex items-center gap-2.5 group">
			<div class="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-all">
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<span class="font-extrabold text-base tracking-tight text-white block uppercase">
					Procure<span class="text-sky-400">Smart</span>
				</span>
				<span class="text-[9px] text-slate-400 font-bold tracking-widest block -mt-1 uppercase">
					Enterprise ERP
				</span>
			</div>
		</a>

		<div class="flex items-center gap-3">
			<a
				href="/"
				class="text-xs font-bold text-slate-400 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1"
			>
				Landing Overview
				<ChevronRight class="w-3.5 h-3.5" />
			</a>

			<button
				onclick={() => globalStore.toggleTheme()}
				class="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-all shadow-sm"
				title="Toggle Theme"
				aria-label="Toggle Theme"
			>
				{#if globalStore.theme === 'light'}
					<Moon class="w-4 h-4 text-slate-300" />
				{:else}
					<Sun class="w-4 h-4 text-amber-400" />
				{/if}
			</button>
		</div>
	</header>

	<!-- Main Container: Responsive Split Screen Layout -->
	<main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 my-auto relative z-10">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
			
			<!-- LEFT COLUMN: Enterprise Value Showcase (Desktop visible, mobile refined) -->
			<div class="lg:col-span-5 xl:col-span-5 hidden lg:flex flex-col space-y-7 pr-2">
				<!-- Enterprise Badge -->
				<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold w-fit">
					<Sparkles class="w-3.5 h-3.5 text-sky-400 animate-pulse" />
					<span>Enterprise Supply Chain Intelligence</span>
				</div>

				<!-- Headline -->
				<div class="space-y-3">
					<h2 class="text-3xl xl:text-4xl font-black text-white tracking-tight leading-[1.15]">
						Seamless Procurement & <br />
						<span class="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
							Instant Tax Settlements
						</span>
					</h2>
					<p class="text-xs xl:text-sm text-slate-400 leading-relaxed font-normal">
						Empowering organizations with automated approval workflows, transparent vendor quotation bidding, and instantaneous Razorpay GST invoice generation.
					</p>
				</div>

				<!-- Feature Highlights Cards -->
				<div class="space-y-3.5">
					<div class="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex items-start gap-3 hover:border-slate-700 transition-all">
						<div class="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
							<FileText class="w-4 h-4" />
						</div>
						<div>
							<h3 class="text-xs font-bold text-white">Automated Approval Workflows</h3>
							<p class="text-[11px] text-slate-400 mt-0.5 leading-snug">
								Automated multi-tier budget validation, managerial authorization, and Purchase Order generation.
							</p>
						</div>
					</div>

					<div class="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex items-start gap-3 hover:border-slate-700 transition-all">
						<div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
							<CheckCircle2 class="w-4 h-4" />
						</div>
						<div>
							<h3 class="text-xs font-bold text-white">Instant Razorpay Settlements</h3>
							<p class="text-[11px] text-slate-400 mt-0.5 leading-snug">
								Automated GST Tax Invoices (18% CGST + SGST) generated upon instant payment verification.
							</p>
						</div>
					</div>

					<div class="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex items-start gap-3 hover:border-slate-700 transition-all">
						<div class="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
							<Building class="w-4 h-4" />
						</div>
						<div>
							<h3 class="text-xs font-bold text-white">Bilateral Portal Access</h3>
							<p class="text-[11px] text-slate-400 mt-0.5 leading-snug">
								Dedicated views for Central Procurement Admin and verified Vendor Partners with audit trails.
							</p>
						</div>
					</div>
				</div>

				<!-- Trust Statistics -->
				<div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-center">
					<div>
						<p class="text-base font-black text-white">99.98%</p>
						<p class="text-[10px] text-slate-400 uppercase font-semibold">Service Uptime</p>
					</div>
					<div class="h-6 w-px bg-slate-800"></div>
					<div>
						<p class="text-base font-black text-emerald-400">₹50 Cr+</p>
						<p class="text-[10px] text-slate-400 uppercase font-semibold">Volume Settled</p>
					</div>
					<div class="h-6 w-px bg-slate-800"></div>
					<div>
						<p class="text-base font-black text-sky-400">100%</p>
						<p class="text-[10px] text-slate-400 uppercase font-semibold">Audit Compliant</p>
					</div>
				</div>
			</div>

			<!-- RIGHT COLUMN: Authentication Card Container -->
			<div class="lg:col-span-7 xl:col-span-7 w-full max-w-xl mx-auto">
				<div class="p-[1px] rounded-3xl bg-gradient-to-b from-sky-500/40 via-slate-800/70 to-indigo-500/30 shadow-2xl shadow-sky-950/60">
					<div class="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[23px] space-y-6">
						
						<!-- Header & Mode Switcher -->
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h2 class="text-2xl font-black text-white tracking-tight">
										{mode === 'login'
											? 'Sign In to Portal'
											: mode === 'register'
												? 'Create Portal Account'
												: 'Password Recovery'}
									</h2>
									<p class="text-xs text-slate-400 mt-0.5">
										{mode === 'login'
											? 'Enter your enterprise credentials or choose a quick demo role.'
											: mode === 'register'
												? 'Register your account to access Procurement & Bidding.'
												: 'Enter your registered email to receive a secure recovery link.'}
									</p>
								</div>
								<div class="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
									<ShieldCheck class="w-6 h-6" />
								</div>
							</div>

							<!-- Tabs Switcher (Login vs Register) -->
							{#if mode !== 'forgot'}
								<div class="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/90 text-xs font-bold">
									<button
										type="button"
										onclick={() => { mode = 'login'; errors = {}; }}
										class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 {mode === 'login'
											? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
											: 'text-slate-400 hover:text-white'}"
									>
										<span>Sign In</span>
									</button>

									<button
										type="button"
										onclick={() => { mode = 'register'; errors = {}; }}
										class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 {mode === 'register'
											? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-md'
											: 'text-slate-400 hover:text-white'}"
									>
										<span>Create Account</span>
									</button>
								</div>
							{/if}
						</div>

						<!-- QUICK DEMO LOGINS BAR (Shown in Login mode for quick access) -->
						{#if mode === 'login'}
							<div class="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-2">
								<div class="flex items-center justify-between text-[11px]">
									<span class="font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
										<Zap class="w-3.5 h-3.5 text-amber-400" />
										1-Click Demo Accounts:
									</span>
									<span class="text-[10px] text-slate-500">Tap to auto-fill</span>
								</div>
								
								<div class="flex flex-wrap gap-1.5">
									{#each demoAccounts as acc}
										<button
											type="button"
											onclick={() => fillDemoAccount(acc)}
											class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-[11px] font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
											title={`${acc.email} (${acc.role})`}
										>
											<span class="w-2 h-2 rounded-full {acc.dotColor}"></span>
											<span>{acc.label}</span>
											<span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold uppercase">{acc.badge}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- FORM CONTENT -->
						{#if mode === 'login'}
							<!-- SIGN IN FORM -->
							<form onsubmit={handleLogin} class="space-y-4">
								<!-- Email Input -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-300" for="login-email">
										Corporate Email Address
									</label>
									<div class="w-full flex items-center gap-3 px-3.5 h-12 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500 focus-within:border-rose-500' : ''}">
										<Mail class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="login-email"
											type="email"
											placeholder="e.g. head@gmail.com"
											bind:value={email}
											autocomplete="username"
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
										/>
									</div>
									{#if errors.email}
										<p class="text-rose-400 text-[11px] font-bold mt-1 flex items-center gap-1">
											• {errors.email}
										</p>
									{/if}
								</div>

								<!-- Password Input -->
								<div class="space-y-1.5">
									<div class="flex justify-between items-center">
										<label class="block font-bold text-xs text-slate-300" for="login-password">
											Password
										</label>
										<button
											type="button"
											onclick={() => (mode = 'forgot')}
											class="text-[11px] font-extrabold text-sky-400 hover:text-sky-300 hover:underline"
										>
											Forgot password?
										</button>
									</div>
									<div class="w-full flex items-center gap-3 px-3.5 h-12 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500 focus-within:border-rose-500' : ''}">
										<Lock class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="login-password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Enter your password"
											bind:value={password}
											autocomplete="current-password"
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-white placeholder:text-slate-500 custom-autofill"
										/>
										<button
											type="button"
											onclick={() => (showPassword = !showPassword)}
											class="text-slate-400 hover:text-white transition-colors shrink-0 p-1"
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
										<p class="text-rose-400 text-[11px] font-bold mt-1 flex items-center gap-1">
											• {errors.password}
										</p>
									{/if}
								</div>

								<!-- Remember Me & Policy -->
								<div class="flex items-center justify-between text-xs text-slate-400 pt-1">
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											bind:checked={rememberMe}
											class="checkbox checkbox-xs checkbox-primary rounded"
										/>
										<span>Keep me signed in</span>
									</label>
									<span class="text-[11px] text-slate-500">256-Bit SSL Secured</span>
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
										<span>Sign In to Dashboard</span>
										<ArrowRight class="w-4 h-4" />
									{/if}
								</button>
							</form>

						{:else if mode === 'register'}
							<!-- REGISTRATION FORM -->
							<form onsubmit={handleRegister} class="space-y-4">
								
								<!-- Interactive Role Selector Cards -->
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-300">
										Select Your Role Type
									</label>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										<!-- Option 1: Employee -->
										<button
											type="button"
											onclick={() => (role = 'Employee')}
											class="p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 {role === 'Employee'
												? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
												: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
										>
											<div class="p-2 rounded-xl {role === 'Employee' ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-400'} shrink-0 mt-0.5">
												<UserIcon class="w-4 h-4" />
											</div>
											<div>
												<p class="font-extrabold text-xs {role === 'Employee' ? 'text-white' : 'text-slate-200'}">Employee Staff</p>
												<p class="text-[10px] text-slate-400 leading-snug mt-0.5">Requisition requests & budget</p>
											</div>
										</button>

										<!-- Option 2: Vendor -->
										<button
											type="button"
											onclick={() => (role = 'Vendor')}
											class="p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 {role === 'Vendor'
												? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
												: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
										>
											<div class="p-2 rounded-xl {role === 'Vendor' ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-400'} shrink-0 mt-0.5">
												<Building class="w-4 h-4" />
											</div>
											<div>
												<p class="font-extrabold text-xs {role === 'Vendor' ? 'text-white' : 'text-slate-200'}">Vendor Partner</p>
												<p class="text-[10px] text-slate-400 leading-snug mt-0.5">Quotation bids & payouts</p>
											</div>
										</button>
									</div>
								</div>

								<!-- Full Name & Username in 2 columns -->
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<!-- Full Name -->
									<div class="space-y-1.5">
										<label class="block font-bold text-xs text-slate-300" for="reg-name">
											Full Name
										</label>
										<div class="w-full flex items-center gap-2.5 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.fullName ? 'border-rose-500' : ''}">
											<UserIcon class="w-4 h-4 text-slate-400 shrink-0" />
											<input
												id="reg-name"
												type="text"
												placeholder="John Doe"
												bind:value={fullName}
												class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500 custom-autofill"
											/>
										</div>
										{#if errors.fullName}
											<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.fullName}</p>
										{/if}
									</div>

									<!-- Username -->
									<div class="space-y-1.5">
										<label class="block font-bold text-xs text-slate-300" for="reg-username">
											Username
										</label>
										<div class="w-full flex items-center gap-2.5 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.username ? 'border-rose-500' : ''}">
											<input
												id="reg-username"
												type="text"
												placeholder="johndoe"
												bind:value={username}
												class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500 custom-autofill"
											/>
										</div>
										{#if errors.username}
											<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.username}</p>
										{/if}
									</div>
								</div>

								<!-- If Employee: Department Dropdown -->
								{#if role === 'Employee'}
									<div class="space-y-1.5">
										<label class="block font-bold text-xs text-slate-300" for="reg-dept">
											Assigned Department
										</label>
										<div class="w-full flex items-center px-3 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 rounded-xl">
											<select
												id="reg-dept"
												bind:value={departmentId}
												class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs font-bold text-white cursor-pointer"
											>
												<option value="dept-electronics" class="bg-slate-900 text-white">Electronics & Hardware</option>
												<option value="dept-kitchen" class="bg-slate-900 text-white">Kitchen Appliances</option>
												<option value="dept-clothes" class="bg-slate-900 text-white">Apparel & Clothes</option>
												<option value="dept-toys" class="bg-slate-900 text-white">Kids Toys</option>
												<option value="dept-deptstore" class="bg-slate-900 text-white">Departmental Store</option>
												<option value="dept-footwear" class="bg-slate-900 text-white">Footwear & Safety</option>
												<option value="dept-furniture" class="bg-slate-900 text-white">Office Furniture</option>
												<option value="dept-others" class="bg-slate-900 text-white">Others & General</option>
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
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500 custom-autofill"
										/>
									</div>
									{#if errors.email}
										<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.email}</p>
									{/if}
								</div>

								<!-- Password Input + Strength Bar -->
								<div class="space-y-1.5">
									<div class="flex justify-between items-center">
										<label class="block font-bold text-xs text-slate-300" for="reg-password">
											Create Password
										</label>
										{#if password}
											<span class="text-[10px] font-bold {passwordStrengthLabel.color}">
												Strength: {passwordStrengthLabel.label}
											</span>
										{/if}
									</div>
									<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500' : ''}">
										<Lock class="w-4 h-4 text-slate-400 shrink-0" />
										<input
											id="reg-password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Min. 6 characters"
											bind:value={password}
											class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500 custom-autofill"
										/>
										<button
											type="button"
											onclick={() => (showPassword = !showPassword)}
											class="text-slate-400 hover:text-white transition-colors shrink-0 p-1"
											aria-label="Toggle password visibility"
										>
											{#if showPassword}
												<EyeOff class="w-4 h-4" />
											{:else}
												<Eye class="w-4 h-4" />
											{/if}
										</button>
									</div>

									{#if password}
										<div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
											<div class="h-full transition-all duration-300 {passwordStrengthLabel.barColor}" style="width: {passwordStrength}%"></div>
										</div>
									{/if}

									{#if errors.password}
										<p class="text-rose-400 text-[10px] font-bold mt-1">• {errors.password}</p>
									{/if}
								</div>

								<!-- Terms Checkbox -->
								<div class="pt-1">
									<label class="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400">
										<input
											type="checkbox"
											bind:checked={termsAccepted}
											class="checkbox checkbox-xs checkbox-primary rounded mt-0.5"
										/>
										<span>
											I agree to the <span class="text-sky-400 font-bold">ProcureSmart Terms of Service</span> and <span class="text-sky-400 font-bold">Privacy Policy</span>.
										</span>
									</label>
								</div>

								<!-- Submit Register Button -->
								<button
									type="submit"
									disabled={isSubmitting}
									class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 mt-2 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-60"
								>
									{#if isSubmitting}
										<span class="loading loading-spinner loading-sm"></span>
										<span>Creating Account...</span>
									{:else}
										<span>Complete Registration</span>
										<ArrowRight class="w-4 h-4" />
									{/if}
								</button>
							</form>

						{:else if mode === 'forgot'}
							<!-- FORGOT PASSWORD FORM -->
							<form onsubmit={handleForgot} class="space-y-4">
								<div class="space-y-1.5">
									<label class="block font-bold text-xs text-slate-300" for="forgot-email">
										Registered Corporate Email
									</label>
									<div class="w-full flex items-center gap-3 px-3.5 h-12 bg-slate-950 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all">
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
									Send Password Reset Link
								</button>

								<div class="text-center pt-2">
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

						<!-- Card Footer Switcher -->
						<div class="pt-2 border-t border-slate-800/80 text-center">
							{#if mode === 'login'}
								<span class="text-slate-400 text-xs">
									Don't have an enterprise account?
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
									Already registered with ProcureSmart?
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
			</div>

		</div>
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 relative z-20">
		<p>© 2026 ProcureSmart Enterprise. All rights reserved.</p>
		<div class="flex items-center gap-4 font-medium">
			<span class="flex items-center gap-1 text-emerald-400">
				<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
				All Systems Operational
			</span>
			<a href="#privacy" class="hover:text-slate-400 transition-colors">Privacy</a>
			<a href="#terms" class="hover:text-slate-400 transition-colors">Terms</a>
			<a href="#security" class="hover:text-slate-400 transition-colors">Security</a>
		</div>
	</footer>
</div>

<style>
	/* Fix Chrome/Edge/Firefox WebKit autofill ugly white background */
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

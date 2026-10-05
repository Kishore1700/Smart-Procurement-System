```svelte
<script>
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { supabase } from '$lib/supabase';
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

	let mode = $state('login');
	let showPassword = $state(false);

	let demoAccounts = $derived(db.getUsers());
	let authInitialized = $state(false);

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let fullName = $state('');
	let role = $state('Employee');
	let departmentId = $state('dept-electronics');

	let errors = $state(/** @type {Record<string, string>} */ ({}));

	const roleSchema = z.enum([
		'Employee',
		'Manager',
		'Vendor'
	]);

	const loginSchema = z.object({
		email: z.string().email({ message: 'Invalid email address' }),
		password: z.string().min(6, {
			message: 'Password must be at least 6 characters'
		})
	});

	const registerSchema = z.object({
		username: z.string().min(3, {
			message: 'Username must be at least 3 characters'
		}),
		email: z.string().email({
			message: 'Invalid email address'
		}),
		fullName: z.string().min(2, {
			message: 'Full name is required'
		}),
		password: z.string().min(6, {
			message: 'Password must be at least 6 characters'
		}),
		role: roleSchema
	});

	function redirectForRole(user) {
		if (user.role === 'Employee') {
			goto('/purchase-requests');
		} else {
			goto('/dashboard');
		}
	}

	/*
	 * Load the authenticated user's procurement record.
	 *
	 * IMPORTANT:
	 * public.users is the source of truth for the application's
	 * Employee / Manager / Vendor role.
	 *
	 * public.profiles is only used as a fallback.
	 */
	async function getProfile(user) {
		const { data: procurementUser, error: procurementError } =
			await supabase
				.from('users')
				.select(
					'id, username, email, role, department_id, vendor_id, full_name, status, avatar_url, created_at'
				)
				.eq('email', user.email)
				.maybeSingle();

		if (procurementError) {
			console.error(
				'Unable to load procurement user:',
				procurementError
			);
		}

		/*
		 * Use public.users when a matching procurement account exists.
		 * This fixes vendor.demo@gmail.com being displayed as Employee.
		 */
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

		/*
		 * Fallback to the Supabase profile if there is no
		 * matching public.users record.
		 */
		const { data, error } = await supabase
			.from('profiles')
			.select(
				'id, username, full_name, role, department_id, vendor_id, status, avatar_url, created_at, updated_at'
			)
			.eq('id', user.id)
			.single();

		if (error) {
			throw error;
		}

		return {
			id: data.id,
			username: data.username || user.email,
			email: user.email,
			role: data.role || 'Employee',
			departmentId: data.department_id,
			vendorId: data.vendor_id,
			fullName: data.full_name || user.email,
			status: data.status,
			avatarUrl: data.avatar_url,
			createdAt: data.created_at,
			updatedAt: data.updated_at
		};
	}

	async function initializeAuth() {
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			globalStore.showToast(error.message, 'error');
		} else if (data.session) {
			try {
				const profile = await getProfile(data.session.user);

				await globalStore.login(profile);

				redirectForRole(profile);
			} catch (profileError) {
				globalStore.clearSession();
				globalStore.showToast(
					profileError.message ||
						'Unable to load your profile.',
					'error'
				);
			}
		} else {
			globalStore.clearSession();
		}

		authInitialized = true;
	}

	$effect(() => {
		if (
			typeof window !== 'undefined' &&
			!authInitialized
		) {
			void initializeAuth();
		}
	});

	function handleDemoLogin(/** @type {string} */ uId) {
		const target = demoAccounts.find(
			(/** @type {any} */ u) => u.id === uId
		);

		if (target) {
			globalStore.showToast(
				`Demo account ${target.email} is not configured in Supabase. Create it there before signing in.`,
				'info'
			);
		}
	}

	async function handleLogin(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		errors = {};

		const result = loginSchema.safeParse({
			email,
			password
		});

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});

			return;
		}

		const { data, error } =
			await supabase.auth.signInWithPassword({
				email,
				password
			});

		if (error) {
			globalStore.showToast(error.message, 'error');
			return;
		}

		try {
			const profile = await getProfile(data.user);

			await globalStore.login(profile);

			redirectForRole(profile);
		} catch (profileError) {
			globalStore.showToast(
				profileError.message ||
					'Unable to load your profile.',
				'error'
			);
		}
	}

	async function handleRegister(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		errors = {};

		const result = registerSchema.safeParse({
			username,
			email,
			fullName,
			password,
			role
		});

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});

			return;
		}

		const avatarUrl =
			`https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;

		const { data, error } =
			await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username,
						fullName,
						role,
						departmentId:
							role === 'Employee' ||
							role === 'Manager'
								? departmentId
								: null,
						vendorId:
							role === 'Vendor'
								? 'vendor-acme'
								: null,
						avatarUrl
					}
				}
			});

		if (error) {
			globalStore.showToast(error.message, 'error');
			return;
		}

		if (!data.session) {
			globalStore.showToast(
				'Account created. Please verify your email, then sign in.',
				'success'
			);

			mode = 'login';
			return;
		}

		try {
			const profile = await getProfile(data.user);

			await globalStore.login(profile);

			globalStore.showToast(
				`Account created! Welcome, ${profile.fullName}!`,
				'success'
			);

			redirectForRole(profile);
		} catch (profileError) {
			globalStore.showToast(
				profileError.message ||
					'Unable to load your profile.',
				'error'
			);
		}
	}

	async function handleForgot(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		if (!email) {
			globalStore.showToast(
				'Please enter your email',
				'error'
			);
			return;
		}

		const { error } =
			await supabase.auth.resetPasswordForEmail(
				email,
				{
					redirectTo:
						`${window.location.origin}/login`
				}
			);

		if (error) {
			globalStore.showToast(error.message, 'error');
			return;
		}

		globalStore.showToast(
			'Password reset link sent to your email!',
			'success'
		);

		mode = 'login';
	}
</script>

<div class="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden transition-colors">
	<div class="absolute top-5 right-5 z-30">
		<button
			onclick={() => globalStore.toggleTheme()}
			class="btn btn-ghost btn-sm btn-circle text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-all duration-300 group shadow-xs"
			title="Toggle Theme"
			aria-label="Toggle Theme"
		>
			<div class="relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-45">
				{#if globalStore.theme === 'light'}
					<Moon class="w-4 h-4 text-slate-700" />
				{:else}
					<Sun class="w-4 h-4 text-amber-400" />
				{/if}
			</div>
		</button>
	</div>

	<div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none"></div>

	<div class="lg:col-span-7 flex items-center justify-center p-8 md:p-16 relative z-10">
		<div class="w-full max-w-md space-y-8 glass-card border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-2xl bg-white/90 dark:bg-slate-900/90">
			<div class="text-left">
				<div class="inline-flex p-3 bg-gradient-to-tr from-sky-600 to-cyan-500 text-white rounded-2xl mb-4 shadow-lg shadow-sky-500/20">
					<ShieldCheck class="w-7 h-7" />
				</div>

				<h1 class="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
					ProcureSmart Portal
				</h1>

				<p class="text-slate-500 dark:text-slate-400 text-xs mt-1.5 font-medium">
					Enter your enterprise credentials to access your procurement dashboard.
				</p>
			</div>

			{#if mode === 'login'}
				<form onsubmit={handleLogin} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1.5" for="login-email">
							<span class="label-text font-bold text-xs text-slate-300">
								Email Address
							</span>
						</label>

						<div class="relative">
							<Mail class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="login-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="input w-full pl-10 bg-slate-900/80 border-slate-800 focus:border-sky-500 text-xs text-slate-100 rounded-xl {errors.email ? 'border-rose-500' : ''}"
							/>
						</div>

						{#if errors.email}
							<span class="text-rose-400 text-[10px] font-bold mt-1">
								{errors.email}
							</span>
						{/if}
					</div>

					<div class="form-control">
						<div class="flex justify-between items-center pb-1.5">
							<label class="label p-0" for="login-password">
								<span class="label-text font-bold text-xs text-slate-300">
									Password
								</span>
							</label>

							<button
								type="button"
								onclick={() => (mode = 'forgot')}
								class="text-[11px] font-extrabold text-sky-400 hover:text-sky-300"
							>
								Forgot password?
							</button>
						</div>

						<div class="relative">
							<Lock class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="login-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								bind:value={password}
								class="input w-full pl-10 pr-10 bg-slate-900/80 border-slate-800 focus:border-sky-500 text-xs text-slate-100 rounded-xl {errors.password ? 'border-rose-500' : ''}"
							/>

							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
							>
								{#if showPassword}
									<EyeOff class="w-4 h-4" />
								{:else}
									<Eye class="w-4 h-4" />
								{/if}
							</button>
						</div>

						{#if errors.password}
							<span class="text-rose-400 text-[10px] font-bold mt-1">
								{errors.password}
							</span>
						{/if}
					</div>

					<button
						type="submit"
						class="btn btn-gradient-primary w-full text-sm font-semibold rounded-xl py-3.5 h-auto shadow-lg shadow-sky-600/25"
					>
						Sign In
						<ArrowRight class="w-4 h-4 ml-1.5" />
					</button>

					<div class="text-center mt-6">
						<span class="text-slate-400 text-[11px]">
							Don't have an account?
						</span>

						<button
							type="button"
							onclick={() => (mode = 'register')}
							class="text-[11px] font-extrabold text-sky-400 hover:text-sky-300"
						>
							Create an account
						</button>
					</div>
				</form>

			{:else if mode === 'forgot'}

				<form onsubmit={handleForgot} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1.5" for="forgot-email">
							<span class="label-text font-bold text-xs text-slate-300">
								Email Address
							</span>
						</label>

						<div class="relative">
							<Mail class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="forgot-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="input w-full pl-10 bg-slate-900/80 border-slate-800 focus:border-sky-500 text-xs text-slate-100 rounded-xl"
							/>
						</div>
					</div>

					<button
						type="submit"
						class="btn btn-gradient-primary w-full text-sm font-semibold rounded-xl py-3.5 h-auto shadow-lg shadow-sky-600/25"
					>
						Send Reset Link
					</button>

					<div class="text-center mt-4">
						<button
							type="button"
							onclick={() => (mode = 'login')}
							class="text-[11px] font-extrabold text-sky-400 hover:text-sky-300"
						>
							Back to Sign In
						</button>
					</div>
				</form>

			{:else}

				<form onsubmit={handleRegister} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1" for="reg-name">
							<span class="label-text font-bold text-xs text-slate-300">
								Full Name
							</span>
						</label>

						<div class="relative">
							<UserIcon class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="reg-name"
								type="text"
								placeholder="Alice Johnson"
								bind:value={fullName}
								class="input w-full pl-10 bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl {errors.fullName ? 'border-rose-500' : ''}"
							/>
						</div>

						{#if errors.fullName}
							<span class="text-rose-400 text-[10px] font-bold mt-1">
								{errors.fullName}
							</span>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="reg-username">
								<span class="label-text font-bold text-xs text-slate-300">
									Username
								</span>
							</label>

							<input
								id="reg-username"
								type="text"
								placeholder="alice"
								bind:value={username}
								class="input w-full bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl {errors.username ? 'border-rose-500' : ''}"
							/>

							{#if errors.username}
								<span class="text-rose-400 text-[10px] font-bold mt-1">
									{errors.username}
								</span>
							{/if}
						</div>

						<div class="form-control">
							<label class="label pb-1" for="reg-role">
								<span class="label-text font-bold text-xs text-slate-300">
									Select Role
								</span>
							</label>

							<select
								id="reg-role"
								bind:value={role}
								class="select bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl"
							>
								<option value="Employee">Employee</option>
								<option value="Manager">Manager / Admin</option>
								<option value="Vendor">Vendor Portal</option>
							</select>
						</div>
					</div>

					{#if role === 'Employee' || role === 'Manager'}
						<div class="form-control">
							<label class="label pb-1" for="reg-dept">
								<span class="label-text font-bold text-xs text-slate-300">
									Department
								</span>
							</label>

							<select
								id="reg-dept"
								bind:value={departmentId}
								class="select bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl"
							>
								<option value="dept-electronics">Electronics</option>
								<option value="dept-kitchen">Kitchen Appliances</option>
								<option value="dept-clothes">Clothes</option>
								<option value="dept-toys">Kids Toys</option>
								<option value="dept-deptstore">Departmental Store</option>
								<option value="dept-footwear">Footwear</option>
								<option value="dept-furniture">Furnitures</option>
								<option value="dept-others">Others</option>
							</select>
						</div>
					{/if}

					<div class="form-control">
						<label class="label pb-1" for="reg-email">
							<span class="label-text font-bold text-xs text-slate-300">
								Email Address
							</span>
						</label>

						<div class="relative">
							<Mail class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="reg-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="input w-full pl-10 bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl {errors.email ? 'border-rose-500' : ''}"
							/>
						</div>

						{#if errors.email}
							<span class="text-rose-400 text-[10px] font-bold mt-1">
								{errors.email}
							</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="reg-password">
							<span class="label-text font-bold text-xs text-slate-300">
								Create Password
							</span>
						</label>

						<div class="relative">
							<Lock class="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

							<input
								id="reg-password"
								type="password"
								placeholder="••••••••"
								bind:value={password}
								class="input w-full pl-10 bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl {errors.password ? 'border-rose-500' : ''}"
							/>
						</div>

						{#if errors.password}
							<span class="text-rose-400 text-[10px] font-bold mt-1">
								{errors.password}
							</span>
						{/if}
					</div>

					<button
						type="submit"
						class="btn btn-gradient-primary w-full text-sm font-semibold rounded-xl py-3.5 h-auto mt-2 shadow-lg shadow-sky-600/25"
					>
						Create Enterprise Account
					</button>

					<div class="text-center mt-4">
						<button
							type="button"
							onclick={() => (mode = 'login')}
							class="text-[11px] font-extrabold text-sky-400 hover:text-sky-300"
						>
							Back to Sign In
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>

	<div class="lg:col-span-5 bg-slate-100/70 dark:bg-slate-900/50 border-l border-slate-200/80 dark:border-slate-800/80 p-8 md:p-12 flex flex-col justify-center relative z-10 backdrop-blur-md">
		<div class="max-w-md mx-auto space-y-6">
			<div>
				<h2 class="text-xs font-black tracking-widest uppercase text-sky-600 dark:text-sky-400">
					System Demo Suite
				</h2>

				<h3 class="text-xl font-black text-slate-900 dark:text-white mt-1">
					One-Click Quick Access Profiles
				</h3>

				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					Select any demo profile to log in instantly with tailored role permissions.
				</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{#each demoAccounts as acc}
					{@const deptName =
						db.getDepartments().find(
							(/** @type {any} */ d) =>
								d.id === acc.departmentId
						)?.name || 'External Division'}

					<button
						onclick={() => handleDemoLogin(acc.id)}
						class="flex flex-col p-4 glass-card border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 rounded-2xl text-left shadow-md hover:shadow-xl hover:border-sky-500/50 hover:-translate-y-1 transition-all duration-200 relative overflow-hidden group min-h-[120px]"
					>
						<div class="absolute top-0 left-0 right-0 h-1.5 {acc.role === 'Employee'
							? 'bg-emerald-500'
							: acc.role === 'Manager'
								? 'bg-sky-500'
								: 'bg-amber-500'}"></div>

						<div class="flex items-start gap-3 mt-1.5 w-full">
							<div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
								<UserIcon class="w-5 h-5" />
							</div>

							<div class="overflow-hidden w-full">
								<p class="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
									{acc.fullName}
								</p>

								<p class="text-[9px] font-black uppercase tracking-wider mt-0.5 {acc.role === 'Employee'
									? 'text-emerald-600 dark:text-emerald-400'
									: acc.role === 'Manager'
										? 'text-sky-600 dark:text-sky-400'
										: 'text-amber-600 dark:text-amber-400'}">
									{acc.role === 'Manager'
										? 'Manager / Admin'
										: acc.role}
								</p>
							</div>
						</div>

						<div class="mt-auto w-full pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
							<span class="truncate max-w-[90px]">{deptName}</span>

							<span class="text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
								Sign In →
							</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
```

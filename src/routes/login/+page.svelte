<script>
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

	let mode = $state('login');
	let showPassword = $state(false);
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
		// If user already logged in locally, skip blocking network call
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
		if (
			typeof window !== 'undefined' &&
			!authInitialized
		) {
			void initializeAuth();
		}
	});

	async function handleLogin(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		errors = {};

		const result = loginSchema.safeParse({
			email,
			password
		});

		if (!result.success) {
			result.error.issues.forEach((/** @type {any} */ issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});

			return;
		}

		const cleanEmail = email.trim().toLowerCase();
		const mockUsers = db.getUsers();
		const matchedUser = mockUsers.find(
			(/** @type {any} */ u) => u.email.toLowerCase() === cleanEmail
		);

		if (matchedUser) {
			if (matchedUser.password && password !== matchedUser.password) {
				globalStore.showToast('Invalid email or password', 'error');
				errors.password = 'Incorrect password';
				return;
			}
			await globalStore.login(matchedUser);
			redirectForRole(matchedUser);
			return;
		}

		try {
			const { data, error } =
				await supabase.auth.signInWithPassword({
					email: cleanEmail,
					password
				});

			if (error) {
				globalStore.showToast(error.message || 'Invalid login credentials', 'error');
				return;
			}

			const profile = await getProfile(data.user);
			await globalStore.login(profile);
			redirectForRole(profile);
		} catch (err) {
			globalStore.showToast('Invalid login credentials', 'error');
		}
	}

	async function handleRegister(/** @type {SubmitEvent} */ e) {
		e.preventDefault();

		errors = {};

		if (role === 'Manager' || role === 'Admin') {
			globalStore.showToast('Admin registration is restricted. Only one Admin account is allowed.', 'error');
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
							role === 'Employee'
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
		} catch (/** @type {any} */ profileError) {
			globalStore.showToast(
				profileError?.message ||
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

<div class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 relative overflow-hidden transition-colors">
	<!-- Theme Switcher Top Right -->
	<div class="absolute top-5 right-5 z-30">
		<button
			onclick={() => globalStore.toggleTheme()}
			class="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800/80 transition-all duration-300 group shadow-xs"
			title="Toggle Theme"
			aria-label="Toggle Theme"
		>
			<div class="relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-45">
				{#if globalStore.theme === 'light'}
					<Moon class="w-4 h-4 text-slate-300" />
				{:else}
					<Sun class="w-4 h-4 text-amber-400" />
				{/if}
			</div>
		</button>
	</div>

	<!-- Ambient Background Glow Accents -->
	<div class="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-sky-500/20 blur-[140px] pointer-events-none"></div>
	<div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[150px] pointer-events-none"></div>

	<!-- Centered Auth Card Container with Gradient Border -->
	<div class="w-full max-w-lg relative z-10 my-6 p-[1px] rounded-3xl bg-gradient-to-b from-sky-500/40 via-slate-800/60 to-indigo-500/40 shadow-2xl shadow-sky-950/50">
		<div class="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl p-7 sm:p-9 rounded-[23px] space-y-7">
			<!-- Header / Brand -->
			<div class="text-left space-y-2">
				<div class="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-sky-500/30">
					<ShieldCheck class="w-7 h-7" />
				</div>

				<h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
					ProcureSmart Portal
				</h1>

				<p class="text-slate-400 text-xs font-medium">
					{mode === 'login'
						? 'Enter your credentials to access your procurement dashboard.'
						: mode === 'register'
							? 'Create a new account to join ProcureSmart.'
							: 'Reset your portal password via email.'}
				</p>
			</div>

			<!-- Mode Switcher Tabs (Login vs Register) -->
			{#if mode !== 'forgot'}
				<div class="grid grid-cols-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs font-bold">
					<button
						type="button"
						onclick={() => (mode = 'login')}
						class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 {mode === 'login'
							? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md font-black'
							: 'text-slate-400 hover:text-white'}"
					>
						Sign In
					</button>

					<button
						type="button"
						onclick={() => (mode = 'register')}
						class="py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 {mode === 'register'
							? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md font-black'
							: 'text-slate-400 hover:text-white'}"
					>
						Create Account
					</button>
				</div>
			{/if}

			{#if mode === 'login'}
				<form onsubmit={handleLogin} class="space-y-5">
					<!-- Email Field -->
					<div class="space-y-1.5">
						<label class="block font-extrabold text-xs text-slate-300" for="login-email">
							Email Address
						</label>

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500 focus-within:border-rose-500' : ''}">
							<Mail class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="login-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>
						</div>

						{#if errors.email}
							<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
								• {errors.email}
							</p>
						{/if}
					</div>

					<!-- Password Field -->
					<div class="space-y-1.5">
						<div class="flex justify-between items-center">
							<label class="block font-extrabold text-xs text-slate-300" for="login-password">
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

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500 focus-within:border-rose-500' : ''}">
							<Lock class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="login-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								bind:value={password}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>

							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="text-slate-400 hover:text-slate-100 transition-colors shrink-0 p-1 rounded-lg"
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
							<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
								• {errors.password}
							</p>
						{/if}
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
					>
						Sign In
						<ArrowRight class="w-4 h-4" />
					</button>

					<div class="text-center pt-2">
						<span class="text-slate-400 text-xs font-medium">
							Don't have an account?
						</span>

						<button
							type="button"
							onclick={() => (mode = 'register')}
							class="text-xs font-extrabold text-sky-400 hover:underline ml-1"
						>
							Create an account
						</button>
					</div>
				</form>

			{:else if mode === 'forgot'}

				<form onsubmit={handleForgot} class="space-y-5">
					<div class="space-y-1.5">
						<label class="block font-extrabold text-xs text-slate-300" for="forgot-email">
							Email Address
						</label>

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all">
							<Mail class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="forgot-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>
						</div>
					</div>

					<button
						type="submit"
						class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none"
					>
						Send Reset Link
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

			{:else}

				<form onsubmit={handleRegister} class="space-y-4">
					<!-- Full Name -->
					<div class="space-y-1.5">
						<label class="block font-extrabold text-xs text-slate-300" for="reg-name">
							Full Name
						</label>

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.fullName ? 'border-rose-500 focus-within:border-rose-500' : ''}">
							<UserIcon class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="reg-name"
								type="text"
								placeholder="Alice Johnson"
								bind:value={fullName}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>
						</div>

						{#if errors.fullName}
							<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
								• {errors.fullName}
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<!-- Username -->
						<div class="space-y-1.5">
							<label class="block font-extrabold text-xs text-slate-300" for="reg-username">
								Username
							</label>

							<div class="w-full flex items-center px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.username ? 'border-rose-500 focus-within:border-rose-500' : ''}">
								<input
									id="reg-username"
									type="text"
									placeholder="alice"
									bind:value={username}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
								/>
							</div>

							{#if errors.username}
								<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
									• {errors.username}
								</p>
							{/if}
						</div>

						<!-- Role -->
						<div class="space-y-1.5">
							<label class="block font-extrabold text-xs text-slate-300" for="reg-role">
								Select Role
							</label>

							<div class="w-full flex items-center px-3 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 rounded-xl">
								<select
									id="reg-role"
									bind:value={role}
									class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs font-bold text-white cursor-pointer"
								>
									<option value="Employee" class="bg-slate-900 text-white">Employee Account</option>
									<option value="Vendor" class="bg-slate-900 text-white">Vendor Portal</option>
								</select>
							</div>
						</div>
					</div>

					{#if role === 'Employee'}
						<div class="space-y-1.5">
							<label class="block font-extrabold text-xs text-slate-300" for="reg-dept">
								Department
							</label>

							<div class="w-full flex items-center px-3 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 rounded-xl">
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

					<!-- Email -->
					<div class="space-y-1.5">
						<label class="block font-extrabold text-xs text-slate-300" for="reg-email">
							Email Address
						</label>

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.email ? 'border-rose-500 focus-within:border-rose-500' : ''}">
							<Mail class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="reg-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>
						</div>

						{#if errors.email}
							<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
								• {errors.email}
							</p>
						{/if}
					</div>

					<!-- Password -->
					<div class="space-y-1.5">
						<label class="block font-extrabold text-xs text-slate-300" for="reg-password">
							Create Password
						</label>

						<div class="w-full flex items-center gap-3 px-3.5 h-11 bg-slate-950/80 border border-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl transition-all {errors.password ? 'border-rose-500 focus-within:border-rose-500' : ''}">
							<Lock class="w-4 h-4 text-slate-400 shrink-0" />

							<input
								id="reg-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								bind:value={password}
								class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder:text-slate-500"
							/>

							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="text-slate-400 hover:text-slate-100 transition-colors shrink-0 p-1 rounded-lg"
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
							<p class="text-rose-400 text-[10px] font-extrabold mt-1 flex items-center gap-1">
								• {errors.password}
							</p>
						{/if}
					</div>

					<button
						type="submit"
						class="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl h-12 mt-2 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
					>
						Create Account
						<ArrowRight class="w-4 h-4" />
					</button>

					<div class="text-center pt-2">
						<span class="text-slate-400 text-xs font-medium">
							Already registered?
						</span>

						<button
							type="button"
							onclick={() => (mode = 'login')}
							class="text-xs font-extrabold text-sky-400 hover:underline ml-1"
						>
							Sign In
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>

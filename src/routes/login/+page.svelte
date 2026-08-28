<script>
	import { goto } from '$app/navigation';
	import { globalStore } from '$lib/stores/globalStore.svelte';
	import { db } from '$lib/db/mockDb';
	import { z } from 'zod';
	import {
		Eye,
		EyeOff,
		Lock,
		Mail,
		User as UserIcon,
		Building,
		ShieldCheck,
		ArrowRight
	} from '@lucide/svelte';

	// Toggle modes: login, register, forgot-password, verify-email
	let mode = $state('login');
	let showPassword = $state(false);

	// Preloaded list of dummy accounts for testing
	let demoAccounts = $derived(db.getUsers());

	// Form states
	let email = $state('');
	let username = $state('');
	let password = $state('');
	let fullName = $state('');
	let role = $state('Employee');
	let departmentId = $state('dept-electronics');

	// Form errors
	let errors = $state(/** @type {Record<string, string>} */ ({}));

	const roleSchema = z.enum([
		'Employee',
		'Manager',
		'Vendor'
	]);

	const loginSchema = z.object({
		email: z.string().email({ message: 'Invalid email address' }),
		password: z.string().min(6, { message: 'Password must be at least 6 characters' })
	});

	const registerSchema = z.object({
		username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
		email: z.string().email({ message: 'Invalid email address' }),
		fullName: z.string().min(2, { message: 'Full name is required' }),
		password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
		role: roleSchema
	});

	$effect(() => {
		// If already logged in, redirect based on role
		if (typeof window !== 'undefined' && globalStore.currentUser) {
			if (globalStore.currentUser.role === 'Employee') {
				goto('/purchase-requests');
			} else {
				goto('/dashboard');
			}
		}
	});

	function handleDemoLogin(/** @type {string} */ uId) {
		const target = demoAccounts.find((/** @type {any} */ u) => u.id === uId);
		if (target) {
			globalStore.login(target);
			if (target.role === 'Employee') {
				goto('/purchase-requests');
			} else {
				goto('/dashboard');
			}
		}
	}

	function handleLogin(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};
		const result = loginSchema.safeParse({ email, password });

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		// Look for matching user email
		const matched = db.getUsers().find((/** @type {any} */ u) => u.email.toLowerCase() === email.toLowerCase());
		if (matched) {
			globalStore.login(matched);
			if (matched.role === 'Employee') {
				goto('/purchase-requests');
			} else {
				goto('/dashboard');
			}
		} else {
			globalStore.showToast('Invalid email or password. Hint: Use one of the Demo Accounts on the right for quick access.', 'error');
		}
	}

	function handleRegister(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		errors = {};
		const result = registerSchema.safeParse({ username, email, fullName, password, role });

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = String(issue.path[0]);
				errors[path] = issue.message;
			});
			return;
		}

		// Register new user
		const users = db.getUsers();
		if (users.some((/** @type {any} */ u) => u.email.toLowerCase() === email.toLowerCase())) {
			globalStore.showToast('Email already registered', 'error');
			return;
		}

		const newUser = {
			id: 'user-' + Math.random().toString(36).substring(2, 9),
			username: username.toLowerCase(),
			email,
			role,
			departmentId: role === 'Employee' || role === 'Manager' ? departmentId : null,
			vendorId: role === 'Vendor' ? 'vendor-acme' : null,
			fullName,
			status: 'Active',
			avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
			createdAt: new Date().toISOString()
		};

		users.push(newUser);
		db.saveUsers(users);
		db.logAction(newUser.id, 'User Registered', `Created account with role: ${role}`);
		globalStore.login(newUser);
		globalStore.showToast(`Account created! Welcome, ${newUser.fullName}!`, 'success');
		if (role === 'Employee') {
			goto('/purchase-requests');
		} else {
			goto('/dashboard');
		}
	}

	function handleForgot(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (!email) {
			globalStore.showToast('Please enter your email', 'error');
			return;
		}
		globalStore.showToast('Password reset link sent to your email!', 'success');
		mode = 'login';
	}
</script>

<div class="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100 relative overflow-hidden">
	<!-- Background Mesh Blur Effects -->
	<div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none"></div>

	<!-- Left Side: Authentication Form container -->
	<div class="lg:col-span-7 flex items-center justify-center p-8 md:p-16 relative z-10">
		<div class="w-full max-w-md space-y-8 glass-card border border-slate-800 p-8 rounded-3xl shadow-2xl">
			<!-- Header -->
			<div class="text-left">
				<div class="inline-flex p-3 bg-gradient-to-tr from-sky-600 to-cyan-500 text-white rounded-2xl mb-4 shadow-lg shadow-sky-500/20">
					<ShieldCheck class="w-7 h-7" />
				</div>
				<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
					ProcureSmart Portal
				</h1>
				<p class="text-slate-400 text-xs mt-1.5 font-medium">
					Enter your enterprise credentials to access your procurement dashboard.
				</p>
			</div>

			<!-- Dynamic Auth Windows -->
			{#if mode === 'login'}
				<form onsubmit={handleLogin} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1.5" for="login-email">
							<span class="label-text font-bold text-xs text-slate-300">Email Address</span>
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
							<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<div class="flex justify-between items-center pb-1.5">
							<label class="label p-0" for="login-password">
								<span class="label-text font-bold text-xs text-slate-300">Password</span>
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
							<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.password}</span>
						{/if}
					</div>

					<button type="submit" class="btn btn-gradient-primary w-full text-xs font-extrabold rounded-xl py-3 h-auto shadow-lg shadow-sky-600/25">
						Sign In
						<ArrowRight class="w-4 h-4 ml-1.5" />
					</button>

					<div class="text-center mt-6">
						<span class="text-slate-400 text-[11px]">Don't have an account? </span>
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
				<!-- Forgot Password flow -->
				<form onsubmit={handleForgot} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1.5" for="forgot-email">
							<span class="label-text font-bold text-xs text-slate-300">Email Address</span>
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

					<button type="submit" class="btn btn-gradient-primary w-full text-xs font-extrabold rounded-xl py-3 h-auto shadow-lg shadow-sky-600/25">
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
				<!-- Register flow -->
				<form onsubmit={handleRegister} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1" for="reg-name">
							<span class="label-text font-bold text-xs text-slate-300">Full Name</span>
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
							<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.fullName}</span>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="reg-username">
								<span class="label-text font-bold text-xs text-slate-300">Username</span>
							</label>
							<input
								id="reg-username"
								type="text"
								placeholder="alice"
								bind:value={username}
								class="input w-full bg-slate-900/80 border-slate-800 text-xs text-slate-100 rounded-xl {errors.username ? 'border-rose-500' : ''}"
							/>
							{#if errors.username}
								<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.username}</span>
							{/if}
						</div>

						<div class="form-control">
							<label class="label pb-1" for="reg-role">
								<span class="label-text font-bold text-xs text-slate-300">Select Role</span>
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
								<span class="label-text font-bold text-xs text-slate-300">Department</span>
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
							<span class="label-text font-bold text-xs text-slate-300">Email Address</span>
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
							<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="reg-password">
							<span class="label-text font-bold text-xs text-slate-300">Create Password</span>
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
							<span class="text-rose-400 text-[10px] font-bold mt-1">{errors.password}</span>
						{/if}
					</div>

					<button type="submit" class="btn btn-gradient-primary w-full text-xs font-extrabold rounded-xl py-3 h-auto mt-2 shadow-lg shadow-sky-600/25">
						Register Account
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

	<!-- Right Side: Split Info & Demo accounts card deck -->
	<div class="lg:col-span-5 bg-slate-900/50 border-l border-slate-800/80 p-8 md:p-12 flex flex-col justify-center relative z-10 backdrop-blur-md">
		<div class="max-w-md mx-auto space-y-6">
			<div>
				<h2 class="text-xs font-black tracking-widest uppercase text-sky-400">System Demo Suite</h2>
				<h3 class="text-xl font-black text-white mt-1">One-Click Quick Access Profiles</h3>
				<p class="text-xs text-slate-400 mt-1">
					Select any demo profile to log in instantly with tailored role permissions.
				</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{#each demoAccounts as acc}
					{@const deptName = db.getDepartments().find((/** @type {any} */ d) => d.id === acc.departmentId)?.name || 'External Division'}
					<button
						onclick={() => handleDemoLogin(acc.id)}
						class="flex flex-col p-4 glass-card border border-slate-800 rounded-2xl text-left shadow-lg hover:shadow-2xl hover:border-sky-500/50 hover:-translate-y-1 transition-all duration-200 relative overflow-hidden group min-h-[120px]"
					>
						<!-- Decorative header stripe -->
						<div class="absolute top-0 left-0 right-0 h-1.5 {acc.role === 'Employee' ? 'bg-emerald-500' : acc.role === 'Manager' ? 'bg-sky-500' : 'bg-amber-500'}"></div>
						
						<div class="flex items-start gap-3 mt-1.5 w-full">
							<div class="w-10 h-10 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center shrink-0 border border-slate-700">
								<UserIcon class="w-5 h-5" />
							</div>
							<div class="overflow-hidden w-full">
								<p class="font-extrabold text-xs text-slate-100 leading-snug group-hover:text-sky-400 transition-colors truncate">
									{acc.fullName}
								</p>
								<p class="text-[9px] font-black uppercase tracking-wider mt-0.5 {acc.role === 'Employee' ? 'text-emerald-400' : acc.role === 'Manager' ? 'text-sky-400' : 'text-amber-400'}">
									{acc.role === 'Manager' ? 'Manager / Admin' : acc.role}
								</p>
							</div>
						</div>
						
						<div class="mt-auto w-full pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
							<span class="truncate max-w-[90px]">{deptName}</span>
							<span class="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">Sign In →</span>
						</div>
					</button>
				{/each}
			</div>

			<!-- Budget Alert Mock visual -->
			<div class="p-4 bg-sky-950/40 border border-sky-800/50 rounded-2xl flex items-start gap-3">
				<Building class="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
				<div>
					<h4 class="text-xs font-bold text-slate-200">Department Budgets Integrated</h4>
					<p class="text-[11px] text-slate-400 mt-0.5 leading-snug">
						Includes real-time threshold checks, automated quotation scoring, and role-based workflows for enterprise procurement management.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>


<script lang="ts">
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
	let mode = $state<'login' | 'register' | 'forgot' | 'verify'>('login');
	let showPassword = $state(false);

	// Preloaded list of dummy accounts for testing
	const demoAccounts = db.getUsers();

	// Form states
	let email = $state('');
	let username = $state('');
	let password = $state('');
	let fullName = $state('');
	let role = $state<z.infer<typeof roleSchema>>('Employee');
	let departmentId = $state('dept-electronics');

	// Form errors
	let errors = $state<{ [key: string]: string }>({});

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

	function handleDemoLogin(uId: string) {
		const target = demoAccounts.find((u) => u.id === uId);
		if (target) {
			globalStore.login(target);
			if (target.role === 'Employee') {
				goto('/purchase-requests');
			} else {
				goto('/dashboard');
			}
		}
	}

	function handleLogin(e: Event) {
		e.preventDefault();
		errors = {};
		const result = loginSchema.safeParse({ email, password });

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = issue.path[0] as string;
				errors[path] = issue.message;
			});
			return;
		}

		// Look for matching user email
		const matched = db.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
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

	function handleRegister(e: Event) {
		e.preventDefault();
		errors = {};
		const result = registerSchema.safeParse({ username, email, fullName, password, role });

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const path = issue.path[0] as string;
				errors[path] = issue.message;
			});
			return;
		}

		// Register new user
		const users = db.getUsers();
		if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
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
			status: 'Active' as const,
			avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
			createdAt: new Date().toISOString()
		};

		users.push(newUser);
		db.saveUsers(users);
		db.logAction(newUser.id, 'User Registered', `Created account with role: ${role}`);
		globalStore.showToast('Registration successful! Please login.', 'success');
		mode = 'login';
	}

	function handleForgot(e: Event) {
		e.preventDefault();
		if (!email) {
			globalStore.showToast('Please enter your email', 'error');
			return;
		}
		globalStore.showToast('Password reset link sent to your email!', 'success');
		mode = 'login';
	}
</script>

<div class="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-800">
	<!-- Left Side: Split Authentication Form container -->
	<div class="lg:col-span-7 flex items-center justify-center p-8 md:p-16">
		<div class="w-full max-w-md space-y-8">
			<!-- Header -->
			<div class="text-left">
				<div class="inline-flex p-3 bg-blue-50 text-primary rounded-xl mb-4">
					<ShieldCheck class="w-7 h-7" />
				</div>
				<h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
					ProcureSmart Portal
				</h1>
				<p class="text-slate-500 text-xs mt-1.5 font-medium">
					Enter your credentials to access the Smart Procurement Management System.
				</p>
			</div>

			<!-- Dynamic Auth Windows -->
			{#if mode === 'login'}
				<form onsubmit={handleLogin} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1.5" for="login-email">
							<span class="label-text font-bold text-xs text-slate-700">Email Address</span>
						</label>
						<div class="relative">
							<Mail class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
							<input
								id="login-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="input w-full pl-9 border-slate-200 focus:border-primary text-xs"
								class:border-error={errors.email}
							/>
						</div>
						{#if errors.email}
							<span class="text-error text-[10px] font-semibold mt-1">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<div class="flex justify-between items-center pb-1.5">
							<label class="label p-0" for="login-password">
								<span class="label-text font-bold text-xs text-slate-700">Password</span>
							</label>
							<button
								type="button"
								onclick={() => (mode = 'forgot')}
								class="text-[11px] font-bold text-primary hover:underline"
							>
								Forgot password?
							</button>
						</div>
						<div class="relative">
							<Lock class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
							<input
								id="login-password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								bind:value={password}
								class="input w-full pl-9 pr-10 border-slate-200 focus:border-primary text-xs"
								class:border-error={errors.password}
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
							>
								{#if showPassword}
									<EyeOff class="w-4 h-4" />
								{:else}
									<Eye class="w-4 h-4" />
								{/if}
							</button>
						</div>
						{#if errors.password}
							<span class="text-error text-[10px] font-semibold mt-1">{errors.password}</span>
						{/if}
					</div>

					<button type="submit" class="btn btn-primary w-full text-xs font-bold rounded-lg py-2.5 h-auto">
						Sign In
						<ArrowRight class="w-4 h-4 ml-1.5" />
					</button>

					<div class="text-center mt-6">
						<span class="text-slate-500 text-[11px]">Don't have an account? </span>
						<button
							type="button"
							onclick={() => (mode = 'register')}
							class="text-[11px] font-bold text-primary hover:underline"
						>
							Create an account
						</button>
					</div>
				</form>
			{:else}
				<!-- Register / Other flows -->
				<form onsubmit={handleRegister} class="space-y-4">
					<div class="form-control">
						<label class="label pb-1" for="reg-name">
							<span class="label-text font-bold text-xs text-slate-700">Full Name</span>
						</label>
						<div class="relative">
							<UserIcon class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
							<input
								id="reg-name"
								type="text"
								placeholder="Alice Johnson"
								bind:value={fullName}
								class="input w-full pl-9 border-slate-200 text-xs"
								class:border-error={errors.fullName}
							/>
						</div>
						{#if errors.fullName}
							<span class="text-error text-[10px] font-semibold mt-1">{errors.fullName}</span>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label pb-1" for="reg-username">
								<span class="label-text font-bold text-xs text-slate-700">Username</span>
							</label>
							<input
								id="reg-username"
								type="text"
								placeholder="alice"
								bind:value={username}
								class="input w-full border-slate-200 text-xs"
								class:border-error={errors.username}
							/>
							{#if errors.username}
								<span class="text-error text-[10px] font-semibold mt-1">{errors.username}</span>
							{/if}
						</div>

						<div class="form-control">
							<label class="label pb-1" for="reg-role">
								<span class="label-text font-bold text-xs text-slate-700">Select Role</span>
							</label>
							<select
								id="reg-role"
								bind:value={role}
								class="select select-bordered w-full border-slate-200 text-xs"
							>
								<option value="Employee">Employee</option>
								<option value="Manager">Manager</option>
								<option value="Vendor">Vendor Portal</option>
							</select>
						</div>
					</div>

					{#if role === 'Employee' || role === 'Manager'}
						<div class="form-control">
							<label class="label pb-1" for="reg-dept">
								<span class="label-text font-bold text-xs text-slate-700">Department</span>
							</label>
							<select
								id="reg-dept"
								bind:value={departmentId}
								class="select select-bordered w-full border-slate-200 text-xs"
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
							<span class="label-text font-bold text-xs text-slate-700">Email Address</span>
						</label>
						<div class="relative">
							<Mail class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
							<input
								id="reg-email"
								type="email"
								placeholder="name@enterprise.com"
								bind:value={email}
								class="input w-full pl-9 border-slate-200 text-xs"
								class:border-error={errors.email}
							/>
						</div>
						{#if errors.email}
							<span class="text-error text-[10px] font-semibold mt-1">{errors.email}</span>
						{/if}
					</div>

					<div class="form-control">
						<label class="label pb-1" for="reg-password">
							<span class="label-text font-bold text-xs text-slate-700">Create Password</span>
						</label>
						<div class="relative">
							<Lock class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
							<input
								id="reg-password"
								type="password"
								placeholder="••••••••"
								bind:value={password}
								class="input w-full pl-9 border-slate-200 text-xs"
								class:border-error={errors.password}
							/>
						</div>
						{#if errors.password}
							<span class="text-error text-[10px] font-semibold mt-1">{errors.password}</span>
						{/if}
					</div>

					<button type="submit" class="btn btn-primary w-full text-xs font-bold rounded-lg py-2.5 h-auto mt-2">
						Register Account
					</button>

					<div class="text-center mt-4">
						<button
							type="button"
							onclick={() => (mode = 'login')}
							class="text-[11px] font-bold text-primary hover:underline"
						>
							Back to Sign In
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>

	<!-- Right Side: Split Info & Demo accounts card deck -->
	<div class="lg:col-span-5 bg-slate-50 border-l border-slate-200/50 p-8 md:p-12 flex flex-col justify-center">
		<div class="max-w-md mx-auto space-y-6">
			<div>
				<h2 class="text-sm font-bold tracking-wider uppercase text-slate-400">System Demo Suite</h2>
				<h3 class="text-lg font-bold text-slate-900 mt-0.5">Quick Access Accounts</h3>
				<p class="text-xs text-slate-500 mt-1">
					Select any profile below to bypass verification and log in with specific role permissions.
				</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{#each demoAccounts as acc}
					{@const deptName = db.getDepartments().find((d) => d.id === acc.departmentId)?.name || 'External Division'}
					<button
						onclick={() => handleDemoLogin(acc.id)}
						class="flex flex-col p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group min-h-[120px]"
					>
						<!-- Decorative header stripe for Employee card vs Manager/Admin card -->
						<div class="absolute top-0 left-0 right-0 h-1.5" class:bg-emerald-500={acc.role === 'Employee'} class:bg-primary={acc.role === 'Manager'} class:bg-amber-500={acc.role === 'Vendor'}></div>
						
						<div class="flex items-start gap-2.5 mt-1.5 w-full">
							<img src={acc.avatarUrl} alt="" class="w-10 h-10 rounded-full ring-2 ring-slate-100 shrink-0 object-cover" />
							<div class="overflow-hidden w-full">
								<p class="font-bold text-xs text-slate-800 leading-snug group-hover:text-primary transition-colors truncate">
									{acc.fullName}
								</p>
								<p class="text-[9px] font-black uppercase tracking-wider mt-0.5" class:text-emerald-600={acc.role === 'Employee'} class:text-primary={acc.role === 'Manager'} class:text-amber-600={acc.role === 'Vendor'}>
									{acc.role === 'Manager' ? 'Manager / Admin' : acc.role}
								</p>
							</div>
						</div>
						
						<div class="mt-auto w-full pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
							<span class="truncate max-w-[80px]">{deptName}</span>
							<span class="text-primary opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
						</div>
					</button>
				{/each}
			</div>

			<!-- Budget Alert Mock visual -->
			<div class="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
				<Building class="w-5 h-5 text-primary shrink-0 mt-0.5" />
				<div>
					<h4 class="text-xs font-bold text-slate-800">Department Budgets Integrated</h4>
					<p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
						Includes real-time threshold check for Electronics, Clothes, Furniture, and Store budgets. Simulates approvals and quotation lowest-price recommendations automatically.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

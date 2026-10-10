import { db } from '../db/mockDb';
import { supabase, withTimeout } from '../supabase';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

class GlobalStore {
currentUser = $state(null);
theme = $state('light');
sidebarExpanded = $state(true);
searchQuery = $state('');
toasts = $state([]);
notifications = $state([]);
activeRole = $state('Guest');
sessionCheckInterval = null;

constructor() {
	if (typeof window !== 'undefined') {
		const savedUser = localStorage.getItem('current_user');
		const loginTime = localStorage.getItem('login_timestamp');

		if (savedUser && loginTime) {
			const elapsed = Date.now() - Number(loginTime);
			if (elapsed >= SESSION_TIMEOUT_MS) {
				this.clearSession();
			} else {
				try {
					const parsed = JSON.parse(savedUser);
					this.currentUser = parsed;
					this.activeRole = parsed.role || 'Guest';
					this.loadNotifications(parsed.id);
					this.startSessionTimer();
				} catch (error) {
					this.clearSession();
				}
			}
		} else {
			this.clearSession();
		}

		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'light' || savedTheme === 'dark') {
			this.theme = savedTheme;
		} else {
			this.theme = 'light';
		}

		this.applyTheme();
	}
}

startSessionTimer() {
	if (typeof window === 'undefined') return;
	if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);

	this.sessionCheckInterval = setInterval(() => {
		if (!this.currentUser) return;
		const loginTime = localStorage.getItem('login_timestamp');
		if (loginTime) {
			const elapsed = Date.now() - Number(loginTime);
			if (elapsed >= SESSION_TIMEOUT_MS) {
				this.autoLogout();
			}
		}
	}, 5000);
}

autoLogout() {
	if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);
	this.clearSession();
	this.showToast('Session expired (15-min limit reached). Please log in again.', 'warning');
	if (typeof window !== 'undefined') {
		window.location.href = '/login';
	}
}

async login(user) {
	let finalUser = { ...user };
	this.currentUser = finalUser;
	this.activeRole = finalUser.role || 'Employee';

	if (typeof window !== 'undefined') {
		localStorage.setItem('current_user', JSON.stringify(finalUser));
		localStorage.setItem('login_timestamp', String(Date.now()));
		this.startSessionTimer();
	}

	this.loadNotifications(finalUser.id);
	this.showToast('Logged in successfully', 'success');

	try {
		db.logAction(finalUser.id, 'User Login', 'Logged in from IP client session.');
	} catch (error) {}

	const email = user?.email;
	if (email) {
		withTimeout(
			supabase
				.from('users')
				.select(
					'id, username, email, role, department_id, vendor_id, full_name, status, avatar_url, created_at'
				)
				.eq('email', email)
				.maybeSingle(),
			800
		).then(({ data }) => {
			if (data) {
				const updatedUser = {
					...finalUser,
					id: data.id,
					username: data.username || email,
					email: data.email || email,
					role: data.role || finalUser.role || 'Employee',
					departmentId: data.department_id || finalUser.departmentId,
					vendorId: data.vendor_id || finalUser.vendorId,
					fullName: data.full_name || finalUser.fullName || email,
					status: data.status || 'Active',
					avatarUrl: data.avatar_url || finalUser.avatarUrl,
					createdAt: data.created_at || finalUser.createdAt
				};
				this.currentUser = updatedUser;
				this.activeRole = updatedUser.role;
				if (typeof window !== 'undefined') {
					localStorage.setItem('current_user', JSON.stringify(updatedUser));
				}
			}
		}).catch(() => {});
	}

	return finalUser;
}

clearSession() {
	if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);
	this.currentUser = null;
	this.activeRole = 'Guest';
	this.notifications = [];

	if (typeof window !== 'undefined') {
		localStorage.removeItem('current_user');
		localStorage.removeItem('login_timestamp');
	}
}

async logout() {
	if (this.currentUser) {
		try {
			db.logAction(this.currentUser.id, 'User Logout', 'Logged out of session.');
		} catch (error) {}

		try {
			await supabase.auth.signOut();
		} catch (e) {}

		this.clearSession();
		this.showToast('Logged out successfully', 'info');
		if (typeof window !== 'undefined') {
			window.location.href = '/login';
		}
	}
}

loadNotifications(userId) {
	const allNotifs = db.getNotifications();

	this.notifications = allNotifs.filter(
		(n) => n.userId === userId
	);
}

markNotificationRead(notifId) {
	const allNotifs = db.getNotifications();

	const idx = allNotifs.findIndex(
		(n) => n.id === notifId
	);

	if (idx !== -1) {
		allNotifs[idx].isRead = true;
		db.saveNotifications(allNotifs);

		if (this.currentUser) {
			this.loadNotifications(this.currentUser.id);
		}
	}
}

toggleTheme() {
	const nextTheme =
		this.theme === 'light' ? 'dark' : 'light';

	if (
		typeof document !== 'undefined' &&
		'startViewTransition' in document
	) {
		// @ts-ignore
		document.startViewTransition(() => {
			this.theme = nextTheme;
			this.applyTheme();
		});
	} else {
		this.theme = nextTheme;
		this.applyTheme();
	}

	if (typeof window !== 'undefined') {
		localStorage.setItem('theme', nextTheme);
	}
}

applyTheme() {
	if (typeof window !== 'undefined') {
		document.documentElement.setAttribute('data-theme', this.theme);
		document.documentElement.classList.toggle('dark', this.theme === 'dark');
	}
}

showToast(message, type = 'info') {
	const id = Math.random()
		.toString(36)
		.substring(2, 9);

	this.toasts.push({
		id,
		message,
		type
	});

	setTimeout(() => {
		this.toasts = this.toasts.filter(
			(t) => t.id !== id
		);
	}, 4000);
}

removeToast(id) {
	this.toasts = this.toasts.filter(
		(t) => t.id !== id
	);
}


}

export const globalStore = new GlobalStore();

export default globalStore;

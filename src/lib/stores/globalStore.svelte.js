import { db } from '../db/mockDb';
import { supabase } from '../supabase';

class GlobalStore {
currentUser = $state(null);
theme = $state('light');
sidebarExpanded = $state(true);
searchQuery = $state('');
toasts = $state([]);
notifications = $state([]);
activeRole = $state('Guest');


constructor() {
	if (typeof window !== 'undefined') {
		const savedUser = localStorage.getItem('current_user');

		if (savedUser) {
			try {
				const parsed = JSON.parse(savedUser);
				this.currentUser = parsed;
				this.activeRole = parsed.role || 'Guest';
				this.loadNotifications(parsed.id);
			} catch (error) {
				console.error('Failed to restore saved user session:', error);
				localStorage.removeItem('current_user');
			}
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

async login(user) {
	let finalUser = { ...user };

	try {
		const email = user?.email;

		if (email) {
			const { data, error } = await supabase
				.from('users')
				.select(
					'id, username, email, role, department_id, vendor_id, full_name, status, avatar_url, created_at'
				)
				.eq('email', email)
				.maybeSingle();

			if (error) {
				console.error('Could not load procurement user:', error);
			}

			if (data) {
				finalUser = {
					...finalUser,
					id: data.id,
					username: data.username || email,
					email: data.email || email,
					role: data.role || 'Employee',
					departmentId: data.department_id,
					vendorId: data.vendor_id,
					fullName: data.full_name || email,
					status: data.status || 'Active',
					avatarUrl: data.avatar_url || null,
					createdAt: data.created_at || null
				};
			}
		}

		this.currentUser = finalUser;
		this.activeRole = finalUser.role || 'Employee';

		if (typeof window !== 'undefined') {
			localStorage.setItem(
				'current_user',
				JSON.stringify(finalUser)
			);
		}

		this.loadNotifications(finalUser.id);

		this.showToast('Logged in successfully', 'success');

		try {
			db.logAction(
				finalUser.id,
				'User Login',
				'Logged in from IP client session.'
			);
		} catch (error) {
			console.warn('Local audit logging skipped:', error);
		}

		return finalUser;
	} catch (error) {
		console.error('Login role loading failed:', error);

		this.currentUser = user;
		this.activeRole = user?.role || 'Employee';

		if (typeof window !== 'undefined') {
			localStorage.setItem(
				'current_user',
				JSON.stringify(user)
			);
		}

		this.loadNotifications(user?.id);
		this.showToast('Logged in successfully', 'success');

		return user;
	}
}

clearSession() {
	this.currentUser = null;
	this.activeRole = 'Guest';
	this.notifications = [];

	if (typeof window !== 'undefined') {
		localStorage.removeItem('current_user');
	}
}

async logout() {
	if (this.currentUser) {
		try {
			db.logAction(
				this.currentUser.id,
				'User Logout',
				'Logged out of session.'
			);
		} catch (error) {
			console.warn('Local audit logging skipped:', error);
		}

		await supabase.auth.signOut();

		this.clearSession();

		this.showToast('Logged out successfully', 'info');
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
		document.documentElement.setAttribute(
			'data-theme',
			this.theme
		);
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

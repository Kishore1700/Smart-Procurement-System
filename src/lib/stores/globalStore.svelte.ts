import { db } from '../db/mockDb';
import type { User, Notification } from '../db/types';

// Svelte 5 State-based Session and Global Store
class GlobalStore {
	// Current logged in user
	currentUser = $state<User | null>(null);

	// Active Theme (light or dark)
	theme = $state<'light' | 'dark'>('dark');

	// Sidebar expanded state
	sidebarExpanded = $state<boolean>(true);

	// Global Search Query
	searchQuery = $state<string>('');

	// Toast notification system
	toasts = $state<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);

	// Active notifications list for current user
	notifications = $state<Notification[]>([]);

	// Selected Role (for quick demo switching)
	activeRole = $state<User['role'] | 'Guest'>('Guest');

	constructor() {
		// Load from localStorage if client-side
		if (typeof window !== 'undefined') {
			const savedUser = localStorage.getItem('current_user');
			if (savedUser) {
				const parsed = JSON.parse(savedUser) as User;
				this.currentUser = parsed;
				this.activeRole = parsed.role;
				this.loadNotifications(parsed.id);
			}

			const savedTheme = localStorage.getItem('theme');
			if (savedTheme === 'light' || savedTheme === 'dark') {
				this.theme = savedTheme;
			} else {
				this.theme = 'dark';
			}
			this.applyTheme();
		}
	}

	login(user: User) {
		this.currentUser = user;
		this.activeRole = user.role;
		if (typeof window !== 'undefined') {
			localStorage.setItem('current_user', JSON.stringify(user));
		}
		this.loadNotifications(user.id);
		this.showToast(`Logged in successfully as ${user.fullName}`, 'success');
		db.logAction(user.id, 'User Login', `Logged in from IP client session.`);
	}

	logout() {
		if (this.currentUser) {
			db.logAction(this.currentUser.id, 'User Logout', `Logged out of session.`);
			this.currentUser = null;
			this.activeRole = 'Guest';
			this.notifications = [];
			if (typeof window !== 'undefined') {
				localStorage.removeItem('current_user');
			}
			this.showToast('Logged out successfully', 'info');
		}
	}

	loadNotifications(userId: string) {
		const allNotifs = db.getNotifications();
		this.notifications = allNotifs.filter((n) => n.userId === userId);
	}

	markNotificationRead(notifId: string) {
		const allNotifs = db.getNotifications();
		const idx = allNotifs.findIndex((n) => n.id === notifId);
		if (idx !== -1) {
			allNotifs[idx].isRead = true;
			db.saveNotifications(allNotifs);
			if (this.currentUser) {
				this.loadNotifications(this.currentUser.id);
			}
		}
	}

	toggleTheme() {
		this.theme = this.theme === 'light' ? 'dark' : 'light';
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', this.theme);
		}
		this.applyTheme();
	}

	private applyTheme() {
		if (typeof window !== 'undefined') {
			const html = document.documentElement;
			html.setAttribute('data-theme', this.theme);
		}
	}

	showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
		const id = Math.random().toString(36).substring(2, 9);
		this.toasts.push({ id, message, type });
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 4000);
	}

	removeToast(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const globalStore = new GlobalStore();
export default globalStore;

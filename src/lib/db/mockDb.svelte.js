// Helper to generate UUIDs
export function generateUUID() {
	return 'xxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Seed Departments
const initialDepartments = [
	{
		id: 'dept-electronics',
		name: 'Electronics',
		managerId: 'user-mgr1',
		annualBudget: 500000,
		allocatedBudget: 500000,
		utilizedBudget: 0,
		remainingBudget: 500000
	},
	{
		id: 'dept-kitchen',
		name: 'Kitchen Appliances',
		managerId: 'user-mgr1',
		annualBudget: 300000,
		allocatedBudget: 300000,
		utilizedBudget: 0,
		remainingBudget: 300000
	},
	{
		id: 'dept-clothes',
		name: 'Clothes',
		managerId: 'user-mgr1',
		annualBudget: 200000,
		allocatedBudget: 200000,
		utilizedBudget: 0,
		remainingBudget: 200000
	},
	{
		id: 'dept-toys',
		name: 'Kids Toys',
		managerId: 'user-mgr1',
		annualBudget: 150000,
		allocatedBudget: 150000,
		utilizedBudget: 0,
		remainingBudget: 150000
	},
	{
		id: 'dept-deptstore',
		name: 'Departmental Store',
		managerId: 'user-mgr1',
		annualBudget: 800000,
		allocatedBudget: 800000,
		utilizedBudget: 0,
		remainingBudget: 800000
	},
	{
		id: 'dept-footwear',
		name: 'Footwear',
		managerId: 'user-mgr1',
		annualBudget: 250000,
		allocatedBudget: 250000,
		utilizedBudget: 0,
		remainingBudget: 250000
	},
	{
		id: 'dept-furniture',
		name: 'Furnitures',
		managerId: 'user-mgr1',
		annualBudget: 400000,
		allocatedBudget: 400000,
		utilizedBudget: 0,
		remainingBudget: 400000
	},
	{
		id: 'dept-others',
		name: 'Others',
		managerId: 'user-mgr1',
		annualBudget: 100000,
		allocatedBudget: 100000,
		utilizedBudget: 0,
		remainingBudget: 100000
	}
];

// Seed Users with exact specified credentials
const initialUsers = [
	{
		id: 'user-mgr1',
		username: 'headadmin',
		email: 'head@gmail.com',
		password: 'Head@123',
		role: 'Manager',
		departmentId: 'dept-electronics',
		vendorId: null,
		fullName: 'Head Admin',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-05T09:00:00Z'
	},
	{
		id: 'user-emp1',
		username: 'employee',
		email: 'employee@gmail.com',
		password: 'Employee@123',
		role: 'Employee',
		departmentId: 'dept-electronics',
		vendorId: null,
		fullName: 'Standard Employee',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-10T08:00:00Z'
	},
	{
		id: 'user-ven1',
		username: 'vendor1',
		email: 'vendor1@gmail.com',
		password: 'Vendor1@123',
		role: 'Vendor',
		departmentId: null,
		vendorId: 'vendor-apex',
		fullName: 'Apex Vendor 1',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-12T14:20:00Z'
	},
	{
		id: 'user-ven2',
		username: 'vendor2',
		email: 'vendor2@gmail.com',
		password: 'Vendor2@123',
		role: 'Vendor',
		departmentId: null,
		vendorId: 'vendor-acme',
		fullName: 'ACME Vendor 2',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-15T11:00:00Z'
	},
	{
		id: 'user-ven3',
		username: 'vendor3',
		email: 'vendor3@gmail.com',
		password: 'Vendor3@123',
		role: 'Vendor',
		departmentId: null,
		vendorId: 'vendor-global',
		fullName: 'Global Vendor 3',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-20T09:30:00Z'
	}
];

// Seed Vendors
const initialVendors = [
	{
		id: 'vendor-acme',
		name: 'ACME Office Supplies',
		email: 'sales@acme.com',
		phone: '+1-555-0199',
		address: '123 Industrial Parkway, Suite A, Metropolis',
		categories: ['Office Furniture', 'Stationery', 'Computer Hardware'],
		rating: 4.2,
		performanceScore: 88,
		status: 'Active',
		contactPerson: 'John Acme',
		createdAt: '2026-01-12T14:20:00Z'
	},
	{
		id: 'vendor-apex',
		name: 'Apex IT Solutions',
		email: 'contact@apexsolutions.com',
		phone: '+1-555-0144',
		address: '456 Tech Boulevard, Silicon Valley',
		categories: ['Computer Hardware', 'Software Licenses', 'Networking Equipment'],
		rating: 4.8,
		performanceScore: 96,
		status: 'Active',
		contactPerson: 'Sarah Apex',
		createdAt: '2026-01-15T09:45:00Z'
	},
	{
		id: 'vendor-global',
		name: 'Global Logistics Corp',
		email: 'delivery@globallogistics.com',
		phone: '+1-555-0177',
		address: '789 Freight Way, Logistics City',
		categories: ['Shipping Services', 'Office Furniture'],
		rating: 3.5,
		performanceScore: 72,
		status: 'Active',
		contactPerson: 'Alex Porter',
		createdAt: '2026-02-02T10:00:00Z'
	}
];

// Seed Purchase Requests
const initialPurchaseRequests = [
	{
		id: 'pr-101',
		title: 'Laptops and Desktops Procurement',
		description: 'High performance workstations for Engineering team',
		departmentId: 'dept-electronics',
		requesterId: 'user-emp1',
		category: 'Computer Hardware',
		priority: 'High',
		estimatedCost: 150000,
		attachmentUrl: null,
		status: 'Approved',
		currentApproverId: 'user-mgr1',
		budgetStatus: 'Valid',
		createdAt: '2026-03-01T10:00:00Z',
		items: [
			{ id: 'item-1', itemName: 'Workstation Laptop i9', quantity: 5, unitPrice: 25000, estimatedCost: 125000 },
			{ id: 'item-2', itemName: '4K Monitors 27"', quantity: 5, unitPrice: 5000, estimatedCost: 25000 }
		]
	},
	{
		id: 'pr-102',
		title: 'Ergonomic Office Chairs & Desks',
		description: 'Replacement furniture for main floor',
		departmentId: 'dept-furniture',
		requesterId: 'user-emp1',
		category: 'Office Furniture',
		priority: 'Medium',
		estimatedCost: 80000,
		attachmentUrl: null,
		status: 'Approved',
		currentApproverId: 'user-mgr1',
		budgetStatus: 'Valid',
		createdAt: '2026-03-05T14:20:00Z',
		items: [
			{ id: 'item-3', itemName: 'Executive Mesh Chair', quantity: 10, unitPrice: 5000, estimatedCost: 50000 },
			{ id: 'item-4', itemName: 'Adjustable Standing Desk', quantity: 5, unitPrice: 6000, estimatedCost: 30000 }
		]
	}
];

// Seed Approvals
const initialApprovals = [];

// Seed Quotations
const initialQuotations = [
	{
		id: 'q-101',
		requestId: 'pr-101',
		vendorId: 'vendor-apex',
		price: 145000,
		deliveryTimeDays: 4,
		warrantyMonths: 24,
		terms: 'Net 30 days payment. 2 Years onsite warranty included.',
		status: 'Submitted',
		recommendationScore: 94,
		isLowestPrice: true,
		createdAt: '2026-03-02T09:30:00Z'
	},
	{
		id: 'q-102',
		requestId: 'pr-101',
		vendorId: 'vendor-acme',
		price: 149000,
		deliveryTimeDays: 7,
		warrantyMonths: 12,
		terms: 'Standard delivery terms apply.',
		status: 'Submitted',
		recommendationScore: 82,
		isLowestPrice: false,
		createdAt: '2026-03-02T11:15:00Z'
	},
	{
		id: 'q-103',
		requestId: 'pr-102',
		vendorId: 'vendor-acme',
		price: 78000,
		deliveryTimeDays: 5,
		warrantyMonths: 12,
		terms: 'Free assembly and delivery included.',
		status: 'Submitted',
		recommendationScore: 88,
		isLowestPrice: true,
		createdAt: '2026-03-06T10:00:00Z'
	}
];

// Seed Purchase Orders
const initialPurchaseOrders = [
	{
		id: 'po-101',
		requestId: 'pr-101',
		poNumber: 'PO-2026-0001',
		vendorId: 'vendor-apex',
		totalAmount: 145000,
		termsAndConditions: 'Net 30 days. Full 24-month warranty.',
		status: 'Approved',
		createdById: 'user-mgr1',
		createdAt: '2026-03-03T15:00:00Z'
	}
];

// Seed Deliveries
const initialDeliveries = [];

// Seed Invoices
const initialInvoices = [
	{
		id: 'inv-101',
		poNumber: 'PO-2026-0001',
		invoiceNumber: 'INV-2026-8901',
		amount: 145000,
		attachmentUrl: '/uploads/invoice_doc.pdf',
		status: 'Verified',
		submittedAt: '2026-03-04T11:30:00Z',
		verifiedAt: '2026-03-05T09:00:00Z',
		verifiedById: 'user-mgr1',
		paidAt: null
	}
];

// Seed Notifications
const initialNotifications = [];

// Seed Audit Logs
const initialAuditLogs = [];

// Database state accessor
class MockDatabase {
	updateTrigger = $state(0);

	get(key, initial) {
		const _ = this.updateTrigger;
		if (typeof window === 'undefined') return initial;
		const val = localStorage.getItem(key);
		if (!val) {
			localStorage.setItem(key, JSON.stringify(initial));
			return initial;
		}
		return JSON.parse(val);
	}

	set(key, data) {
		if (typeof window === 'undefined') return;
		localStorage.setItem(key, JSON.stringify(data));
		this.updateTrigger++;
	}

	// Clear data and reseed
	reset() {
		if (typeof window === 'undefined') return;
		localStorage.clear();
		this.updateTrigger++;

		this.set('users', initialUsers);
		this.set('departments', initialDepartments);
		this.set('purchaseRequests', initialPurchaseRequests);
		this.set('approvals', initialApprovals);
		this.set('vendors', initialVendors);
		this.set('quotations', initialQuotations);
		this.set('purchaseOrders', initialPurchaseOrders);
		this.set('deliveries', initialDeliveries);
		this.set('invoices', initialInvoices);
		this.set('notifications', initialNotifications);
		this.set('auditLogs', initialAuditLogs);
	}

	// USERS
	getUsers() {
		let users = this.get('users', initialUsers);
		const requiredEmails = ['head@gmail.com', 'employee@gmail.com', 'vendor1@gmail.com', 'vendor2@gmail.com', 'vendor3@gmail.com'];
		const hasAllNewUsers = requiredEmails.every((em) => users.some((u) => u.email === em));
		if (!hasAllNewUsers) {
			if (typeof window !== 'undefined') {
				this.set('users', initialUsers);
			}
			return initialUsers;
		}
		return users;
	}
	saveUsers(users) {
		this.set('users', users);
	}

	// DEPARTMENTS
	getDepartments() {
		let depts = this.get('departments', initialDepartments);
		if (depts.some((d) => d.id === 'dept-it' || d.id === 'dept-hr') || !depts.some((d) => d.id === 'dept-others')) {
			if (typeof window !== 'undefined') {
				setTimeout(() => this.reset(), 0);
			}
			return initialDepartments;
		}
		return depts;
	}
	saveDepartments(depts) {
		this.set('departments', depts);
	}

	// PURCHASE REQUESTS
	getPurchaseRequests() {
		return this.get('purchaseRequests', initialPurchaseRequests);
	}
	savePurchaseRequests(requests) {
		this.set('purchaseRequests', requests);
	}

	// APPROVALS
	getApprovals() {
		return this.get('approvals', initialApprovals);
	}
	saveApprovals(approvals) {
		this.set('approvals', approvals);
	}

	// VENDORS
	getVendors() {
		return this.get('vendors', initialVendors);
	}
	saveVendors(vendors) {
		this.set('vendors', vendors);
	}

	// QUOTATIONS
	getQuotations() {
		return this.get('quotations', initialQuotations);
	}
	saveQuotations(quotes) {
		this.set('quotations', quotes);
	}

	// PURCHASE ORDERS
	getPurchaseOrders() {
		return this.get('purchaseOrders', initialPurchaseOrders);
	}
	savePurchaseOrders(pos) {
		this.set('purchaseOrders', pos);
	}

	// DELIVERIES
	getDeliveries() {
		return this.get('deliveries', initialDeliveries);
	}
	saveDeliveries(deliveries) {
		this.set('deliveries', deliveries);
	}

	// INVOICES
	getInvoices() {
		return this.get('invoices', initialInvoices);
	}
	saveInvoices(invoices) {
		this.set('invoices', invoices);
	}

	// NOTIFICATIONS
	getNotifications() {
		return this.get('notifications', initialNotifications);
	}
	saveNotifications(notifications) {
		this.set('notifications', notifications);
	}

	// AUDIT LOGS
	getAuditLogs() {
		return this.get('auditLogs', initialAuditLogs);
	}
	saveAuditLogs(logs) {
		this.set('auditLogs', logs);
	}

	// Log transaction audit
	logAction(userId, action, details) {
		const users = this.getUsers();
		const user = users.find((u) => u.id === userId);
		const newLog = {
			id: 'log-' + generateUUID().slice(0, 8),
			userId,
			username: user?.username || 'unknown',
			role: user?.role || 'System',
			action,
			details,
			timestamp: new Date().toISOString()
		};
		const logs = this.getAuditLogs();
		logs.unshift(newLog); // Prepend to show newest first
		this.saveAuditLogs(logs);
	}

	// Create and push notification
	addNotification(userId, title, message, type) {
		const newNotif = {
			id: 'notif-' + generateUUID().slice(0, 8),
			userId,
			title,
			message,
			isRead: false,
			type,
			createdAt: new Date().toISOString()
		};
		const notifs = this.getNotifications();
		notifs.unshift(newNotif);
		this.saveNotifications(notifs);
	}
}

export const db = new MockDatabase();

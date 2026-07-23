import type {
	User,
	Department,
	PurchaseRequest,
	Approval,
	Vendor,
	Quotation,
	PurchaseOrder,
	Delivery,
	Invoice,
	Notification,
	AuditLog
} from './types';

// Helper to generate UUIDs
export function generateUUID() {
	return 'xxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Seed Departments
const initialDepartments: Department[] = [
	{
		id: 'dept-electronics',
		name: 'Electronics',
		managerId: 'user-mgr1',
		annualBudget: 500000,
		allocatedBudget: 500000,
		utilizedBudget: 150000,
		remainingBudget: 350000
	},
	{
		id: 'dept-kitchen',
		name: 'Kitchen Appliances',
		managerId: 'user-mgr1',
		annualBudget: 300000,
		allocatedBudget: 300000,
		utilizedBudget: 80000,
		remainingBudget: 220000
	},
	{
		id: 'dept-clothes',
		name: 'Clothes',
		managerId: 'user-mgr1',
		annualBudget: 200000,
		allocatedBudget: 200000,
		utilizedBudget: 50000,
		remainingBudget: 150000
	},
	{
		id: 'dept-toys',
		name: 'Kids Toys',
		managerId: 'user-mgr1',
		annualBudget: 150000,
		allocatedBudget: 150000,
		utilizedBudget: 30000,
		remainingBudget: 120000
	},
	{
		id: 'dept-deptstore',
		name: 'Departmental Store',
		managerId: 'user-mgr1',
		annualBudget: 800000,
		allocatedBudget: 800000,
		utilizedBudget: 400000,
		remainingBudget: 400000
	},
	{
		id: 'dept-footwear',
		name: 'Footwear',
		managerId: 'user-mgr1',
		annualBudget: 250000,
		allocatedBudget: 250000,
		utilizedBudget: 60000,
		remainingBudget: 190000
	},
	{
		id: 'dept-furniture',
		name: 'Furnitures',
		managerId: 'user-mgr1',
		annualBudget: 400000,
		allocatedBudget: 400000,
		utilizedBudget: 200000,
		remainingBudget: 200000
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

// Seed Users (passwords are dummy 'password')
const initialUsers: User[] = [
	{
		id: 'user-emp1',
		username: 'employee',
		email: 'employee@enterprise.com',
		role: 'Employee',
		departmentId: 'dept-electronics',
		vendorId: null,
		fullName: 'Alice Johnson',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-10T08:00:00Z'
	},
	{
		id: 'user-mgr1',
		username: 'manager',
		email: 'manager@enterprise.com',
		role: 'Manager',
		departmentId: 'dept-electronics',
		vendorId: null,
		fullName: 'Bob Smith',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-05T09:00:00Z'
	},
	{
		id: 'user-ven1',
		username: 'acme_vendor',
		email: 'sales@acme.com',
		role: 'Vendor',
		departmentId: null,
		vendorId: 'vendor-acme',
		fullName: 'John Acme',
		status: 'Active',
		avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
		createdAt: '2026-01-12T14:20:00Z'
	}
];

// Seed Vendors
const initialVendors: Vendor[] = [
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
const initialPurchaseRequests: PurchaseRequest[] = [
	{
		id: 'pr-001',
		title: 'Developer Laptops Upgrade',
		description: 'Purchase of high-performance laptops for new engineering hires and hardware refresh.',
		departmentId: 'dept-electronics',
		requesterId: 'user-emp1',
		category: 'Computer Hardware',
		priority: 'High',
		estimatedCost: 15000,
		attachmentUrl: '/dummy_specs.pdf',
		attachmentName: 'laptop_specs.pdf',
		status: 'Pending Approval',
		currentApproverId: 'user-mgr1',
		items: [
			{
				id: 'pri-1',
				itemName: 'Developer Laptop 16" (32GB RAM, 1TB SSD)',
				quantity: 5,
				unitPrice: 2500,
				estimatedCost: 12500
			},
			{
				id: 'pri-2',
				itemName: 'USB-C Dual Monitor Docking Stations',
				quantity: 5,
				unitPrice: 500,
				estimatedCost: 2500
			}
		],
		budgetStatus: 'Valid',
		createdAt: '2026-07-15T09:00:00Z',
		updatedAt: '2026-07-15T09:00:00Z'
	},
	{
		id: 'pr-002',
		title: 'Office Ergonomic Chairs',
		description: 'Replacement of damaged and worn out office chairs in the main department floor.',
		departmentId: 'dept-furniture',
		requesterId: 'user-emp1',
		category: 'Office Furniture',
		priority: 'Medium',
		estimatedCost: 3600,
		attachmentUrl: null,
		attachmentName: null,
		status: 'Approved',
		currentApproverId: null,
		items: [
			{
				id: 'pri-3',
				itemName: 'Ergonomic Task Chair (Mesh Back)',
				quantity: 12,
				unitPrice: 300,
				estimatedCost: 3600
			}
		],
		budgetStatus: 'Valid',
		createdAt: '2026-07-10T10:30:00Z',
		updatedAt: '2026-07-12T11:45:00Z'
	},
	{
		id: 'pr-003',
		title: 'Enterprise ERP Cloud Software License Renewal',
		description: 'Annual licensing fees renewal for CRM and Cloud Infrastructure tools.',
		departmentId: 'dept-electronics',
		requesterId: 'user-emp1',
		category: 'Software Licenses',
		priority: 'Urgent',
		estimatedCost: 140000,
		attachmentUrl: null,
		attachmentName: null,
		status: 'Approved',
		currentApproverId: null,
		items: [
			{
				id: 'pri-4',
				itemName: 'Cloud ERP Software Subscription (100 Users)',
				quantity: 1,
				unitPrice: 140000,
				estimatedCost: 140000
			}
		],
		budgetStatus: 'Valid',
		createdAt: '2026-07-11T13:00:00Z',
		updatedAt: '2026-07-13T16:20:00Z'
	}
];

// Seed Approvals
const initialApprovals: Approval[] = [
	{
		id: 'app-1',
		requestId: 'pr-002',
		approverId: 'user-mgr1',
		approverRole: 'Manager',
		status: 'Approved',
		comments: 'Crucial for employee health and workplace ergonomics. Approved.',
		actionDate: '2026-07-12T11:45:00Z'
	},
	{
		id: 'app-2',
		requestId: 'pr-003',
		approverId: 'user-mgr1',
		approverRole: 'Manager',
		status: 'Approved',
		comments: 'Essential software, must renew. Approved.',
		actionDate: '2026-07-12T14:30:00Z'
	},
	{
		id: 'app-3',
		requestId: 'pr-003',
		approverId: 'user-mgr1',
		approverRole: 'Manager',
		status: 'Approved',
		comments: 'Finance reviewed budget allocation. Fully approved.',
		actionDate: '2026-07-13T16:20:00Z'
	}
];

// Seed Quotations
const initialQuotations: Quotation[] = [
	{
		id: 'q-1',
		requestId: 'pr-001',
		vendorId: 'vendor-acme',
		price: 15500,
		deliveryTimeDays: 10,
		warrantyMonths: 12,
		attachmentUrl: '/quote_acme.pdf',
		terms: 'Net 30 payment terms. Free shipping included.',
		status: 'Submitted',
		recommendationScore: 78,
		isLowestPrice: false,
		createdAt: '2026-07-16T10:00:00Z'
	},
	{
		id: 'q-2',
		requestId: 'pr-001',
		vendorId: 'vendor-apex',
		price: 14800,
		deliveryTimeDays: 5,
		warrantyMonths: 24,
		attachmentUrl: '/quote_apex.pdf',
		terms: 'Net 15 payment terms. Next-day delivery.',
		status: 'Submitted',
		recommendationScore: 95,
		isLowestPrice: true,
		createdAt: '2026-07-16T11:30:00Z'
	}
];

// Seed Purchase Orders
const initialPurchaseOrders: PurchaseOrder[] = [
	{
		id: 'po-1',
		requestId: 'pr-002',
		poNumber: 'PO-2026-0001',
		vendorId: 'vendor-acme',
		totalAmount: 3600,
		termsAndConditions: 'Deliver to Warehouse A. Payment after complete inspection.',
		status: 'Approved',
		createdById: 'user-mgr1',
		createdAt: '2026-07-13T10:00:00Z'
	},
	{
		id: 'po-2',
		requestId: 'pr-003',
		poNumber: 'PO-2026-0002',
		vendorId: 'vendor-apex',
		totalAmount: 140000,
		termsAndConditions: 'Electronic delivery of license keys. 1-year contract duration.',
		status: 'Issued',
		createdById: 'user-mgr1',
		createdAt: '2026-07-14T09:30:00Z'
	}
];

// Seed Deliveries
const initialDeliveries: Delivery[] = [
	{
		id: 'del-1',
		poNumber: 'PO-2026-0001',
		status: 'Delivered',
		trackingNumber: 'TRK-ACME-88910',
		carrier: 'UPS Ground',
		estimatedDeliveryDate: '2026-07-18T17:00:00Z',
		actualDeliveryDate: '2026-07-16T14:15:00Z',
		notes: 'All 12 chairs received in perfect condition. Unboxed and placed in main department floor.',
		itemsReceived: [
			{
				itemId: 'pri-3',
				quantityReceived: 12
			}
		],
		createdAt: '2026-07-14T11:00:00Z'
	}
];

// Seed Invoices
const initialInvoices: Invoice[] = [
	{
		id: 'inv-1',
		poNumber: 'PO-2026-0001',
		invoiceNumber: 'INV-ACME-5541',
		amount: 3600,
		attachmentUrl: '/invoice_acme.pdf',
		status: 'Verified',
		submittedAt: '2026-07-16T15:00:00Z',
		verifiedAt: '2026-07-17T09:00:00Z',
		verifiedById: 'user-mgr1',
		paidAt: null
	}
];

// Seed Notifications
const initialNotifications: Notification[] = [
	{
		id: 'notif-1',
		userId: 'user-mgr1',
		title: 'New Purchase Request Pending',
		message: 'Alice Johnson submitted "Developer Laptops Upgrade" for Electronics department approval.',
		isRead: false,
		type: 'Alert',
		createdAt: '2026-07-15T09:01:00Z'
	},
	{
		id: 'notif-2',
		userId: 'user-emp1',
		title: 'Request Approved',
		message: 'Your purchase request "Office Ergonomic Chairs" has been approved.',
		isRead: true,
		type: 'Success',
		createdAt: '2026-07-12T11:46:00Z'
	}
];

// Seed Audit Logs
const initialAuditLogs: AuditLog[] = [
	{
		id: 'log-1',
		userId: 'user-emp1',
		username: 'employee',
		role: 'Employee',
		action: 'Create Purchase Request',
		details: 'Created PR "Developer Laptops Upgrade" with estimated cost of ₹15,000.',
		timestamp: '2026-07-15T09:00:00Z'
	},
	{
		id: 'log-2',
		userId: 'user-mgr1',
		username: 'manager',
		role: 'Manager',
		action: 'Approve Purchase Request',
		details: 'Approved PR "Office Ergonomic Chairs" (₹3,600).',
		timestamp: '2026-07-12T11:45:00Z'
	}
];

// Database state accessor
class MockDatabase {
	private get<T>(key: string, initial: T[]): T[] {
		if (typeof window === 'undefined') return initial;
		const val = localStorage.getItem(key);
		if (!val) {
			localStorage.setItem(key, JSON.stringify(initial));
			return initial;
		}
		return JSON.parse(val);
	}

	private set<T>(key: string, data: T[]): void {
		if (typeof window === 'undefined') return;
		localStorage.setItem(key, JSON.stringify(data));
	}

	// Clear data and reseed
	public reset() {
		if (typeof window === 'undefined') return;
		localStorage.clear();
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
	getUsers(): User[] {
		let users = this.get<User>('users', initialUsers);
		const validRoles = ['Employee', 'Manager', 'Vendor'];
		const hasLegacyRoles = users.some((u) => !validRoles.includes(u.role));
		if (hasLegacyRoles) {
			this.reset();
			return initialUsers;
		}
		return users;
	}
	saveUsers(users: User[]) {
		this.set('users', users);
	}

	// DEPARTMENTS
	getDepartments(): Department[] {
		let depts = this.get<Department>('departments', initialDepartments);
		if (depts.some((d) => d.id === 'dept-it' || d.id === 'dept-hr') || !depts.some((d) => d.id === 'dept-others')) {
			this.reset();
			return initialDepartments;
		}
		return depts;
	}
	saveDepartments(depts: Department[]) {
		this.set('departments', depts);
	}

	// PURCHASE REQUESTS
	getPurchaseRequests(): PurchaseRequest[] {
		return this.get<PurchaseRequest>('purchaseRequests', initialPurchaseRequests);
	}
	savePurchaseRequests(requests: PurchaseRequest[]) {
		this.set('purchaseRequests', requests);
	}

	// APPROVALS
	getApprovals(): Approval[] {
		return this.get<Approval>('approvals', initialApprovals);
	}
	saveApprovals(approvals: Approval[]) {
		this.set('approvals', approvals);
	}

	// VENDORS
	getVendors(): Vendor[] {
		return this.get<Vendor>('vendors', initialVendors);
	}
	saveVendors(vendors: Vendor[]) {
		this.set('vendors', vendors);
	}

	// QUOTATIONS
	getQuotations(): Quotation[] {
		return this.get<Quotation>('quotations', initialQuotations);
	}
	saveQuotations(quotes: Quotation[]) {
		this.set('quotations', quotes);
	}

	// PURCHASE ORDERS
	getPurchaseOrders(): PurchaseOrder[] {
		return this.get<PurchaseOrder>('purchaseOrders', initialPurchaseOrders);
	}
	savePurchaseOrders(pos: PurchaseOrder[]) {
		this.set('purchaseOrders', pos);
	}

	// DELIVERIES
	getDeliveries(): Delivery[] {
		return this.get<Delivery>('deliveries', initialDeliveries);
	}
	saveDeliveries(deliveries: Delivery[]) {
		this.set('deliveries', deliveries);
	}

	// INVOICES
	getInvoices(): Invoice[] {
		return this.get<Invoice>('invoices', initialInvoices);
	}
	saveInvoices(invoices: Invoice[]) {
		this.set('invoices', invoices);
	}

	// NOTIFICATIONS
	getNotifications(): Notification[] {
		return this.get<Notification>('notifications', initialNotifications);
	}
	saveNotifications(notifications: Notification[]) {
		this.set('notifications', notifications);
	}

	// AUDIT LOGS
	getAuditLogs(): AuditLog[] {
		return this.get<AuditLog>('auditLogs', initialAuditLogs);
	}
	saveAuditLogs(logs: AuditLog[]) {
		this.set('auditLogs', logs);
	}

	// Log transaction audit
	logAction(userId: string, action: string, details: string) {
		const users = this.getUsers();
		const user = users.find((u) => u.id === userId);
		const newLog: AuditLog = {
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
	addNotification(userId: string, title: string, message: string, type: Notification['type']) {
		const newNotif: Notification = {
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

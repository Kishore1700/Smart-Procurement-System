export interface User {
	id: string;
	username: string;
	email: string;
	role: 'Employee' | 'Manager' | 'Vendor';
	departmentId: string | null;
	vendorId: string | null;
	fullName: string;
	status: 'Active' | 'Inactive';
	avatarUrl: string;
	createdAt: string;
}

export interface Department {
	id: string;
	name: string;
	managerId: string;
	annualBudget: number;
	allocatedBudget: number;
	utilizedBudget: number;
	remainingBudget: number;
}

export interface PurchaseRequestItem {
	id: string;
	itemName: string;
	quantity: number;
	unitPrice: number;
	estimatedCost: number;
}

export interface PurchaseRequest {
	id: string;
	title: string;
	description: string;
	departmentId: string;
	requesterId: string;
	category: string;
	priority: 'Low' | 'Medium' | 'High' | 'Urgent';
	estimatedCost: number;
	attachmentUrl: string | null;
	attachmentName: string | null;
	status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled';
	currentApproverId: string | null;
	items: PurchaseRequestItem[];
	budgetStatus: 'Valid' | 'Over Budget';
	createdAt: string;
	updatedAt: string;
}

export interface Approval {
	id: string;
	requestId: string;
	approverId: string;
	approverRole: string;
	status: 'Pending' | 'Approved' | 'Rejected';
	comments: string;
	actionDate: string;
}

export interface Vendor {
	id: string;
	name: string;
	email: string;
	phone: string;
	address: string;
	categories: string[];
	rating: number; // 1-5
	performanceScore: number; // 0-100
	status: 'Active' | 'Inactive';
	contactPerson: string;
	createdAt: string;
}

export interface Quotation {
	id: string;
	requestId: string;
	vendorId: string;
	price: number;
	deliveryTimeDays: number;
	warrantyMonths: number;
	attachmentUrl: string | null;
	terms: string;
	status: 'Submitted' | 'Shortlisted' | 'Accepted' | 'Rejected';
	recommendationScore: number;
	isLowestPrice: boolean;
	createdAt: string;
}

export interface PurchaseOrder {
	id: string;
	requestId: string;
	poNumber: string;
	vendorId: string;
	totalAmount: number;
	termsAndConditions: string;
	status: 'Draft' | 'Pending Approval' | 'Approved' | 'Issued' | 'Completed' | 'Cancelled';
	createdById: string;
	createdAt: string;
}

export interface DeliveryItemReceived {
	itemId: string;
	quantityReceived: number;
}

export interface Delivery {
	id: string;
	poNumber: string;
	status: 'Pending' | 'Shipped' | 'Delivered' | 'Partially Delivered' | 'Delayed';
	trackingNumber: string;
	carrier: string;
	estimatedDeliveryDate: string;
	actualDeliveryDate: string | null;
	notes: string;
	itemsReceived: DeliveryItemReceived[];
	createdAt: string;
}

export interface Invoice {
	id: string;
	poNumber: string;
	invoiceNumber: string;
	amount: number;
	attachmentUrl: string | null;
	status: 'Unverified' | 'Verified' | 'Paid' | 'Rejected';
	submittedAt: string;
	verifiedAt: string | null;
	verifiedById: string | null;
	paidAt: string | null;
}

export interface Notification {
	id: string;
	userId: string;
	title: string;
	message: string;
	isRead: boolean;
	type: 'Info' | 'Alert' | 'Success' | 'Warning';
	createdAt: string;
}

export interface AuditLog {
	id: string;
	userId: string;
	username: string;
	role: string;
	action: string;
	details: string;
	timestamp: string;
}

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {'Employee' | 'Manager' | 'Vendor'} role
 * @property {string|null} departmentId
 * @property {string|null} vendorId
 * @property {string} fullName
 * @property {'Active' | 'Inactive'} status
 * @property {string} avatarUrl
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Department
 * @property {string} id
 * @property {string} name
 * @property {string} managerId
 * @property {number} annualBudget
 * @property {number} allocatedBudget
 * @property {number} utilizedBudget
 * @property {number} remainingBudget
 */

/**
 * @typedef {Object} PurchaseRequestItem
 * @property {string} id
 * @property {string} itemName
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} estimatedCost
 */

/**
 * @typedef {Object} PurchaseRequest
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} departmentId
 * @property {string} requesterId
 * @property {string} category
 * @property {'Low' | 'Medium' | 'High' | 'Urgent'} priority
 * @property {number} estimatedCost
 * @property {string|null} attachmentUrl
 * @property {string|null} attachmentName
 * @property {'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled'} status
 * @property {string} currentApproverId
 * @property {PurchaseRequestItem[]} items
 * @property {'Valid' | 'Over Budget'} budgetStatus
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export {};

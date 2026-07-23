-- MySQL Schema for Smart Procurement Management System
-- Generated: 2026-07-17

CREATE DATABASE IF NOT EXISTS smart_procurement;
USE smart_procurement;

-- Disable foreign key checks to allow clean table creation
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table `departments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `manager_id` VARCHAR(50) NOT NULL,
  `annual_budget` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `allocated_budget` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `utilized_budget` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `remaining_budget` DECIMAL(15,2) GENERATED ALWAYS AS (`allocated_budget` - `utilized_budget`) STORED,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Employee', 'Manager', 'Finance Officer', 'Procurement Officer', 'Vendor', 'Admin') NOT NULL,
  `department_id` VARCHAR(50) DEFAULT NULL,
  `vendor_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_users_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update Departments to reference Users for Manager relation
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_users` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

-- -----------------------------------------------------
-- Table `vendors`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `categories` JSON DEFAULT NULL, -- Comma-separated or array of category strings
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `performance_score` INT NOT NULL DEFAULT 100,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add relation from user back to vendors
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_vendors` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL;

-- -----------------------------------------------------
-- Table `purchase_requests`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `department_id` VARCHAR(50) NOT NULL,
  `requester_id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  `estimated_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `attachment_url` VARCHAR(255) DEFAULT NULL,
  `attachment_name` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Draft',
  `current_approver_id` VARCHAR(50) DEFAULT NULL,
  `budget_status` ENUM('Valid', 'Over Budget') NOT NULL DEFAULT 'Valid',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pr_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_pr_users` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_pr_approver` FOREIGN KEY (`current_approver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `purchase_request_items`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `estimated_cost` DECIMAL(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price`) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_items_pr` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `approvals`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `approvals` (
  `id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `approver_id` VARCHAR(50) NOT NULL,
  `approver_role` VARCHAR(50) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `comments` TEXT DEFAULT NULL,
  `action_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_approvals_pr` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approvals_users` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `quotations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `vendor_id` VARCHAR(50) NOT NULL,
  `price` DECIMAL(15,2) NOT NULL,
  `delivery_time_days` INT NOT NULL,
  `warranty_months` INT NOT NULL DEFAULT 0,
  `attachment_url` VARCHAR(255) DEFAULT NULL,
  `terms` TEXT DEFAULT NULL,
  `status` ENUM('Submitted', 'Shortlisted', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Submitted',
  `recommendation_score` INT NOT NULL DEFAULT 0,
  `is_lowest_price` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_quotes_pr` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotes_vendors` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `purchase_orders`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` VARCHAR(50) NOT NULL,
  `request_id` VARCHAR(50) NOT NULL,
  `po_number` VARCHAR(50) NOT NULL UNIQUE,
  `vendor_id` VARCHAR(50) NOT NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `terms_and_conditions` TEXT DEFAULT NULL,
  `status` ENUM('Draft', 'Pending Approval', 'Approved', 'Issued', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Draft',
  `created_by_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_po_pr` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`),
  CONSTRAINT `fk_po_vendors` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `fk_po_creators` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `deliveries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` VARCHAR(50) NOT NULL,
  `po_number` VARCHAR(50) NOT NULL,
  `status` ENUM('Pending', 'Shipped', 'Delivered', 'Partially Delivered', 'Delayed') NOT NULL DEFAULT 'Pending',
  `tracking_number` VARCHAR(100) DEFAULT NULL,
  `carrier` VARCHAR(100) DEFAULT NULL,
  `estimated_delivery_date` TIMESTAMP NULL DEFAULT NULL,
  `actual_delivery_date` TIMESTAMP NULL DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `items_received` JSON DEFAULT NULL, -- Array of item received configurations
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_deliveries_po` FOREIGN KEY (`po_number`) REFERENCES `purchase_orders` (`po_number`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `invoices`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(50) NOT NULL,
  `po_number` VARCHAR(50) NOT NULL,
  `invoice_number` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `attachment_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Unverified', 'Verified', 'Paid', 'Rejected') NOT NULL DEFAULT 'Unverified',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `verified_by_id` VARCHAR(50) DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_invoices_po` FOREIGN KEY (`po_number`) REFERENCES `purchase_orders` (`po_number`),
  CONSTRAINT `fk_invoices_verifiers` FOREIGN KEY (`verified_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `notifications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `type` ENUM('Info', 'Alert', 'Success', 'Warning') NOT NULL DEFAULT 'Info',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notifications_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `audit_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

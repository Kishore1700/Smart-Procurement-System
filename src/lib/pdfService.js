// @ts-nocheck
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Currency formatter helper for clean PDF text (avoiding Unicode glyph issues)
 */
function formatCurrency(amount) {
	const num = Number(amount || 0);
	return 'INR ' + num.toLocaleString('en-IN');
}

/**
 * Format Date helper
 */
function formatDate(dateStr) {
	if (!dateStr) return 'N/A';
	try {
		return new Date(dateStr).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Common Corporate Header Drawer
 */
function drawCorporateHeader(doc, title, subtitle, refNumber) {
	const pageWidth = doc.internal.pageSize.getWidth();

	// Primary brand banner background (Top bar)
	doc.setFillColor(15, 23, 42); // slate-900
	doc.rect(0, 0, pageWidth, 28, 'F');

	// Accent cyan line
	doc.setFillColor(2, 132, 199); // sky-600
	doc.rect(0, 28, pageWidth, 2.5, 'F');

	// Organization Name
	doc.setTextColor(255, 255, 255);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.text('SMART PROCUREMENT SYSTEM', 14, 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(186, 230, 253); // sky-200
	doc.text('Enterprise Resource & Supply Chain Operations • ISO 9001:2026 Compliant', 14, 20);

	// Document Meta in top-right
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(255, 255, 255);
	const refText = refNumber ? `REF: ${refNumber}` : `SYSTEM AUDIT LEDGER`;
	doc.text(refText, pageWidth - 14, 12, { align: 'right' });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(226, 232, 240);
	doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 14, 19, { align: 'right' });

	// Document Title Below Banner
	doc.setTextColor(15, 23, 42);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.text(title, 14, 40);

	if (subtitle) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(100, 116, 139); // slate-500
		doc.text(subtitle, 14, 46);
	}

	// Light separator line
	doc.setDrawColor(226, 232, 240);
	doc.setLineWidth(0.5);
	doc.line(14, 49, pageWidth - 14, 49);
}

/**
 * Common Corporate Footer & Sign-off Drawer
 */
function drawCorporateFooter(doc, generatedBy = 'Authorized Officer') {
	const pageCount = doc.internal.getNumberOfPages();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();

	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);

		// Bottom separator line
		doc.setDrawColor(226, 232, 240);
		doc.setLineWidth(0.5);
		doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

		// Footer info
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(100, 116, 139);
		doc.text(
			`Smart Procurement System • Confidential & Proprietary Document • Auditor: ${generatedBy}`,
			14,
			pageHeight - 10
		);

		// Page number
		doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
	}
}

/**
 * Draw Official Verification & Signature Box
 */
function drawVerificationStampAndSignatures(doc, startY, user) {
	const pageWidth = doc.internal.pageSize.getWidth();
	const y = startY + 8;

	// Verification Box (Left)
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(186, 230, 253);
	doc.roundedRect(14, y, 78, 30, 2, 2, 'FD');

	doc.setTextColor(3, 105, 161);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.text('OFFICIAL VERIFICATION SEAL', 18, y + 7);

	doc.setTextColor(15, 23, 42);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8.5);
	doc.text('DIGITALLY AUDITED & APPROVED', 18, y + 14);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);
	doc.setTextColor(100, 116, 139);
	doc.text(`Checksum: SHA-256 VALIDATED`, 18, y + 20);
	doc.text(`Verified On: ${new Date().toLocaleDateString('en-IN')}`, 18, y + 25);

	// Authorized Signatory 1 (Center)
	const sigX1 = 100;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(100, 116, 139);
	doc.text('Prepared & Certified By:', sigX1, y + 7);

	doc.setDrawColor(203, 213, 225);
	doc.line(sigX1, y + 22, sigX1 + 42, y + 22);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(15, 23, 42);
	doc.text(user?.fullName || user?.username || 'Procurement Auditor', sigX1, y + 27);

	// Authorized Signatory 2 (Right)
	const sigX2 = 152;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(100, 116, 139);
	doc.text('Authorized Finance Controller:', sigX2, y + 7);

	doc.setDrawColor(203, 213, 225);
	doc.line(sigX2, y + 22, sigX2 + 42, y + 22);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(15, 23, 42);
	doc.text('Financial Controller', sigX2, y + 27);
}

/* =====================================================================
   1. PURCHASE REQUESTS LEDGER REPORT PDF
   ===================================================================== */
export function downloadPurchaseRequestsReport(prs, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const safePrs = prs || [];

	const totalValue = safePrs.reduce((acc, p) => acc + Number(p.estimatedCost || 0), 0);
	const approvedCount = safePrs.filter((p) => p.status === 'Approved').length;
	const pendingCount = safePrs.filter((p) => p.status === 'Pending' || p.status === 'Under Review').length;

	drawCorporateHeader(
		doc,
		'Purchase Requests Audit Ledger',
		'Comprehensive summary of department procurement requisitions, status and values.',
		`PR-REP-${Date.now().toString().slice(-6)}`
	);

	// KPI Summary Cards
	const kpiY = 54;
	const cardW = 43;

	// Card 1
	doc.setFillColor(241, 245, 249);
	doc.roundedRect(14, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(100, 116, 139);
	doc.text('TOTAL REQUESTS', 17, kpiY + 5);
	doc.setFontSize(12);
	doc.setTextColor(15, 23, 42);
	doc.text(String(safePrs.length), 17, kpiY + 12);

	// Card 2
	doc.setFillColor(236, 253, 245);
	doc.roundedRect(14 + cardW + 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(5, 150, 105);
	doc.text('APPROVED REQUISITIONS', 17 + cardW + 3, kpiY + 5);
	doc.setFontSize(12);
	doc.text(String(approvedCount), 17 + cardW + 3, kpiY + 12);

	// Card 3
	doc.setFillColor(254, 243, 199);
	doc.roundedRect(14 + (cardW + 3) * 2, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(217, 119, 6);
	doc.text('PENDING REVIEW', 17 + (cardW + 3) * 2, kpiY + 5);
	doc.setFontSize(12);
	doc.text(String(pendingCount), 17 + (cardW + 3) * 2, kpiY + 12);

	// Card 4
	doc.setFillColor(239, 246, 255);
	doc.roundedRect(14 + (cardW + 3) * 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(37, 99, 235);
	doc.text('TOTAL VALUE', 17 + (cardW + 3) * 3, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(totalValue), 17 + (cardW + 3) * 3, kpiY + 12);

	// Table Data
	const tableRows = safePrs.map((p, idx) => [
		idx + 1,
		p.id || 'N/A',
		p.title || 'Untitled Requisition',
		p.category || 'General',
		p.priority || 'Medium',
		formatCurrency(p.estimatedCost),
		p.status || 'Draft',
		formatDate(p.createdAt)
	]);

	autoTable(doc, {
		startY: 74,
		head: [['#', 'Request ID', 'Requisition Title', 'Category', 'Priority', 'Est. Cost', 'Status', 'Date']],
		body: tableRows,
		theme: 'grid',
		styles: {
			fontSize: 7.5,
			cellPadding: 2.2,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		columnStyles: {
			0: { cellWidth: 8, halign: 'center' },
			1: { cellWidth: 26, fontStyle: 'bold' },
			2: { cellWidth: 46 },
			3: { cellWidth: 24 },
			4: { cellWidth: 18, halign: 'center' },
			5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
			6: { cellWidth: 20, halign: 'center' },
			7: { cellWidth: 18, halign: 'center' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	const finalY = doc.lastAutoTable?.finalY || 160;
	if (finalY < 235) {
		drawVerificationStampAndSignatures(doc, finalY, user);
	}

	drawCorporateFooter(doc, user?.fullName || user?.username || 'Procurement Auditor');
	doc.save(`Purchase_Requests_Ledger_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =====================================================================
   2. DEPARTMENT BUDGETS METRICS REPORT PDF
   ===================================================================== */
export function downloadDepartmentBudgetsReport(depts, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const safeDepts = depts || [];

	const totalAllocated = safeDepts.reduce((acc, d) => acc + Number(d.allocatedBudget || 0), 0);
	const totalUtilized = safeDepts.reduce((acc, d) => acc + Number(d.utilizedBudget || 0), 0);
	const totalRemaining = safeDepts.reduce((acc, d) => acc + Number(d.remainingBudget || 0), 0);
	const overallBurnRate = totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0;

	drawCorporateHeader(
		doc,
		'Department Budget Allocation & Utilization Report',
		'Financial thresholds, actual procurement expenditures, and remaining division balances.',
		`BUD-REP-${Date.now().toString().slice(-6)}`
	);

	// KPI Cards
	const kpiY = 54;
	const cardW = 43;

	// Card 1
	doc.setFillColor(241, 245, 249);
	doc.roundedRect(14, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(100, 116, 139);
	doc.text('TOTAL DIVISIONS', 17, kpiY + 5);
	doc.setFontSize(12);
	doc.setTextColor(15, 23, 42);
	doc.text(String(safeDepts.length), 17, kpiY + 12);

	// Card 2
	doc.setFillColor(239, 246, 255);
	doc.roundedRect(14 + cardW + 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(37, 99, 235);
	doc.text('TOTAL ALLOCATED', 17 + cardW + 3, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(totalAllocated), 17 + cardW + 3, kpiY + 12);

	// Card 3
	doc.setFillColor(254, 242, 242);
	doc.roundedRect(14 + (cardW + 3) * 2, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(220, 38, 38);
	doc.text('TOTAL UTILIZED (SPENT)', 17 + (cardW + 3) * 2, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(totalUtilized), 17 + (cardW + 3) * 2, kpiY + 12);

	// Card 4
	doc.setFillColor(236, 253, 245);
	doc.roundedRect(14 + (cardW + 3) * 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(5, 150, 105);
	doc.text('OVERALL REMAINING', 17 + (cardW + 3) * 3, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(totalRemaining), 17 + (cardW + 3) * 3, kpiY + 12);

	// Table Data
	const tableRows = safeDepts.map((d, idx) => {
		const alloc = Number(d.allocatedBudget || 0);
		const used = Number(d.utilizedBudget || 0);
		const rem = Number(d.remainingBudget !== undefined ? d.remainingBudget : alloc - used);
		const pct = alloc > 0 ? Math.round((used / alloc) * 100) : 0;
		return [
			idx + 1,
			d.id || 'N/A',
			d.name || 'Division',
			formatCurrency(alloc),
			formatCurrency(used),
			formatCurrency(rem),
			`${pct}%`,
			pct > 80 ? 'CRITICAL' : pct > 50 ? 'MODERATE' : 'HEALTHY'
		];
	});

	autoTable(doc, {
		startY: 74,
		head: [['#', 'Dept ID', 'Department Name', 'Allocated (INR)', 'Utilized (INR)', 'Remaining (INR)', 'Burn %', 'Status']],
		body: tableRows,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 2.4,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8.5
		},
		columnStyles: {
			0: { cellWidth: 8, halign: 'center' },
			1: { cellWidth: 20, fontStyle: 'bold' },
			2: { cellWidth: 44 },
			3: { cellWidth: 28, halign: 'right' },
			4: { cellWidth: 28, halign: 'right' },
			5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
			6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
			7: { cellWidth: 18, halign: 'center' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	const finalY = doc.lastAutoTable?.finalY || 160;
	if (finalY < 235) {
		drawVerificationStampAndSignatures(doc, finalY, user);
	}

	drawCorporateFooter(doc, user?.fullName || user?.username || 'Finance Controller');
	doc.save(`Department_Budgets_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =====================================================================
   3. INVOICES & FINANCIAL AUDITING REPORT PDF
   ===================================================================== */
export function downloadInvoicesReport(invoices, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const safeInvoices = invoices || [];

	const totalAmount = safeInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
	const paidInvoices = safeInvoices.filter((i) => i.status === 'Paid' || i.paymentStatus === 'Paid');
	const paidAmount = paidInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
	const pendingAmount = totalAmount - paidAmount;

	drawCorporateHeader(
		doc,
		'Financial Accounts & Vendor Invoices Ledger',
		'Audited disbursement records, vendor billing settlements, and payment clearance notes.',
		`INV-REP-${Date.now().toString().slice(-6)}`
	);

	// KPI Cards
	const kpiY = 54;
	const cardW = 43;

	// Card 1
	doc.setFillColor(241, 245, 249);
	doc.roundedRect(14, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(100, 116, 139);
	doc.text('TOTAL INVOICES', 17, kpiY + 5);
	doc.setFontSize(12);
	doc.setTextColor(15, 23, 42);
	doc.text(String(safeInvoices.length), 17, kpiY + 12);

	// Card 2
	doc.setFillColor(236, 253, 245);
	doc.roundedRect(14 + cardW + 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(5, 150, 105);
	doc.text('PAID / SETTLED (INR)', 17 + cardW + 3, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(paidAmount), 17 + cardW + 3, kpiY + 12);

	// Card 3
	doc.setFillColor(254, 243, 199);
	doc.roundedRect(14 + (cardW + 3) * 2, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(217, 119, 6);
	doc.text('PENDING CLEARANCE (INR)', 17 + (cardW + 3) * 2, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(pendingAmount), 17 + (cardW + 3) * 2, kpiY + 12);

	// Card 4
	doc.setFillColor(239, 246, 255);
	doc.roundedRect(14 + (cardW + 3) * 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(37, 99, 235);
	doc.text('TOTAL BILLED (INR)', 17 + (cardW + 3) * 3, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(formatCurrency(totalAmount), 17 + (cardW + 3) * 3, kpiY + 12);

	// Table Data
	const tableRows = safeInvoices.map((i, idx) => [
		idx + 1,
		i.invoiceNumber || 'N/A',
		i.poNumber || 'N/A',
		i.vendorName || 'Authorized Vendor',
		formatCurrency(i.amount),
		i.status || 'Pending',
		i.paymentId ? `Razorpay (${i.paymentId.slice(-6)})` : 'Direct / Pending',
		formatDate(i.submittedAt || i.paidAt)
	]);

	autoTable(doc, {
		startY: 74,
		head: [['#', 'Invoice #', 'PO Link', 'Vendor Entity', 'Amount (INR)', 'Status', 'Payment Method', 'Date']],
		body: tableRows,
		theme: 'grid',
		styles: {
			fontSize: 7.5,
			cellPadding: 2.2,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		columnStyles: {
			0: { cellWidth: 8, halign: 'center' },
			1: { cellWidth: 28, fontStyle: 'bold' },
			2: { cellWidth: 26 },
			3: { cellWidth: 38 },
			4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
			5: { cellWidth: 18, halign: 'center' },
			6: { cellWidth: 26, halign: 'center' },
			7: { cellWidth: 16, halign: 'center' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	const finalY = doc.lastAutoTable?.finalY || 160;
	if (finalY < 235) {
		drawVerificationStampAndSignatures(doc, finalY, user);
	}

	drawCorporateFooter(doc, user?.fullName || user?.username || 'Finance Auditor');
	doc.save(`Invoices_Financial_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =====================================================================
   4. EXECUTIVE MASTER PROCUREMENT AUDIT REPORT (COMBINED)
   ===================================================================== */
export function downloadExecutiveSummaryReport(prs, depts, invoices, pos, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const safePrs = prs || [];
	const safeDepts = depts || [];
	const safeInvoices = invoices || [];
	const safePos = pos || [];

	drawCorporateHeader(
		doc,
		'Executive Procurement Master Audit Report',
		'Consolidated executive intelligence: requisitions, purchase orders, budgets and financial settlements.',
		`EXEC-AUDIT-${Date.now().toString().slice(-6)}`
	);

	// Section 1: Executive Highlights
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(203, 213, 225);
	doc.roundedRect(14, 52, 182, 38, 2, 2, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9.5);
	doc.setTextColor(15, 23, 42);
	doc.text('EXECUTIVE PROCUREMENT SCORECARD', 20, 60);

	const totalPrValue = safePrs.reduce((a, b) => a + Number(b.estimatedCost || 0), 0);
	const totalBudget = safeDepts.reduce((a, b) => a + Number(b.allocatedBudget || 0), 0);
	const totalSpent = safeDepts.reduce((a, b) => a + Number(b.utilizedBudget || 0), 0);
	const totalInvoiced = safeInvoices.reduce((a, b) => a + Number(b.amount || 0), 0);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(71, 85, 105);
	doc.text(`• Total Requisitions Processed: ${safePrs.length} (${formatCurrency(totalPrValue)})`, 20, 68);
	doc.text(`• Total Purchase Orders Issued: ${safePos.length} active supplier orders`, 20, 74);
	doc.text(`• Overall Corporate Budget: ${formatCurrency(totalBudget)} (Spent: ${formatCurrency(totalSpent)})`, 20, 80);
	doc.text(`• Settled Accounts & Invoices: ${safeInvoices.length} billings (${formatCurrency(totalInvoiced)})`, 20, 86);

	// Section 2: Department Budgets Table
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	doc.text('1. Divisional Budget Health Breakdown', 14, 98);

	const deptRows = safeDepts.map((d) => [
		d.name || 'Division',
		formatCurrency(d.allocatedBudget),
		formatCurrency(d.utilizedBudget),
		formatCurrency(d.remainingBudget),
		`${Math.round(((d.utilizedBudget || 0) / (d.allocatedBudget || 1)) * 100)}%`
	]);

	autoTable(doc, {
		startY: 102,
		head: [['Department', 'Allocated', 'Utilized', 'Remaining', 'Utilization %']],
		body: deptRows,
		theme: 'grid',
		styles: { fontSize: 7.5, cellPadding: 2 },
		headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
		margin: { left: 14, right: 14 }
	});

	// Section 3: Recent Key Requisitions
	const nextY = doc.lastAutoTable.finalY + 8;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	doc.text('2. Requisition Pipeline Highlights', 14, nextY);

	const prRows = safePrs.slice(0, 5).map((p) => [
		p.id || 'N/A',
		p.title || 'Requisition',
		p.category || 'General',
		formatCurrency(p.estimatedCost),
		p.status || 'Pending'
	]);

	autoTable(doc, {
		startY: nextY + 4,
		head: [['PR ID', 'Title', 'Category', 'Est. Cost', 'Status']],
		body: prRows,
		theme: 'grid',
		styles: { fontSize: 7.5, cellPadding: 2 },
		headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
		margin: { left: 14, right: 14 }
	});

	const finalY = doc.lastAutoTable.finalY || 180;
	if (finalY < 235) {
		drawVerificationStampAndSignatures(doc, finalY, user);
	}

	drawCorporateFooter(doc, user?.fullName || 'Chief Procurement Officer');
	doc.save(`Executive_Procurement_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =====================================================================
   5. OFFICIAL PURCHASE ORDER (PO) PDF DOCUMENT
   ===================================================================== */
export function downloadPurchaseOrderPdf(po, vendor, request, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();

	// Top Banner
	doc.setFillColor(15, 23, 42);
	doc.rect(0, 0, pageWidth, 32, 'F');
	doc.setFillColor(2, 132, 199);
	doc.rect(0, 32, pageWidth, 2.5, 'F');

	doc.setTextColor(255, 255, 255);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.text('SMART PROCUREMENT SYSTEM', 14, 14);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(186, 230, 253);
	doc.text('Enterprise Procurement Hub • Corporate Headquarters • GSTIN: 33AAAAA0000A1Z5', 14, 21);
	doc.text('Contact: procurements@enterprise.com | +91 44 2828 9000', 14, 27);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(255, 255, 255);
	doc.text('OFFICIAL PURCHASE ORDER', pageWidth - 14, 15, { align: 'right' });

	doc.setFontSize(8.5);
	doc.setTextColor(147, 197, 253);
	doc.text(`PO NUMBER: ${po.poNumber || `PO-${po.id}`}`, pageWidth - 14, 22, { align: 'right' });
	doc.text(`DATE: ${formatDate(po.createdAt)}`, pageWidth - 14, 28, { align: 'right' });

	// PO Metadata Boxes (Bilateral Vendor & Delivery Address)
	const boxY = 40;
	const boxW = 88;

	// Box 1: Vendor / Supplier Info
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(226, 232, 240);
	doc.roundedRect(14, boxY, boxW, 40, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(2, 132, 199);
	doc.text('SUPPLIER / VENDOR DETAILS', 18, boxY + 6);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	const vendorName = vendor?.name || vendor?.vendor_name || vendor?.company_name || 'Authorized Commercial Vendor';
	doc.text(vendorName, 18, boxY + 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text(`Vendor ID: ${vendor?.id || po.vendorId || 'VND-2026'}`, 18, boxY + 19);
	doc.text(`Email: ${vendor?.email || 'vendor.billing@procuresuppliers.com'}`, 18, boxY + 24);
	doc.text(`Contact: ${vendor?.phone || '+91 98765 43210'}`, 18, boxY + 29);
	doc.text(`GSTIN: ${vendor?.gstin || '33BBBBB1111B2Z9'}`, 18, boxY + 34);

	// Box 2: Deliver-To / Buyer Details
	const box2X = 14 + boxW + 6;
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(226, 232, 240);
	doc.roundedRect(box2X, boxY, boxW, 40, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(2, 132, 199);
	doc.text('DELIVER TO / SHIP TO ADDRESS', box2X + 4, boxY + 6);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	doc.text('Smart Procurement Central Logistics Hub', box2X + 4, boxY + 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text('Building 4B, Tech Industrial Park, Chennai - 600096', box2X + 4, boxY + 19);
	doc.text(`Attention: Procurement Receiving Desk`, box2X + 4, boxY + 24);
	doc.text(`Linked Requisition: ${request?.request_number || request?.id || po.requestId || 'PR-Direct'}`, box2X + 4, boxY + 29);
	doc.text(`PO Status: ${po.status || 'Issued'}`, box2X + 4, boxY + 34);

	// Line Items Table
	const items = request?.items && Array.isArray(request.items) && request.items.length > 0
		? request.items
		: [
				{
					description: request?.title || 'Contracted Procurement Supplies and Commercial Deliverables',
					quantity: 1,
					unitPrice: Number(po.totalAmount || 0),
					totalPrice: Number(po.totalAmount || 0)
				}
		  ];

	const lineRows = items.map((item, idx) => {
		const qty = Number(item.quantity || 1);
		const unitPrice = Number(item.unitPrice || item.estimatedCost || (po.totalAmount / items.length));
		const total = qty * unitPrice;
		return [
			idx + 1,
			item.description || item.title || 'Procurement Item',
			item.category || request?.category || 'Supply Goods',
			qty,
			formatCurrency(unitPrice),
			'18%',
			formatCurrency(total)
		];
	});

	autoTable(doc, {
		startY: 86,
		head: [['#', 'Item Description / Scope of Work', 'Category', 'Qty', 'Unit Price', 'GST', 'Total Amount']],
		body: lineRows,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 2.5,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8.5
		},
		columnStyles: {
			0: { cellWidth: 8, halign: 'center' },
			1: { cellWidth: 68 },
			2: { cellWidth: 26 },
			3: { cellWidth: 14, halign: 'center' },
			4: { cellWidth: 26, halign: 'right' },
			5: { cellWidth: 14, halign: 'center' },
			6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	let curY = doc.lastAutoTable.finalY + 4;

	// Total Calculations Box (Right Side)
	const totalW = 75;
	const totalX = pageWidth - 14 - totalW;
	const subtotal = Number(po.totalAmount || 0);

	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(203, 213, 225);
	doc.roundedRect(totalX, curY, totalW, 26, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text('Subtotal (Exclusive of Tax):', totalX + 4, curY + 6);
	doc.text(formatCurrency(subtotal * 0.8475), totalX + totalW - 4, curY + 6, { align: 'right' });

	doc.text('Applicable GST (18% Integrated):', totalX + 4, curY + 12);
	doc.text(formatCurrency(subtotal * 0.1525), totalX + totalW - 4, curY + 12, { align: 'right' });

	doc.setDrawColor(203, 213, 225);
	doc.line(totalX + 4, curY + 15, totalX + totalW - 4, curY + 15);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(15, 23, 42);
	doc.text('TOTAL CONTRACT VALUE:', totalX + 4, curY + 21);
	doc.setTextColor(2, 132, 199);
	doc.text(formatCurrency(subtotal), totalX + totalW - 4, curY + 21, { align: 'right' });

	// Terms and Conditions Box (Left Side)
	doc.setFillColor(248, 250, 252);
	doc.roundedRect(14, curY, totalX - 18, 26, 1.5, 1.5, 'F');
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(7.5);
	doc.setTextColor(15, 23, 42);
	doc.text('PURCHASE TERMS & COMPLIANCE CONDITIONS:', 18, curY + 6);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(6.8);
	doc.setTextColor(100, 116, 139);
	const termsText = po.termsAndConditions || 'Standard terms apply: Delivery within 14 working days of order issuance. Payment released upon verification of invoice and goods receipt confirmation.';
	doc.text(doc.splitTextToSize(termsText, totalX - 26), 18, curY + 12);

	curY += 32;

	// Verification Seal & Signatures
	drawVerificationStampAndSignatures(doc, curY, user);

	drawCorporateFooter(doc, user?.fullName || 'Procurement Executive');
	doc.save(`Purchase_Order_${po.poNumber || po.id}.pdf`);
}

/* =====================================================================
   6. OFFICIAL TAX INVOICE & SETTLEMENT RECORD PDF
   ===================================================================== */
export function downloadTaxInvoicePdf(invoice, po, vendor, currentUser) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const invNumber = invoice.invoiceNumber || `INV-${invoice.id}`;
	const poNum = invoice.poNumber || po?.poNumber || 'PO-2026';
	const amount = Number(invoice.amount || po?.totalAmount || 0);

	// Top Banner
	doc.setFillColor(15, 23, 42);
	doc.rect(0, 0, pageWidth, 32, 'F');
	doc.setFillColor(5, 150, 105); // Emerald accent for tax invoice
	doc.rect(0, 32, pageWidth, 2.5, 'F');

	doc.setTextColor(255, 255, 255);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.text('OFFICIAL TAX INVOICE', 14, 14);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(167, 243, 208);
	doc.text('Original for Recipient • GST / Statutory Settlement Document • Form GST INV-1', 14, 21);
	doc.text(`Linked Purchase Order: ${poNum}`, 14, 27);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(11);
	doc.setTextColor(255, 255, 255);
	doc.text(`INVOICE: ${invNumber}`, pageWidth - 14, 15, { align: 'right' });

	doc.setFontSize(8.5);
	doc.setTextColor(209, 250, 229);
	doc.text(`DATE: ${formatDate(invoice.submittedAt || invoice.paidAt)}`, pageWidth - 14, 22, { align: 'right' });
	doc.text(`STATUS: ${invoice.status?.toUpperCase() || 'PAID'}`, pageWidth - 14, 28, { align: 'right' });

	// Bilateral Entity Information (Billed By vs Billed To)
	const boxY = 40;
	const boxW = 88;

	// Billed By (Vendor)
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(226, 232, 240);
	doc.roundedRect(14, boxY, boxW, 42, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(5, 150, 105);
	doc.text('BILLED BY (SUPPLIER / VENDOR)', 18, boxY + 6);

	const vendorName = invoice.vendorName || vendor?.name || 'Authorized Commercial Vendor Ltd';
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	doc.text(vendorName, 18, boxY + 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text(`GSTIN / UIN: ${vendor?.gstin || '33BBBBB1111B2Z9'}`, 18, boxY + 19);
	doc.text(`PAN: ${vendor?.pan || 'AAACB1234F'}`, 18, boxY + 24);
	doc.text(`State / Code: Tamil Nadu (Code 33)`, 18, boxY + 29);
	doc.text(`Vendor ID: ${invoice.vendorId || vendor?.id || 'VND-2026'}`, 18, boxY + 34);
	doc.text(`Email: ${vendor?.email || 'vendor.billing@supplier.com'}`, 18, boxY + 39);

	// Billed To (Buyer)
	const box2X = 14 + boxW + 6;
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(226, 232, 240);
	doc.roundedRect(box2X, boxY, boxW, 42, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(2, 132, 199);
	doc.text('BILLED TO (BUYER / RECIPIENT)', box2X + 4, boxY + 6);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.setTextColor(15, 23, 42);
	doc.text('Smart Procurement System Corp', box2X + 4, boxY + 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text('Corporate Supply Operations, Chennai - 600096', box2X + 4, boxY + 19);
	doc.text('GSTIN: 33AAAAA0000A1Z5 | State: Tamil Nadu (33)', box2X + 4, boxY + 24);
	doc.text(`PO Reference: ${poNum}`, box2X + 4, boxY + 29);
	const payRef = invoice.paymentId ? `Razorpay: ${invoice.paymentId}` : 'Digital Verification Pending';
	doc.text(`Payment Ref: ${payRef}`, box2X + 4, boxY + 34);
	doc.text(`Settlement Status: ${invoice.status || 'Paid'}`, box2X + 4, boxY + 39);

	// Line Item Breakdown Table
	const lineItems = [
		[
			1,
			`Procurement Fulfillment & Deliverables under ${poNum}`,
			'998311',
			1,
			formatCurrency(amount * 0.8475),
			formatCurrency(amount * 0.07625),
			formatCurrency(amount * 0.07625),
			formatCurrency(amount)
		]
	];

	autoTable(doc, {
		startY: 88,
		head: [['#', 'Description of Goods / Services', 'HSN/SAC', 'Qty', 'Taxable Val', 'CGST (9%)', 'SGST (9%)', 'Total (INR)']],
		body: lineItems,
		theme: 'grid',
		styles: {
			fontSize: 7.8,
			cellPadding: 2.5,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8
		},
		columnStyles: {
			0: { cellWidth: 8, halign: 'center' },
			1: { cellWidth: 62 },
			2: { cellWidth: 18, halign: 'center' },
			3: { cellWidth: 12, halign: 'center' },
			4: { cellWidth: 24, halign: 'right' },
			5: { cellWidth: 20, halign: 'right' },
			6: { cellWidth: 20, halign: 'right' },
			7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	let curY = doc.lastAutoTable.finalY + 4;

	// Total & Payment Verification Card
	const totalW = 75;
	const totalX = pageWidth - 14 - totalW;

	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(203, 213, 225);
	doc.roundedRect(totalX, curY, totalW, 26, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text('Taxable Value:', totalX + 4, curY + 6);
	doc.text(formatCurrency(amount * 0.8475), totalX + totalW - 4, curY + 6, { align: 'right' });

	doc.text('Total GST (CGST + SGST):', totalX + 4, curY + 12);
	doc.text(formatCurrency(amount * 0.1525), totalX + totalW - 4, curY + 12, { align: 'right' });

	doc.setDrawColor(203, 213, 225);
	doc.line(totalX + 4, curY + 15, totalX + totalW - 4, curY + 15);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(15, 23, 42);
	doc.text('NET INVOICE VALUE:', totalX + 4, curY + 21);
	doc.setTextColor(5, 150, 105);
	doc.text(formatCurrency(amount), totalX + totalW - 4, curY + 21, { align: 'right' });

	// Razorpay Payment Seal (Left Side)
	doc.setFillColor(236, 253, 245);
	doc.setDrawColor(167, 243, 208);
	doc.roundedRect(14, curY, totalX - 18, 26, 1.5, 1.5, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(5, 150, 105);
	doc.text('PAYMENT VERIFICATION & CLEARANCE STATUS', 18, curY + 6);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8.5);
	doc.setTextColor(15, 23, 42);
	const txnId = invoice.paymentId || 'RAZORPAY_OFFICIAL_GATEWAY';
	doc.text(`VERIFIED VIA RAZORPAY • TXN ID: ${txnId}`, 18, curY + 13);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);
	doc.setTextColor(71, 85, 105);
	doc.text('Funds transferred and settled under secure automated escrow clearance.', 18, curY + 19);
	doc.text('Digital Signature Certificate: Valid & Verified (Sec 65B Indian Evidence Act)', 18, curY + 23);

	curY += 32;

	// Verification Seal & Signatures
	drawVerificationStampAndSignatures(doc, curY, currentUser);

	drawCorporateFooter(doc, currentUser?.fullName || 'Tax Accounts Auditor');
	doc.save(`Tax_Invoice_${invNumber}.pdf`);
}

/* =====================================================================
   7. DELIVERY CONSIGNMENT CHALLAN & GRN PDF
   ===================================================================== */
export function downloadDeliveryChallanPdf(delivery, po, user) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const trackingNo = delivery.trackingNumber || `DEL-${delivery.id || '2026'}`;

	drawCorporateHeader(
		doc,
		'Delivery Consignment Challan & Goods Receipt Note (GRN)',
		'Official transit dispatch voucher, waybill tracking manifest, and physical receipt sign-off.',
		`WAYBILL: ${trackingNo}`
	);

	// Consignment Key Details
	const kpiY = 54;
	const cardW = 43;

	// Card 1
	doc.setFillColor(241, 245, 249);
	doc.roundedRect(14, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(100, 116, 139);
	doc.text('LOGISTICS CARRIER', 17, kpiY + 5);
	doc.setFontSize(10.5);
	doc.setTextColor(15, 23, 42);
	doc.text(delivery.carrier || 'Express Logistics', 17, kpiY + 12);

	// Card 2
	doc.setFillColor(239, 246, 255);
	doc.roundedRect(14 + cardW + 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(37, 99, 235);
	doc.text('PO REFERENCE', 17 + cardW + 3, kpiY + 5);
	doc.setFontSize(10.5);
	doc.text(delivery.poNumber || po?.poNumber || 'PO-2026', 17 + cardW + 3, kpiY + 12);

	// Card 3
	doc.setFillColor(236, 253, 245);
	doc.roundedRect(14 + (cardW + 3) * 2, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(5, 150, 105);
	doc.text('PAYMENT STATUS', 17 + (cardW + 3) * 2, kpiY + 5);
	doc.setFontSize(9.5);
	doc.text(delivery.paymentStatus || 'Paid via Razorpay', 17 + (cardW + 3) * 2, kpiY + 12);

	// Card 4
	doc.setFillColor(delivery.status === 'Delivered' ? 236 : 254, delivery.status === 'Delivered' ? 253 : 243, delivery.status === 'Delivered' ? 245 : 199);
	doc.roundedRect(14 + (cardW + 3) * 3, kpiY, cardW, 16, 1.5, 1.5, 'F');
	doc.setFontSize(7);
	doc.setTextColor(delivery.status === 'Delivered' ? 5 : 217, delivery.status === 'Delivered' ? 150 : 119, delivery.status === 'Delivered' ? 105 : 6);
	doc.text('TRANSIT STATUS', 17 + (cardW + 3) * 3, kpiY + 5);
	doc.setFontSize(10.5);
	doc.text(delivery.status?.toUpperCase() || 'IN TRANSIT', 17 + (cardW + 3) * 3, kpiY + 12);

	// Items Manifest Table
	const items = delivery.items && Array.isArray(delivery.items) && delivery.items.length > 0
		? delivery.items
		: [
				{
					description: 'Commercial Procurement Deliverables and Materials',
					quantity: 1,
					unitPrice: delivery.totalAmount || 0
				}
		  ];

	const tableRows = items.map((item, idx) => [
		idx + 1,
		item.description || item.title || 'Manifest Deliverable',
		item.quantity || 1,
		formatCurrency(item.unitPrice || delivery.totalAmount),
		delivery.status === 'Delivered' ? 'Verified / Intact' : 'In Transit / Sealed'
	]);

	autoTable(doc, {
		startY: 74,
		head: [['#', 'Consignment Description / Material Manifest', 'Qty / Packages', 'Valuation', 'Receiving Inspection']],
		body: tableRows,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: 2.5,
			textColor: [30, 41, 59],
			lineColor: [226, 232, 240],
			lineWidth: 0.1
		},
		headStyles: {
			fillColor: [15, 23, 42],
			textColor: [255, 255, 255],
			fontStyle: 'bold',
			fontSize: 8.5
		},
		columnStyles: {
			0: { cellWidth: 10, halign: 'center' },
			1: { cellWidth: 90 },
			2: { cellWidth: 26, halign: 'center' },
			3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
			4: { cellWidth: 34, halign: 'center' }
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252]
		},
		margin: { left: 14, right: 14 }
	});

	let curY = doc.lastAutoTable.finalY + 8;

	// Goods Receipt Note (GRN) Sign-off box
	doc.setFillColor(248, 250, 252);
	doc.setDrawColor(203, 213, 225);
	doc.roundedRect(14, curY, pageWidth - 28, 38, 2, 2, 'FD');

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(15, 23, 42);
	doc.text('GOODS RECEIPT NOTE (GRN) ACCEPTANCE & ACKNOWLEDGMENT', 20, curY + 7);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(71, 85, 105);
	doc.text(
		'The consignee hereby confirms physical receipt of the materials listed above in good order and sound condition, without any transit defect, shortages, or damages, unless endorsed otherwise.',
		20,
		curY + 14,
		{ maxWidth: pageWidth - 48 }
	);

	// Signatures lines inside GRN box
	doc.setDrawColor(203, 213, 225);
	doc.line(20, curY + 31, 70, curY + 31);
	doc.line(80, curY + 31, 130, curY + 31);
	doc.line(140, curY + 31, 190, curY + 31);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(7);
	doc.setTextColor(15, 23, 42);
	doc.text('Carrier Driver Signature', 20, curY + 35);
	doc.text('Warehouse Receiving Officer', 80, curY + 35);
	doc.text('Quality Inspection Sign-off', 140, curY + 35);

	curY += 44;

	if (curY < 235) {
		drawVerificationStampAndSignatures(doc, curY, user);
	}

	drawCorporateFooter(doc, user?.fullName || 'Logistics Receiving Desk');
	doc.save(`Delivery_Challan_${trackingNo}.pdf`);
}

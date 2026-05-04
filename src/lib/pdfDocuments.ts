/**
 * pdfDocuments.ts — PDF Document Types (Receipts, Vouchers, Statements, Cashbook, Reports)
 * 
 * Clean A4 design matching the TUBA ALHIJAZ invoice template.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  initPdf, addPdfHeader, addPdfFooter, addTitleBlock, addMetaLine,
  addSectionTitle, addSummaryCards, addInfoBox, addFinancialBox,
  addBalanceBar, addSignatureBlock, addWatermark, addRawTable,
  addDueHighlight, addTotalsBar, addFilterSummary, addBillToAndMeta,
  getWatermarkStatus, ensurePageSpace, buildFileName,
  fmtDate, fmtBDT, fmtAmount, bengaliCellHook,
  DARK, LIGHT_BG, TABLE_HEADER, MUTED,
  type SummaryCard, type FilterItem, type InfoField,
} from "./pdfCore";
import { generateTrackingQr, addQrToDoc } from "./pdfQrCode";

const MARGIN = 16;

// ═══════════════════════════════════════════════════════════════
// 1. CUSTOMER PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════
export interface PaymentReceiptData {
  customerName: string;
  customerPhone?: string | null;
  passport?: string | null;
  bookingTrackingId: string;
  packageName: string;
  installmentNumber?: number | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  totalBookingAmount: number;
  totalPaidSoFar: number;
  remainingDue: number;
  notes?: string | null;
}

export async function generatePaymentReceipt(data: PaymentReceiptData) {
  const { doc, logoBase64, sig, cfg } = await initPdf({
    qrUrl: `https://triptastic.com.bd/verify?id=${data.bookingTrackingId}`,
  });
  const qr = await generateTrackingQr(data.bookingTrackingId);

  let y = await addPdfHeader(doc, cfg, logoBase64, qr);
  addWatermark(doc, "paid");

  y = addTitleBlock(doc, y, "PAYMENT RECEIPT");

  const receiptNum = `${data.bookingTrackingId}-${data.installmentNumber || "P"}`;

  y = addBillToAndMeta(doc, y,
    [
      { label: "Name", value: data.customerName },
      { label: "Phone", value: data.customerPhone || "N/A" },
      { label: "Passport", value: data.passport || "N/A" },
      { label: "Package", value: data.packageName },
    ],
    [
      { label: "Receipt #", value: receiptNum },
      { label: "Date", value: fmtDate(data.paymentDate) },
      { label: "Booking ID", value: data.bookingTrackingId },
    ]
  );

  y = addSectionTitle(doc, y, "PAYMENT DETAILS");
  y = addRawTable(doc, {
    startY: y,
    head: ["Description", "Details"],
    body: [
      ["Installment #", String(data.installmentNumber || "N/A")],
      ["Amount Received", fmtBDT(data.amount)],
      ["Payment Method", (data.paymentMethod || "Cash").charAt(0).toUpperCase() + (data.paymentMethod || "cash").slice(1)],
      ["Payment Date", fmtDate(data.paymentDate)],
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    fontSize: 9,
  });

  y = addBalanceBar(doc, y, "Total Paid", fmtBDT(data.totalPaidSoFar), "Remaining Due", fmtBDT(data.remainingDue));
  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg);
  doc.save(buildFileName("Receipt", receiptNum));
}

// ═══════════════════════════════════════════════════════════════
// 2. MOALLEM PAYMENT RECEIPT
// ═══════════════════════════════════════════════════════════════
export interface MoallemReceiptData {
  moallemName: string;
  moallemPhone?: string | null;
  bookingTrackingId?: string | null;
  packageName?: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  totalDeposit: number;
  totalDue: number;
  notes?: string | null;
}

export async function generateMoallemReceipt(data: MoallemReceiptData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);
  addWatermark(doc, "paid");

  y = addTitleBlock(doc, y, "MOALLEM RECEIPT");

  y = addBillToAndMeta(doc, y,
    [
      { label: "Moallem", value: data.moallemName },
      { label: "Phone", value: data.moallemPhone || "N/A" },
      ...(data.packageName ? [{ label: "Package", value: data.packageName }] : []),
    ],
    [
      { label: "Date", value: fmtDate(data.paymentDate) },
      ...(data.bookingTrackingId ? [{ label: "Booking", value: data.bookingTrackingId }] : []),
    ]
  );

  y = addSectionTitle(doc, y, "PAYMENT DETAILS");
  y = addRawTable(doc, {
    startY: y,
    head: ["Description", "Details"],
    body: [
      ["Amount Received", fmtBDT(data.amount)],
      ["Payment Method", (data.paymentMethod || "Cash").charAt(0).toUpperCase() + (data.paymentMethod || "cash").slice(1)],
      ...(data.bookingTrackingId ? [["Against Booking", data.bookingTrackingId]] : []),
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    fontSize: 9,
  });

  y = addBalanceBar(doc, y, "Total Deposits", fmtBDT(data.totalDeposit), "Outstanding Due", fmtBDT(data.totalDue));
  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg);
  doc.save(buildFileName("Moallem_Receipt", data.moallemName.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 3. SUPPLIER PAYMENT VOUCHER
// ═══════════════════════════════════════════════════════════════
export interface SupplierVoucherData {
  supplierName: string;
  companyName?: string | null;
  supplierPhone?: string | null;
  bookingTrackingId?: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  totalPaid: number;
  totalDue: number;
  notes?: string | null;
}

export async function generateSupplierVoucher(data: SupplierVoucherData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "PAYMENT VOUCHER");

  y = addBillToAndMeta(doc, y,
    [
      { label: "Supplier", value: data.supplierName },
      { label: "Company", value: data.companyName || "N/A" },
      { label: "Phone", value: data.supplierPhone || "N/A" },
    ],
    [
      { label: "Voucher Date", value: fmtDate(data.paymentDate) },
      ...(data.bookingTrackingId ? [{ label: "Booking", value: data.bookingTrackingId }] : []),
    ]
  );

  y = addSectionTitle(doc, y, "PAYMENT DETAILS");
  y = addRawTable(doc, {
    startY: y,
    head: ["Description", "Details"],
    body: [
      ["Amount Paid", fmtBDT(data.amount)],
      ["Payment Method", (data.paymentMethod || "Cash").charAt(0).toUpperCase() + (data.paymentMethod || "cash").slice(1)],
      ...(data.bookingTrackingId ? [["Against Booking", data.bookingTrackingId]] : []),
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    fontSize: 9,
  });

  y = addBalanceBar(doc, y, "Total Paid", fmtBDT(data.totalPaid), "Outstanding Due", fmtBDT(data.totalDue));
  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg);
  doc.save(buildFileName("Voucher_Supplier", data.supplierName.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 4. EXPENSE VOUCHER
// ═══════════════════════════════════════════════════════════════
export interface ExpenseVoucherData {
  title: string;
  category: string;
  amount: number;
  date: string;
  expenseType: string;
  walletName?: string | null;
  bookingTrackingId?: string | null;
  customerName?: string | null;
  notes?: string | null;
}

export async function generateExpenseVoucher(data: ExpenseVoucherData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "EXPENSE VOUCHER");
  y = addMetaLine(doc, y,
    [`Date: ${fmtDate(data.date)}`],
    [`Category: ${data.category}`]
  );

  y = addSectionTitle(doc, y, "EXPENSE DETAILS");
  y = addRawTable(doc, {
    startY: y,
    head: ["Description", "Details"],
    body: [
      ["Title", data.title],
      ["Category", data.category],
      ["Type", data.expenseType],
      ["Amount", fmtBDT(data.amount)],
      ["Date", fmtDate(data.date)],
      ...(data.walletName ? [["Wallet", data.walletName]] : []),
      ...(data.bookingTrackingId ? [["Booking", data.bookingTrackingId]] : []),
      ...(data.customerName ? [["Customer", data.customerName]] : []),
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    fontSize: 9,
  });

  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg);
  doc.save(buildFileName("Expense_Voucher", data.title.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 5. CUSTOMER STATEMENT
// ═══════════════════════════════════════════════════════════════
export interface CustomerStatementData {
  customerName: string;
  customerPhone?: string | null;
  email?: string | null;
  address?: string | null;
  statementPeriod?: string;
  bookings: { trackingId: string; packageName: string; date: string; total: number; paid: number; due: number; status: string }[];
  payments: { date: string; description: string; amount: number; method: string; status: string }[];
  summary: { totalBookings: number; totalAmount: number; totalPaid: number; totalDue: number };
}

export async function generateCustomerStatement(data: CustomerStatementData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "CUSTOMER STATEMENT");

  y = addBillToAndMeta(doc, y,
    [
      { label: "Name", value: data.customerName },
      { label: "Phone", value: data.customerPhone || "N/A" },
      { label: "Email", value: data.email || "N/A" },
      { label: "Address", value: data.address || "N/A" },
    ],
    [
      { label: "Generated", value: fmtDate(new Date().toISOString()) },
      ...(data.statementPeriod ? [{ label: "Period", value: data.statementPeriod }] : []),
    ]
  );

  y = addSummaryCards(doc, y, [
    { label: "Bookings", value: String(data.summary.totalBookings) },
    { label: "Total Amount", value: fmtBDT(data.summary.totalAmount) },
    { label: "Total Paid", value: fmtBDT(data.summary.totalPaid) },
    { label: "Total Due", value: fmtBDT(data.summary.totalDue), highlight: data.summary.totalDue > 0 },
  ]);

  if (data.bookings.length > 0) {
    y = addSectionTitle(doc, y, "BOOKINGS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"],
      body: data.bookings.map(b => [
        b.trackingId, b.packageName, fmtDate(b.date),
        fmtBDT(b.total), fmtBDT(b.paid), fmtBDT(b.due),
        b.status.charAt(0).toUpperCase() + b.status.slice(1),
      ]),
    });
  }

  if (data.payments.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "PAYMENT HISTORY");
    y = addRawTable(doc, {
      startY: y,
      head: ["Date", "Description", "Amount", "Method", "Status"],
      body: data.payments.map(p => [
        fmtDate(p.date), p.description, fmtBDT(p.amount), p.method,
        p.status.charAt(0).toUpperCase() + p.status.slice(1),
      ]),
    });
  }

  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildFileName("Statement", data.customerName.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 6. MOALLEM STATEMENT
// ═══════════════════════════════════════════════════════════════
export interface MoallemStatementData {
  moallemName: string;
  phone?: string | null;
  address?: string | null;
  nidNumber?: string | null;
  bookings: { trackingId: string; guestName: string; packageName: string; total: number; paid: number; due: number; status: string }[];
  deposits: { date: string; amount: number; method: string; notes?: string | null }[];
  commissions: { date: string; amount: number; method: string; notes?: string | null }[];
  summary: { totalBookings: number; totalAmount: number; totalPaid: number; totalDue: number; totalDeposit: number; totalCommission: number; commissionPaid: number; commissionDue: number };
}

export async function generateMoallemStatement(data: MoallemStatementData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "MOALLEM STATEMENT");

  y = addBillToAndMeta(doc, y,
    [
      { label: "Name", value: data.moallemName },
      { label: "Phone", value: data.phone || "N/A" },
      { label: "NID", value: data.nidNumber || "N/A" },
      { label: "Address", value: data.address || "N/A" },
    ],
    [
      { label: "Generated", value: fmtDate(new Date().toISOString()) },
    ]
  );

  y = addSummaryCards(doc, y, [
    { label: "Bookings", value: String(data.summary.totalBookings) },
    { label: "Total Amount", value: fmtBDT(data.summary.totalAmount) },
    { label: "Deposits", value: fmtBDT(data.summary.totalDeposit) },
    { label: "Due", value: fmtBDT(data.summary.totalDue), highlight: data.summary.totalDue > 0 },
  ]);

  y = addTotalsBar(doc, y, [
    `Commission: ${fmtBDT(data.summary.totalCommission)}`,
    `Comm. Paid: ${fmtBDT(data.summary.commissionPaid)}`,
    `Comm. Due: ${fmtBDT(data.summary.commissionDue)}`,
  ]);

  if (data.bookings.length > 0) {
    y = addSectionTitle(doc, y, "BOOKINGS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Tracking ID", "Guest", "Package", "Total", "Paid", "Due", "Status"],
      body: data.bookings.map(b => [
        b.trackingId, b.guestName, b.packageName,
        fmtBDT(b.total), fmtBDT(b.paid), fmtBDT(b.due), b.status,
      ]),
    });
  }

  if (data.deposits.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "MOALLEM DEPOSITS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Date", "Amount", "Method", "Notes"],
      body: data.deposits.map(p => [fmtDate(p.date), fmtBDT(p.amount), p.method, p.notes || "—"]),
    });
  }

  if (data.commissions.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "COMMISSION PAYMENTS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Date", "Amount", "Method", "Notes"],
      body: data.commissions.map(p => [fmtDate(p.date), fmtBDT(p.amount), p.method, p.notes || "—"]),
    });
  }

  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildFileName("Moallem_Statement", data.moallemName.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 7. SUPPLIER STATEMENT
// ═══════════════════════════════════════════════════════════════
export interface SupplierStatementData {
  agentName: string;
  companyName?: string | null;
  phone?: string | null;
  address?: string | null;
  bookings: { trackingId: string; guestName: string; packageName: string; cost: number; paid: number; due: number; status: string }[];
  payments: { date: string; amount: number; method: string; notes?: string | null; category?: string }[];
  contracts?: { contractAmount: number; pilgrimCount: number; totalPaid: number; totalDue: number }[];
  summary: { totalBookings: number; totalBilled: number; totalPaid: number; totalDue: number; contractedHajji: number };
}

export async function generateSupplierStatement(data: SupplierStatementData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "SUPPLIER STATEMENT");

  y = addBillToAndMeta(doc, y,
    [
      { label: "Agent", value: data.agentName },
      { label: "Company", value: data.companyName || "N/A" },
      { label: "Phone", value: data.phone || "N/A" },
      { label: "Address", value: data.address || "N/A" },
    ],
    [
      { label: "Generated", value: fmtDate(new Date().toISOString()) },
    ]
  );

  y = addSummaryCards(doc, y, [
    { label: "Contracted Hajji", value: String(data.summary.contractedHajji) },
    { label: "Total Billed", value: fmtBDT(data.summary.totalBilled) },
    { label: "Total Paid", value: fmtBDT(data.summary.totalPaid) },
    { label: "Outstanding", value: fmtBDT(data.summary.totalDue), highlight: data.summary.totalDue > 0 },
  ]);

  if (data.bookings.length > 0) {
    y = addSectionTitle(doc, y, "BOOKINGS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Tracking ID", "Guest", "Package", "Cost", "Paid", "Due", "Status"],
      body: data.bookings.map(b => [
        b.trackingId, b.guestName, b.packageName,
        fmtBDT(b.cost), fmtBDT(b.paid), fmtBDT(b.due), b.status,
      ]),
    });
  }

  if (data.payments.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "PAYMENT HISTORY");
    y = addRawTable(doc, {
      startY: y,
      head: ["Date", "Category", "Amount", "Method", "Notes"],
      body: data.payments.map(p => [
        fmtDate(p.date), p.category || "Payment", fmtBDT(p.amount), p.method, p.notes || "—",
      ]),
    });
  }

  if (data.contracts && data.contracts.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "CONTRACTS");
    y = addRawTable(doc, {
      startY: y,
      head: ["Pilgrim Count", "Contract Amount", "Paid", "Due"],
      body: data.contracts.map(c => [
        String(c.pilgrimCount), fmtBDT(c.contractAmount), fmtBDT(c.totalPaid), fmtBDT(c.totalDue),
      ]),
    });
  }

  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildFileName("Supplier_Statement", data.agentName.replace(/\s+/g, "_")));
}

// ═══════════════════════════════════════════════════════════════
// 8. DAILY CASHBOOK PDF
// ═══════════════════════════════════════════════════════════════
export interface CashbookPdfData {
  date: string;
  entries: { description: string; category: string; type: "income" | "expense"; amount: number; method?: string; wallet?: string; notes?: string | null }[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export async function generateCashbookPdf(data: CashbookPdfData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "DAILY CASHBOOK");
  y = addMetaLine(doc, y, [`Date: ${fmtDate(data.date)}`], [`Entries: ${data.entries.length}`]);

  y = addSummaryCards(doc, y, [
    { label: "Total Income", value: fmtBDT(data.totalIncome) },
    { label: "Total Expense", value: fmtBDT(data.totalExpense) },
    { label: "Net Balance", value: fmtBDT(data.netBalance), highlight: true },
  ]);

  const incomeEntries = data.entries.filter(e => e.type === "income");
  if (incomeEntries.length > 0) {
    y = addSectionTitle(doc, y, "INCOME");
    y = addRawTable(doc, {
      startY: y,
      head: ["Description", "Category", "Method", "Amount"],
      body: incomeEntries.map(e => [e.description, e.category, e.method || "Cash", fmtBDT(e.amount)]),
      foot: [["", "", "Total Income", fmtBDT(data.totalIncome)]],
      columnStyles: { 3: { halign: "right" } },
    });
  }

  const expenseEntries = data.entries.filter(e => e.type === "expense");
  if (expenseEntries.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "EXPENSES");
    y = addRawTable(doc, {
      startY: y,
      head: ["Description", "Category", "Method", "Amount"],
      body: expenseEntries.map(e => [e.description, e.category, e.method || "Cash", fmtBDT(e.amount)]),
      foot: [["", "", "Total Expense", fmtBDT(data.totalExpense)]],
      columnStyles: { 3: { halign: "right" } },
    });
  }

  y = addBalanceBar(doc, y, "Net Balance", fmtBDT(data.netBalance), "Entries", String(data.entries.length));
  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg);
  doc.save(buildFileName("Cashbook", data.date));
}

// ═══════════════════════════════════════════════════════════════
// 9. SMART REPORT PDF
// ═══════════════════════════════════════════════════════════════
export interface SmartReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summaryCards?: SummaryCard[];
  filters?: FilterItem[];
  summaryLines?: string[];
  orientation?: "portrait" | "landscape";
}

export async function generateSmartReport(data: SmartReportData) {
  const { doc, logoBase64, sig, cfg } = await initPdf({
    orientation: data.orientation || "portrait",
  });

  let y = await addPdfHeader(doc, cfg, logoBase64);
  y = addTitleBlock(doc, y, data.title);

  if (data.filters && data.filters.length > 0) {
    y = addFilterSummary(doc, y, data.filters);
  }

  if (data.summaryCards && data.summaryCards.length > 0) {
    y = addSummaryCards(doc, y, data.summaryCards);
  }

  const fmtCell = (val: string | number) =>
    typeof val === "number" ? fmtBDT(val) : val;

  autoTable(doc, {
    head: [data.columns],
    body: data.rows.map(row => row.map(fmtCell)),
    startY: y,
    showHead: "everyPage",
    styles: { fontSize: 8, cellPadding: 3, font: "NotoSansBengali", lineColor: [220, 220, 220], lineWidth: 0.3 },
    headStyles: { fillColor: [TABLE_HEADER.r, TABLE_HEADER.g, TABLE_HEADER.b], font: "NotoSansBengali", fontStyle: "bold", fontSize: 8, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
    didDrawCell: bengaliCellHook,
  });

  y = (doc as any).lastAutoTable?.finalY + 8 || 50;

  if (data.summaryLines && data.summaryLines.length > 0) {
    y = ensurePageSpace(doc, y, data.summaryLines.length * 8 + 10);
    y = addTotalsBar(doc, y, data.summaryLines, 8 * data.summaryLines.length + 6);
  }

  addPdfFooter(doc, cfg, { showPageNumbers: true });

  const safeName = data.title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
  doc.save(buildFileName(safeName || "report"));
}

// ═══════════════════════════════════════════════════════════════
// 10. FINANCIAL SUMMARY REPORT PDF
// ═══════════════════════════════════════════════════════════════
export interface FinancialSummaryReportData {
  period?: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalSales: number;
  totalDue: number;
  totalCommission: number;
  incomeBreakdown: { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

export async function generateFinancialSummaryReport(data: FinancialSummaryReportData) {
  const { doc, logoBase64, sig, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64);

  y = addTitleBlock(doc, y, "FINANCIAL SUMMARY");
  y = addMetaLine(doc, y,
    [`Generated: ${fmtDate(new Date().toISOString())}`, data.period ? `Period: ${data.period}` : ""],
    []
  );

  y = addSummaryCards(doc, y, [
    { label: "Total Income", value: fmtBDT(data.totalIncome) },
    { label: "Total Expense", value: fmtBDT(data.totalExpense) },
    { label: "Net Profit", value: fmtBDT(data.netProfit), highlight: true },
    { label: "Total Due", value: fmtBDT(data.totalDue), highlight: data.totalDue > 0 },
  ]);

  if (data.incomeBreakdown.length > 0) {
    y = addSectionTitle(doc, y, "INCOME BREAKDOWN");
    y = addRawTable(doc, {
      startY: y,
      head: ["Category", "Amount"],
      body: data.incomeBreakdown.map(i => [i.category, fmtBDT(i.amount)]),
      foot: [["Total Income", fmtBDT(data.totalIncome)]],
      columnStyles: { 1: { halign: "right" } },
    });
  }

  if (data.expenseBreakdown.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    y = addSectionTitle(doc, y, "EXPENSE BREAKDOWN");
    y = addRawTable(doc, {
      startY: y,
      head: ["Category", "Amount"],
      body: data.expenseBreakdown.map(e => [e.category, fmtBDT(e.amount)]),
      foot: [["Total Expense", fmtBDT(data.totalExpense)]],
      columnStyles: { 1: { halign: "right" } },
    });
  }

  y = addTotalsBar(doc, y, [
    `Total Income: ${fmtBDT(data.totalIncome)}`,
    `Total Expense: ${fmtBDT(data.totalExpense)}`,
    `Net Profit: ${fmtBDT(data.netProfit)}`,
  ]);

  y = addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildFileName("Financial_Summary"));
}

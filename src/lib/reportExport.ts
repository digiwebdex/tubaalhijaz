/**
 * reportExport.ts — Report PDF & Excel exports
 * Uses unified pdfCore design system.
 */
import * as XLSX from "xlsx";
import {
  initPdf, addPdfHeader, addPdfFooter, addTitleBlock, addSummaryCards,
  addSectionTitle, addRawTable, addTotalsBar, addSignatureBlock,
  fmtDate, fmtBDT,
  DARK, LIGHT_BG,
  type SummaryCard,
} from "./pdfCore";
import { bengaliCellHook } from "./pdfFontLoader";
import { formatBDT } from "@/lib/utils";
import autoTable from "jspdf-autotable";

// ── Interfaces ──
interface ReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: string[];
}

export interface HajjiReportData {
  title: string;
  customers: {
    name: string;
    phone: string;
    passport: string;
    bookings: number;
    travelers: number;
    revenue: number;
    due: number;
    expenses: number;
    profit: number;
    bookingDetails: {
      trackingId: string;
      packageName: string;
      date: string;
      total: number;
      paid: number;
      due: number;
      status: string;
    }[];
  }[];
}

const buildSafeFileName = (title: string, ext: "pdf" | "xlsx") => {
  const date = new Date().toISOString().slice(0, 10);
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "report"}_${date}.${ext}`;
};

// ═══════════════════════════════════════════════════════════════
// EXPORT PDF (Standard Reports)
// ═══════════════════════════════════════════════════════════════
export async function exportPDF({ title, columns, rows, summary }: ReportData) {
  const { doc, logoBase64, sig, qrDataUrl, cfg } = await initPdf();

  let y = await addPdfHeader(doc, cfg, logoBase64, qrDataUrl);
  y = addTitleBlock(doc, y, title);

  const fmtCell = (val: string | number) =>
    typeof val === "number" ? `BDT ${val.toLocaleString("en-IN")}` : val;

  const formattedRows = rows.map(row => row.map(fmtCell));

  y = addRawTable(doc, {
    startY: y,
    head: columns,
    body: formattedRows,
  });

  // Summary footer
  if (summary && summary.length > 0) {
    y = addTotalsBar(doc, y, summary, 8 * summary.length + 4);
  }

  addSignatureBlock(doc, sig, y);
  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildSafeFileName(title, "pdf"));
}

// ═══════════════════════════════════════════════════════════════
// EXPORT HAJJI PDF (Detailed Customer Reports)
// ═══════════════════════════════════════════════════════════════
export async function exportHajjiPDF({ title, customers }: HajjiReportData) {
  const { doc, logoBase64, sig, qrDataUrl, cfg } = await initPdf({ orientation: "landscape" });
  const pw = doc.internal.pageSize.getWidth();

  let y = await addPdfHeader(doc, cfg, logoBase64, qrDataUrl);
  y = addTitleBlock(doc, y, title);

  // Grand totals summary cards
  const totals = customers.reduce(
    (acc, c) => ({
      bookings: acc.bookings + c.bookings, travelers: acc.travelers + c.travelers,
      revenue: acc.revenue + c.revenue, due: acc.due + c.due,
      expenses: acc.expenses + c.expenses, profit: acc.profit + c.profit,
    }),
    { bookings: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, profit: 0 }
  );

  const cards: SummaryCard[] = [
    { label: "Customers", value: String(customers.length) },
    { label: "Total Revenue", value: fmtBDT(totals.revenue) },
    { label: "Total Due", value: fmtBDT(totals.due), highlight: totals.due > 0 },
    { label: "Net Profit", value: fmtBDT(totals.profit), highlight: true },
  ];
  y = addSummaryCards(doc, y, cards);

  // Each customer
  customers.forEach((c, idx) => {
    const ph = doc.internal.pageSize.getHeight();
    if (y > ph - 60) {
      doc.addPage();
      y = 18;
    }

    // Customer header bar
    y = addTotalsBar(doc, y, [
      `${idx + 1}. ${c.name}`,
      `Phone: ${c.phone}`,
      `Passport: ${c.passport}`,
    ], 10);

    // Customer stats line
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(
      `Bookings: ${c.bookings} | Travelers: ${c.travelers} | Revenue: ${formatBDT(c.revenue)} | Due: ${formatBDT(c.due)} | Expenses: ${formatBDT(c.expenses)} | Profit: ${formatBDT(c.profit)}`,
      18, y - 2
    );
    doc.setTextColor(0);

    if (c.bookingDetails.length > 0) {
      y = addRawTable(doc, {
        startY: y + 2,
        head: ["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"],
        body: c.bookingDetails.map(b => [
          b.trackingId, b.packageName, b.date,
          formatBDT(b.total), formatBDT(b.paid), formatBDT(b.due),
          b.status.charAt(0).toUpperCase() + b.status.slice(1),
        ]),
        fontSize: 7,
      });
    } else {
      y += 6;
    }
  });

  // Grand total bar
  y = addTotalsBar(doc, y, [
    `Grand Total — Customers: ${customers.length}`,
    `Revenue: ${fmtBDT(totals.revenue)}`,
    `Due: ${fmtBDT(totals.due)}`,
    `Profit: ${fmtBDT(totals.profit)}`,
  ]);

  addPdfFooter(doc, cfg, { showPageNumbers: true });
  doc.save(buildSafeFileName(title, "pdf"));
}

// ═══════════════════════════════════════════════════════════════
// EXCEL EXPORTS (unchanged)
// ═══════════════════════════════════════════════════════════════
export function exportHajjiExcel({ title, customers }: HajjiReportData) {
  const rows: (string | number)[][] = [];
  rows.push(["Customer", "Phone", "Passport", "Bookings", "Travelers", "Revenue", "Due", "Expenses", "Profit"]);
  customers.forEach((c) => {
    rows.push([c.name, c.phone, c.passport, c.bookings, c.travelers, c.revenue, c.due, c.expenses, c.profit]);
  });
  rows.push([]);
  rows.push(["=== BOOKING DETAILS ==="]);
  rows.push([]);
  customers.forEach((c) => {
    rows.push([`Customer: ${c.name} (${c.phone})`]);
    rows.push(["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]);
    c.bookingDetails.forEach((b) => {
      rows.push([b.trackingId, b.packageName, b.date, b.total, b.paid, b.due, b.status]);
    });
    rows.push([]);
  });
  rows.push([]);
  rows.push(["TUBA ALHIJAZ"]);
  rows.push(["Phone: +880 1711-925400 | Email: info@triptastic.com.bd"]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, buildSafeFileName(title, "xlsx"));
}

export function exportExcel({ title, columns, rows, summary }: ReportData) {
  const wsData = [columns, ...rows];
  if (summary && summary.length > 0) {
    wsData.push([]);
    summary.forEach(line => wsData.push([line]));
  }
  wsData.push([]);
  wsData.push(["TUBA ALHIJAZ"]);
  wsData.push(["Phone: +880 1711-925400 | Email: info@triptastic.com.bd"]);
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, buildSafeFileName(title, "xlsx"));
}

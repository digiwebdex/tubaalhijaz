/**
 * pdfCore.ts — Unified PDF Design System for TUBA ALHIJAZ
 * 
 * Clean, professional A4 design matching the company invoice template.
 * Large logo header, clean typography, dark footer bar with contact info.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import logoImg from "@/assets/logo-pdf.png";
import { getSignatureData, type SignatureData } from "./pdfSignature";
import { registerBengaliFont, addBengaliText, hasBengali, bengaliCellHook } from "./pdfFontLoader";
import { getPdfCompanyConfig, type PdfCompanyConfig } from "./pdfCompanyConfig";
import { formatBDT, formatAmount } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// BRAND CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const BRAND_ORANGE = { r: 243, g: 146, b: 55 }; // Logo orange
export const DARK = { r: 51, g: 51, b: 51 };
export const DARK_BG = { r: 55, g: 55, b: 55 }; // Footer bar
export const LIGHT_BG = { r: 248, g: 248, b: 248 };
export const MUTED = { r: 120, g: 120, b: 120 };
export const TABLE_HEADER = { r: 50, g: 50, b: 50 }; // Dark black table header matching sample
export const BEIGE_BG = { r: 245, g: 235, b: 220 }; // Beige background for financial summary
export const WHITE = { r: 255, g: 255, b: 255 };

// Legacy aliases
export const GOLD = BRAND_ORANGE;
export const ORANGE = BRAND_ORANGE;

export const FOOTER_HEIGHT = 42;
const CONTENT_BOTTOM_PADDING = 4;
const CONTINUATION_START_Y = 18;
const MARGIN = 16;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtAmount = (value: number) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export const fmtBDT = (value: number) => `BDT ${fmtAmount(value)}`;

export function getContentBottomY(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - FOOTER_HEIGHT - CONTENT_BOTTOM_PADDING;
}

export function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number, nextPageStartY = CONTINUATION_START_Y): number {
  if (y + requiredHeight <= getContentBottomY(doc)) return y;
  doc.addPage();
  return nextPageStartY;
}

export function getPageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

export function getPageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

// ═══════════════════════════════════════════════════════════════
// LOGO LOADING
// ═══════════════════════════════════════════════════════════════
let _logoCache: string | null = null;

export function loadLogoBase64(): Promise<string> {
  if (_logoCache) return Promise.resolve(_logoCache);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      _logoCache = canvas.toDataURL("image/png");
      resolve(_logoCache);
    };
    img.onerror = () => resolve("");
    img.src = logoImg;
  });
}

// ═══════════════════════════════════════════════════════════════
// QR CODE
// ═══════════════════════════════════════════════════════════════
export async function generateCompanyQr(url?: string): Promise<string> {
  const cfg = await getPdfCompanyConfig();
  try {
    return await QRCode.toDataURL(url || cfg.website, {
      width: 200, margin: 1,
      color: { dark: "#333333", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  } catch { return ""; }
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT INIT
// ═══════════════════════════════════════════════════════════════
export interface PdfInitResult {
  doc: jsPDF;
  logoBase64: string;
  sig: SignatureData;
  qrDataUrl: string;
  cfg: PdfCompanyConfig;
}

export async function initPdf(options?: { orientation?: "portrait" | "landscape"; qrUrl?: string }): Promise<PdfInitResult> {
  const doc = new jsPDF({ orientation: options?.orientation || "portrait", unit: "mm", format: "a4" });
  await registerBengaliFont(doc);
  const [logoBase64, sig, qrDataUrl, cfg] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    generateCompanyQr(options?.qrUrl),
    getPdfCompanyConfig(),
  ]);
  return { doc, logoBase64, sig, qrDataUrl, cfg };
}

// ═══════════════════════════════════════════════════════════════
// HEADER — Logo (top-left) + Orange rounded QR tab (top-right)
// Matches sample design: tab hangs from top edge with rounded bottom
// ═══════════════════════════════════════════════════════════════
export async function addPdfHeader(
  doc: jsPDF, cfg: PdfCompanyConfig, logoBase64: string, qrDataUrl?: string
): Promise<number> {
  const pw = getPageWidth(doc);

  // ── Logo — top left, shifted down & right for breathing room ──
  if (logoBase64) {
    try {
      const imageProps = doc.getImageProperties(logoBase64);
      const aspectRatio = imageProps.width / Math.max(imageProps.height, 1);
      const logoW = Math.min(72, 50 * aspectRatio);
      const logoH = logoW / Math.max(aspectRatio, 0.01);
      doc.addImage(logoBase64, "PNG", 6, 6, logoW, logoH);
    } catch { /* skip */ }
  }

  // ── Orange QR tab — top right, hanging from top edge ──
  // Width ~30mm, height ~42mm, rounded only on bottom (approximated with full rounded rect from y=-6)
  const tabW = 32;
  const tabH = 44;
  const tabX = pw - MARGIN - tabW - 10;
  const tabY = -8; // extends above page edge so only bottom shows rounded
  doc.setFillColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
  doc.roundedRect(tabX, tabY, tabW, tabH, 6, 6, "F");

  // QR code or "QR Code" text inside the tab
  if (qrDataUrl) {
    try {
      const qrSize = 22;
      const qrX = tabX + (tabW - qrSize) / 2;
      const qrY = tabY + tabH - qrSize - 4;
      // White background behind QR for contrast
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, "F");
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      // Fallback: render "QR Code" text centered
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("QR", tabX + tabW / 2, tabY + tabH - 16, { align: "center" });
      doc.text("Code", tabX + tabW / 2, tabY + tabH - 8, { align: "center" });
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("QR", tabX + tabW / 2, tabY + tabH - 16, { align: "center" });
    doc.text("Code", tabX + tabW / 2, tabY + tabH - 8, { align: "center" });
  }

  doc.setTextColor(0);
  doc.setFontSize(10);

  return 50; // Content starts below header
}

// ═══════════════════════════════════════════════════════════════
// FOOTER — Dark bar with contact info + Thank You
// ═══════════════════════════════════════════════════════════════
export function addPdfFooter(doc: jsPDF, cfg: PdfCompanyConfig, options?: { showPageNumbers?: boolean }) {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pw = getPageWidth(doc);
    const ph = getPageHeight(doc);

    const barY = ph - FOOTER_HEIGHT;
    const barH = FOOTER_HEIGHT;

    // ORANGE footer bar (matching sample design)
    doc.setFillColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
    doc.rect(0, barY, pw, barH, "F");

    // ── Helper: draw a small glyph (phone/envelope/globe) inside a white circle ──
    const drawIconCircle = (
      cx: number, cy: number, r: number,
      glyph: "phone" | "email" | "web"
    ) => {
      // White circle background
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, r, "F");

      // Orange glyph on top
      doc.setDrawColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
      doc.setFillColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
      doc.setLineWidth(0.35);

      if (glyph === "phone") {
        const w = r * 0.9, h = r * 1.4;
        doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 0.5, 0.5, "F");
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy - h / 2 + 0.5, 0.25, "F");
        doc.setFillColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
      } else if (glyph === "email") {
        const w = r * 1.6, h = r * 1.1;
        doc.setLineWidth(0.4);
        doc.rect(cx - w / 2, cy - h / 2, w, h, "S");
        doc.line(cx - w / 2, cy - h / 2, cx, cy + h / 6);
        doc.line(cx + w / 2, cy - h / 2, cx, cy + h / 6);
      } else if (glyph === "web") {
        doc.setLineWidth(0.35);
        doc.circle(cx, cy, r * 0.75, "S");
        doc.line(cx, cy - r * 0.75, cx, cy + r * 0.75);
        doc.line(cx - r * 0.75, cy, cx + r * 0.75, cy);
        doc.ellipse(cx, cy, r * 0.35, r * 0.75, "S");
      }
      doc.setLineWidth(0.2);
    };

    // Phone number - left side with phone icon
    drawIconCircle(MARGIN + 3, barY + 13, 2.5, "phone");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(cfg.phone, MARGIN + 9, barY + 14);

    // Email & website - center with envelope + globe icons
    const centerX = pw / 2 - 5;
    drawIconCircle(centerX - 5, barY + 8.5, 2, "email");
    drawIconCircle(centerX - 5, barY + 14.5, 2, "web");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(255);
    doc.text(cfg.email || "info@triptastic.com.bd", centerX, barY + 10);
    doc.text("triptastic.com.bd", centerX, barY + 16);

    // Thank You — right side
    doc.setFontSize(16);
    doc.setFont("helvetica", "bolditalic");
    doc.setTextColor(255);
    doc.text("Thank You", pw - MARGIN - 4, barY + 10, { align: "right" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("Stay With TUBA ALHIJAZ", pw - MARGIN - 4, barY + 17, { align: "right" });


    // Page numbers
    if (options?.showPageNumbers !== false && totalPages > 1) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200);
      doc.text(`Page ${i} of ${totalPages}`, pw - MARGIN - 4, barY + 22, { align: "right" });
    }

    // Address line — full corporate address, centered at bottom of footer bar
    if (cfg.address) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);
      const addressLines = doc.splitTextToSize(cfg.address, pw - 16);
      const linesToShow = addressLines.slice(0, 2);
      const startY = barY + barH - 4 - (linesToShow.length - 1) * 3.2;
      linesToShow.forEach((line: string, idx: number) => {
        doc.text(line, pw / 2, startY + idx * 3.2, { align: "center" });
      });
    }

    doc.setTextColor(0);
  }
}

// ═══════════════════════════════════════════════════════════════
// SIGNATURE BLOCK — Clean lines matching sample
// ═══════════════════════════════════════════════════════════════
export function addSignatureBlock(doc: jsPDF, sig: SignatureData, y: number): number {
  const pw = getPageWidth(doc);
  let lineY = ensurePageSpace(doc, y + 10, 20, 44);
  if (lineY < 44) lineY = 44;

  const leftLineStart = MARGIN;
  const leftLineEnd = MARGIN + 70;
  const rightLineStart = pw - MARGIN - 70;
  const rightLineEnd = pw - MARGIN;
  const rightCenter = (rightLineStart + rightLineEnd) / 2;

  // Signature images above the right line
  if (sig.stamp_base64) {
    try { doc.addImage(sig.stamp_base64, "PNG", rightCenter - 14, lineY - 30, 28, 28); } catch { /* skip */ }
  }
  if (sig.signature_base64) {
    try { doc.addImage(sig.signature_base64, "PNG", rightCenter - 12, lineY - 12, 24, 10); } catch { /* skip */ }
  }

  // Lines
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(leftLineStart, lineY, leftLineEnd, lineY);
  doc.line(rightLineStart, lineY, rightLineEnd, lineY);
  doc.setLineWidth(0.2);

  // Labels
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text("Customer Signature", leftLineStart, lineY + 5);

  if (sig.authorized_name) {
    doc.setFont("helvetica", "bold");
    doc.text(sig.authorized_name, rightCenter, lineY + 5, { align: "center" });
  } else {
    doc.text("TUBA ALHIJAZ", rightCenter, lineY + 5, { align: "center" });
  }

  if (sig.designation) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(sig.designation, rightCenter, lineY + 10, { align: "center" });
  }

  doc.setTextColor(0);
  return lineY + 14;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TITLE — Large bold text (like "INVOICE" in sample)
// ═══════════════════════════════════════════════════════════════
export type StatusType = "completed" | "pending" | "confirmed" | "cancelled" | "processing" | "paid" | "partial" | "due";

const STATUS_COLORS: Record<string, { r: number; g: number; b: number }> = {
  completed: { r: 34, g: 139, b: 34 },
  paid: { r: 34, g: 139, b: 34 },
  pending: { r: 210, g: 140, b: 20 },
  confirmed: { r: 30, g: 100, b: 200 },
  partial: { r: 210, g: 140, b: 20 },
  due: { r: 200, g: 40, b: 40 },
  cancelled: { r: 150, g: 50, b: 50 },
  processing: { r: 100, g: 100, b: 200 },
};

export function addTitleBlock(
  doc: jsPDF, y: number, title: string, status?: string | null
): number {
  // Kept for backwards compatibility (used by reports/profile PDFs).
  // For invoice-style docs, prefer passing { title } to addBillToAndMeta which
  // renders the title on the right column matching the sample design.
  const pw = getPageWidth(doc);
  const upperTitle = title.toUpperCase();

  let fontSize = 38;
  if (upperTitle.length > 10) fontSize = 28;
  if (upperTitle.length > 18) fontSize = 22;
  if (upperTitle.length > 25) fontSize = 18;

  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
  doc.text(upperTitle, pw - MARGIN, y + 4, { align: "right" });

  if (status) {
    const statusKey = status.toLowerCase() as StatusType;
    const sc = STATUS_COLORS[statusKey] || MUTED;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(sc.r, sc.g, sc.b);
    doc.text(`Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`, pw - MARGIN, y + 10, { align: "right" });
  }

  doc.setTextColor(0);
  return y + (status ? 14 : 10);
}

// ═══════════════════════════════════════════════════════════════
// BILL TO + INVOICE TITLE + METADATA — pixel-perfect sample layout
// Left column: orange "BILL TO :" header + stacked label/value pairs
// Right column: huge orange "INVOICE" title + metadata block underneath
// ═══════════════════════════════════════════════════════════════
export function addBillToAndMeta(
  doc: jsPDF, y: number,
  billToFields: { label: string; value: string }[],
  metaFields: { label: string; value: string }[],
  options?: { title?: string }
): number {
  const pw = getPageWidth(doc);
  const leftX = MARGIN;
  const rightColX = pw / 2 + 8;
  const title = (options?.title || "INVOICE").toUpperCase();

  // ── RIGHT: Large orange title (top of right column) ──
  doc.setFontSize(38);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
  doc.text(title, pw - MARGIN, y + 6, { align: "right" });

  // ── LEFT: BILL TO heading ──
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
  doc.text("BILL TO :", leftX, y + 6);

  // ── LEFT: Bill-to fields (label : value) ──
  let fieldY = y + 14;
  doc.setFontSize(10.5);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.setFont("helvetica", "normal");

  // Column-align the colon position
  let maxLabelW = 0;
  billToFields.forEach((f) => {
    const w = doc.getTextWidth(f.label);
    if (w > maxLabelW) maxLabelW = w;
  });
  const colonX = leftX + maxLabelW + 3;

  // Sanitize: replace Bengali Taka (৳) with "BDT" so helvetica renders cleanly
  // (avoids letter-spacing / fallback issues in jsPDF when a single Bengali char appears in Latin text)
  const sanitizeForLatin = (v: string) =>
    (v || "").replace(/৳\s*/g, "BDT ").replace(/[\u0980-\u09FF]/g, "");

  billToFields.forEach((f) => {
    doc.setFont("helvetica", "normal");
    doc.text(f.label, leftX, fieldY);
    doc.text(":", colonX, fieldY);
    const safeVal = sanitizeForLatin(f.value || "N/A") || "N/A";
    doc.text(safeVal, colonX + 3, fieldY);
    fieldY += 6.2;
  });

  // ── RIGHT: Metadata block, sits below the title ──
  let metaY = y + 18;
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);

  let maxMetaLabelW = 0;
  metaFields.forEach((f) => {
    const w = doc.getTextWidth(f.label);
    if (w > maxMetaLabelW) maxMetaLabelW = w;
  });
  const metaColonX = rightColX + maxMetaLabelW + 3;

  metaFields.forEach((f) => {
    const isBold = /travel\s*date/i.test(f.label);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(f.label, rightColX, metaY);
    doc.text(":", metaColonX, metaY);
    doc.text(f.value, metaColonX + 3, metaY);
    metaY += 6.2;
  });

  doc.setTextColor(0);
  return Math.max(fieldY, metaY) + 6;
}

// ═══════════════════════════════════════════════════════════════
// SECTION TITLE (like "SERVICE DETAILS :" in sample)
// ═══════════════════════════════════════════════════════════════
export function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  y = ensurePageSpace(doc, y, 14);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
  doc.text(`${title} :`, MARGIN, y);
  doc.setTextColor(0);
  return y + 6;
}

// ═══════════════════════════════════════════════════════════════
// METADATA LINE (legacy support)
// ═══════════════════════════════════════════════════════════════
export function addMetaLine(doc: jsPDF, y: number, leftItems: string[], rightItems: string[]): number {
  const pw = getPageWidth(doc);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);

  leftItems.filter(Boolean).forEach((t, i) => doc.text(t, MARGIN, y + i * 5.5));
  rightItems.filter(Boolean).forEach((t, i) => doc.text(t, pw / 2 + 10, y + i * 5.5));

  doc.setTextColor(0);
  return y + Math.max(leftItems.filter(Boolean).length, rightItems.filter(Boolean).length) * 5.5 + 4;
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY CARDS (Executive Summary)
// ═══════════════════════════════════════════════════════════════
export interface SummaryCard {
  label: string;
  value: string;
  highlight?: boolean;
}

export function addSummaryCards(doc: jsPDF, y: number, cards: SummaryCard[]): number {
  const pw = getPageWidth(doc);
  const availW = pw - MARGIN * 2;
  const cols = Math.min(cards.length, 4);
  const cardW = (availW - (cols - 1) * 3) / cols;
  const cardH = 16;

  y = ensurePageSpace(doc, y, cardH + 4);

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + 3);
    const cy = y + row * (cardH + 3);

    if (card.highlight) {
      doc.setFillColor(DARK.r, DARK.g, DARK.b);
      doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, "F");
      doc.setTextColor(255);
    } else {
      doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
      doc.setDrawColor(220);
      doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, "FD");
      doc.setTextColor(DARK.r, DARK.g, DARK.b);
    }

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    if (!card.highlight) doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(card.label.toUpperCase(), x + 4, cy + 5.5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (card.highlight) doc.setTextColor(255);
    else doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(card.value, x + 4, cy + 12);
  });

  doc.setTextColor(0);
  const rows = Math.ceil(cards.length / cols);
  return y + rows * (cardH + 3) + 4;
}

// ═══════════════════════════════════════════════════════════════
// FILTER SUMMARY
// ═══════════════════════════════════════════════════════════════
export interface FilterItem {
  label: string;
  value: string;
}

export function addFilterSummary(doc: jsPDF, y: number, filters: FilterItem[]): number {
  const activeFilters = filters.filter(f => f.value && f.value !== "All" && f.value !== "all");
  if (activeFilters.length === 0) return y;

  const pw = getPageWidth(doc);
  y = ensurePageSpace(doc, y, 12);

  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.setDrawColor(220);

  const boxH = 6 + Math.ceil(activeFilters.length / 3) * 5;
  doc.roundedRect(MARGIN, y, pw - MARGIN * 2, boxH, 1, 1, "FD");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("APPLIED FILTERS:", MARGIN + 4, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const colW = (pw - MARGIN * 2 - 8) / 3;
  activeFilters.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    doc.setTextColor(80);
    doc.text(`${f.label}: ${f.value}`, MARGIN + 4 + col * colW, y + 9 + row * 5);
  });

  doc.setTextColor(0);
  return y + boxH + 4;
}

// ═══════════════════════════════════════════════════════════════
// INFO BOX (for entity profiles — clean, no border like sample)
// ═══════════════════════════════════════════════════════════════
export interface InfoField {
  label: string;
  value: string;
}

export async function addInfoBox(doc: jsPDF, y: number, fields: InfoField[], title?: string): Promise<number> {
  const pw = getPageWidth(doc);
  const rowH = 6;
  const rows = Math.ceil(fields.length / 2);
  const totalH = (title ? 12 : 0) + rows * rowH + 4;

  y = ensurePageSpace(doc, y, totalH);

  const col1 = MARGIN;
  const col2 = pw / 2 + 5;
  let row = y;

  // Title in orange bold — matches BILL TO style
  if (title) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_ORANGE.r, BRAND_ORANGE.g, BRAND_ORANGE.b);
    doc.text(`${title} :`, col1, row + 4);
    row += 12;
  }

  doc.setFontSize(9.5);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const col = i % 2 === 0 ? col1 : col2;
    if (i > 0 && i % 2 === 0) row += rowH;

    doc.setFont("helvetica", "normal");
    const label = f.label;
    doc.text(label, col, row);
    const labelW = doc.getTextWidth(label);
    
    const val = f.value || "N/A";
    const maxValW = (i % 2 === 0 ? col2 - col - labelW - 8 : pw - MARGIN - col - labelW - 4);
    const truncatedVal = val.length > 40 ? val.substring(0, 40) + "..." : val;

    if (hasBengali(val)) {
      const displayVal = val.length > 35 ? val.substring(0, 35) + "..." : val;
      await addBengaliText(doc, `: ${displayVal}`, col + labelW + 1, row, { fontSize: 9.5, maxWidth: maxValW });
    } else {
      doc.text(`: ${truncatedVal}`, col + labelW + 1, row);
    }
  }

  doc.setTextColor(0);
  return y + totalH + 2;
}

// ═══════════════════════════════════════════════════════════════
// FINANCIAL SUMMARY (right-aligned like sample)
// ═══════════════════════════════════════════════════════════════
export function addFinancialBox(
  doc: jsPDF, y: number,
  items: { label: string; value: string; bold?: boolean }[],
  options?: { width?: number; align?: "left" | "right" }
): number {
  const pw = getPageWidth(doc);
  const boxW = options?.width || 100;
  const boxX = options?.align === "left" ? MARGIN : pw - MARGIN - boxW;

  y = ensurePageSpace(doc, y, items.length * 7 + 12);

  // Beige/tan background box matching sample
  const boxH = items.length * 7 + 8;
  doc.setFillColor(245, 235, 220);
  doc.roundedRect(boxX, y - 2, boxW, boxH, 1.5, 1.5, "F");

  let iy = y + 4;
  doc.setFontSize(9.5);

  items.forEach((item, idx) => {
    doc.setFont("helvetica", item.bold ? "bold" : "normal");
    doc.setTextColor(item.bold ? DARK.r : 80, item.bold ? DARK.g : 80, item.bold ? DARK.b : 80);
    doc.text(`${item.label} :`, boxX + 6, iy);
    doc.text(item.value, boxX + boxW - 6, iy, { align: "right" });

    // Separator line after Net Total (3rd item typically)
    if (idx === 2 && items.length > 3) {
      doc.setDrawColor(210, 200, 180);
      doc.setLineWidth(0.3);
      doc.line(boxX + 6, iy + 3, boxX + boxW - 6, iy + 3);
      doc.setLineWidth(0.2);
      iy += 4;
    }

    iy += 7;
  });

  doc.setTextColor(0);
  return iy + 4;
}

// ═══════════════════════════════════════════════════════════════
// TOTALS BAR (dark bar with key-value pairs)
// ═══════════════════════════════════════════════════════════════
export function addTotalsBar(doc: jsPDF, y: number, items: string[], height = 12): number {
  const pw = getPageWidth(doc);
  y = ensurePageSpace(doc, y, height + 4);

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(MARGIN, y, pw - MARGIN * 2, height, 1.5, 1.5, "F");

  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  if (items.length === 1) {
    doc.text(items[0], MARGIN + 6, y + height / 2 + 2);
  } else {
    const spacing = (pw - MARGIN * 2 - 12) / items.length;
    items.forEach((item, i) => {
      doc.text(item, MARGIN + 6 + i * spacing, y + height / 2 + 2);
    });
  }

  doc.setTextColor(0);
  return y + height + 6;
}

// ═══════════════════════════════════════════════════════════════
// WATERMARK
// ═══════════════════════════════════════════════════════════════
export type WatermarkStatus = "paid" | "partial" | "due";

export function getWatermarkStatus(paidAmount: number, dueAmount: number): WatermarkStatus {
  if (dueAmount <= 0) return "paid";
  if (paidAmount > 0 && dueAmount > 0) return "partial";
  return "due";
}

export function addWatermark(doc: jsPDF, status: WatermarkStatus) {
  const pw = getPageWidth(doc);
  const ph = getPageHeight(doc);

  const config: Record<WatermarkStatus, { text: string; r: number; g: number; b: number }> = {
    paid: { text: "PAID", r: 34, g: 139, b: 34 },
    partial: { text: "PARTIAL", r: 210, g: 140, b: 20 },
    due: { text: "DUE", r: 200, g: 40, b: 40 },
  };

  const { text, r, g, b } = config[status];

  doc.saveGraphicsState();
  const gState = new (doc as any).GState({ opacity: 0.08 });
  doc.setGState(gState);
  doc.setTextColor(r, g, b);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.text(text, pw / 2, ph / 2, { align: "center", angle: 35 });
  doc.restoreGraphicsState();
  doc.setTextColor(0);
}

// ═══════════════════════════════════════════════════════════════
// STANDARD TABLE with autoTable — clean dark header
// ═══════════════════════════════════════════════════════════════
export interface PdfTableOptions {
  startY: number;
  head: string[];
  body: (string | number)[][];
  foot?: (string | number)[][];
  columnStyles?: Record<number, any>;
  showHead?: "everyPage" | "firstPage" | "never";
  fontSize?: number;
  margin?: { left?: number; right?: number };
  didParseCell?: (data: any) => void;
}

const getTableCellText = (data: any): string => {
  if (Array.isArray(data?.cell?.text) && data.cell.text.length > 0) {
    return data.cell.text.join(" ");
  }
  if (Array.isArray(data?.cell?.raw)) {
    return data.cell.raw.join(" ");
  }
  return String(data?.cell?.raw ?? "");
};

const buildDidParseCell = (callback?: (data: any) => void) => (data: any) => {
  const cellText = getTableCellText(data);
  data.cell.styles.font = hasBengali(cellText) ? "NotoSansBengali" : "helvetica";

  if (data.section === "head") {
    data.cell.styles.font = "helvetica";
    data.cell.styles.fontStyle = "bold";
  }
  if (data.section === "foot") {
    data.cell.styles.fontStyle = "bold";
  }
  callback?.(data);
};

export function addTable(doc: jsPDF, options: PdfTableOptions): number {
  autoTable(doc, {
    startY: options.startY,
    head: [options.head],
    body: options.body.map(row => row.map(cell =>
      typeof cell === "number" ? fmtBDT(cell) : cell
    )),
    foot: options.foot ? options.foot.map(row => row.map(cell =>
      typeof cell === "number" ? fmtBDT(cell) : cell
    )) : undefined,
    showHead: options.showHead || "everyPage",
    styles: {
      fontSize: options.fontSize || 8,
      cellPadding: 3,
      font: "helvetica",
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [TABLE_HEADER.r, TABLE_HEADER.g, TABLE_HEADER.b],
      textColor: [255, 255, 255],
      fontSize: options.fontSize || 8,
      font: "helvetica",
      fontStyle: "bold",
      cellPadding: 3.5,
    },
    footStyles: {
      fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b],
      textColor: [DARK.r, DARK.g, DARK.b],
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: options.columnStyles || {},
    margin: { left: options.margin?.left || MARGIN, right: options.margin?.right || MARGIN },
    didParseCell: buildDidParseCell(options.didParseCell),
    didDrawCell: bengaliCellHook,
  });

  return ((doc as any).lastAutoTable?.finalY || options.startY + 20) + 6;
}

// ═══════════════════════════════════════════════════════════════
// RAW TABLE (no BDT formatting, raw strings passed as-is)
// ═══════════════════════════════════════════════════════════════
export function addRawTable(doc: jsPDF, options: PdfTableOptions): number {
  autoTable(doc, {
    startY: options.startY,
    head: [options.head],
    body: options.body,
    foot: options.foot,
    showHead: options.showHead || "everyPage",
    styles: {
      fontSize: options.fontSize || 8,
      cellPadding: 3,
      font: "helvetica",
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [TABLE_HEADER.r, TABLE_HEADER.g, TABLE_HEADER.b],
      textColor: [255, 255, 255],
      fontSize: options.fontSize || 8,
      font: "helvetica",
      fontStyle: "bold",
      cellPadding: 3.5,
    },
    footStyles: {
      fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b],
      textColor: [DARK.r, DARK.g, DARK.b],
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: options.columnStyles || {},
    margin: { left: options.margin?.left || MARGIN, right: options.margin?.right || MARGIN },
    didParseCell: buildDidParseCell(options.didParseCell),
    didDrawCell: bengaliCellHook,
  });

  return ((doc as any).lastAutoTable?.finalY || options.startY + 20) + 6;
}

// ═══════════════════════════════════════════════════════════════
// DUE HIGHLIGHT BAR
// ═══════════════════════════════════════════════════════════════
export function addDueHighlight(doc: jsPDF, y: number, dueAmount: number): number {
  if (dueAmount <= 0) return y;

  const pw = getPageWidth(doc);
  const boxW = 80;
  const boxX = pw - MARGIN - boxW;

  doc.setFillColor(255, 240, 230);
  doc.setDrawColor(220, 120, 20);
  doc.roundedRect(boxX, y, boxW, 8, 1, 1, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 80, 0);
  doc.text(`Outstanding Balance: ${fmtBDT(dueAmount)}`, boxX + boxW / 2, y + 5, { align: "center" });
  doc.setTextColor(0);

  return y + 12;
}

// ═══════════════════════════════════════════════════════════════
// BALANCE BAR (dark summary bar)
// ═══════════════════════════════════════════════════════════════
export function addBalanceBar(doc: jsPDF, y: number, leftLabel: string, leftValue: string, rightLabel: string, rightValue: string): number {
  const pw = getPageWidth(doc);
  y = ensurePageSpace(doc, y, 18);

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(MARGIN, y, pw - MARGIN * 2, 14, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${leftLabel}: ${leftValue}`, MARGIN + 6, y + 9);
  doc.text(`${rightLabel}: ${rightValue}`, pw - MARGIN - 6, y + 9, { align: "right" });
  doc.setTextColor(0);

  return y + 22;
}

// ═══════════════════════════════════════════════════════════════
// SAFE FILENAME
// ═══════════════════════════════════════════════════════════════
export function buildFileName(prefix: string, id?: string, ext = "pdf"): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = (id || "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  return `${prefix}${safe ? `_${safe}` : ""}_${date}.${ext}`;
}

// Re-exports for convenience
export { registerBengaliFont, addBengaliText, hasBengali, bengaliCellHook };
export { formatBDT, formatAmount };
export type { SignatureData, PdfCompanyConfig };

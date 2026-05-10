import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck, Loader2, FileText, Calendar, Users, Package as PackageIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatBDT } from "@/lib/utils";

interface VerifiedBooking {
  id: string;
  tracking_id: string;
  status: string;
  guest_name: string | null;
  num_travelers: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number | null;
  created_at: string;
  travel_date: string | null;
  package_name: string | null;
  package_type: string | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function VerifyInvoice() {
  const { invoiceNumber, trackingId } = useParams() as { invoiceNumber?: string; trackingId?: string };
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const { t } = useLanguage();

  const [booking, setBooking] = useState<VerifiedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<"verified" | "invalid" | "revoked" | "expired" | null>(null);

  useEffect(() => {
    const tid = (trackingId || queryId || invoiceNumber || "").trim();
    if (!tid) {
      setScanResult("invalid");
      setLoading(false);
      return;
    }
    const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    fetch(`${apiBase}/verify/${encodeURIComponent(tid)}`)
      .then((r) => r.json())
      .then((data) => {
        setScanResult(data?.scan_result || "invalid");
        if (data?.verified && data?.booking) setBooking(data.booking);
      })
      .catch(() => setScanResult("invalid"))
      .finally(() => setLoading(false));
  }, [invoiceNumber, queryId, trackingId]);

  const isValid = scanResult === "verified" && booking;
  const paymentStatus = booking
    ? Number(booking.due_amount || 0) <= 0
      ? "PAID"
      : Number(booking.paid_amount) > 0
      ? "PARTIAL"
      : "DUE"
    : "";

  const statusBadge =
    paymentStatus === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : paymentStatus === "PARTIAL"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1729] via-[#1a2238] to-[#0b1729] p-4 flex items-center justify-center">
      <div className="w-full max-w-xl">
        {/* Header brand bar */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-amber-300/30 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            <span className="text-amber-100 text-xs tracking-widest uppercase font-semibold">Document Verification</span>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white shadow-2xl p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-slate-500">{t("verify.verifying") || "Verifying..."}</p>
          </div>
        )}

        {!loading && !isValid && (
          <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
              <XCircle className="h-20 w-20 text-white mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-white tracking-wide">INVALID DOCUMENT</h1>
              <p className="text-red-100 text-sm mt-2 capitalize">
                {scanResult === "revoked" && "This document has been revoked"}
                {scanResult === "expired" && "This document has expired"}
                {(scanResult === "invalid" || !scanResult) && "Document not found or tampered"}
              </p>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">
                If you believe this is an error, please contact our support team.
              </p>
            </div>
          </div>
        )}

        {!loading && isValid && booking && (
          <div className="rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-200/50">
            {/* Verified header — gold gradient */}
            <div className="relative bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#b8860b] p-8 text-center">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_white,_transparent_70%)]" />
              <CheckCircle2 className="h-20 w-20 text-white mx-auto mb-3 drop-shadow-lg" />
              <h1 className="text-2xl font-bold text-white tracking-widest">VERIFIED</h1>
              <p className="text-amber-50 text-sm mt-2">Authentic document issued by Tuba Al Hijaz</p>
            </div>

            {/* Customer block */}
            <div className="p-6 border-b border-slate-100">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Pilgrim Name</p>
              <h2 className="text-2xl font-bold text-slate-900">{booking.guest_name || "—"}</h2>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
                  {booking.tracking_id}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-md border ${statusBadge}`}>
                  {paymentStatus}
                </span>
              </div>
            </div>

            {/* Detail grid */}
            <div className="p-6 grid grid-cols-2 gap-5">
              <Field icon={<PackageIcon className="h-4 w-4" />} label="Package" value={booking.package_name || "—"} />
              <Field icon={<FileText className="h-4 w-4" />} label="Type" value={booking.package_type || "—"} />
              <Field icon={<Users className="h-4 w-4" />} label="Travelers" value={String(booking.num_travelers)} />
              <Field icon={<Calendar className="h-4 w-4" />} label="Travel Date" value={fmtDate(booking.travel_date)} />
              <Field icon={<Calendar className="h-4 w-4" />} label="Issued" value={fmtDate(booking.created_at)} />
              <Field icon={<ShieldCheck className="h-4 w-4" />} label="Booking Status" value={booking.status} />
            </div>

            {/* Financial summary */}
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-2">
                <Row label="Total Amount" value={formatBDT(booking.total_amount)} bold />
                <Row label="Paid" value={formatBDT(booking.paid_amount)} className="text-emerald-700" />
                <Row
                  label="Due"
                  value={formatBDT(Math.max(0, Number(booking.due_amount || 0)))}
                  className={Number(booking.due_amount || 0) > 0 ? "text-red-600" : "text-emerald-700"}
                  bold
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t px-6 py-4 text-center">
              <p className="text-xs text-slate-500 font-semibold">Tuba Al Hijaz · Saudi Umrah Operations</p>
              <p className="text-xs text-slate-400 mt-1">+880 1711-925400 · info@tubaalhijaz.com</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Row({ label, value, bold, className = "" }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={`text-slate-600 ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${bold ? "font-bold text-base" : "font-medium"} ${className}`}>{value}</span>
    </div>
  );
}

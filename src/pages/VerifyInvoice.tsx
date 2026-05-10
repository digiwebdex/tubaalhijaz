import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import { generateVerificationId } from "@/lib/pdfQrCode";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatBDT } from "@/lib/utils";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface VerifiedBooking {
  tracking_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number | null;
  status: string;
  created_at: string;
  num_travelers: number;
  guest_name: string | null;
  packages: { name: string; type?: string } | null;
}

export default function VerifyInvoice() {
  const { invoiceNumber } = useParams();
  const [searchParams] = useSearchParams();
  const trackingFromQuery = searchParams.get("id");
  const { t } = useLanguage();

  const [booking, setBooking] = useState<VerifiedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      setNotFound(false);

      const trackingId = trackingFromQuery || "";

      if (!trackingId && !invoiceNumber) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (trackingId) {
        try {
          const { data, error } = await apiClient.functions.invoke("verify-invoice", {
            body: { tracking_id: trackingId },
          });

          if (error || !data?.booking) {
            setNotFound(true);
          } else {
            setBooking(data.booking as VerifiedBooking);
          }
        } catch {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      if (invoiceNumber) {
        try {
          const { data } = await apiClient.functions.invoke("verify-invoice", {
            body: { tracking_id: invoiceNumber },
          });

          if (data?.booking) {
            setBooking(data.booking as VerifiedBooking);
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
        setNotFound(true);
        setLoading(false);
      }
    };

    verify();
  }, [invoiceNumber, trackingFromQuery]);

  const paymentStatus = booking
    ? Number(booking.due_amount || 0) <= 0
      ? "PAID"
      : Number(booking.paid_amount) > 0
      ? "PARTIAL"
      : "DUE"
    : "";

  const statusColor =
    paymentStatus === "PAID"
      ? "text-green-600"
      : paymentStatus === "PARTIAL"
      ? "text-orange-500"
      : "text-red-500";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-500">{t("verify.verifying")}</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("verify.notFoundTitle")}</h1>
            <p className="text-gray-500">{t("verify.notFoundDesc")}</p>
            {invoiceNumber && (
              <p className="text-sm text-gray-400 mt-4 font-mono">{invoiceNumber}</p>
            )}
          </div>
        )}

        {!loading && booking && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 p-6 text-center">
              <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-green-800">{t("verify.verified")}</h1>
              <p className="text-sm text-green-600 mt-1">{t("verify.verifiedDesc")}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">{t("verify.details")}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label={t("verify.invoiceNo")} value={generateVerificationId(booking.tracking_id)} />
                <Detail label={t("verify.bookingId")} value={booking.tracking_id} />
                <Detail label={t("verify.customer")} value={booking.guest_name || "N/A"} />
                <Detail label={t("verify.package")} value={booking.packages?.name || "N/A"} />
                <Detail label={t("verify.packageType")} value={booking.packages?.type || "N/A"} />
                <Detail label={t("verify.travelers")} value={String(booking.num_travelers)} />
                <Detail label={t("verify.issueDate")} value={fmtDate(booking.created_at)} />
                <Detail
                  label={t("verify.status")}
                  value={paymentStatus}
                  valueClass={`font-bold ${statusColor}`}
                />
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                <FinRow label={t("verify.totalAmount")} value={formatBDT(booking.total_amount)} bold />
                <FinRow label={t("verify.paidAmount")} value={formatBDT(booking.paid_amount)} className="text-green-600" />
                <FinRow
                  label={t("verify.dueAmount")}
                  value={formatBDT(Math.max(0, Number(booking.due_amount || 0)))}
                  className={Number(booking.due_amount || 0) > 0 ? "text-red-500" : "text-green-600"}
                  bold
                />
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 text-center">
              <p className="text-xs text-gray-400">{t("verify.companyFooter")}</p>
              <p className="text-xs text-gray-400 mt-1">
                +880 1711-925400 | info@triptastic.com.bd
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-medium text-gray-800 ${valueClass}`}>{value}</p>
    </div>
  );
}

function FinRow({ label, value, bold, className = "" }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={`text-gray-500 ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${className}`}>{value}</span>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { generateInvoice, generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { Printer, Download, Search } from "lucide-react";
import { generateVerificationId } from "@/lib/pdfQrCode";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatBDT } from "@/lib/utils";

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function InvoicePage() {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signatureData, setSignatureData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const company: CompanyInfo = {
    name: "TUBA ALHIJAZ",
    phone: "+880 1711-925400",
    email: "info@triptastic.com.bd",
    address: "Corporate Office: TUBA ALHIJAZ, 4th Floor, Jail Road, Munshipara, Dinajpur Sadar - 5200",
  };
  const companyAddressBn = "কর্পোরেট অফিস: তুবা আলহিজাজ, ৪র্থ তলা, জেল রোড, মুন্সিপাড়া, দিনাজপুর সদর - ৫২০০";

  const search = async () => {
    if (!trackingId.trim()) return;
    setLoading(true);
    setError("");
    setBooking(null);

    const { data: bk, error: bkErr } = await apiClient
      .from("bookings")
      .select("*")
      .eq("tracking_id", trackingId.trim().toUpperCase())
      .single();

    if (bk && bk.package_id) {
      const { data: pkgData } = await apiClient.from("packages").select("name, type, duration_days, start_date, price").eq("id", bk.package_id).maybeSingle();
      if (pkgData) (bk as any).packages = pkgData;
    }

    if (bkErr || !bk) {
      setError(t("invoice.notFound"));
      setLoading(false);
      return;
    }

    const [payRes, profRes, sigRes, moallemRes] = await Promise.all([
      apiClient.from("payments").select("*").eq("booking_id", bk.id).order("installment_number"),
      bk.user_id ? apiClient.from("profiles").select("full_name, phone, passport_number, address, email").eq("user_id", bk.user_id).single() : Promise.resolve({ data: null }),
      apiClient.from("company_settings").select("setting_value").eq("setting_key", "signature").maybeSingle(),
      bk.moallem_id ? apiClient.from("moallems").select("name").eq("id", bk.moallem_id).single() : Promise.resolve({ data: null }),
    ]);

    setBooking(bk);
    setPayments(payRes.data || []);
    setCustomer({
      full_name: profRes.data?.full_name || bk.guest_name,
      phone: profRes.data?.phone || bk.guest_phone,
      passport_number: profRes.data?.passport_number || bk.guest_passport,
      address: profRes.data?.address || bk.guest_address,
      email: profRes.data?.email || bk.guest_email,
      moallem_name: moallemRes.data?.name || null,
    });
    if (sigRes.data?.setting_value) setSignatureData(sigRes.data.setting_value);
    setLoading(false);
  };

  useEffect(() => {
    if (trackingId) search();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = async () => {
    if (!booking || !customer) return;

    const [membersRes] = await Promise.all([
      apiClient.from("booking_members").select("*").eq("booking_id", booking.id).order("created_at", { ascending: true }),
    ]);

    const invoiceBooking = { ...booking };

    if (!invoiceBooking.packages && invoiceBooking.package_id) {
      const { data: pkgData } = await apiClient.from("packages").select("name, type, duration_days, start_date, price").eq("id", invoiceBooking.package_id).maybeSingle();
      if (pkgData) invoiceBooking.packages = pkgData;
    }

    const memberRows = (membersRes.data || []) as any[];

    const memberPkgIds = memberRows.filter((m: any) => m.package_id && !m.packages).map((m: any) => m.package_id);
    if (memberPkgIds.length > 0) {
      const uniqueIds = Array.from(new Set(memberPkgIds));
      const { data: pkgs } = await apiClient.from("packages").select("id, name").in("id", uniqueIds);
      const pkgMap: Record<string, string> = {};
      (pkgs || []).forEach((p: any) => { pkgMap[p.id] = p.name; });
      memberRows.forEach((m: any) => {
        if (m.package_id && pkgMap[m.package_id]) m.packages = { name: pkgMap[m.package_id] };
      });
    }

    const isFamily = String(invoiceBooking.booking_type || "").toLowerCase().includes("family")
      || Number(invoiceBooking.num_travelers || 0) > 1
      || memberRows.length > 0;

    await generateInvoice(
      invoiceBooking,
      customer,
      payments as InvoicePayment[],
      company,
      { members: memberRows, forceFamily: isFamily }
    );
  };

  const handleDownloadReceipt = (payment: any) => {
    if (!booking || !customer) return;
    generateReceipt(payment, booking, customer, company, payments as InvoicePayment[]);
  };

  const totalPaid = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = Number(booking?.total_amount || 0) - totalPaid;

  return (
    <div className="min-h-screen bg-background">
      {/* Search bar - hidden on print */}
      <div className="print:hidden bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-3 items-center">
          <input
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={t("invoice.searchPlaceholder")}
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
          <button onClick={search} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Search className="h-4 w-4" /> {t("invoice.searchButton")}
          </button>
        </div>
      </div>

      {error && <p className="text-center text-destructive py-8 print:hidden">{error}</p>}
      {loading && <p className="text-center text-muted-foreground py-8 print:hidden">{t("invoice.loading")}</p>}

      {booking && customer && (
        <>
          {/* Action buttons - hidden on print */}
          <div className="print:hidden max-w-4xl mx-auto p-4 flex gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary border border-border px-4 py-2 rounded-lg text-sm hover:bg-secondary/80">
              <Printer className="h-4 w-4" /> {t("invoice.print")}
            </button>
            <button onClick={handleDownloadInvoice} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
              <Download className="h-4 w-4" /> {t("invoice.download")}
            </button>
          </div>

          {/* Printable Invoice - A4 format */}
          <div ref={printRef} className="max-w-4xl mx-auto bg-white text-black p-8 print:p-6 print:m-0 print:max-w-none relative overflow-hidden" style={{ fontFamily: "Arial, sans-serif" }}>
            {/* Payment Status Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
              <span
                className="text-7xl font-bold uppercase"
                style={{
                  transform: "rotate(-35deg)",
                  opacity: 0.07,
                  color: totalDue <= 0 ? "#228B22" : totalPaid > 0 ? "#D28C14" : "#C82828",
                }}
              >
                {totalDue <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "DUE"}
              </span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6 relative" style={{ zIndex: 1 }}>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-600">{t("invoice.hajjUmrahServices")}</p>
                <p className="text-xs text-gray-500 mt-1">{company.phone} | {company.email}</p>
                <p className="text-xs text-gray-500" style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}>{companyAddressBn}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{t("invoice.invoiceTitle")}</h2>
                  <p className="text-sm text-gray-600">#{booking.tracking_id}</p>
                  <p className="text-sm text-gray-600">{fmtDate(new Date().toISOString())}</p>
                </div>
                {/* QR Verification Stamp */}
                <div className="border border-gray-700 rounded p-1.5 mt-1 flex flex-col items-center">
                  <p className="text-[7px] font-bold text-green-700 mb-0.5">{t("invoice.verifiedBooking")}</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://triptastic.com.bd/verify/${generateVerificationId(booking.tracking_id)}`)}`}
                    alt="QR Code"
                    className="w-[72px] h-[72px]"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <p className="text-[5.5px] font-bold text-gray-700 mt-0.5">{generateVerificationId(booking.tracking_id)}</p>
                  <p className="text-[6px] text-gray-400 mt-0.5">{t("invoice.scanToVerify")}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">{t("invoice.billTo")}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-500">{t("invoice.name")}</span> {customer.full_name || booking.guest_name || "N/A"}</p>
                <p><span className="text-gray-500">{t("invoice.phone")}</span> {customer.phone || booking.guest_phone || "N/A"}</p>
                <p><span className="text-gray-500">{t("invoice.passport")}</span> {customer.passport_number || booking.guest_passport || "N/A"}</p>
                <p><span className="text-gray-500">{t("invoice.address")}</span> {customer.address || booking.guest_address || "N/A"}</p>
                {(customer.email || booking.guest_email) && (
                  <p><span className="text-gray-500">{t("invoice.email")}</span> {customer.email || booking.guest_email}</p>
                )}
                {customer.moallem_name && (
                  <p><span className="text-gray-500">{t("invoice.moallem")}</span> {customer.moallem_name}</p>
                )}
              </div>
              {booking.notes && (
                <p className="text-sm mt-2"><span className="text-gray-500">{t("track.notes")}:</span> {booking.notes}</p>
              )}
            </div>

            {/* Package Info */}
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">{t("invoice.packageDetails")}</h3>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">{t("track.package")}</span>{booking.packages?.name || "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">{t("invoice.type")}</span>{booking.packages?.type || "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">{t("invoice.duration")}</span>{booking.packages?.duration_days ? `${booking.packages.duration_days} ${t("invoice.days")}` : "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">{t("invoice.travelers")}</span>{booking.num_travelers}</div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">{t("invoice.paymentSchedule")}</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-right">{t("invoice.amount")}</th>
                    <th className="p-2 text-center">{t("invoice.dueDate")}</th>
                    <th className="p-2 text-center">{t("track.status")}</th>
                    <th className="p-2 text-center">{t("invoice.paidDate")}</th>
                    <th className="p-2 text-center">{t("invoice.method")}</th>
                    <th className="p-2 text-center print:hidden">{t("invoice.receipt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-2 border-b border-gray-200">{p.installment_number || "—"}</td>
                      <td className="p-2 border-b border-gray-200 text-right font-medium">৳{Number(p.amount).toLocaleString("en-IN")}</td>
                      <td className="p-2 border-b border-gray-200 text-center">{fmtDate(p.due_date)}</td>
                      <td className="p-2 border-b border-gray-200 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {p.status === "completed" ? t("invoice.paid") : t("invoice.pending")}
                        </span>
                      </td>
                      <td className="p-2 border-b border-gray-200 text-center">{fmtDate(p.paid_at)}</td>
                      <td className="p-2 border-b border-gray-200 text-center capitalize">{p.payment_method || "—"}</td>
                      <td className="p-2 border-b border-gray-200 text-center print:hidden">
                        {p.status === "completed" && (
                          <button onClick={() => handleDownloadReceipt(p)} className="text-blue-600 hover:underline text-xs">PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-400">{t("invoice.noPayments")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-800 text-white rounded-lg p-4 flex justify-between items-center mb-8">
              <div><span className="text-gray-300 text-xs">{t("invoice.totalAmount")}</span><p className="text-lg font-bold">৳{Number(booking.total_amount).toLocaleString("en-IN")}</p></div>
              <div><span className="text-gray-300 text-xs">{t("invoice.totalPaid")}</span><p className="text-lg font-bold text-green-400">৳{totalPaid.toLocaleString("en-IN")}</p></div>
              <div><span className="text-gray-300 text-xs">{t("invoice.balanceDue")}</span><p className="text-lg font-bold text-red-400">৳{Math.max(0, totalDue).toLocaleString("en-IN")}</p></div>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-end mt-16 pt-4">
              <div className="text-center">
                <div className="border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-xs text-gray-500">{t("invoice.customerSignature")}</p>
              </div>
              <div className="text-center">
                {signatureData?.stamp_url && (
                  <img src={signatureData.stamp_url} alt="Stamp" className="max-h-16 object-contain mx-auto mb-1 opacity-70" />
                )}
                {signatureData?.signature_url && (
                  <img src={signatureData.signature_url} alt="Signature" className="max-h-12 object-contain mx-auto mb-1" />
                )}
                <div className="border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-xs text-gray-800 font-semibold">{signatureData?.authorized_name || t("invoice.authorizedSignature")}</p>
                {signatureData?.designation && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{signatureData.designation}</p>
                )}
                {!signatureData?.designation && (
                  <p className="text-[10px] text-gray-400 mt-1">{t("invoice.companySeal")}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-gray-400 mt-8 italic">
              {t("invoice.generatedNote")} {company.phone} | {company.email}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

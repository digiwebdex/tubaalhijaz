import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { formatTrackingId } from "@/lib/utils";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import {
  LogOut, Package, CreditCard, AlertTriangle, User, FileText,
  ChevronDown, ChevronUp, Search, Save, MapPin, Phone, Mail, Settings, Download
} from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import DocumentUpload from "@/components/DocumentUpload";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { generateInvoice, generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { useLanguage } from "@/i18n/LanguageContext";
import { PayOnlineButton } from "@/components/PayOnlineButton";

interface Booking {
  id: string;
  tracking_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  num_travelers: number;
  created_at: string;
  packages: { name: string; type: string } | null;
  installment_plan_id: string | null;
}

interface Payment {
  id: string;
  amount: number;
  installment_number: number | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  booking_id: string;
}

type TabKey = "overview" | "bookings" | "payments" | "due" | "profile";

const Dashboard = () => {
  useSessionTimeout();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [bookingDocs, setBookingDocs] = useState<Record<string, any[]>>({});
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  // Profile editing
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    passport_number: "",
    address: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [profileRes, bookingsRes, paymentsRes, docsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("bookings").select("*, packages(name, type)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("user_id", user.id).order("due_date", { ascending: true }),
      supabase.from("booking_documents").select("*").eq("user_id", user.id),
    ]);
    setProfile(profileRes.data);
    if (profileRes.data) {
      setProfileForm({
        full_name: profileRes.data.full_name || "",
        phone: profileRes.data.phone || "",
        passport_number: profileRes.data.passport_number || "",
        address: profileRes.data.address || "",
      });
    }
    setBookings((bookingsRes.data as any) || []);
    setPayments((paymentsRes.data as any) || []);
    const grouped: Record<string, any[]> = {};
    (docsRes.data || []).forEach((d: any) => {
      if (!grouped[d.booking_id]) grouped[d.booking_id] = [];
      grouped[d.booking_id].push(d);
    });
    setBookingDocs(grouped);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("dashboard.signedOut"));
    navigate("/");
  };

  const handleSaveProfile = async () => {
    if (!profileForm.full_name.trim()) { toast.error(t("dashboard.nameRequired")); return; }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || null,
        passport_number: profileForm.passport_number.trim() || null,
        address: profileForm.address.trim() || null,
      })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { toast.success(t("dashboard.profileUpdated")); fetchData(); }
    setSavingProfile(false);
  };

  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const totalDue = bookings.reduce((sum, b) => sum + Number(b.due_amount || 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const overduePayments = payments.filter(
    (p) => p.status === "pending" && p.due_date && new Date(p.due_date) < new Date()
  );

  const getBookingPayments = (bookingId: string) =>
    payments.filter((p) => p.booking_id === bookingId).sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

  const getCompanyInfo = async (): Promise<CompanyInfo> => {
    const { data: cms } = await supabase.from("site_content" as any).select("content").eq("section_key", "contact").maybeSingle();
    const c = (cms as any)?.content || {};
    return { name: "TUBA ALHIJAZ", phone: c.phone || "", email: c.email || "", address: c.location || "" };
  };

  const handleDownloadInvoice = async (b: any) => {
    setGeneratingPdf(b.id);
    try {
      const bPayments = getBookingPayments(b.id);
      const [company, bookingRes] = await Promise.all([
        getCompanyInfo(),
        supabase
          .from("bookings")
          .select("*, packages(name, type, duration_days, start_date, price), booking_members(full_name, passport_number, selling_price, discount, final_price, package_id, packages(name))")
          .eq("id", b.id)
          .maybeSingle(),
      ]);

      const invoiceBooking = bookingRes.data
        ? { ...b, ...bookingRes.data, packages: bookingRes.data.packages || b.packages }
        : b;
      const memberRows = ((bookingRes.data as any)?.booking_members || []) as any[];
      const isFamily = String(invoiceBooking.booking_type || "").toLowerCase().includes("family")
        || Number(invoiceBooking.num_travelers || 0) > 1
        || memberRows.length > 0;

      await generateInvoice(
        invoiceBooking,
        profile || {},
        bPayments as InvoicePayment[],
        company,
        { members: memberRows, forceFamily: isFamily }
      );
      toast.success(t("dashboard.invoiceDownloaded"));
    } catch {
      toast.error(t("dashboard.invoiceFailed"));
    }
    setGeneratingPdf(null);
  };

  const handleDownloadReceipt = async (p: Payment, b: any) => {
    setGeneratingPdf(p.id);
    try {
      const company = await getCompanyInfo();
      const allBPayments = getBookingPayments(p.booking_id);
      await generateReceipt(p as InvoicePayment, b, profile || {}, company, allBPayments as InvoicePayment[]);
      toast.success(t("dashboard.receiptDownloaded"));
    } catch { toast.error(t("dashboard.receiptFailed")); }
    setGeneratingPdf(null);
  };
  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "text-emerald bg-emerald/10";
      case "pending": return "text-primary bg-primary/10";
      case "confirmed": return "text-primary bg-primary/10";
      case "cancelled": case "failed": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const statusTimeline = ["pending", "visa_processing", "ticket_confirmed", "completed"];
  const statusLabels: Record<string, string> = {
    pending: t("dashboard.pending"),
    visa_processing: t("dashboard.visaProcessing"),
    ticket_confirmed: t("dashboard.ticketConfirmed"),
    completed: t("dashboard.completed"),
    cancelled: t("dashboard.cancelled"),
  };

  const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: t("dashboard.overview"), icon: FileText },
    { key: "bookings", label: t("dashboard.myBookings"), icon: Package },
    { key: "payments", label: t("dashboard.payments"), icon: CreditCard },
    { key: "due", label: t("dashboard.dueAlerts"), icon: AlertTriangle },
    { key: "profile", label: t("dashboard.profile"), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("dashboard.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-md object-cover" />
            <span className="font-heading text-lg font-bold text-primary hidden sm:block">TUBA ALHIJAZ</span>
          </a>
          <div className="flex items-center gap-4">
            <Link to="/track" className="text-muted-foreground hover:text-primary transition-colors" title="Track Booking">
              <Search className="h-5 w-5" />
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.full_name || user?.email}</span>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("dashboard.bookings")}</span>
            </div>
            <p className="text-2xl font-heading font-bold">{bookings.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("dashboard.totalAmount")}</span>
            </div>
            <p className="text-2xl font-heading font-bold">৳{totalAmount.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-5 w-5 text-emerald" />
              <span className="text-xs text-muted-foreground">{t("dashboard.paid")}</span>
            </div>
            <p className="text-2xl font-heading font-bold text-emerald">৳{totalPaid.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-xs text-muted-foreground">{t("dashboard.due")}</span>
            </div>
            <p className="text-2xl font-heading font-bold text-destructive">৳{totalDue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "due" && overduePayments.length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {overduePayments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──── Overview Tab ──── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Recent Bookings with inline payments */}
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">{t("dashboard.noBookings")}</p>
                <Link to="/packages" className="text-primary hover:underline">{t("dashboard.browsePackages")}</Link>
              </div>
            ) : (
              bookings.map((b) => {
                const bPayments = getBookingPayments(b.id);
                const paidCount = bPayments.filter((p) => p.status === "completed").length;
                const overdueCount = bPayments.filter((p) => p.status === "pending" && p.due_date && new Date(p.due_date) < new Date()).length;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                  >
                    {/* Booking header */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <Link to={`/track?id=${formatTrackingId(b.tracking_id)}`} className="font-mono font-bold text-primary hover:underline text-sm">
                            {formatTrackingId(b.tracking_id)}
                          </Link>
                          <p className="text-sm text-muted-foreground">{b.packages?.name || "N/A"} • {b.num_travelers} {b.num_travelers > 1 ? t("dashboard.travelers") : t("dashboard.traveler")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {overdueCount > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            {overdueCount} {t("dashboard.overdue")}
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColor(b.status)}`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </div>
                    </div>

                    {/* Financial bar */}
                    <div className="px-5 pb-3">
                      <div className="flex gap-6 text-sm mb-2">
                        <span className="text-muted-foreground">{t("dashboard.total")}: <strong className="text-foreground">৳{Number(b.total_amount).toLocaleString("en-IN")}</strong></span>
                        <span className="text-muted-foreground">{t("dashboard.paid")}: <strong className="text-emerald">৳{Number(b.paid_amount).toLocaleString("en-IN")}</strong></span>
                        <span className="text-muted-foreground">{t("dashboard.due")}: <strong className="text-destructive">৳{Number(b.due_amount || 0).toLocaleString("en-IN")}</strong></span>
                      </div>
                      {Number(b.total_amount) > 0 && (
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (Number(b.paid_amount) / Number(b.total_amount)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Payment history inline */}
                    {bPayments.length > 0 && (
                      <div className="border-t border-border">
                        <div className="px-5 py-3 bg-muted/30">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {t("dashboard.paymentHistory")} ({paidCount}/{bPayments.length} {t("dashboard.completed")})
                          </p>
                          <div className="space-y-1.5">
                            {bPayments.map((p) => {
                              const isOverdue = p.status === "pending" && p.due_date && new Date(p.due_date) < new Date();
                              return (
                                <div key={p.id} className={`flex items-center justify-between text-sm py-1.5 px-3 rounded-md ${isOverdue ? "bg-destructive/5" : ""}`}>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-6">#{p.installment_number || "—"}</span>
                                    <span className="font-medium">৳{Number(p.amount).toLocaleString("en-IN")}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {p.due_date ? `Due: ${new Date(p.due_date).toLocaleDateString()}` : ""}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(isOverdue ? "failed" : p.status)}`}>
                                      {isOverdue ? "overdue" : p.status}
                                    </span>
                                    {p.status === "completed" && (
                                      <button
                                        onClick={() => handleDownloadReceipt(p, b)}
                                        disabled={generatingPdf === p.id}
                                        className="text-xs text-primary hover:underline"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="px-5 py-3 border-t border-border flex items-center gap-4 flex-wrap">
                      <button
                        onClick={() => handleDownloadInvoice(b)}
                        disabled={generatingPdf === b.id}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {generatingPdf === b.id ? t("dashboard.generating") : t("dashboard.invoice")}
                      </button>
                      {Number(b.due_amount || 0) > 0 && (
                        <PayOnlineButton
                          bookingId={b.id}
                          dueAmount={Number(b.due_amount)}
                          customerName={profile?.full_name}
                          customerPhone={profile?.phone}
                          customerEmail={user?.email}
                          size="sm"
                          label={`Pay ৳${Number(b.due_amount).toLocaleString("en-IN")}`}
                        />
                      )}
                      <button
                        onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {t("dashboard.docs")} ({(bookingDocs[b.id] || []).length}/3)
                      </button>
                    </div>
                    {expandedBooking === b.id && (
                      <div className="px-5 pb-5 border-t border-border pt-3">
                        <DocumentUpload bookingId={b.id} userId={user.id} documents={bookingDocs[b.id] || []} onUploaded={fetchData} />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ──── Bookings Tab ──── */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">{t("dashboard.noBookings")}</p>
                <Link to="/packages" className="text-primary hover:underline">{t("dashboard.browsePackages")}</Link>
              </div>
            ) : (
              bookings.map((b) => {
                const bPayments = getBookingPayments(b.id);
                const currentStepIdx = statusTimeline.indexOf(b.status);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("dashboard.trackingId")}</p>
                        <Link to={`/track?id=${formatTrackingId(b.tracking_id)}`} className="font-mono font-bold text-primary hover:underline">
                          {formatTrackingId(b.tracking_id)}
                        </Link>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColor(b.status)}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </div>

                    {/* Status Timeline */}
                    {b.status !== "cancelled" && (
                      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                        {statusTimeline.map((s, i) => (
                          <div key={s} className="flex items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              i <= currentStepIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}>
                              {i <= currentStepIdx ? "✓" : i + 1}
                            </div>
                            <span className={`text-xs ml-1 mr-2 whitespace-nowrap hidden sm:inline ${
                              i <= currentStepIdx ? "text-primary font-medium" : "text-muted-foreground"
                            }`}>
                              {statusLabels[s]}
                            </span>
                            {i < statusTimeline.length - 1 && (
                              <div className={`w-6 h-0.5 ${i < currentStepIdx ? "bg-primary" : "bg-border"}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.package")}</p>
                        <p className="font-medium">{b.packages?.name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.total")}</p>
                        <p className="font-medium">৳{Number(b.total_amount).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.paid")}</p>
                        <p className="font-medium text-emerald">৳{Number(b.paid_amount).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.due")}</p>
                        <p className="font-medium text-destructive">৳{Number(b.due_amount || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Installment Schedule */}
                    {bPayments.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => setExpandedSchedule(expandedSchedule === b.id ? null : b.id)}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <CreditCard className="h-4 w-4" />
                          {t("dashboard.installmentSchedule")} ({bPayments.filter((p) => p.status === "completed").length}/{bPayments.length} {t("dashboard.paid").toLowerCase()})
                          {expandedSchedule === b.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {expandedSchedule === b.id && (
                          <div className="mt-3 pt-3 border-t border-border overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground border-b border-border/50">
                                  <th className="pb-2 pr-4">#</th>
                                  <th className="pb-2 pr-4">{t("dashboard.amount")}</th>
                                  <th className="pb-2 pr-4">{t("dashboard.dueDate")}</th>
                                  <th className="pb-2 pr-4">{t("dashboard.status")}</th>
                                  <th className="pb-2">{t("dashboard.paidAt")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bPayments.map((p) => {
                                  const isOverdue = p.status === "pending" && p.due_date && new Date(p.due_date) < new Date();
                                  return (
                                    <tr key={p.id} className={`border-b border-border/30 ${isOverdue ? "bg-destructive/5" : ""}`}>
                                      <td className="py-2 pr-4">{p.installment_number || "—"}</td>
                                      <td className="py-2 pr-4 font-medium">৳{Number(p.amount).toLocaleString("en-IN")}</td>
                                      <td className="py-2 pr-4">{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                                      <td className="py-2 pr-4">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(p.status)}`}>
                                          {isOverdue ? t("dashboard.overdue") : p.status}
                                        </span>
                                      </td>
                                      <td className="py-2">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents */}
                    <button
                      onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}
                      className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {t("dashboard.documents")} ({(bookingDocs[b.id] || []).length}/3)
                      {expandedBooking === b.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {expandedBooking === b.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <DocumentUpload
                          bookingId={b.id}
                          userId={user.id}
                          documents={bookingDocs[b.id] || []}
                          onUploaded={fetchData}
                        />
                      </div>
                    )}

                    {/* Download Invoice */}
                    <button
                      onClick={() => handleDownloadInvoice(b)}
                      disabled={generatingPdf === b.id}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {generatingPdf === b.id ? t("dashboard.generating") : t("dashboard.downloadInvoice")}
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ──── Payments Tab ──── */}
        {activeTab === "payments" && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("dashboard.noPayments")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">{t("dashboard.amount")}</th>
                      <th className="pb-3 pr-4">{t("dashboard.dueDate")}</th>
                      <th className="pb-3 pr-4">{t("dashboard.paidAt")}</th>
                      <th className="pb-3 pr-4">{t("dashboard.status")}</th>
                      <th className="pb-3 pr-4">{t("dashboard.method")}</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3 pr-4">{p.installment_number || "—"}</td>
                        <td className="py-3 pr-4 font-medium">৳{Number(p.amount).toLocaleString("en-IN")}</td>
                        <td className="py-3 pr-4">{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                        <td className="py-3 pr-4">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 capitalize">{p.payment_method || "—"}</td>
                        <td className="py-3">
                          {p.status === "completed" && (
                            <button
                              onClick={() => handleDownloadReceipt(p, bookings.find((b) => b.id === p.booking_id))}
                              disabled={generatingPdf === p.id}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                            >
                              <Download className="h-3 w-3" />
                              {generatingPdf === p.id ? "..." : t("dashboard.receipt")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ──── Due Alerts Tab ──── */}
        {activeTab === "due" && (
          <div className="space-y-3">
            {overduePayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("dashboard.noDue")}</p>
              </div>
            ) : (
              overduePayments.map((p) => {
                const booking = bookings.find((b) => b.id === p.booking_id);
                return (
                  <div key={p.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-destructive">{t("dashboard.installmentOverdue").replace("{n}", String(p.installment_number))}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking?.packages?.name || "Booking"} • Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : "N/A"}
                      </p>
                      {booking && (
                        <Link to={`/track?id=${formatTrackingId(booking.tracking_id)}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                          Track: {formatTrackingId(booking.tracking_id)}
                        </Link>
                      )}
                    </div>
                    <p className="text-xl font-heading font-bold text-destructive">৳{Number(p.amount).toLocaleString("en-IN")}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ──── Profile Settings Tab ──── */}
        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> {t("dashboard.profileSettings")}
              </h2>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user?.email}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("dashboard.fullName")} <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    maxLength={100}
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("dashboard.phone")}</label>
                  <input
                    type="tel"
                    maxLength={15}
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("dashboard.passportNumber")}</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={profileForm.passport_number}
                    onChange={(e) => setProfileForm({ ...profileForm, passport_number: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t("dashboard.address")}</label>
                  <input
                    type="text"
                    maxLength={200}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold px-6 py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {savingProfile ? t("dashboard.saving") : t("dashboard.saveChanges")}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

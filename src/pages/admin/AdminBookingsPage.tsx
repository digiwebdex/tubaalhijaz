import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import {
  Download, Edit2, Trash2, Save, X, Search, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Plus, Eye, Copy, CreditCard, Receipt,
  FileText, RefreshCw, Upload as UploadIcon, User, Users, FileDown, FileSpreadsheet,
  CalendarIcon, Package, CheckCircle2, AlertCircle, FileCheck, FileMinus
} from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { generateInvoice, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { getCompanyInfoForPdf } from "@/lib/entityPdfGenerator";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import { handlePhoneChange } from "@/lib/phoneValidation";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatBDT, cn, formatTrackingId } from "@/lib/utils";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const STATUSES = ["pending", "confirmed", "visa_processing", "ticket_issued", "completed", "cancelled"];
const normalizeBookingType = (value?: string | null) => (value || "").trim().toLowerCase();
const isFamilyBooking = (value?: string | null, memberCount = 0) => normalizeBookingType(value).includes("family") || memberCount > 0;
const toMoney = (value: any) => Math.max(0, Number(value || 0));
const REQUIRED_DOCUMENT_TYPES = ["passport", "nid", "photo"] as const;
const DOCUMENT_TYPE_ALIASES: Record<string, (typeof REQUIRED_DOCUMENT_TYPES)[number] | string> = {
  passport: "passport",
  passport_copy: "passport",
  nid: "nid",
  nid_copy: "nid",
  national_id: "nid",
  national_id_copy: "nid",
  photo: "photo",
  passport_photo: "photo",
  passport_size_photo: "photo",
  passport_size: "photo",
};

const normalizeDocumentType = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return DOCUMENT_TYPE_ALIASES[normalized] || normalized;
};

const getUploadedDocumentTypes = (docs: any[]) => new Set(docs.map((doc: any) => normalizeDocumentType(doc.document_type)).filter(Boolean));
const getMissingRequiredDocuments = (docs: any[]) => REQUIRED_DOCUMENT_TYPES.filter((type) => !getUploadedDocumentTypes(docs).has(type));
const getCompletedRequiredDocumentsCount = (docs: any[]) => REQUIRED_DOCUMENT_TYPES.filter((type) => getUploadedDocumentTypes(docs).has(type)).length;

function BookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [bkRes, payRes, expRes, memRes, docRes] = await Promise.all([
        supabase.from("bookings").select("total_amount, paid_amount, due_amount, total_cost, total_commission, extra_expense, profit_amount").eq("id", bookingId).single(),
        supabase.from("payments").select("*").eq("booking_id", bookingId).order("installment_number", { ascending: true }),
        supabase.from("expenses").select("*").eq("booking_id", bookingId).order("date", { ascending: false }),
        supabase.from("booking_members").select("*, packages(name)").eq("booking_id", bookingId).order("created_at", { ascending: true }),
        supabase.from("booking_documents").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
      ]);
      setBooking(bkRes.data || null);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setMembers(memRes.data || []);
      setDocuments(docRes.data || []);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  if (loading) return <p className="text-xs text-muted-foreground py-3">Loading details...</p>;

  // Use trigger-calculated values from booking record for consistency
  const totalPaid = Number(booking?.paid_amount || 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = Number(booking?.profit_amount || 0);
  const totalDue = Number(booking?.due_amount || 0);

  const EXPENSE_LABELS: Record<string, string> = {
    visa: "Visa", ticket: "Ticket", hotel: "Hotel", transport: "Transport",
    food: "Food", guide: "Guide", office: "Office", other: "Other",
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payments Received</p>
          <p className="font-heading font-bold text-emerald-500 text-lg">{formatBDT(totalPaid)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expenses Assigned</p>
          <p className="font-heading font-bold text-destructive text-lg">{formatBDT(totalExpenses)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit</p>
          <p className={`font-heading font-bold text-lg flex items-center gap-1 ${profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
            {profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatBDT(profit)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due Amount</p>
          <p className="font-heading font-bold text-yellow-600 text-lg">{formatBDT(totalDue)}</p>
        </div>
      </div>

      {/* Payment Timeline - Completed Payments with Dates */}
      {(() => {
        const completedPayments = payments.filter(p => p.status === "completed" && p.paid_at).sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
        return completedPayments.length > 0 ? (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Timeline ({completedPayments.length})</h4>
            <div className="space-y-1.5">
              {completedPayments.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{new Date(p.paid_at).toLocaleDateString("en-GB")}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 capitalize">{p.payment_method || "manual"}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{formatBDT(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Installment History ({payments.length})</h4>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-3">#</th><th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Due Date</th>
                  <th className="pb-2 pr-3">Paid Date</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{p.installment_number || "—"}</td>
                    <td className="py-2 pr-3 font-medium">{formatBDT(p.amount)}</td>
                    <td className="py-2 pr-3 capitalize">{p.payment_method || "—"}</td>
                    <td className="py-2 pr-3">{p.due_date ? new Date(p.due_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="py-2 pr-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="py-2">
                      <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No installments recorded.</p>
        )}
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Family Members ({members.length})</h4>
          <div className="space-y-1">
            {members.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{i + 1}.</span>
                  <span className="text-xs font-medium">{m.full_name}</span>
                  {m.passport_number && <span className="text-[10px] text-muted-foreground">({m.passport_number})</span>}
                </div>
                <span className="text-xs font-bold">{formatBDT(Number(m.final_price || 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Documents ({documents.length})
          {documents.length > 0 && <span className="ml-2 text-emerald-500">✓</span>}
        </h4>
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {documents.map((doc: any) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name || doc.file_path || "");
              const fileUrl = doc.file_path?.startsWith("/") ? doc.file_path : `/uploads/${doc.file_path}`;
              return (
                <div key={doc.id} className="bg-secondary/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] capitalize">{doc.document_type}</Badge>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">View</a>
                  </div>
                  {isImage && (
                    <img src={fileUrl} alt={doc.document_type} className="w-full h-20 object-cover rounded border border-border" />
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{doc.file_name}</p>
                  {doc.file_size && <p className="text-[10px] text-muted-foreground">{(doc.file_size / 1024).toFixed(1)} KB</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-destructive font-medium">⚠ No documents uploaded for this booking</p>
            <p className="text-[10px] text-muted-foreground mt-1">Passport, NID, and photo should be uploaded before processing.</p>
          </div>
        )}
        {/* Document completeness check */}
        {documents.length > 0 && (() => {
          const missing = getMissingRequiredDocuments(documents);
          return missing.length > 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-medium">
                Missing: {missing.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ All required documents uploaded</p>
            </div>
          );
        })()}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assigned Expenses ({expenses.length})</h4>
        {expenses.length > 0 ? (
          <div className="space-y-1">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{EXPENSE_LABELS[e.expense_type] || e.category || "other"}</Badge>
                  <span className="text-xs truncate">{e.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                  <span className="text-xs font-bold text-destructive">{formatBDT(e.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No expenses assigned to this booking.</p>
        )}
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewer = useIsViewer();
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [statusChangeVal, setStatusChangeVal] = useState("");
  const [bookingPayments, setBookingPayments] = useState<Record<string, any[]>>({});
  const [editMembers, setEditMembers] = useState<any[]>([]);
  const [bookingDocs, setBookingDocs] = useState<Record<string, any[]>>({});
  const [inlineStatusId, setInlineStatusId] = useState<string | null>(null);
  const [docReviewBooking, setDocReviewBooking] = useState<any>(null);

  const fetchBookings = async () => {
    setBookingsLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, packages(name, type, duration_days, price, start_date), moallems(name, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchBookings error:", error);
      const message = error.message || "Failed to load bookings";
      setBookingsError(message);
      setBookings([]);
      setBookingsLoading(false);
      return;
    }

    setBookings(Array.isArray(data) ? data : []);
    setBookingsError(null);
    setBookingsLoading(false);
  };

  const fetchAllPayments = () =>
    supabase.from("payments").select("id, booking_id, amount, paid_at, payment_method, status")
      .eq("status", "completed")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .then(({ data }) => {
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((p: any) => {
          if (!grouped[p.booking_id]) grouped[p.booking_id] = [];
          grouped[p.booking_id].push(p);
        });
        setBookingPayments(grouped);
      });

  const fetchBookingDocs = async () => {
    const { data } = await supabase.from("booking_documents").select("id, booking_id, document_type, file_name, file_path, file_size, created_at").order("created_at", { ascending: false });
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((d: any) => {
      if (!grouped[d.booking_id]) grouped[d.booking_id] = [];
      grouped[d.booking_id].push(d);
    });
    setBookingDocs(grouped);
  };

  const autoCreateCustomer = async (booking: any) => {
    try {
      const guestName = booking.guest_name || "";
      const guestPhone = booking.guest_phone || "";
      const guestEmail = booking.guest_email || "";
      const guestPassport = booking.guest_passport || "";
      const guestAddress = booking.guest_address || "";
      const userId = booking.user_id;
      if (!guestName && !guestPhone) return;
      let exists = false;
      if (userId) {
        const { data: ep } = await supabase.from("profiles").select("id").eq("user_id", userId).limit(1);
        if (ep && ep.length > 0) exists = true;
      }
      if (!exists && guestPhone) {
        const { data: pp } = await supabase.from("profiles").select("id").eq("phone", guestPhone).limit(1);
        if (pp && pp.length > 0) exists = true;
      }
      if (!exists) {
        const { error: insertErr } = await supabase.from("profiles").insert({
          user_id: userId || booking.id,
          full_name: guestName,
          phone: guestPhone,
          email: guestEmail,
          passport_number: guestPassport,
          address: guestAddress,
        });
        if (!insertErr) toast.success(`Customer "${guestName}" added to Customer Management`);
        else console.error("Auto-create customer error:", insertErr);
      }
    } catch (e) { console.error("Auto-create customer failed:", e); }
  };

  const handleInlineStatusChange = async (bookingId: string, newStatus: string) => {
    setInlineStatusId(null);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status === newStatus) return;
    
    setStatusChangeId(bookingId);
    setStatusChangeVal(newStatus);
    // Trigger the existing handleStatusChange flow
    const oldStatus = booking.status;
    const { error } = await supabase.from("bookings").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", bookingId);
    if (error) { toast.error(error.message); setStatusChangeId(null); return; }
    toast.success(`Status updated to ${newStatus}`);

    // Auto-create customer on confirm
    if (newStatus === "confirmed") {
      await autoCreateCustomer(booking);
    }

    setStatusChangeId(null);
    fetchBookings();
  };

  // Close inline status dropdown on outside click
  useEffect(() => {
    if (!inlineStatusId) return;
    const handler = () => setInlineStatusId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [inlineStatusId]);

  useEffect(() => {
    fetchBookings();
    fetchAllPayments();
    fetchBookingDocs();
    supabase.from("moallems").select("id, name, phone, status").eq("status", "active").order("name").then(({ data }) => setMoallems(data || []));
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") navigate("/admin/bookings/create", { replace: true });
  }, [searchParams]);

  const startEdit = async (b: any) => {
    const normalizedType = normalizeBookingType(b.booking_type) || "individual";

    setEditingId(b.id);
    setEditForm({
      status: b.status,
      selling_price_per_person: Number(b.selling_price_per_person || 0),
      cost_price_per_person: Number(b.cost_price_per_person || 0),
      extra_expense: Number(b.extra_expense || 0),
      commission_per_person: Number(b.commission_per_person || 0),
      notes: b.notes || "",
      num_travelers: Number(b.num_travelers || 1),
      paid_amount: Number(b.paid_amount || 0),
      guest_name: b.guest_name || "",
      guest_phone: b.guest_phone || "",
      guest_email: b.guest_email || "",
      guest_address: b.guest_address || "",
      guest_passport: b.guest_passport || "",
      user_id: b.user_id || null,
      moallem_id: b.moallem_id || (moallems.find((m: any) => m.name === "TUBA ALHIJAZ")?.id || ""),
      booking_type: normalizedType,
    });

    const { data: membersData, error: membersError } = await supabase
      .from("booking_members")
      .select("id, booking_id, package_id, full_name, passport_number, selling_price, discount, final_price, created_at")
      .eq("booking_id", b.id)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("startEdit booking_members load error:", membersError);
    }

    const existingMembers = (membersData || []).map((m: any, index: number) => {
      const selling = toMoney(m.selling_price);
      const discount = Math.min(toMoney(m.discount), selling);
      const final = Math.max(0, toMoney(m.final_price || selling - discount));

      return {
        ...m,
        temp_id: m.id || `tmp-${index}-${crypto.randomUUID()}`,
        full_name: m.full_name || "",
        passport_number: m.passport_number || "",
        package_id: m.package_id || b.package_id || null,
        selling_price: selling,
        discount,
        final_price: final,
      };
    });

    const travelerCount = Math.max(Number(b.num_travelers || 1), existingMembers.length, 1);
    const shouldUseFamily = isFamilyBooking(normalizedType, existingMembers.length) || travelerCount > 1;
    const fallbackUnit = toMoney(b.selling_price_per_person) || Math.round(toMoney(b.total_amount) / travelerCount);

    // Parse comma/newline/semicolon-separated names and passports from guest_name/guest_passport
    const parsedNames = (b.guest_name || "").split(/[,;\n]+/).map((n: string) => n.trim()).filter(Boolean);
    const parsedPassports = (b.guest_passport || "").split(/[,;\n]+/).map((p: string) => p.trim()).filter(Boolean);

    const fallbackMembers = Array.from({ length: travelerCount }, (_, index) => {
      const discount = Math.min(index === 0 ? toMoney(b.discount) : 0, fallbackUnit);
      return {
        temp_id: `tmp-${index}-${crypto.randomUUID()}`,
        full_name: parsedNames[index] || "",
        passport_number: parsedPassports[index] || "",
        package_id: b.package_id || null,
        selling_price: fallbackUnit,
        discount,
        final_price: Math.max(0, fallbackUnit - discount),
      };
    });

    const hydratedMembers = existingMembers.length > 0 ? existingMembers : (shouldUseFamily ? fallbackMembers : []);
    setEditMembers(hydratedMembers);

    if (shouldUseFamily) {
      setEditForm((prev: any) => ({
        ...prev,
        booking_type: "family",
        num_travelers: Math.max(hydratedMembers.length, Number(prev.num_travelers || 1), 1),
      }));
    }
  };

  const isEditingFamily = isFamilyBooking(editForm.booking_type, editMembers.length);
  const editTotalSelling = editingId
    ? (isEditingFamily ? editMembers.reduce((s: number, m: any) => s + Number(m.final_price || 0), 0) : Number(editForm.selling_price_per_person || 0) * Number(editForm.num_travelers || 1))
    : 0;
  const editTotalCost = editingId ? (Number(editForm.cost_price_per_person || 0) * Number(editForm.num_travelers || 1)) : 0;
  const editTotalCommission = editingId ? (Number(editForm.commission_per_person || 0) * Number(editForm.num_travelers || 1)) : 0;
  const editProfit = editTotalSelling - editTotalCost - editTotalCommission - Number(editForm.extra_expense || 0);
  const editDue = editingId ? Math.max(0, editTotalSelling - Number(editForm.paid_amount || 0)) : 0;

  const saveEdit = async () => {
    if (!editingId) return;
    const isFamily = isFamilyBooking(editForm.booking_type, editMembers.length);
    const sellingPP = toMoney(editForm.selling_price_per_person);
    const costPP = toMoney(editForm.cost_price_per_person);
    const commPP = toMoney(editForm.commission_per_person);
    const extraExp = toMoney(editForm.extra_expense);

    const preparedMembers = editMembers.map((m: any, idx: number) => {
      const selling = toMoney(m.selling_price);
      const discount = Math.min(toMoney(m.discount), selling);
      const finalPrice = Math.max(0, toMoney(m.final_price || selling - discount));

      return {
        ...m,
        full_name: (m.full_name || `Traveler ${idx + 1}`).trim(),
        passport_number: m.passport_number?.trim() || null,
        package_id: m.package_id || null,
        selling_price: selling,
        discount,
        final_price: finalPrice,
      };
    });

    const travelers = isFamily
      ? Math.max(preparedMembers.length, parseInt(editForm.num_travelers) || 1, 1)
      : Math.max(parseInt(editForm.num_travelers) || 1, 1);

    const totalSelling = (isFamily && preparedMembers.length > 0)
      ? preparedMembers.reduce((s: number, m: any) => s + Number(m.final_price || 0), 0)
      : sellingPP * travelers;

    const totalCostVal = costPP * travelers;
    const totalCommVal = commPP * travelers;
    const paid = Math.min(toMoney(editForm.paid_amount), totalSelling);
    const due = Math.max(0, totalSelling - paid);
    const profit = totalSelling - totalCostVal - totalCommVal - extraExp;

    if (isFamily && preparedMembers.length > 0) {
      const memberResults = await Promise.all(
        preparedMembers.map((m: any) => {
          const memberPayload = {
            full_name: m.full_name,
            passport_number: m.passport_number,
            selling_price: m.selling_price,
            discount: m.discount,
            final_price: m.final_price,
            package_id: m.package_id,
          };

          if (m.id) {
            return supabase.from("booking_members").update(memberPayload).eq("id", m.id);
          }

          return supabase.from("booking_members").insert({
            ...memberPayload,
            booking_id: editingId,
          });
        })
      );

      const memberError = memberResults.find((result: any) => result.error)?.error;
      if (memberError) {
        toast.error(memberError.message || "Failed to save traveler details");
        return;
      }
    }

    // For family bookings, store concatenated member names as backup in guest_name/guest_passport
    const guestName = (isFamily && preparedMembers.length > 0)
      ? preparedMembers.map((m: any) => m.full_name).filter(Boolean).join(", ") || editForm.guest_name?.trim() || null
      : editForm.guest_name?.trim() || null;
    const guestPassport = (isFamily && preparedMembers.length > 0)
      ? preparedMembers.map((m: any) => m.passport_number).filter(Boolean).join(", ") || editForm.guest_passport?.trim() || null
      : editForm.guest_passport?.trim() || null;

    const { error } = await supabase.from("bookings").update({
      status: editForm.status,
      booking_type: isFamily ? "family" : "individual",
      selling_price_per_person: sellingPP,
      total_amount: totalSelling,
      paid_amount: paid,
      due_amount: due,
      cost_price_per_person: costPP,
      total_cost: totalCostVal,
      extra_expense: extraExp,
      profit_amount: profit,
      commission_per_person: commPP,
      total_commission: totalCommVal,
      notes: editForm.notes || null, num_travelers: travelers,
      guest_name: guestName, guest_phone: editForm.guest_phone?.trim() || null,
      guest_email: editForm.guest_email?.trim() || null, guest_address: editForm.guest_address?.trim() || null,
      guest_passport: guestPassport, user_id: editForm.user_id || null,
      moallem_id: editForm.moallem_id || null,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking updated successfully");
    setEditingId(null);
    setEditMembers([]);
    fetchBookings();
    fetchAllPayments();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      // Delete all dependent records first to avoid FK constraint violations
      await Promise.all([
        supabase.from("payments").delete().eq("booking_id", deleteId),
        supabase.from("expenses").delete().eq("booking_id", deleteId),
        supabase.from("booking_members").delete().eq("booking_id", deleteId),
        supabase.from("booking_documents").delete().eq("booking_id", deleteId),
        supabase.from("moallem_payments").delete().eq("booking_id", deleteId),
        supabase.from("moallem_commission_payments").delete().eq("booking_id", deleteId),
        supabase.from("supplier_agent_payments").delete().eq("booking_id", deleteId),
        supabase.from("notification_logs").delete().eq("booking_id", deleteId),
        supabase.from("transactions").delete().eq("booking_id", deleteId),
      ]);
      const { error } = await supabase.from("bookings").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
      toast.success("Booking and all related records deleted");
      setDeleteId(null);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking");
    }
  };

  const handleDuplicate = async (b: any) => {
    const { error } = await supabase.from("bookings").insert({
      user_id: b.user_id, package_id: b.package_id, total_amount: b.total_amount,
      num_travelers: b.num_travelers, installment_plan_id: b.installment_plan_id,
      notes: `Duplicated from ${b.tracking_id}`, guest_name: b.guest_name,
      guest_phone: b.guest_phone, guest_email: b.guest_email,
      guest_address: b.guest_address, guest_passport: b.guest_passport,
      moallem_id: b.moallem_id || null,
      status: "pending", paid_amount: 0, due_amount: Number(b.total_amount),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Booking duplicated");
    fetchBookings();
  };

  const handleStatusChange = async () => {
    if (!statusChangeId || !statusChangeVal) return;
    const booking = bookings.find((b: any) => b.id === statusChangeId);
    const oldStatus = booking?.status;
    
    const { error } = await supabase.from("bookings").update({ status: statusChangeVal }).eq("id", statusChangeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");

    // Auto-create customer profile when booking is confirmed
    if (statusChangeVal === "confirmed" && booking) {
      await autoCreateCustomer(booking);
    }

    // Auto-send notification to customer
    if (booking?.user_id && oldStatus !== statusChangeVal) {
      try {
        const statusLabels: Record<string, string> = {
          pending: "Pending",
          confirmed: "Confirmed ✅",
          visa_processing: "Visa Processing 📋",
          ticket_issued: "Ticket Issued 🎫",
          completed: "Completed 🎉",
          cancelled: "Cancelled ❌",
        };
        const newLabel = statusLabels[statusChangeVal] || statusChangeVal;
        const pkgName = booking.packages?.name || "your package";
        const smsMsg = `TUBA ALHIJAZ: Dear ${booking.guest_name || "Customer"}, your booking (${booking.tracking_id}) status has been updated to "${newLabel}". Package: ${pkgName}. For queries: 01711-999910`;
        const emailSubject = `Booking Status Updated — ${booking.tracking_id}`;
        const emailHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#C5A55A;padding:15px;text-align:center;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;">TUBA ALHIJAZ</h2>
            </div>
            <div style="border:1px solid #e5e5e5;border-top:0;padding:20px;border-radius:0 0 8px 8px;">
              <p>Dear <strong>${booking.guest_name || "Customer"}</strong>,</p>
              <p>Your booking status has been updated:</p>
              <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">Tracking ID</td><td style="padding:8px;border:1px solid #eee;">${booking.tracking_id}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">Package</td><td style="padding:8px;border:1px solid #eee;">${pkgName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">Previous Status</td><td style="padding:8px;border:1px solid #eee;">${statusLabels[oldStatus] || oldStatus}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold;">New Status</td><td style="padding:8px;border:1px solid #eee;color:#C5A55A;font-weight:bold;">${newLabel}</td></tr>
              </table>
              <p>For any queries, contact us at <strong>01711-999910</strong></p>
              <p style="color:#888;font-size:12px;margin-top:20px;">Thank you for choosing TUBA ALHIJAZ.</p>
            </div>
          </div>`;

        await supabase.functions.invoke("send-notification", {
          body: {
            type: "booking_status_updated",
            channels: ["sms", "email"],
            user_id: booking.user_id,
            booking_id: booking.id,
            custom_subject: emailSubject,
            custom_message: emailHtml,
            sms_message: smsMsg,
            new_status: statusChangeVal,
          },
        });
        toast.success("Customer notified via SMS & Email");
      } catch (notifErr: any) {
        console.error("Notification failed:", notifErr);
        toast.info("Status updated but notification failed to send");
      }
    }

    setStatusChangeId(null);
    fetchBookings();
  };

  const handleDownloadInvoice = async (b: any) => {
    setGeneratingId(b.id);
    try {
      // Fetch payments, booking members, package info, and company in parallel
      // VPS API doesn't support nested selects, so fetch separately
      const [paymentsRes, membersRes, company] = await Promise.all([
        supabase.from("payments").select("*").eq("booking_id", b.id).order("installment_number", { ascending: true }),
        supabase.from("booking_members").select("*").eq("booking_id", b.id).order("created_at", { ascending: true }),
        getCompanyInfoForPdf(),
      ]);

      // Build package info from the already-loaded booking data (from fetchBookings which uses custom JOIN route)
      const invoiceBooking = { ...b };

      // If package info missing, fetch it separately
      if (!invoiceBooking.packages && invoiceBooking.package_id) {
        const { data: pkgData } = await supabase.from("packages").select("name, type, duration_days, start_date, price").eq("id", invoiceBooking.package_id).maybeSingle();
        if (pkgData) invoiceBooking.packages = pkgData;
      }

      const memberRows = (membersRes.data || []) as any[];

      // If members have package_id but no package name, fetch package names
      const memberPackageIds = memberRows.filter((m: any) => m.package_id && !m.packages).map((m: any) => m.package_id);
      if (memberPackageIds.length > 0) {
        const uniqueIds = Array.from(new Set(memberPackageIds));
        const { data: pkgs } = await supabase.from("packages").select("id, name").in("id", uniqueIds);
        const pkgMap: Record<string, string> = {};
        (pkgs || []).forEach((p: any) => { pkgMap[p.id] = p.name; });
        memberRows.forEach((m: any) => {
          if (m.package_id && pkgMap[m.package_id]) {
            m.packages = { name: pkgMap[m.package_id] };
          }
        });
      }

      const travelerCount = Number(invoiceBooking.num_travelers || 0);

      await generateInvoice(
        { ...invoiceBooking, booking_type: normalizeBookingType(invoiceBooking.booking_type) },
        {
          full_name: invoiceBooking.guest_name,
          phone: invoiceBooking.guest_phone,
          passport_number: invoiceBooking.guest_passport,
          address: invoiceBooking.guest_address,
          email: invoiceBooking.guest_email,
        },
        (paymentsRes.data || []) as InvoicePayment[],
        company,
        {
          members: memberRows,
          forceFamily: isFamilyBooking(invoiceBooking.booking_type, memberRows.length) || travelerCount > 1,
        }
      );
      toast.success("Invoice downloaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate invoice");
    }
    setGeneratingId(null);
  };

  const filtered = useMemo(() => bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || (b.tracking_id?.toLowerCase().includes(q) || b.guest_name?.toLowerCase()?.includes(q) || b.guest_email?.toLowerCase()?.includes(q) || b.guest_phone?.toLowerCase()?.includes(q) || b.guest_passport?.toLowerCase()?.includes(q) || b.packages?.name?.toLowerCase().includes(q) || b.status?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const bookingDate = new Date(b.created_at);
    let matchesFrom = true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      matchesFrom = bookingDate >= from;
    }
    let matchesTo = true;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      matchesTo = bookingDate <= to;
    }
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  }), [bookings, search, statusFilter, dateFrom, dateTo]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === "pending").length;
    const confirmed = bookings.filter(b => b.status === "confirmed").length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const totalRevenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalPaid = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.paid_amount || 0), 0);
    const totalDue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.due_amount || 0), 0);
    return { total, pending, confirmed, completed, cancelled, totalRevenue, totalPaid, totalDue };
  }, [bookings]);

  const getBookingActions = (b: any): ActionItem[] => [
    { label: "View Details", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setViewBooking(b) },
    
    { label: "Download Invoice", icon: <Download className="h-3.5 w-3.5" />, onClick: () => handleDownloadInvoice(b), disabled: generatingId === b.id },
    { label: "Edit", icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => startEdit(b), variant: "warning", hidden: isViewer },
    { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(b.id), variant: "destructive", hidden: isViewer, separator: true },
    { label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => handleDuplicate(b), variant: "purple", hidden: isViewer },
    { label: "Add Payment", icon: <CreditCard className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/payments?action=add`), variant: "success", hidden: isViewer, separator: true },
    { label: "Add Expense", icon: <Receipt className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/accounting?action=add`), variant: "success", hidden: isViewer },
    { label: "Change Status", icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => { setStatusChangeId(b.id); setStatusChangeVal(b.status); }, hidden: isViewer },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-heading font-bold">{kpiStats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/30" onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-heading font-bold text-yellow-600">{kpiStats.pending}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center"><Users className="h-5 w-5 text-yellow-600" /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/30" onClick={() => setStatusFilter(statusFilter === "confirmed" ? "all" : "confirmed")}>
          <div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <p className="text-2xl font-heading font-bold text-emerald-500">{kpiStats.confirmed}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-heading font-bold">{formatBDT(kpiStats.totalRevenue)}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
        </div>
      </div>

      {/* Table Header Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="font-heading text-xl font-bold">All Bookings ({filtered.length})</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => exportPDF({ title: "Bookings Report", columns: ["Tracking ID", "Customer", "Package", "Travelers", "Total", "Paid", "Due", "Status"], rows: filtered.map(b => [b.tracking_id, b.guest_name || "—", b.packages?.name || "—", b.num_travelers, Number(b.total_amount), Number(b.paid_amount), Number(b.due_amount ?? 0), b.status]) })}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel({ title: "Bookings Report", columns: ["Tracking ID", "Customer", "Package", "Travelers", "Total", "Paid", "Due", "Status"], rows: filtered.map(b => [b.tracking_id, b.guest_name || "—", b.packages?.name || "—", b.num_travelers, Number(b.total_amount), Number(b.paid_amount), Number(b.due_amount ?? 0), b.status]) })}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
            {!isViewer && (
              <button onClick={() => navigate("/admin/bookings/create")}
                className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold">
                <Plus className="h-4 w-4" /> New Booking
              </button>
            )}
          </div>
        </div>

        {/* Search + Filters Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="Search by name, email, or booking ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <select className={inputClass + " w-[140px]"} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
          </select>
          {(dateFrom || dateTo || search || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSearch(""); setStatusFilter("all"); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking ID</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Package</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pax</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((b: any) => {
                const paymentStatus = Number(b.paid_amount || 0) >= Number(b.total_amount || 0) ? "paid" : Number(b.paid_amount || 0) > 0 ? "partial" : "unpaid";
                const paymentMethod = b.notes?.match(/Payment Method:\s*([^\n,]+)/i)?.[1]?.trim() || "—";
                const statusColors: Record<string, string> = {
                  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
                  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                  visa_processing: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
                  ticket_issued: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
                  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
                };
                const paymentColors: Record<string, string> = {
                  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
                  unpaid: "bg-destructive/15 text-destructive",
                };
                const trackingLabels: Record<string, string> = {
                  pending: "Order Submitted",
                  confirmed: "Confirmed",
                  visa_processing: "Visa Processing",
                  ticket_issued: "Ticket Issued",
                  completed: "Completed",
                  cancelled: "Cancelled",
                };

                return editingId === b.id ? (
                  <tr key={b.id}>
                    <td colSpan={11} className="py-4 px-2">
                      <div className="space-y-3 bg-secondary/30 rounded-lg p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                          <p className="font-mono font-bold text-primary text-sm">{formatTrackingId(b.tracking_id)}</p>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><Save className="h-3 w-3" /> Save</button>
                            <button onClick={() => { setEditingId(null); setEditMembers([]); }} className="text-xs bg-secondary text-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><X className="h-3 w-3" /> Cancel</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Change Customer</label>
                          <CustomerSearchSelect selectedId={editForm.user_id} onSelect={(c) => {
                            if (c) { setEditForm((f: any) => ({ ...f, user_id: c.user_id, guest_name: c.full_name || "", guest_phone: c.phone || "", guest_email: c.email || "", guest_address: c.address || "", guest_passport: c.passport_number || "" })); }
                            else { setEditForm((f: any) => ({ ...f, user_id: null, guest_name: "", guest_phone: "", guest_email: "", guest_address: "", guest_passport: "" })); }
                          }} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div><label className="text-xs text-muted-foreground block mb-1">Customer Name</label><input className={inputClass} value={editForm.guest_name} onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Phone</label><input className={inputClass} value={editForm.guest_phone} onChange={(e) => handlePhoneChange(e.target.value, (v) => setEditForm({ ...editForm, guest_phone: v }))} maxLength={15} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Passport</label><input className={inputClass} value={editForm.guest_passport} onChange={(e) => setEditForm({ ...editForm, guest_passport: e.target.value })} /></div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div><label className="text-xs text-muted-foreground block mb-1">Selling Price/Person</label><input className={inputClass} type="number" min={0} value={editForm.selling_price_per_person} onChange={(e) => setEditForm((f: any) => ({ ...f, selling_price_per_person: e.target.value }))} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Cost Price/Person</label><input className={inputClass} type="number" min={0} value={editForm.cost_price_per_person} onChange={(e) => setEditForm((f: any) => ({ ...f, cost_price_per_person: e.target.value }))} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Extra Expense</label><input className={inputClass} type="number" min={0} value={editForm.extra_expense} onChange={(e) => setEditForm((f: any) => ({ ...f, extra_expense: e.target.value }))} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Travelers</label><input className={inputClass} type="number" min={1} value={editForm.num_travelers} onChange={(e) => setEditForm({ ...editForm, num_travelers: e.target.value })} /></div>
                        </div>
                        {editForm.moallem_id && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><label className="text-xs text-muted-foreground block mb-1">Commission/Person</label><input className={inputClass} type="number" min={0} value={editForm.commission_per_person} onChange={(e) => setEditForm((f: any) => ({ ...f, commission_per_person: e.target.value }))} /></div>
                            <div><label className="text-xs text-muted-foreground block mb-1">Total Commission</label><div className={`${inputClass} bg-muted/50 font-bold`}>BDT {editTotalCommission.toLocaleString("en-IN")}</div></div>
                          </div>
                        )}

                        {isEditingFamily && (
                          <div className="border border-primary/30 rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5"><User className="h-4 w-4 text-primary" />Family Members ({editMembers.length})</h4>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => {
                                  const defaultPrice = toMoney(editForm.selling_price_per_person || b.selling_price_per_person || 0);
                                  setEditMembers((prev: any[]) => ([...prev, { temp_id: `tmp-${crypto.randomUUID()}`, full_name: "", passport_number: "", package_id: b.package_id || null, selling_price: defaultPrice, discount: 0, final_price: defaultPrice }]));
                                  setEditForm((prev: any) => ({ ...prev, booking_type: "family", num_travelers: Math.max(Number(prev.num_travelers || 1), editMembers.length + 1) }));
                                }} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground"><Plus className="h-3 w-3" /> Add Traveler</button>
                                <Badge variant="outline" className="text-[10px]">Family</Badge>
                              </div>
                            </div>
                            {editMembers.map((m: any, idx: number) => (
                              <div key={m.id || m.temp_id || `member-${idx}`} className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-secondary/30 rounded-md p-2">
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Name</label><input className={inputClass + " text-xs"} value={m.full_name} onChange={(e) => { const u = [...editMembers]; u[idx] = { ...u[idx], full_name: e.target.value }; setEditMembers(u); }} /></div>
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Passport</label><input className={inputClass + " text-xs"} value={m.passport_number || ""} onChange={(e) => { const u = [...editMembers]; u[idx] = { ...u[idx], passport_number: e.target.value }; setEditMembers(u); }} /></div>
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Package</label><div className={`${inputClass} text-xs bg-muted/50`}>{b.packages?.name || "N/A"}</div></div>
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Selling</label><input className={inputClass + " text-xs"} type="number" min={0} value={m.selling_price} onChange={(e) => { const u = [...editMembers]; const sp = toMoney(e.target.value); const d = Math.min(toMoney(u[idx].discount), sp); u[idx] = { ...u[idx], selling_price: sp, discount: d, final_price: Math.max(0, sp - d) }; setEditMembers(u); }} /></div>
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Discount</label><input className={inputClass + " text-xs"} type="number" min={0} value={m.discount} onChange={(e) => { const u = [...editMembers]; const s = toMoney(u[idx].selling_price); const d = Math.min(toMoney(e.target.value), s); u[idx] = { ...u[idx], discount: d, final_price: Math.max(0, s - d) }; setEditMembers(u); }} /></div>
                                <div><label className="text-[10px] text-muted-foreground block mb-0.5">Final</label><div className={`${inputClass} bg-muted/50 font-bold text-xs`}>৳{Number(m.final_price || 0).toLocaleString("en-IN")}</div></div>
                              </div>
                            ))}
                            {editMembers.length > 0 && <div className="text-right text-xs font-bold text-primary">Members Total: ৳{editMembers.reduce((s: number, m: any) => s + Number(m.final_price || 0), 0).toLocaleString("en-IN")}</div>}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div><label className="text-xs text-muted-foreground block mb-1">Status</label><select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}</select></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Total Selling</label><div className={`${inputClass} bg-muted/50 font-bold`}>৳{editTotalSelling.toLocaleString("en-IN")}</div></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Paid</label><input className={inputClass} type="number" min={0} max={editTotalSelling} value={editForm.paid_amount} onChange={(e) => setEditForm((f: any) => ({ ...f, paid_amount: Math.min(Math.max(0, parseFloat(e.target.value) || 0), editTotalSelling) }))} /></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Due</label><div className={`${inputClass} bg-muted/50 font-bold ${editDue > 0 ? "text-destructive" : ""}`}>৳{editDue.toLocaleString("en-IN")}</div></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Profit</label><div className={`${inputClass} bg-muted/50 font-bold ${editProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>৳{editProfit.toLocaleString("en-IN")}</div></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className="text-xs text-muted-foreground block mb-1">Moallem</label><select className={inputClass} value={editForm.moallem_id || ""} onChange={(e) => setEditForm({ ...editForm, moallem_id: e.target.value })}><option value="">-- No Moallem --</option>{moallems.map((m: any) => <option key={m.id} value={m.id}>{m.name} {m.phone ? `(${m.phone})` : ""}</option>)}</select></div>
                          <div><label className="text-xs text-muted-foreground block mb-1">Notes</label><input className={inputClass} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={b.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group" onClick={() => setViewBooking(b)}>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString("en-GB", { month: "short", day: "2-digit", year: "numeric" })}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-mono text-xs font-bold text-primary">{formatTrackingId(b.tracking_id)?.slice(-8) || b.id?.slice(0, 8)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="min-w-[120px]">
                        <p className="font-semibold text-sm leading-tight">{b.guest_name || "Unknown"}</p>
                        {b.guest_email && <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{b.guest_email}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs text-muted-foreground">{b.guest_phone || "—"}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="min-w-[120px]">
                        <p className="text-sm font-medium leading-tight">{b.packages?.name || "N/A"}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{b.packages?.type || ""}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm font-medium">{b.num_travelers}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-sm font-bold">৳{Number(b.total_amount || 0).toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${paymentColors[paymentStatus]}`}>
                          {paymentStatus === "paid" ? "✅ Paid" : paymentStatus === "partial" ? "⏳ Partial" : "⏳ Pending"}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">{paymentMethod}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInlineStatusId(inlineStatusId === b.id ? null : b.id)}
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize cursor-pointer hover:opacity-80 transition-opacity ${statusColors[b.status] || "bg-secondary text-foreground"}`}
                      >
                        {b.status === "pending" ? "⏳" : b.status === "confirmed" ? "✅" : b.status === "completed" ? "🎉" : b.status === "cancelled" ? "❌" : "📋"} {b.status?.replace("_", " ")}
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </button>
                      {inlineStatusId === b.id && (
                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleInlineStatusChange(b.id, s)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs capitalize hover:bg-secondary/50 transition-colors flex items-center gap-2",
                                b.status === s && "bg-secondary font-bold"
                              )}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full ${s === "pending" ? "bg-yellow-500" : s === "confirmed" ? "bg-emerald-500" : s === "completed" ? "bg-emerald-600" : s === "cancelled" ? "bg-destructive" : "bg-blue-500"}`} />
                              {s.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => { e.stopPropagation(); setDocReviewBooking(b); }}>
                      {(() => {
                        const docs = bookingDocs[b.id] || [];
                        const completedCount = getCompletedRequiredDocumentsCount(docs);
                        const isComplete = completedCount === REQUIRED_DOCUMENT_TYPES.length;
                        const hasAny = completedCount > 0;
                        return (
                          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${isComplete ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : hasAny ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" : "bg-secondary text-muted-foreground"}`}>
                              {isComplete ? <FileCheck className="h-3 w-3" /> : hasAny ? <FileMinus className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {completedCount}/{REQUIRED_DOCUMENT_TYPES.length}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {isComplete ? "Complete" : hasAny ? "Partial" : "Missing"}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <AdminActionMenu actions={getBookingActions(b)} inlineCount={0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {bookingsLoading && <p className="text-center text-muted-foreground py-12">Loading bookings...</p>}
        {!bookingsLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{bookingsError ? `Failed to load bookings: ${bookingsError}` : "No bookings found."}</p>
        )}
      </div>

      {/* View Booking Modal */}
      <Dialog open={!!viewBooking} onOpenChange={(o) => { if (!o) setViewBooking(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Booking Details — {formatTrackingId(viewBooking?.tracking_id)}</DialogTitle>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-4">
              {isFamilyBooking(viewBooking.booking_type) && <Badge variant="outline" className="text-xs">Family Booking</Badge>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">Customer</span><span className="font-medium">{viewBooking.guest_name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Phone</span><span className="font-medium">{viewBooking.guest_phone || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Package</span><span className="font-medium">{viewBooking.packages?.name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Travelers</span><span className="font-medium">{viewBooking.num_travelers}</span></div>
                <div><span className="text-muted-foreground text-xs block">Selling/Person</span><span className="font-medium">{formatBDT(Number(viewBooking.selling_price_per_person || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Total Selling</span><span className="font-medium">{formatBDT(Number(viewBooking.total_amount))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Cost/Person</span><span className="font-medium">{formatBDT(Number(viewBooking.cost_price_per_person || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Total Cost</span><span className="font-medium">{formatBDT(Number(viewBooking.total_cost || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Extra Expense</span><span className="font-medium">{formatBDT(Number(viewBooking.extra_expense || 0))}</span></div>
                {viewBooking.moallem_id && <>
                  <div><span className="text-muted-foreground text-xs block">Commission/Person</span><span className="font-medium">{formatBDT(Number(viewBooking.commission_per_person || 0))}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Total Commission</span><span className="font-medium">{formatBDT(Number(viewBooking.total_commission || 0))}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Commission Paid</span><span className="font-medium text-emerald-500">{formatBDT(Number(viewBooking.commission_paid || 0))}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Commission Due</span><span className="font-medium text-destructive">{formatBDT(Number(viewBooking.commission_due || 0))}</span></div>
                </>}
                <div><span className="text-muted-foreground text-xs block">Supplier Paid</span><span className="font-medium text-emerald-500">{formatBDT(Number(viewBooking.paid_to_supplier || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Supplier Due</span><span className="font-medium text-destructive">{formatBDT(Number(viewBooking.supplier_due || 0))}</span></div>
                {viewBooking.moallem_id && <>
                  <div><span className="text-muted-foreground text-xs block">Moallem Paid</span><span className="font-medium text-emerald-500">{formatBDT(Number(viewBooking.paid_by_moallem || 0))}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Moallem Due</span><span className="font-medium text-destructive">{formatBDT(Number(viewBooking.moallem_due || 0))}</span></div>
                </>}
                <div><span className="text-muted-foreground text-xs block">Paid</span><span className="font-medium text-emerald-500">{formatBDT(Number(viewBooking.paid_amount))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Due</span><span className="font-medium text-destructive">{formatBDT(Number(viewBooking.due_amount || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Profit</span><span className={`font-medium ${Number(viewBooking.profit_amount || 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>{formatBDT(Number(viewBooking.profit_amount || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Status</span><Badge variant={viewBooking.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">{viewBooking.status}</Badge></div>
                <div><span className="text-muted-foreground text-xs block">Passport</span><span className="font-medium">{viewBooking.guest_passport || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Email</span><span className="font-medium">{viewBooking.guest_email || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Address</span><span className="font-medium">{viewBooking.guest_address || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Moallem</span><span className="font-medium">{viewBooking.moallems?.name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Package Price</span><span className="font-medium">{formatBDT(Number(viewBooking.packages?.price || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">Date</span><span className="font-medium">{new Date(viewBooking.created_at).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground text-xs block">Booking Type</span><span className="font-medium capitalize">{viewBooking.booking_type || "individual"}</span></div>
              </div>
              {viewBooking.notes && (
                <div><span className="text-muted-foreground text-xs block">Notes</span><p className="text-sm">{viewBooking.notes}</p></div>
              )}
              <BookingDetail bookingId={viewBooking.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      {statusChangeId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setStatusChangeId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-3">Change Status</h3>
            <select className={inputClass} value={statusChangeVal} onChange={(e) => setStatusChangeVal(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
            </select>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setStatusChangeId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={handleStatusChange} className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Booking?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All associated payments, expenses, and records will be permanently deleted.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Review Dialog */}
      <Dialog open={!!docReviewBooking} onOpenChange={(o) => { if (!o) setDocReviewBooking(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Document Review
            </DialogTitle>
          </DialogHeader>
          {docReviewBooking && (() => {
            const docs = bookingDocs[docReviewBooking.id] || [];
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{docReviewBooking.guest_name || "Unknown"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{docReviewBooking.packages?.name || "N/A"}</p>
                </div>

                <Badge variant={docs.length > 0 ? "default" : "secondary"} className="text-xs">
                  {docs.length} Document{docs.length !== 1 ? "s" : ""} Uploaded
                </Badge>

                {docs.length > 0 ? (
                  <div className="space-y-3">
                    {docs.map((doc: any) => {
                      const fileUrl = doc.file_path?.startsWith("http") ? doc.file_path : doc.file_path?.startsWith("/") ? doc.file_path : `/uploads/${doc.file_path}`;
                      const fileSizeKB = doc.file_size ? (doc.file_size / 1024).toFixed(1) : null;
                      const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB", { month: "short", day: "2-digit", year: "numeric" }) : "";
                      const uploadTime = doc.created_at ? new Date(doc.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

                      return (
                        <div key={doc.id} className="flex items-center gap-3 border border-border rounded-lg p-3 hover:bg-secondary/30 transition-colors">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold capitalize">{doc.document_type?.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground truncate">{doc.file_name || "Unknown file"}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {fileSizeKB && <span>{fileSizeKB} KB</span>}
                              {uploadDate && <><span>•</span><span>{uploadDate} {uploadTime}</span></>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/10 transition-colors">
                              <Eye className="h-3.5 w-3.5" /> View
                            </a>
                            <a href={fileUrl} download={doc.file_name}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-secondary transition-colors">
                              <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-medium text-destructive">No documents uploaded</p>
                    <p className="text-xs text-muted-foreground mt-1">Passport, NID, and photo should be uploaded before processing.</p>
                  </div>
                )}

                {/* Missing documents warning */}
                {docs.length > 0 && (() => {
                  const missing = getMissingRequiredDocuments(docs);
                  return missing.length > 0 ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                        ⚠ Missing: {missing.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ All required documents uploaded</p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}


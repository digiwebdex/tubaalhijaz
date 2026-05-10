import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Printer, DollarSign, TrendingUp, TrendingDown, Clock, Download,
  FileText, Hotel, Package, CreditCard, Eye, CalendarDays
} from "lucide-react";
import { generateInvoice, generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { generateCustomerPdf, getCompanyInfoForPdf, CustomerPdfData } from "@/lib/entityPdfGenerator";
import { toast } from "sonner";
import { formatBDT } from "@/lib/utils";

interface CustomerFinancialReportProps {
  customer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export default function CustomerFinancialReport({ customer, open, onOpenChange }: CustomerFinancialReportProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const getCompanyInfo = async (): Promise<CompanyInfo> => {
    return getCompanyInfoForPdf();
  };

  const handleInvoice = async (b: any) => {
    setGeneratingPdf(b.id);
    try {
      const bPayments = payments.filter((p) => p.booking_id === b.id);
      const [company, bookingRes] = await Promise.all([
        getCompanyInfo(),
        apiClient
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
        customer,
        bPayments as InvoicePayment[],
        company,
        { members: memberRows, forceFamily: isFamily }
      );
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed");
    }
    setGeneratingPdf(null);
  };

  const handleReceipt = async (p: any) => {
    setGeneratingPdf(p.id);
    try {
      const booking = bookings.find((b) => b.id === p.booking_id);
      const allBPayments = payments.filter((pm) => pm.booking_id === p.booking_id);
      const company = await getCompanyInfo();
      await generateReceipt(p as InvoicePayment, booking || {}, customer, company, allBPayments as InvoicePayment[]);
      toast.success("Receipt downloaded");
    } catch { toast.error("Failed"); }
    setGeneratingPdf(null);
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const { data } = await apiClient.storage.from("booking-documents").createSignedUrl(doc.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not generate URL");
    } catch { toast.error("Failed to open document"); }
  };

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);

    const fetchData = async () => {
      // Normalize phone for matching
      const normalizePhone = (p: string | null | undefined) => p ? p.replace(/[^\d]/g, "").slice(-10) : "";
      const customerPhone = normalizePhone(customer.phone);

      // Fetch bookings by user_id
      const { data: byUserId } = await apiClient.from("bookings").select("*, packages(name, type, price, duration_days, start_date)").eq("user_id", customer.user_id);

      // Also fetch bookings by guest_phone if customer has a phone
      let byPhone: any[] = [];
      if (customerPhone) {
        const { data: phoneBookings } = await apiClient.from("bookings").select("*, packages(name, type, price, duration_days, start_date)").ilike("guest_phone", `%${customerPhone}`);
        byPhone = phoneBookings || [];
      }

      // Merge and deduplicate
      const allBookings = [...(byUserId || [])];
      byPhone.forEach((b: any) => {
        if (!allBookings.find((ab: any) => ab.id === b.id)) allBookings.push(b);
      });

      setBookings(allBookings);

      // Collect all booking IDs for related queries
      const bIds = allBookings.map((b: any) => b.id);

      // Fetch payments by user_id + by booking_ids
      const { data: payByUser } = await apiClient.from("payments").select("*, bookings(tracking_id)").eq("user_id", customer.user_id).order("due_date", { ascending: true });
      let payByBooking: any[] = [];
      if (bIds.length > 0) {
        const { data: pb } = await apiClient.from("payments").select("*, bookings(tracking_id)").in("booking_id", bIds).order("due_date", { ascending: true });
        payByBooking = pb || [];
      }
      const allPayments = [...(payByUser || [])];
      payByBooking.forEach((p: any) => {
        if (!allPayments.find((ap: any) => ap.id === p.id)) allPayments.push(p);
      });
      setPayments(allPayments);

      // Documents & hotels by user_id (these are user-specific)
      const [docsRes, hotelRes, directExpRes] = await Promise.all([
        apiClient.from("booking_documents").select("*").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
        apiClient.from("hotel_bookings").select("*, hotels(name, city, location), hotel_rooms(name, price_per_night)").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
        apiClient.from("expenses").select("*").eq("customer_id", customer.user_id).order("date", { ascending: false }),
      ]);

      setDocuments(docsRes.data || []);
      setHotelBookings(hotelRes.data || []);

      // Get booking-linked expenses too
      let bookingExpenses: any[] = [];
      if (bIds.length > 0) {
        const { data: bExp } = await apiClient.from("expenses").select("*").in("booking_id", bIds);
        bookingExpenses = bExp || [];
      }

      // Merge direct customer expenses + booking-linked expenses (deduplicate)
      const allExpenses = [...(directExpRes.data || [])];
      bookingExpenses.forEach((be: any) => {
        if (!allExpenses.find((e: any) => e.id === be.id)) allExpenses.push(be);
      });
      setExpenses(allExpenses);
      setLoading(false);
    };

    fetchData();
  }, [open, customer]);

  const summary = useMemo(() => {
    const totalPaid = payments.filter((p) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalDue = payments.filter((p) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalBookingValue = bookings.reduce((s: number, b: any) => s + Number(b.total_amount), 0);
    return { totalPaid, totalExpenses, netProfit: totalPaid - totalExpenses, totalDue, totalBookingValue };
  }, [payments, expenses, bookings]);

  // Ledger timeline: merge all events chronologically
  const ledgerTimeline = useMemo(() => {
    const events: any[] = [];

    bookings.forEach((b: any) => {
      events.push({
        date: b.created_at,
        type: "booking",
        icon: "📋",
        label: `Booking Created`,
        detail: `${b.tracking_id} — ${(b.packages as any)?.name || "Package"} (${b.num_travelers} travelers)`,
        amount: Number(b.total_amount),
        amountType: "neutral",
      });
    });

    payments.forEach((p: any) => {
      if (p.status === "completed") {
        events.push({
          date: p.paid_at || p.created_at,
          type: "payment",
          icon: "💰",
          label: `Payment Received`,
          detail: `${(p.bookings as any)?.tracking_id || ""} — Installment #${p.installment_number || "N/A"} via ${p.payment_method || "manual"}`,
          amount: Number(p.amount),
          amountType: "income",
        });
      } else if (p.status === "pending") {
        events.push({
          date: p.due_date || p.created_at,
          type: "due",
          icon: "⏳",
          label: `Payment Due`,
          detail: `${(p.bookings as any)?.tracking_id || ""} — Installment #${p.installment_number || "N/A"}`,
          amount: Number(p.amount),
          amountType: "pending",
        });
      }
    });

    expenses.forEach((e: any) => {
      events.push({
        date: e.date || e.created_at,
        type: "expense",
        icon: "📤",
        label: `Expense: ${e.title}`,
        detail: `${e.expense_type || e.category || "general"} ${e.booking_id ? "• Linked to booking" : ""}`,
        amount: Number(e.amount),
        amountType: "expense",
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings, payments, expenses]);

  const DOC_TYPE_LABELS: Record<string, string> = {
    passport_copy: "Passport Copy", nid_copy: "NID Copy", photo: "Photo",
    visa_copy: "Visa Copy", ticket_copy: "Ticket Copy", other: "Other",
  };

  const EXPENSE_TYPE_LABELS: Record<string, string> = {
    visa: "Visa", ticket: "Ticket", hotel: "Hotel", transport: "Transport",
    food: "Food", guide: "Guide", office: "Office", other: "Other",
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print-report-content">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {customer.full_name || "Unnamed Customer"} — Ledger
          </DialogTitle>
          <DialogDescription>Complete financial ledger with all bookings, payments, expenses, and profit.</DialogDescription>
          <div className="flex gap-2 pt-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> প্রিন্ট
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const company = await getCompanyInfo();
              const pdfData: CustomerPdfData = {
                full_name: customer.full_name || "N/A",
                phone: customer.phone, email: customer.email,
                passport_number: customer.passport_number, nid_number: customer.nid_number,
                address: customer.address, date_of_birth: customer.date_of_birth,
                emergency_contact: customer.emergency_contact,
                bookings: bookings.map(b => ({
                  tracking_id: b.tracking_id, package_name: b.packages?.name || "—",
                  total: Number(b.total_amount), paid: Number(b.paid_amount),
                  due: Number(b.due_amount || 0), status: b.status,
                  date: b.created_at,
                })),
                payments: payments.filter(p => p.status === "completed").map(p => ({
                  amount: Number(p.amount), date: p.paid_at || p.created_at,
                  method: p.payment_method || "—", status: p.status,
                  installment: p.installment_number,
                  tracking_id: bookings.find(b => b.id === p.booking_id)?.tracking_id || "—",
                })),
                summary: {
                  totalBookings: bookings.length,
                  totalAmount: summary.totalPaid + summary.totalDue,
                  totalPaid: summary.totalPaid, totalDue: summary.totalDue,
                  totalExpenses: summary.totalExpenses, profit: summary.netProfit,
                },
              };
              await generateCustomerPdf(pdfData, company);
              toast.success("Customer PDF downloaded");
            }}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Customer Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{customer.phone || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Passport</span><p className="font-medium">{customer.passport_number || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Address</span><p className="font-medium">{customer.address || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p></div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div><p className="text-[10px] text-muted-foreground">Bookings</p><p className="font-semibold text-sm">{bookings.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <div><p className="text-[10px] text-muted-foreground">Total Paid</p><p className="font-semibold text-sm">{formatBDT(summary.totalPaid)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div><p className="text-[10px] text-muted-foreground">Total Due</p><p className="font-semibold text-sm">{formatBDT(summary.totalDue)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <div><p className="text-[10px] text-muted-foreground">Expenses</p><p className="font-semibold text-sm">{formatBDT(summary.totalExpenses)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div><p className="text-[10px] text-muted-foreground">Net Profit</p><p className={`font-semibold text-sm ${summary.netProfit < 0 ? "text-destructive" : ""}`}>{formatBDT(summary.netProfit)}</p></div>
          </CardContent></Card>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : (
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="ledger" className="text-xs gap-1"><CalendarDays className="h-3 w-3" /> Ledger</TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs gap-1"><Package className="h-3 w-3" /> Bookings</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> Payments</TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs gap-1"><TrendingDown className="h-3 w-3" /> Expenses</TabsTrigger>
              <TabsTrigger value="hotels" className="text-xs gap-1"><Hotel className="h-3 w-3" /> Hotels</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs gap-1"><FileText className="h-3 w-3" /> Docs</TabsTrigger>
            </TabsList>

            {/* ===== LEDGER TIMELINE TAB ===== */}
            <TabsContent value="ledger">
              <div className="relative pl-6 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                {ledgerTimeline.map((event, i) => (
                  <div key={i} className="relative flex items-start gap-3 py-3">
                    {/* Dot */}
                    <div className={`absolute left-[-13px] top-4 h-3 w-3 rounded-full border-2 border-background z-10 ${
                      event.amountType === "income" ? "bg-emerald-500" :
                      event.amountType === "expense" ? "bg-destructive" :
                      event.amountType === "pending" ? "bg-yellow-500" :
                      "bg-primary"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <span>{event.icon}</span>
                            <span className="truncate">{event.label}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.detail}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${
                            event.amountType === "income" ? "text-emerald-500" :
                            event.amountType === "expense" ? "text-destructive" :
                            event.amountType === "pending" ? "text-yellow-600" :
                            "text-foreground"
                          }`}>
                            {event.amountType === "income" ? "+" : event.amountType === "expense" ? "−" : ""}{formatBDT(event.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {ledgerTimeline.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 pl-4">No ledger entries yet.</p>
                )}
              </div>

              {/* Running Balance */}
              {ledgerTimeline.length > 0 && (
                <div className="mt-4 bg-card border border-border rounded-lg p-4 flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Inflow</p>
                    <p className="font-heading font-bold text-emerald-500">{formatBDT(summary.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Outflow</p>
                    <p className="font-heading font-bold text-destructive">{formatBDT(summary.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="font-heading font-bold text-yellow-600">{formatBDT(summary.totalDue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`font-heading font-bold ${summary.netProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>{formatBDT(summary.netProfit)}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ===== BOOKINGS TAB ===== */}
            <TabsContent value="bookings">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tracking ID</TableHead><TableHead>Package</TableHead>
                  <TableHead>Travelers</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.tracking_id}</TableCell>
                      <TableCell>
                        <p className="text-sm">{(b.packages as any)?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{(b.packages as any)?.type} • {(b.packages as any)?.duration_days || "—"} days</p>
                      </TableCell>
                      <TableCell>{b.num_travelers}</TableCell>
                      <TableCell>{formatBDT(Number(b.total_amount))}</TableCell>
                      <TableCell className="text-emerald-500 font-medium">{formatBDT(Number(b.paid_amount))}</TableCell>
                      <TableCell className="text-destructive font-medium">{formatBDT(Number(b.due_amount || 0))}</TableCell>
                      <TableCell><Badge variant={b.status === "completed" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <button onClick={() => handleInvoice(b)} disabled={generatingPdf === b.id} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                          <Download className="h-3 w-3" />{generatingPdf === b.id ? "..." : "Invoice"}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No bookings</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* ===== PAYMENTS TAB ===== */}
            <TabsContent value="payments">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Booking</TableHead><TableHead>#</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{(p.bookings as any)?.tracking_id || "—"}</TableCell>
                      <TableCell>{p.installment_number || "—"}</TableCell>
                      <TableCell className="font-medium">{formatBDT(Number(p.amount))}</TableCell>
                      <TableCell className="capitalize text-xs">{p.payment_method || "—"}</TableCell>
                      <TableCell className="text-xs">{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        {p.status === "completed" && (
                          <button onClick={() => handleReceipt(p)} disabled={generatingPdf === p.id} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                            <Download className="h-3 w-3" />{generatingPdf === p.id ? "..." : "Receipt"}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payments</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* ===== EXPENSES TAB ===== */}
            <TabsContent value="expenses">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead><TableHead>Linked Booking</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {expenses.map((e) => {
                    const linkedBooking = bookings.find((b: any) => b.id === e.booking_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{EXPENSE_TYPE_LABELS[e.expense_type] || e.category || "other"}</Badge>
                        </TableCell>
                        <TableCell className="text-destructive font-medium">{formatBDT(Number(e.amount))}</TableCell>
                        <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{linkedBooking?.tracking_id || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No expenses assigned</TableCell></TableRow>}
                </TableBody>
              </Table>
              {expenses.length > 0 && (
                <div className="mt-3 text-right">
                  <span className="text-sm text-muted-foreground">Total: </span>
                  <span className="font-heading font-bold text-destructive">{formatBDT(summary.totalExpenses)}</span>
                </div>
              )}
            </TabsContent>

            {/* ===== HOTELS TAB ===== */}
            <TabsContent value="hotels">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Hotel</TableHead><TableHead>Room</TableHead><TableHead>City</TableHead>
                  <TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {hotelBookings.map((hb) => (
                    <TableRow key={hb.id}>
                      <TableCell className="font-medium text-sm">{(hb.hotels as any)?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{(hb.hotel_rooms as any)?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{(hb.hotels as any)?.city || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(hb.check_in).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(hb.check_out).toLocaleDateString()}</TableCell>
                      <TableCell>{formatBDT(Number(hb.total_price))}</TableCell>
                      <TableCell><Badge variant={hb.status === "confirmed" ? "default" : "secondary"}>{hb.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {hotelBookings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No hotel bookings</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* ===== DOCUMENTS TAB ===== */}
            <TabsContent value="documents">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell><Badge variant="outline">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</Badge></TableCell>
                      <TableCell className="text-sm">{doc.file_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <button onClick={() => handleViewDocument(doc)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Eye className="h-3 w-3" /> View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No documents</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end print-hide">
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" /> Print Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

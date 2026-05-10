import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, MessageSquare, Phone, CheckCircle, Send } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface PaymentRow {
  id: string;
  amount: number;
  due_date: string;
  installment_number: number | null;
  status: string;
  booking_id: string;
  user_id: string;
  bookings: {
    tracking_id: string;
    user_id: string;
    packages: { name: string } | null;
  } | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export default function AdminDueAlertsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bookingDues, setBookingDues] = useState<any[]>([]);
  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, profilesRes, bookingsRes] = await Promise.all([
      apiClient
        .from("payments")
        .select("*, bookings(tracking_id, user_id, guest_name, guest_phone, packages(name))")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true }),
      apiClient.from("profiles").select("user_id, full_name, phone"),
      // Also fetch bookings with outstanding dues but no pending payment records
      apiClient
        .from("bookings")
        .select("id, tracking_id, user_id, guest_name, guest_phone, total_amount, paid_amount, due_amount, status, packages(name)")
        .gt("due_amount", 0)
        .in("status", ["pending", "confirmed", "visa_processing", "ticket_issued"])
        .order("created_at", { ascending: false }),
    ]);
    setPayments((paymentsRes.data as any[]) || []);
    setProfiles((profilesRes.data as any[]) || []);
    
    // Find bookings that have dues but NO pending payment records
    const paymentBookingIds = new Set((paymentsRes.data || []).map((p: any) => p.booking_id));
    const bookingsWithoutPayments = (bookingsRes.data || [])
      .filter((b: any) => !paymentBookingIds.has(b.id))
      .map((b: any) => ({
        id: `booking-${b.id}`,
        amount: Number(b.due_amount || 0),
        due_date: null,
        installment_number: null,
        status: "pending",
        booking_id: b.id,
        user_id: b.user_id || "",
        isBookingDue: true,
        bookings: {
          tracking_id: b.tracking_id,
          user_id: b.user_id,
          guest_name: b.guest_name,
          guest_phone: b.guest_phone,
          packages: b.packages,
        },
      }));
    setBookingDues(bookingsWithoutPayments);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles.forEach((p) => { map[p.user_id] = p; });
    return map;
  }, [profiles]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = useMemo(
    () => [
      ...payments.filter((p) => new Date(p.due_date) < today),
    ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [payments]
  );

  const upcoming = useMemo(
    () => [
      ...payments.filter((p) => {
        const d = new Date(p.due_date);
        return d >= today && differenceInDays(d, today) <= 30;
      }),
    ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [payments]
  );

  // Bookings with dues but no scheduled payments - show separately
  const allDueItems = useMemo(() => [...overdue, ...upcoming, ...bookingDues], [overdue, upcoming, bookingDues]);

  const overdueTotal = overdue.reduce((s, p) => s + Number(p.amount), 0);
  const upcomingTotal = upcoming.reduce((s, p) => s + Number(p.amount), 0);
  const bookingDueTotal = bookingDues.reduce((s, p) => s + Number(p.amount), 0);

  const getProfile = (p: any) => profileMap[p.bookings?.user_id || p.user_id];
  const getName = (p: any) => {
    const profile = getProfile(p);
    return profile?.full_name || p.bookings?.guest_name || "—";
  };
  const getPhone = (p: any) => {
    const profile = getProfile(p);
    return profile?.phone || p.bookings?.guest_phone || "—";
  };

  const markPaid = async (id: string) => {
    const { error } = await apiClient.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment marked as completed");
    fetchData();
  };

  const buildMessage = (p: PaymentRow) => {
    const profile = getProfile(p);
    const name = profile?.full_name || "Customer";
    const trackingId = p.bookings?.tracking_id || "N/A";
    return `Dear ${name}, your installment #${p.installment_number || 1} of BDT ${Number(p.amount).toLocaleString("en-IN")} for booking ${trackingId} is due on ${format(new Date(p.due_date), "dd MMM yyyy")}. Please make your payment at the earliest. Thank you!`;
  };

  const sendWhatsApp = (p: PaymentRow) => {
    const profile = getProfile(p);
    const phone = profile?.phone?.replace(/[^0-9]/g, "") || "";
    if (!phone) { toast.error("No phone number found"); return; }
    const msg = encodeURIComponent(buildMessage(p));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendSms = async (p: PaymentRow) => {
    const profile = getProfile(p);
    const phone = profile?.phone;
    if (!phone) { toast.error("No phone number found"); return; }
    setSendingId(p.id);
    try {
      const { data, error } = await apiClient.functions.invoke("send-notification", {
        body: {
          type: "payment_reminder",
          channels: ["sms"],
          user_id: p.bookings?.user_id || p.user_id,
          booking_id: p.booking_id,
          payment_id: p.id,
          amount: Number(p.amount),
          due_date: format(new Date(p.due_date), "dd MMM yyyy"),
          installment_number: p.installment_number || 1,
        },
      });
      if (error) throw error;
      toast.success("SMS reminder sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS");
    } finally {
      setSendingId(null);
    }
  };

  const sendEmailReminder = async (p: PaymentRow) => {
    setSendingId(p.id);
    try {
      const { data, error } = await apiClient.functions.invoke("send-notification", {
        body: {
          type: "payment_reminder",
          channels: ["email"],
          user_id: p.bookings?.user_id || p.user_id,
          booking_id: p.booking_id,
          payment_id: p.id,
          amount: Number(p.amount),
          due_date: format(new Date(p.due_date), "dd MMM yyyy"),
          installment_number: p.installment_number || 1,
        },
      });
      if (error) throw error;
      toast.success("Email reminder sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  const renderRow = (p: any, type: "overdue" | "upcoming" | "booking_due") => {
    const dueDate = p.due_date ? new Date(p.due_date) : null;
    const days = dueDate ? Math.abs(differenceInDays(dueDate, today)) : null;

    return (
      <TableRow key={p.id}>
        <TableCell className="font-mono text-xs">{p.bookings?.tracking_id || "—"}</TableCell>
        <TableCell>{getName(p)}</TableCell>
        <TableCell className="text-xs">{getPhone(p)}</TableCell>
        <TableCell className="text-center">{p.installment_number || "—"}</TableCell>
        <TableCell className="font-medium">BDT {Number(p.amount).toLocaleString("en-IN")}</TableCell>
        <TableCell>{dueDate ? format(dueDate, "dd MMM yyyy") : "No date set"}</TableCell>
        <TableCell>
          {type === "booking_due" ? (
            <Badge variant="secondary">Outstanding</Badge>
          ) : (
            <Badge variant={type === "overdue" ? "destructive" : "secondary"}>
              {days} {type === "overdue" ? "days overdue" : "days left"}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1.5">
            {!p.isBookingDue && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendSms(p)} disabled={sendingId === p.id}>
                  <Phone className="h-3 w-3" /> SMS
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendEmailReminder(p)} disabled={sendingId === p.id}>
                  <Send className="h-3 w-3" /> Email
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendWhatsApp(p)}>
                  <MessageSquare className="h-3 w-3" /> WhatsApp
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => markPaid(p.id)}>
                  <CheckCircle className="h-3 w-3" /> Paid
                </Button>
              </>
            )}
            {p.isBookingDue && (
              <span className="text-xs text-muted-foreground">No installment schedule</span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) return <div className="flex justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" /> Due Alerts
      </h2>

      <Tabs defaultValue="all_dues">
        <TabsList>
          <TabsTrigger value="all_dues" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> All Dues ({bookingDues.length + overdue.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all_dues">
          <Card className="mb-4">
            <CardContent className="py-4 flex gap-6">
              <div><span className="text-sm text-muted-foreground">Bookings with Dues</span><p className="text-2xl font-bold text-destructive">{bookingDues.length + overdue.length}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Outstanding</span><p className="text-2xl font-bold">BDT {(bookingDueTotal + overdueTotal).toLocaleString("en-IN")}</p></div>
            </CardContent>
          </Card>
          {(bookingDues.length + overdue.length) === 0 ? (
            <p className="text-center text-muted-foreground py-12">No outstanding dues 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="text-center">#</TableHead><TableHead>Due Amount</TableHead><TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((p) => renderRow(p, "overdue"))}
                  {bookingDues.map((p) => renderRow(p, "booking_due"))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue">
          <Card className="mb-4">
            <CardContent className="py-4 flex gap-6">
              <div><span className="text-sm text-muted-foreground">Overdue Payments</span><p className="text-2xl font-bold text-destructive">{overdue.length}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Amount</span><p className="text-2xl font-bold">BDT {overdueTotal.toLocaleString("en-IN")}</p></div>
            </CardContent>
          </Card>
          {overdue.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No overdue payments 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="text-center">#</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{overdue.map((p) => renderRow(p, "overdue"))}</TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          <Card className="mb-4">
            <CardContent className="py-4 flex gap-6">
              <div><span className="text-sm text-muted-foreground">Upcoming (30 days)</span><p className="text-2xl font-bold text-primary">{upcoming.length}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Amount</span><p className="text-2xl font-bold">BDT {upcomingTotal.toLocaleString("en-IN")}</p></div>
            </CardContent>
          </Card>
          {upcoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No upcoming payments in the next 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="text-center">#</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{upcoming.map((p) => renderRow(p, "upcoming"))}</TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

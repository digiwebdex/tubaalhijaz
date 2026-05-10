import { useEffect, useState, useMemo } from "react";
import { formatTrackingId } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Mail, MessageSquare, Send, Filter, RefreshCw, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { format } from "date-fns";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const EVENT_LABELS: Record<string, string> = {
  booking_created: "Booking Created",
  booking_confirmed: "Booking Confirmed",
  booking_completed: "Booking Completed",
  payment_received: "Payment Received",
  payment_reminder: "Payment Reminder",
  custom: "Custom",
};

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
};

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  const [sendForm, setSendForm] = useState({
    type: "custom" as string,
    channels: ["email", "sms"] as string[],
    booking_id: "",
    custom_subject: "",
    custom_message: "",
  });

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await apiClient
      .from("notification_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs((data as any[]) || []);
    setLoading(false);
  };

  const fetchBookings = async () => {
    const { data } = await apiClient
      .from("bookings")
      .select("id, tracking_id, user_id, total_amount, paid_amount, packages(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setBookings(data || []);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (filterEvent && l.event_type !== filterEvent) return false;
      if (filterChannel && l.channel !== filterChannel) return false;
      return true;
    });
  }, [logs, filterEvent, filterChannel]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l: any) => l.status === "sent").length;
    const failed = logs.filter((l: any) => l.status === "failed").length;
    const emailCount = logs.filter((l: any) => l.channel === "email").length;
    const smsCount = logs.filter((l: any) => l.channel === "sms").length;
    return { total, sent, failed, emailCount, smsCount };
  }, [logs]);

  const toggleChannel = (ch: string) => {
    const channels = sendForm.channels.includes(ch)
      ? sendForm.channels.filter((c) => c !== ch)
      : [...sendForm.channels, ch];
    setSendForm({ ...sendForm, channels });
  };

  const handleSend = async () => {
    if (!sendForm.channels.length) { toast.error("Select at least one channel"); return; }

    const selectedBooking = bookings.find((b) => b.id === sendForm.booking_id);
    if (!selectedBooking && sendForm.type !== "custom") {
      toast.error("Select a booking");
      return;
    }
    if (sendForm.type === "custom" && !sendForm.custom_message) {
      toast.error("Enter a message");
      return;
    }

    setSending(true);
    try {
      const { error } = await apiClient.functions.invoke("send-notification", {
        body: {
          type: sendForm.type,
          channels: sendForm.channels,
          user_id: selectedBooking?.user_id,
          booking_id: sendForm.booking_id || undefined,
          custom_subject: sendForm.custom_subject || undefined,
          custom_message: sendForm.custom_message || undefined,
        },
      });
      if (error) throw error;
      toast.success("Notification sent!");
      fetchLogs();
      setShowSendForm(false);
      setSendForm({ type: "custom", channels: ["email", "sms"], booking_id: "", custom_subject: "", custom_message: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    }
    setSending(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notifications
        </h2>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/settings#notification-settings")}
            className="gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" /> SMS/Email Config
          </Button>
          <Button size="sm" variant="outline" onClick={fetchLogs} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowSendForm(!showSendForm); if (!showSendForm) fetchBookings(); }} className="gap-1.5 bg-gradient-gold text-primary-foreground">
            <Send className="h-3.5 w-3.5" /> {showSendForm ? "Cancel" : "Send Notification"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <Card><CardContent className="py-3 px-4"><span className="text-xs text-muted-foreground">Total</span><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><span className="text-xs text-muted-foreground">Sent</span><p className="text-xl font-bold text-emerald">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><span className="text-xs text-muted-foreground">Failed</span><p className="text-xl font-bold text-destructive">{stats.failed}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span><p className="text-xl font-bold">{stats.emailCount}</p></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> SMS</span><p className="text-xl font-bold">{stats.smsCount}</p></CardContent></Card>
      </div>

      {/* Send Form */}
      {showSendForm && (
        <Card className="mb-5">
          <CardContent className="py-5 space-y-4">
            <h3 className="font-semibold text-sm">Send Notification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Event Type</label>
                <select className={inputClass} value={sendForm.type} onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Booking</label>
                <select className={inputClass} value={sendForm.booking_id} onChange={(e) => setSendForm({ ...sendForm, booking_id: e.target.value })}>
                  <option value="">Select booking...</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>{formatTrackingId(b.tracking_id)} — {b.packages?.name || "N/A"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Channels</label>
                <div className="flex gap-2">
                  {["email", "sms"].map((ch) => (
                    <button key={ch} onClick={() => toggleChannel(ch)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ${
                        sendForm.channels.includes(ch) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}>
                      {ch === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {sendForm.type === "custom" && (
              <div className="grid grid-cols-1 gap-3">
                <input className={inputClass} placeholder="Subject (for email)" value={sendForm.custom_subject} onChange={(e) => setSendForm({ ...sendForm, custom_subject: e.target.value })} />
                <textarea className={inputClass} placeholder="Message *" rows={3} value={sendForm.custom_message} onChange={(e) => setSendForm({ ...sendForm, custom_message: e.target.value })} />
              </div>
            )}
            <Button onClick={handleSend} disabled={sending} className="bg-gradient-gold text-primary-foreground">
              {sending ? "Sending..." : "Send Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </div>
        <select className={inputClass + " w-40"} value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={inputClass + " w-32"} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">No notifications found.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log: any) => {
                const ChannelIcon = CHANNEL_ICON[log.channel] || Mail;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {EVENT_LABELS[log.event_type] || log.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        <ChannelIcon className="h-3 w-3" /> {log.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[160px]">{log.recipient}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{log.subject || "—"}</TableCell>
                    <TableCell>
                      {log.status === "sent" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald"><CheckCircle className="h-3 w-3" /> Sent</span>
                      ) : log.status === "failed" ? (
                        <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> Failed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, FileText, CreditCard, Stamp, Hotel, Plane, FileSignature,
  Bus, Briefcase, Users, ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

type EventState = "completed" | "active" | "pending";

interface TimelineEvent {
  key: string;
  title: string;
  titleBn?: string;
  description?: string;
  icon: any;
  state: EventState;
  at?: string | null;
  badge?: string;
}

interface Booking {
  id: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_amount?: number;
  created_at?: string;
  driver_name?: string | null;
  vehicle_number?: string | null;
  pickup_time?: string | null;
}
interface Payment { id: string; status: string; paid_at?: string | null; amount: number; }
interface Doc { id: string; document_type: string; verification_status?: string; created_at?: string; verified_at?: string | null; }

interface Props {
  booking: Booking;
  payments?: Payment[];
  documents?: Doc[];
  className?: string;
}

const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

export default function BookingTimeline({ booking, payments = [], documents = [], className = "" }: Props) {
  const events = useMemo<TimelineEvent[]>(() => {
    const completedPayments = payments.filter((p) => p.status === "completed");
    const lastPayment = completedPayments.sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || ""))[0];
    const passport = documents.find((d) => /passport/i.test(d.document_type));
    const visa = documents.find((d) => /visa/i.test(d.document_type));
    const isFullyPaid = Number(booking.due_amount || 0) <= 0 && Number(booking.paid_amount) >= Number(booking.total_amount);
    const status = (booking.status || "").toLowerCase();

    const stateOf = (cond: boolean, active = false): EventState =>
      cond ? "completed" : active ? "active" : "pending";

    const list: TimelineEvent[] = [
      {
        key: "created",
        title: "Booking Created",
        titleBn: "বুকিং তৈরি",
        icon: Briefcase,
        state: "completed",
        at: booking.created_at,
        badge: "completed",
      },
      {
        key: "invoice",
        title: "Invoice Generated",
        titleBn: "ইনভয়েস তৈরি",
        icon: FileText,
        state: "completed",
        at: booking.created_at,
        badge: "completed",
      },
      {
        key: "payment",
        title: completedPayments.length > 0 ? "Payment Received" : "Awaiting Payment",
        titleBn: completedPayments.length > 0 ? "পেমেন্ট গৃহীত" : "পেমেন্টের অপেক্ষা",
        description: completedPayments.length
          ? `${completedPayments.length} payment(s) totaling ৳${Number(booking.paid_amount).toLocaleString("en-IN")}`
          : `Due: ৳${Number(booking.due_amount || 0).toLocaleString("en-IN")}`,
        icon: CreditCard,
        state: stateOf(isFullyPaid, completedPayments.length > 0),
        at: lastPayment?.paid_at,
        badge: isFullyPaid ? "paid" : completedPayments.length ? "processing" : "awaiting_payment",
      },
      {
        key: "passport",
        title: passport ? "Passport Uploaded" : "Passport Pending",
        titleBn: "পাসপোর্ট",
        icon: FileSignature,
        state: stateOf(!!passport, !!passport && passport.verification_status === "pending"),
        at: passport?.verified_at || passport?.created_at,
        badge: passport?.verification_status || (passport ? "processing" : "pending"),
      },
      {
        key: "visa",
        title: visa?.verification_status === "approved" ? "Visa Approved" : visa ? "Visa Submitted" : "Visa Pending",
        titleBn: "ভিসা",
        icon: Stamp,
        state: stateOf(visa?.verification_status === "approved", !!visa),
        at: visa?.verified_at || visa?.created_at,
        badge: visa?.verification_status === "approved" ? "visa_approved" : visa ? "processing" : "pending",
      },
      {
        key: "hotel",
        title: ["confirmed", "completed", "ticket_issued", "visa_issued"].includes(status) ? "Hotel Confirmed" : "Hotel Pending",
        titleBn: "হোটেল",
        icon: Hotel,
        state: stateOf(["confirmed", "completed", "ticket_issued"].includes(status), status === "visa_issued"),
        badge: ["confirmed", "completed"].includes(status) ? "hotel_confirmed" : "pending",
      },
      {
        key: "flight",
        title: ["ticket_issued", "ticket_confirmed", "completed"].includes(status) ? "Flight Confirmed" : "Flight Pending",
        titleBn: "ফ্লাইট",
        icon: Plane,
        state: stateOf(["ticket_issued", "ticket_confirmed", "completed"].includes(status)),
        badge: ["ticket_issued", "ticket_confirmed"].includes(status) ? "confirmed" : "pending",
      },
      {
        key: "driver",
        title: booking.driver_name ? "Driver Assigned" : "Driver Pending",
        titleBn: "ড্রাইভার",
        description: booking.driver_name ? `${booking.driver_name} · ${booking.vehicle_number || "—"}` : undefined,
        icon: Bus,
        state: stateOf(!!booking.driver_name),
        at: booking.pickup_time,
        badge: booking.driver_name ? "driver_assigned" : "pending",
      },
      {
        key: "qr",
        title: "QR Verification Active",
        titleBn: "QR যাচাই",
        icon: ShieldCheck,
        state: "completed",
        badge: "qr_verified",
      },
      {
        key: "departure",
        title: status === "completed" ? "Departure Completed" : "Departure",
        titleBn: "ডিপারচার",
        icon: Users,
        state: stateOf(status === "completed"),
        badge: status === "completed" ? "completed" : "scheduled",
      },
    ];
    return list;
  }, [booking, payments, documents]);

  return (
    <div className={`relative ${className}`}>
      {/* Vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-400/60 via-primary/30 to-border" />

      <ol className="space-y-3">
        {events.map((e, i) => {
          const Icon = e.icon;
          const isCompleted = e.state === "completed";
          const isActive = e.state === "active";
          return (
            <motion.li
              key={e.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex gap-3 items-start"
            >
              <div
                className={`relative z-10 w-10 h-10 shrink-0 rounded-full border flex items-center justify-center
                  ${isCompleted
                    ? "bg-gradient-to-br from-amber-300/30 to-amber-600/10 border-amber-400/60 text-amber-600 dark:text-amber-300"
                    : isActive
                    ? "bg-sky-500/10 border-sky-400/60 text-sky-600 dark:text-sky-300 animate-pulse"
                    : "bg-muted/40 border-border text-muted-foreground"}
                `}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0 pb-3">
                <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {e.title}
                        {e.titleBn && <span className="ml-2 text-[10px] text-muted-foreground font-normal">· {e.titleBn}</span>}
                      </div>
                      {e.description && <div className="text-xs text-muted-foreground mt-0.5">{e.description}</div>}
                      {e.at && <div className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtDate(e.at)}</div>}
                    </div>
                    {e.badge && <StatusBadge kind={e.badge} size="xs" />}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

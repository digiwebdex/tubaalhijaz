import { ReactNode } from "react";
import {
  CheckCircle2, Clock, Loader2, XCircle, AlertTriangle,
  Plane, Hotel, FileCheck2, CreditCard, Stamp, Bus, Map, ShieldCheck,
} from "lucide-react";

export type BadgeKind =
  | "pending" | "processing" | "confirmed" | "completed" | "cancelled" | "failed" | "overdue"
  | "approved" | "rejected" | "paid" | "due" | "active"
  | "visa_approved" | "awaiting_payment" | "driver_assigned" | "hotel_confirmed"
  | "qr_verified" | "movement_active" | "scheduled" | "on_route" | "arrived" | "delayed";

const MAP: Record<BadgeKind, { label: string; cls: string; icon?: any }> = {
  pending:           { label: "Pending",          cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   icon: Clock },
  processing:        { label: "Processing",       cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",            icon: Loader2 },
  confirmed:         { label: "Confirmed",        cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  completed:         { label: "Completed",        cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  cancelled:         { label: "Cancelled",        cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",        icon: XCircle },
  failed:            { label: "Failed",           cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",        icon: XCircle },
  overdue:           { label: "Overdue",          cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",        icon: AlertTriangle },
  approved:          { label: "Approved",         cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  rejected:          { label: "Rejected",         cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",        icon: XCircle },
  paid:              { label: "Paid",             cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  due:               { label: "Due",              cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   icon: Clock },
  active:            { label: "Active",           cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",            icon: CheckCircle2 },
  visa_approved:     { label: "Visa Approved",    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: Stamp },
  awaiting_payment:  { label: "Awaiting Payment", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   icon: CreditCard },
  driver_assigned:   { label: "Driver Assigned",  cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", icon: Bus },
  hotel_confirmed:   { label: "Hotel Confirmed",  cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",            icon: Hotel },
  qr_verified:       { label: "QR Verified",      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: ShieldCheck },
  movement_active:   { label: "Movement Active",  cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",            icon: Map },
  scheduled:         { label: "Scheduled",        cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",   icon: Clock },
  on_route:          { label: "On Route",         cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",            icon: Plane },
  arrived:           { label: "Arrived",          cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  delayed:           { label: "Delayed",          cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   icon: AlertTriangle },
};

export function StatusBadge({
  kind, label, size = "sm", icon: forceIcon, className = "",
}: {
  kind: BadgeKind | string;
  label?: string;
  size?: "xs" | "sm" | "md";
  icon?: any;
  className?: string;
}) {
  const k = (kind as string)?.toLowerCase() as BadgeKind;
  const def = MAP[k] || MAP.pending;
  const Icon = forceIcon || def.icon;
  const sz = size === "xs"
    ? "text-[10px] px-1.5 py-0.5"
    : size === "md"
    ? "text-xs px-3 py-1"
    : "text-[11px] px-2 py-0.5";
  const showLabel = label ?? def.label;
  const isProcessing = k === "processing";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${def.cls} ${sz} ${className}`}>
      {Icon && <Icon className={`w-3 h-3 ${isProcessing ? "animate-spin" : ""}`} />}
      <span className="capitalize">{showLabel}</span>
    </span>
  );
}

/** Wrapper helper for plain string statuses (e.g. "completed", "pending"). */
export function statusBadgeFor(status?: string | null, fallback: BadgeKind = "pending"): ReactNode {
  if (!status) return <StatusBadge kind={fallback} />;
  return <StatusBadge kind={status as BadgeKind} />;
}

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  titleBn: string;
  badge?: string;
  intro: string;
  steps: { title: string; detail: string }[];
  tips?: string[];
}

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    titleBn: "শুরু করার পদ্ধতি",
    badge: "Basics",
    intro: "Admin Panel এ login করার পর আপনি Dashboard দেখবেন। বাম পাশে sidebar থেকে সব module access করা যায়।",
    steps: [
      { title: "Login", detail: "/admin route এ যান। Email + Password দিন। 2FA enabled থাকলে SMS/Authenticator code দিন।" },
      { title: "Dashboard Overview", detail: "Total bookings, revenue, due, recent activity, KPI cards দেখা যাবে।" },
      { title: "Sidebar Navigation", detail: "Bookings, Customers, Packages, Payments, Accounting, Reports, CMS, Settings — সব এক জায়গায়।" },
      { title: "Language Toggle", detail: "Top-right এ EN/বাংলা switch — পুরো UI bilingual।" },
    ],
    tips: ["Primary admin role delete করা যায় না (DB trigger protected)।", "Session timeout 30 minutes — inactivity তে auto logout।"],
  },
  {
    id: "bookings",
    title: "Booking Management",
    titleBn: "বুকিং ব্যবস্থাপনা",
    badge: "Core",
    intro: "Hajj, Umrah, Tour, Ticket, Visa — সব ধরনের booking এখানে create, edit, track করুন। প্রতিটা booking এর tracking ID auto-generate হয় (TT-XXXX)।",
    steps: [
      { title: "Create Booking", detail: "Bookings → Create Booking। Customer (existing/new), Package, Travelers count, Total amount, Moallem, Supplier দিন।" },
      { title: "Travelers", detail: "প্রতি traveler এর Name, Passport, NID, Phone আলাদা ভাবে save হয়। Documents upload করুন (Passport copy, NID, Photo)।" },
      { title: "Status Flow", detail: "Pending → Confirmed → In Progress → Completed। Cancelled হলে financial calculation থেকে বাদ যায়।" },
      { title: "Payment Tracking", detail: "Total, Paid, Due auto-calculate। Installment schedule generate করতে পারেন (3-12 months)।" },
      { title: "Tracking ID", detail: "Customer public link এ tracking ID দিয়ে status দেখতে পারে।" },
    ],
    tips: ["Soft delete only — booking 'deleted' status এ যায়, hard delete হয় না।", "Guest booking auto Moallem 'Manasik Travel Hub' এ assigned হয়।"],
  },
  {
    id: "customers",
    title: "Customer Management",
    titleBn: "কাস্টমার ব্যবস্থাপনা",
    badge: "Core",
    intro: "Customer profiles, contact info, booking history, due payments — এক জায়গায়।",
    steps: [
      { title: "Add Customer", detail: "Customers → Add। Name, Phone, Email, NID, Address। Phone number unique।" },
      { title: "Profile View", detail: "প্রতি customer এর সব booking, payment history, due summary দেখা যায়।" },
      { title: "Phone Matching", detail: "OTP login এর সময় phone দিয়ে existing profile auto-link হয়।" },
      { title: "Bulk Communication", detail: "Filter করে SMS/Email পাঠাতে পারবেন।" },
    ],
  },
  {
    id: "packages",
    title: "Package & Hotel Setup",
    titleBn: "প্যাকেজ ও হোটেল সেটআপ",
    badge: "Catalog",
    intro: "Hajj/Umrah packages, Hotel inventory, pricing, inclusions — public website এ এগুলোই দেখা যায়।",
    steps: [
      { title: "Create Package", detail: "Packages → Create। Title, Description, Price, Duration, Inclusions, Images, Expiry date।" },
      { title: "Hotel Linking", detail: "Hotels module থেকে Makkah/Madinah hotels add করুন, package এর সাথে link করুন।" },
      { title: "Auto Expiry", detail: "Expiry date পেরোলে package status auto 'inactive' হয়ে যায়।" },
      { title: "SEO", detail: "প্রতি package এর meta title, description, og-image set করুন।" },
    ],
  },
  {
    id: "payments",
    title: "Payments & Wallets",
    titleBn: "পেমেন্ট ও ওয়ালেট",
    badge: "Finance",
    intro: "Customer payments, supplier payments, commission — সব Cash/Bank/bKash/Nagad wallet এর সাথে linked।",
    steps: [
      { title: "Record Payment", detail: "Payments → New। Booking select, Amount, Method (Cash/Bank/bKash/Nagad), Wallet (mandatory), Receipt upload।" },
      { title: "Online Payment", detail: "Customer Dashboard/TrackBooking থেকে SSLCommerz দিয়ে directly pay করতে পারে।" },
      { title: "Installments", detail: "Create করার সময় auto-schedule generate হয়। প্রতিটা installment আলাদা track।" },
      { title: "Refund", detail: "Refunds module → Booking select, refund amount, wallet। Booking auto-cancelled হবে।" },
    ],
    tips: ["Bank transfer এর জন্য proof file mandatory।", "Wallet balance insufficient হলে payment block হবে (DB trigger)।"],
  },
  {
    id: "moallem",
    title: "Moallem Management",
    titleBn: "মোয়াল্লেম ব্যবস্থাপনা",
    badge: "Operations",
    intro: "Moallem (group leader) profiles, Hajji count, advance payments, commission tracking।",
    steps: [
      { title: "Add Moallem", detail: "Moallems → Add। Name, Phone, NID, Address।" },
      { title: "Advance Payment", detail: "Moallem থেকে advance নিলে record করুন। FIFO basis এ booking এ distribute হবে।" },
      { title: "Hajji Count", detail: "Booking এ Moallem assign করলে count auto-update।" },
      { title: "Commission", detail: "Booking complete হলে commission calculate, payment record করুন।" },
    ],
  },
  {
    id: "suppliers",
    title: "Supplier Agents",
    titleBn: "সাপ্লায়ার এজেন্ট",
    badge: "Operations",
    intro: "Air ticket, hotel, transport supplier agents এবং তাদের payments track করুন।",
    steps: [
      { title: "Add Agent", detail: "Supplier Agents → Add। Name, Type (Air/Hotel/Transport), Contact।" },
      { title: "Contracts", detail: "Long-term contract create করতে পারবেন — total amount, paid, due track।" },
      { title: "Payment", detail: "Booking-wise বা contract-wise payment record। Wallet থেকে auto deduct।" },
    ],
  },
  {
    id: "tickets-visa",
    title: "Tickets & Visa",
    titleBn: "টিকেট ও ভিসা",
    badge: "Service",
    intro: "Standalone air ticket booking এবং visa application service management।",
    steps: [
      { title: "Ticket Booking", detail: "Tickets → New। Passenger, PNR, Route, Cost (our), Billing (customer), Profit auto-calc।" },
      { title: "Ticket Refund", detail: "Refund module — our charge vs customer charge difference profit।" },
      { title: "Visa Application", detail: "Visa → New। Country, Type, Cost, Billing। Status track (Applied/Approved/Rejected)।" },
      { title: "Invoice", detail: "Auto invoice numbers — TKT, VS, RFN prefix।" },
    ],
  },
  {
    id: "accounting",
    title: "Accounting & Reports",
    titleBn: "একাউন্টিং ও রিপোর্ট",
    badge: "Finance",
    intro: "Double-entry ledger, Chart of accounts, Daily cashbook, Expenses, Financial summary, P&L, Receivables।",
    steps: [
      { title: "Chart of Accounts", detail: "Income, Expense, Asset (Cash/Bank/bKash/Nagad), Liability accounts manage।" },
      { title: "Daily Cashbook", detail: "প্রতিদিনের income/expense entry — auto wallet update।" },
      { title: "Expenses", detail: "Office rent, salary, marketing, utility — categorized expense।" },
      { title: "Reports", detail: "Reports module → Date range select → Income, Expense, Profit, Customer-wise, Booking-wise।" },
      { title: "Wallet Recalc", detail: "Settings → Recalculate Wallet Balances (গরমিল হলে use করুন)।" },
    ],
    tips: ["Cancelled bookings সব calculation থেকে exclude।", "প্রতি transaction master ledger এ যায় — full audit trail।"],
  },
  {
    id: "cms",
    title: "Website CMS",
    titleBn: "ওয়েবসাইট কন্টেন্ট",
    badge: "Marketing",
    intro: "Homepage banner, About, Contact, Privacy, Terms, Refund policy — public site এর সব content edit করুন।",
    steps: [
      { title: "Banners", detail: "Hero slider banners — 16:9 ratio recommended, max 3 active।" },
      { title: "Pages", detail: "About, Contact, Policy pages — rich text editor।" },
      { title: "SEO", detail: "Site-wide SEO settings, meta tags, og-image, favicon।" },
      { title: "Footer", detail: "Contact info, social links, address।" },
    ],
    tips: ["শুধু admin/cms_manager role এর CMS access আছে।"],
  },
  {
    id: "notifications",
    title: "Notifications & Alerts",
    titleBn: "নোটিফিকেশন ও অ্যালার্ট",
    badge: "Automation",
    intro: "SMS (BulkSMSBD), Email, in-app notifications। Auto due reminder cron।",
    steps: [
      { title: "Notification Center", detail: "Notifications → সব sent SMS/Email log। Filter by type/date।" },
      { title: "Due Alerts", detail: "Due Alerts → upcoming due, overdue customers list। Manual SMS পাঠাতে পারবেন।" },
      { title: "Auto Reminder", detail: "Daily 09:30 AM Asia/Dhaka — 3 days before, on due, 3 days late, 7 days late SMS auto যায়।" },
      { title: "Manual Trigger", detail: "Security page থেকে Test Run করতে পারবেন।" },
    ],
  },
  {
    id: "security",
    title: "Security & 2FA",
    titleBn: "সিকিউরিটি ও টু-ফ্যাক্টর",
    badge: "Security",
    intro: "Admin account এর জন্য SMS OTP বা TOTP (Google Authenticator) 2FA enable করুন।",
    steps: [
      { title: "Enable SMS 2FA", detail: "Security → SMS 2FA → Phone দিয়ে enable। Login এর সময় OTP যাবে।" },
      { title: "Enable TOTP", detail: "Security → TOTP Setup → QR code scan with Google Authenticator/Authy → 6-digit code confirm।" },
      { title: "Audit Logs", detail: "Audit Logs page এ সব admin action — who, what, when, IP, change diff।" },
      { title: "Role Management", detail: "Settings → Users → Role assign (admin, accountant, cms_manager, support)।" },
    ],
    tips: ["Primary admin role delete করা যায় না।", "Public registration disabled — শুধু admin user provision করতে পারে।"],
  },
  {
    id: "bulk-import",
    title: "Bulk Import & Backup",
    titleBn: "বাল্ক ইম্পোর্ট ও ব্যাকআপ",
    badge: "Tools",
    intro: "Excel/CSV থেকে bulk booking import এবং database backup/restore।",
    steps: [
      { title: "Bulk Import", detail: "Bulk Import → Template download → fill করে upload → preview → confirm।" },
      { title: "Database Backup", detail: "Settings → Backup → Manual download (.sql)। Auto Google Drive backup configured।" },
      { title: "Restore", detail: "Strict table order মেনে restore করতে হয় (FK constraint)। Production এ careful।" },
    ],
  },
];

const AdminGuidePage = () => {
  const [generating, setGenerating] = useState(false);

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 20;

      // Cover
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 60, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26).setFont("helvetica", "bold");
      pdf.text("Admin User Guide", pageW / 2, 30, { align: "center" });
      pdf.setFontSize(13).setFont("helvetica", "normal");
      pdf.text("TUBA ALHIJAZ — Travel Management ERP", pageW / 2, 42, { align: "center" });
      pdf.setFontSize(9);
      pdf.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageW / 2, 50, { align: "center" });

      pdf.setTextColor(30, 30, 30);
      y = 75;
      pdf.setFontSize(14).setFont("helvetica", "bold");
      pdf.text("Table of Contents", 15, y);
      y += 8;
      pdf.setFontSize(10).setFont("helvetica", "normal");
      SECTIONS.forEach((s, i) => {
        pdf.text(`${i + 1}. ${s.title}`, 18, y);
        y += 6;
      });

      // Sections
      SECTIONS.forEach((s, idx) => {
        pdf.addPage();
        y = 20;
        // Header bar
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageW, 14, "F");
        pdf.setTextColor(255, 255, 255).setFontSize(10).setFont("helvetica", "bold");
        pdf.text(`Section ${idx + 1}`, 15, 9);
        pdf.text("TUBA ALHIJAZ Admin Guide", pageW - 15, 9, { align: "right" });

        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(18).setFont("helvetica", "bold");
        pdf.text(`${idx + 1}. ${s.title}`, 15, y + 5);
        pdf.setFontSize(11).setFont("helvetica", "italic").setTextColor(100, 100, 100);
        pdf.text(s.titleBn, 15, y + 12);
        y += 22;

        pdf.setFontSize(10).setFont("helvetica", "normal").setTextColor(40, 40, 40);
        const introLines = pdf.splitTextToSize(s.intro, pageW - 30);
        pdf.text(introLines, 15, y);
        y += introLines.length * 5 + 4;

        autoTable(pdf, {
          startY: y,
          head: [["#", "Step", "Details"]],
          body: s.steps.map((st, i) => [i + 1, st.title, st.detail]),
          theme: "striped",
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 10 },
          bodyStyles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40, fontStyle: "bold" }, 2: { cellWidth: "auto" } },
          margin: { left: 15, right: 15 },
        });

        y = (pdf as any).lastAutoTable.finalY + 6;

        if (s.tips?.length) {
          if (y > pageH - 40) { pdf.addPage(); y = 20; }
          pdf.setFillColor(254, 243, 199);
          pdf.setDrawColor(251, 191, 36);
          const tipsHeight = s.tips.length * 5 + 10;
          pdf.roundedRect(15, y, pageW - 30, tipsHeight, 2, 2, "FD");
          pdf.setFontSize(10).setFont("helvetica", "bold").setTextColor(120, 53, 15);
          pdf.text("💡 Tips", 20, y + 6);
          pdf.setFontSize(9).setFont("helvetica", "normal").setTextColor(80, 50, 10);
          s.tips.forEach((t, i) => {
            pdf.text(`• ${t}`, 20, y + 12 + i * 5);
          });
        }
      });

      // Footer page numbers
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8).setTextColor(120, 120, 120);
        pdf.text(`Page ${i} of ${total}`, pageW / 2, pageH - 8, { align: "center" });
      }

      pdf.save(`TripTastic-Admin-Guide-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> Admin User Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            TUBA ALHIJAZ ERP — সম্পূর্ণ admin manual। প্রতিটা module কীভাবে use করবেন step-by-step।
          </p>
        </div>
        <Button onClick={downloadPdf} disabled={generating} size="lg">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {SECTIONS.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="text-sm hover:text-primary hover:underline">
                {i + 1}. {s.title} <span className="text-muted-foreground text-xs">— {s.titleBn}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={SECTIONS.map((s) => s.id)} className="space-y-3">
        {SECTIONS.map((s, idx) => (
          <AccordionItem key={s.id} value={s.id} id={s.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.title}
                    {s.badge && <Badge variant="secondary" className="text-[10px]">{s.badge}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal">{s.titleBn}</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{s.intro}</p>
              <div className="space-y-2">
                {s.steps.map((st, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/40">
                    <span className="flex-shrink-0 h-6 w-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="text-sm">
                      <div className="font-semibold">{st.title}</div>
                      <div className="text-muted-foreground mt-0.5">{st.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {s.tips?.length ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">💡 Tips</div>
                  <ul className="space-y-1">
                    {s.tips.map((t, i) => (
                      <li key={i} className="text-xs text-amber-900 dark:text-amber-200">• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default AdminGuidePage;

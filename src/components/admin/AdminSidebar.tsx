import {
  LayoutDashboard, FileText, Users, Package, CreditCard,
  Calculator, BarChart3, Pencil, Settings, LogOut, UserCheck, Truck,
  Hotel, Bell, AlertTriangle, BookOpen, DollarSign, RotateCcw, PieChart,
  Plane, FileCheck, Map, Search, Upload, Shield, ShieldCheck, Bus, UtensilsCrossed, ScrollText,
  Receipt, Route as RouteIcon, Car, Briefcase, FileSignature, Activity,
} from "lucide-react";
import logo from "@/assets/tuba-logo.png";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { apiClient } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import type { AppRole } from "@/hooks/useUserRole";

// ====== Tuba Al Hijaz — Umrah & Hajj Operations Sidebar ======
// Grouped per operational workflow (not generic ERP).

const operationsMenu = [
  { title: "Dashboard",            url: "/admin",                       icon: LayoutDashboard, roles: ["admin", "accountant", "viewer"] },
  { title: "Operations Center",    url: "/admin/operations",            icon: LayoutDashboard, roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Live Operations Map",  url: "/admin/live-map",              icon: Map,             roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Airport Coordinator",  url: "/admin/airport-coordinator",   icon: Plane,           roles: ["admin", "booking", "viewer"] },
  { title: "Ops Alerts",           url: "/admin/ops-alerts",            icon: AlertTriangle,   roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Umrah Bookings",       url: "/admin/bookings",              icon: FileText,        roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Umrah Orders",         url: "/admin/umrah-orders",          icon: ScrollText,      roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Umrah Packages",       url: "/admin/packages",              icon: Package,         roles: ["admin", "viewer"] },
  { title: "Transport Vouchers",   url: "/admin/transport-vouchers",    icon: FileSignature,   roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Internal Movements",   url: "/admin/movements",             icon: RouteIcon,       roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Group Manifest",       url: "/admin/group-manifest",        icon: FileText,        roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Catering Bookings",    url: "/admin/catering",              icon: UtensilsCrossed, roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Visa Processing",      url: "/admin/visa",                  icon: FileCheck,       roles: ["admin", "accountant", "booking", "viewer"] },
];

const pilgrimServicesMenu = [
  { title: "Pilgrims",             url: "/admin/pilgrims",              icon: Users,           roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Customers",            url: "/admin/customers",             icon: UserCheck,       roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Hotels",               url: "/admin/hotels",                icon: Hotel,           roles: ["admin", "viewer"] },
  { title: "Flights",              url: "/admin/flights",               icon: Plane,           roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Air Tickets",          url: "/admin/tickets",               icon: Plane,           roles: ["admin", "accountant", "booking", "viewer"] },
];

const logisticsMenu = [
  { title: "Transport",            url: "/admin/transport",             icon: Bus,             roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Drivers & Vehicles",   url: "/admin/drivers-vehicles",      icon: Car,             roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Agents",               url: "/admin/agents",                icon: Briefcase,       roles: ["admin", "accountant", "viewer"] },
  { title: "Moallems",             url: "/admin/moallems",              icon: UserCheck,       roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Supplier Agents",      url: "/admin/supplier-agents",       icon: Truck,           roles: ["admin", "accountant", "viewer"] },
];

const financeMenu = [
  { title: "Invoices",             url: "/admin/invoices",              icon: Receipt,         roles: ["admin", "accountant", "viewer"] },
  { title: "Payments",             url: "/admin/payments",              icon: CreditCard,      roles: ["admin", "accountant", "viewer"] },
  { title: "Settlements",          url: "/admin/settlements",           icon: FileCheck,       roles: ["admin", "accountant", "viewer"] },
  { title: "Accounting",           url: "/admin/accounting",            icon: Calculator,      roles: ["admin", "accountant", "viewer"] },
  { title: "Receivables",          url: "/admin/receivables",           icon: DollarSign,      roles: ["admin", "accountant", "viewer"] },
  { title: "Due Alerts",           url: "/admin/due-alerts",            icon: AlertTriangle,   roles: ["admin", "accountant", "viewer"] },
  { title: "Refunds",              url: "/admin/refunds",               icon: RotateCcw,       roles: ["admin", "accountant", "viewer"] },
  { title: "Ticket Refunds",       url: "/admin/ticket-refunds",        icon: RotateCcw,       roles: ["admin", "accountant", "viewer"] },
  { title: "Reports",              url: "/admin/reports",               icon: BarChart3,       roles: ["admin", "accountant", "viewer"] },
  { title: "Analytics",            url: "/admin/analytics",             icon: PieChart,        roles: ["admin", "accountant", "viewer"] },
];

const systemMenu = [
  { title: "Notifications",        url: "/admin/notifications",         icon: Bell,            roles: ["admin"] },
  { title: "Message Templates",    url: "/admin/message-templates",     icon: Bell,            roles: ["admin"] },
  { title: "Messaging Settings",   url: "/admin/messaging-settings",    icon: Settings,        roles: ["admin"] },
  { title: "Message Logs",         url: "/admin/message-logs",          icon: BarChart3,       roles: ["admin"] },
  { title: "QR Verifications",     url: "/admin/qr-verifications",      icon: ShieldCheck,     roles: ["admin"] },
  { title: "Document Reviews",     url: "/admin/document-reviews",      icon: FileCheck,       roles: ["admin", "booking"] },
  { title: "Payment Methods",      url: "/admin/payment-methods",       icon: CreditCard,      roles: ["admin"] },
  { title: "CMS",                  url: "/admin/cms",                   icon: Pencil,          roles: ["admin", "cms"] },
  { title: "SEO",                  url: "/admin/seo",                   icon: Search,          roles: ["admin"] },
  { title: "Bulk Import",          url: "/admin/bulk-import",           icon: Upload,          roles: ["admin"] },
  { title: "Roles & Permissions",  url: "/admin/rbac",                  icon: ShieldCheck,     roles: ["admin"] },
  { title: "Approvals",            url: "/admin/approvals",             icon: FileSignature,   roles: ["admin"] },
  { title: "Active Sessions",      url: "/admin/sessions",              icon: UserCheck,       roles: ["admin"] },
  { title: "Audit Logs",           url: "/admin/audit-logs",            icon: Shield,          roles: ["admin"] },
  { title: "Security & 2FA",       url: "/admin/security",              icon: ShieldCheck,     roles: ["admin"] },
  { title: "System Health",        url: "/admin/system-health",         icon: Activity,        roles: ["admin"] },
  { title: "User Guide",           url: "/admin/guide",                 icon: BookOpen,        roles: ["admin", "accountant", "cms_manager", "support"] },
  { title: "Settings",             url: "/admin/settings",              icon: Settings,        roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: AppRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiClient.auth.signOut();
    navigate("/");
  };

  const filterByRole = (items: typeof operationsMenu) =>
    items.filter((item) => role && item.roles.includes(role));

  const renderGroup = (label: string, items: typeof operationsMenu) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-primary/70 px-3 mb-1 font-semibold">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filtered.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end={item.url === "/admin"}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/70 hover:bg-primary/5 hover:text-primary transition-colors"
                    activeClassName="bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-2 border-primary"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1.5 shadow-gold border border-primary/30">
            <img src={logo} alt="Tuba Al Hijaz" className="h-9 w-9 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold text-gradient-gold leading-tight">Tuba Al Hijaz</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Operations Suite</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {renderGroup("Operations", operationsMenu)}
        {renderGroup("Pilgrim Services", pilgrimServicesMenu)}
        {renderGroup("Logistics", logisticsMenu)}
        {renderGroup("Finance", financeMenu)}
        {renderGroup("System", systemMenu)}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-primary/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

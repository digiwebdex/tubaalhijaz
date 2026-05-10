import {
  LayoutDashboard, FileText, Users, Package, CreditCard,
  Calculator, BarChart3, Pencil, Settings, LogOut, UserCheck, Truck,
  Hotel, Bell, AlertTriangle, BookOpen, DollarSign, RotateCcw, PieChart,
  Plane, FileCheck, Map, Search, Upload, Shield, ShieldCheck, Bus, UtensilsCrossed, ScrollText,
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

// Role access matrix
const mainMenuItems = [
  { title: "Dashboard",       url: "/admin",                icon: LayoutDashboard, roles: ["admin", "accountant", "viewer"] },
  { title: "Bookings",        url: "/admin/bookings",       icon: FileText,        roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Umrah Orders",    url: "/admin/umrah-orders",   icon: ScrollText,      roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Customers",       url: "/admin/customers",      icon: Users,           roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Moallems",        url: "/admin/moallems",       icon: UserCheck,       roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Supplier Agents", url: "/admin/supplier-agents", icon: Truck,          roles: ["admin", "accountant", "viewer"] },
  { title: "Packages",        url: "/admin/packages",       icon: Package,         roles: ["admin", "viewer"] },
  { title: "Air Tickets",     url: "/admin/tickets",        icon: Plane,           roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Visa Services",   url: "/admin/visa",           icon: FileCheck,       roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Ticket Refunds",  url: "/admin/ticket-refunds", icon: RotateCcw,       roles: ["admin", "accountant", "viewer"] },
  { title: "Tours",           url: "/admin/packages?type=tour",      icon: Map,     roles: ["admin", "viewer"] },
  { title: "Hotels",          url: "/admin/hotels",         icon: Hotel,           roles: ["admin", "viewer"] },
  { title: "Transport",       url: "/admin/transport",      icon: Bus,             roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Catering",        url: "/admin/catering",       icon: UtensilsCrossed, roles: ["admin", "accountant", "booking", "viewer"] },
];

const financeMenuItems = [
  { title: "Payments",        url: "/admin/payments",       icon: CreditCard,      roles: ["admin", "accountant", "viewer"] },
  { title: "Settlements",     url: "/admin/settlements",    icon: FileCheck,       roles: ["admin", "accountant", "viewer"] },
  { title: "Accounting",      url: "/admin/accounting",     icon: Calculator,      roles: ["admin", "accountant", "viewer"] },
  { title: "Receivables",     url: "/admin/receivables",    icon: DollarSign,      roles: ["admin", "accountant", "viewer"] },
  { title: "Due Alerts",      url: "/admin/due-alerts",     icon: AlertTriangle,   roles: ["admin", "accountant", "viewer"] },
  
  { title: "Refunds",         url: "/admin/refunds",        icon: RotateCcw,       roles: ["admin", "accountant", "viewer"] },
  { title: "Reports",         url: "/admin/reports",        icon: BarChart3,       roles: ["admin", "accountant", "viewer"] },
  { title: "Analytics",       url: "/admin/analytics",      icon: PieChart,        roles: ["admin", "accountant", "viewer"] },
  { title: "Calculator",      url: "/admin/calculator",     icon: Calculator,      roles: ["admin", "accountant", "booking", "viewer"] },
];

const toolsMenuItems = [
  
  { title: "Payment Methods", url: "/admin/payment-methods", icon: CreditCard,      roles: ["admin"] },
  { title: "Notifications",   url: "/admin/notifications",  icon: Bell,            roles: ["admin"] },
  { title: "CMS",             url: "/admin/cms",            icon: Pencil,          roles: ["admin", "cms"] },
  { title: "SEO",             url: "/admin/seo",            icon: Search,          roles: ["admin"] },
  { title: "Bulk Import",     url: "/admin/bulk-import",    icon: Upload,          roles: ["admin"] },
  { title: "Audit Logs",      url: "/admin/audit-logs",     icon: Shield,          roles: ["admin"] },
  { title: "Security & 2FA",  url: "/admin/security",       icon: ShieldCheck,     roles: ["admin"] },
  { title: "User Guide",      url: "/admin/guide",          icon: BookOpen,        roles: ["admin", "accountant", "cms_manager", "support"] },
  { title: "Settings",        url: "/admin/settings",       icon: Settings,        roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: AppRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiClient.auth.signOut();
    navigate("/");
  };

  const filterByRole = (items: typeof mainMenuItems) =>
    items.filter((item) => role && item.roles.includes(role));

  const renderGroup = (label: string, items: typeof mainMenuItems) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 mb-1">
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
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-md p-1 shadow-sm border border-border">
            <img src={logo} alt="TUBA ALHIJAZ Logo" className="h-9 w-9 object-contain" />
          </div>
          <span className="font-heading text-base font-bold text-primary">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {renderGroup("Main", mainMenuItems)}
        {renderGroup("Finance", financeMenuItems)}
        {renderGroup("Tools", toolsMenuItems)}
      </SidebarContent>

      <SidebarFooter className="p-3">
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

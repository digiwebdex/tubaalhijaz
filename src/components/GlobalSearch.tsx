import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileText, Users, CreditCard, Package, Plane, Truck, Hotel, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";

type Hit = {
  id: string;
  type: "booking" | "customer" | "payment" | "package" | "hotel" | "ticket" | "transport";
  title: string;
  subtitle?: string;
  href: string;
};

const ICONS: Record<Hit["type"], React.ComponentType<{ className?: string }>> = {
  booking: FileText,
  customer: Users,
  payment: CreditCard,
  package: Package,
  hotel: Hotel,
  ticket: Plane,
  transport: Truck,
};

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(q, 250);

  // Cmd/Ctrl + K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const term = debounced.trim();
    if (!term || term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const c = apiClient as unknown as {
          from: (t: string) => {
            select: (cols?: string) => {
              ilike?: (col: string, v: string) => Promise<{ data?: unknown[] }>;
              or?: (cond: string) => Promise<{ data?: unknown[] }>;
              limit: (n: number) => Promise<{ data?: unknown[] }>;
            };
          };
        };
        const like = `%${term}%`;
        const [bookings, customers, packages] = await Promise.all([
          c.from("bookings").select("id,booking_number,customer_name,phone").or?.(`booking_number.ilike.${like},customer_name.ilike.${like},phone.ilike.${like}`) ??
            c.from("bookings").select("id,booking_number,customer_name").limit(8),
          c.from("customers").select("id,name,phone,email").or?.(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`) ??
            c.from("customers").select("id,name,phone").limit(8),
          c.from("packages").select("id,name").or?.(`name.ilike.${like}`) ?? c.from("packages").select("id,name").limit(8),
        ]);
        if (cancelled) return;
        const collected: Hit[] = [];
        const bRows = (bookings?.data || []) as Array<Record<string, unknown>>;
        bRows.slice(0, 6).forEach((r) =>
          collected.push({
            id: String(r.id),
            type: "booking",
            title: String(r.booking_number || r.customer_name || `Booking ${r.id}`),
            subtitle: [r.customer_name, r.phone].filter(Boolean).join(" • ") as string,
            href: `/admin/bookings?id=${r.id}`,
          }),
        );
        const cRows = (customers?.data || []) as Array<Record<string, unknown>>;
        cRows.slice(0, 6).forEach((r) =>
          collected.push({
            id: String(r.id),
            type: "customer",
            title: String(r.name || `Customer ${r.id}`),
            subtitle: [r.phone, r.email].filter(Boolean).join(" • ") as string,
            href: `/admin/customers?id=${r.id}`,
          }),
        );
        const pRows = (packages?.data || []) as Array<Record<string, unknown>>;
        pRows.slice(0, 4).forEach((r) =>
          collected.push({
            id: String(r.id),
            type: "package",
            title: String(r.name || `Package ${r.id}`),
            href: `/admin/packages?id=${r.id}`,
          }),
        );
        setHits(collected);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[GlobalSearch] failed", err);
        setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const map: Record<string, Hit[]> = {};
    hits.forEach((h) => {
      (map[h.type] ||= []).push(h);
    });
    return map;
  }, [hits]);

  const goTo = (h: Hit) => {
    setOpen(false);
    setQ("");
    navigate(h.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 text-sm text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors min-w-[240px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search bookings, customers…</span>
        <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted/50"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search bookings, customers, packages…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && <div className="p-6 text-center text-sm text-muted-foreground">Searching…</div>}
              {!loading && q.trim().length < 2 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </div>
              )}
              {!loading && q.trim().length >= 2 && hits.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No results found.</div>
              )}
              {!loading &&
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="py-2">
                    <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {type}s
                    </div>
                    {items.map((h) => {
                      const Icon = ICONS[h.type];
                      return (
                        <button
                          key={`${h.type}-${h.id}`}
                          onClick={() => goTo(h)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 text-left"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-foreground truncate">{h.title}</div>
                            {h.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">{h.subtitle}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalSearch;

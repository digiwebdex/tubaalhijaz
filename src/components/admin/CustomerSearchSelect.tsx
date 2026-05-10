import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { Search, User, X, UserPlus } from "lucide-react";

interface Customer {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  passport_number: string | null;
  address: string | null;
}

interface Props {
  onSelect: (customer: Customer | null) => void;
  selectedId: string | null;
}

export default function CustomerSearchSelect({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const term = `%${q.trim()}%`;
      const { data } = await apiClient
        .from("profiles")
        .select("user_id, full_name, phone, email, passport_number, address")
        .ilike("full_name", term)
        .order("full_name")
        .limit(20);
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCustomers(val), 300);
  };

  const handleSelect = (c: Customer) => {
    setSelected(c);
    setQuery("");
    setOpen(false);
    onSelect(c);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    onSelect(null);
  };

  // Sync external clear
  useEffect(() => {
    if (!selectedId && selected) {
      setSelected(null);
      setQuery("");
    }
  }, [selectedId, selected]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selected.full_name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {selected.phone || ""}{selected.phone && selected.passport_number ? " — " : ""}{selected.passport_number || ""}
          </p>
        </div>
        <button onClick={handleClear} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="সরান">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          placeholder="Search by name, phone, email or passport..."
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-xs text-muted-foreground text-center">খুঁজছে...</div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">No customer found</p>
              <div className="flex items-center gap-1 justify-center text-xs text-primary">
                <UserPlus className="h-3 w-3" />
                <span>Enter details manually below</span>
              </div>
            </div>
          )}
          {!loading && results.map((c) => (
            <button
              key={c.user_id}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.phone || "—"}{c.passport_number ? ` — ${c.passport_number}` : ""}{c.email ? ` — ${c.email}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

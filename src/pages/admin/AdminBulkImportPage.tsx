import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EntityType = "ticket_bookings" | "ticket_refunds";

// Target schema definitions
const SCHEMAS: Record<EntityType, {
  label: string;
  fields: { key: string; label: string; required?: boolean; type: "text" | "number" | "date" }[];
}> = {
  ticket_bookings: {
    label: "Air Tickets (ticket_bookings)",
    fields: [
      { key: "passenger_name", label: "Passenger Name", required: true, type: "text" },
      { key: "billing_name", label: "Billing Name", type: "text" },
      { key: "client_reference", label: "Client Reference", type: "text" },
      { key: "booking_ref", label: "Booking Ref / PNR", type: "text" },
      { key: "vendor_name", label: "Vendor / Supplier", type: "text" },
      { key: "staff_name", label: "Staff Name", type: "text" },
      { key: "issue_date", label: "Issue Date", type: "date" },
      { key: "departure_date", label: "Departure Date", type: "date" },
      { key: "arrival_date", label: "Arrival Date", type: "date" },
      { key: "expected_collection_date", label: "Expected Collection Date", type: "date" },
      { key: "route", label: "Route", type: "text" },
      { key: "terms_of_charge", label: "Terms of Charge", type: "text" },
      { key: "customer_billing_amount", label: "Customer Billing Amount", required: true, type: "number" },
      { key: "our_cost", label: "Our Cost", required: true, type: "number" },
      { key: "received_amount", label: "Received Amount", type: "number" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  ticket_refunds: {
    label: "Ticket Refunds (ticket_refunds)",
    fields: [
      { key: "passenger_name", label: "Passenger Name", required: true, type: "text" },
      { key: "billing_name", label: "Billing Name", type: "text" },
      { key: "booking_ref", label: "Booking Ref / PNR", type: "text" },
      { key: "vendor_name", label: "Vendor / Supplier", type: "text" },
      { key: "staff_name", label: "Staff Name", type: "text" },
      { key: "refund_date", label: "Refund Date", type: "date" },
      { key: "billing_amount_was", label: "Original Billing Amount", type: "number" },
      { key: "customer_refund_charge", label: "Customer Refund Charge", type: "number" },
      { key: "our_refund_charge", label: "Our Refund Charge", type: "number" },
      { key: "refund_back_from_vendor", label: "Refund From Vendor", type: "number" },
      { key: "credit_amount_to_client", label: "Credit Amount to Client", type: "number" },
      { key: "ticket_costing_was", label: "Original Ticket Cost", type: "number" },
      { key: "bill_received", label: "Bill Received", type: "number" },
      { key: "route", label: "Route", type: "text" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
};

const NONE = "__none__";

// Auto-suggest mapping by fuzzy column name match
function autoMap(headers: string[], targetKey: string, targetLabel: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tk = norm(targetKey);
  const tl = norm(targetLabel);
  const found = headers.find((h) => {
    const nh = norm(h);
    return nh === tk || nh === tl || nh.includes(tk) || tk.includes(nh);
  });
  return found || NONE;
}

// Excel serial date → ISO
function parseDate(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // Try common formats
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export default function AdminBulkImportPage() {
  const { toast } = useToast();
  const [entity, setEntity] = useState<EntityType>("ticket_bookings");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const schema = SCHEMAS[entity];

  const handleFile = async (file: File) => {
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "", raw: true });
    if (json.length === 0) {
      toast({ title: "Empty file", variant: "destructive" });
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRawRows(json);
    // Auto-map
    const auto: Record<string, string> = {};
    schema.fields.forEach((f) => {
      auto[f.key] = autoMap(hdrs, f.key, f.label);
    });
    setMapping(auto);
    toast({ title: `${json.length} rows loaded`, description: "Review column mapping below." });
  };

  const onEntityChange = (e: EntityType) => {
    setEntity(e);
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
  };

  const mappedPreview = useMemo(() => {
    if (rawRows.length === 0) return [];
    return rawRows.slice(0, 5).map((row) => {
      const out: any = {};
      schema.fields.forEach((f) => {
        const src = mapping[f.key];
        if (!src || src === NONE) return;
        const v = row[src];
        if (f.type === "number") out[f.key] = parseNumber(v);
        else if (f.type === "date") out[f.key] = parseDate(v);
        else out[f.key] = v ? String(v).trim() : null;
      });
      return out;
    });
  }, [rawRows, mapping, schema]);

  const validate = (): string[] => {
    const errs: string[] = [];
    schema.fields.forEach((f) => {
      if (f.required && (!mapping[f.key] || mapping[f.key] === NONE)) {
        errs.push(`Required field "${f.label}" is not mapped.`);
      }
    });
    return errs;
  };

  const runImport = async () => {
    const errs = validate();
    if (errs.length) {
      toast({ title: "Validation errors", description: errs.join(" "), variant: "destructive" });
      return;
    }
    setImporting(true);
    setProgress(0);
    setResult(null);

    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const payload: any = {};
      schema.fields.forEach((f) => {
        const src = mapping[f.key];
        if (!src || src === NONE) return;
        const v = row[src];
        if (v === "" || v === null || v === undefined) return;
        if (f.type === "number") payload[f.key] = parseNumber(v);
        else if (f.type === "date") {
          const d = parseDate(v);
          if (d) payload[f.key] = d;
        } else payload[f.key] = String(v).trim();
      });

      // Skip empty rows
      if (Object.keys(payload).length === 0) {
        failed++;
        continue;
      }

      const { error } = await apiClient.from(entity).insert(payload);
      if (error) {
        failed++;
        if (errors.length < 10) errors.push(`Row ${i + 2}: ${error.message}`);
      } else {
        success++;
      }
      setProgress(Math.round(((i + 1) / rawRows.length) * 100));
    }

    setImporting(false);
    setResult({ success, failed, errors });
    toast({
      title: "Import complete",
      description: `${success} succeeded, ${failed} failed`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const downloadTemplate = () => {
    const headers = schema.fields.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${entity}_template.xlsx`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import</h1>
          <p className="text-muted-foreground">Import legacy Excel/CSV data directly into your records.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Step 1 — Choose target & upload file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Import to</Label>
              <Select value={entity} onValueChange={(v) => onEntityChange(v as EntityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCHEMAS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <div className="flex-1">
                <Label>Excel / CSV file</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Map columns ({rawRows.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {schema.fields.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <Label className="w-48 shrink-0 text-sm">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                    <Badge variant="outline" className="ml-2 text-[10px]">{f.type}</Badge>
                  </Label>
                  <Select
                    value={mapping[f.key] || NONE}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="-- skip --" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- skip --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mappedPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Preview (first 5 rows)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {schema.fields.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedPreview.map((row, i) => (
                  <TableRow key={i}>
                    {schema.fields.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                      <TableCell key={f.key} className="text-xs">
                        {row[f.key] === null || row[f.key] === undefined ? <span className="text-muted-foreground">—</span> : String(row[f.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={runImport} disabled={importing} size="lg">
                <Upload className="h-4 w-4 mr-2" />
                {importing ? `Importing... ${progress}%` : `Import ${rawRows.length} rows`}
              </Button>
              {importing && <Progress value={progress} className="w-64" />}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Alert variant={result.failed > 0 ? "destructive" : "default"}>
          {result.failed > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>
            <div className="font-semibold mb-1">
              ✅ {result.success} imported · ❌ {result.failed} failed
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs mt-2 space-y-1">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

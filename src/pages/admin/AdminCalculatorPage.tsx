import { useState, useMemo } from "react";
import { Calculator, Plus, Trash2, FileDown, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo-nobg.png";
import { toast } from "sonner";
import { formatBDT } from "@/lib/utils";

interface CostItem {
  id: string;
  description: string;
  unitPrice: number;
}

const DEFAULT_ITEMS: CostItem[] = [
  { id: "1", description: "Ticket", unitPrice: 0 },
  { id: "2", description: "Visa", unitPrice: 0 },
  { id: "3", description: "Makkah Hotel", unitPrice: 0 },
  { id: "4", description: "Madina Hotel", unitPrice: 0 },
  { id: "5", description: "Food", unitPrice: 0 },
  { id: "6", description: "Water", unitPrice: 0 },
  { id: "7", description: "Breakfast", unitPrice: 0 },
  { id: "8", description: "Fruits", unitPrice: 0 },
  { id: "9", description: "Miscellaneous", unitPrice: 0 },
];


export default function AdminCalculatorPage() {
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupDate, setGroupDate] = useState("");
  const [totalHajji, setTotalHajji] = useState<number | null>(null);
  const [sellingPricePerPerson, setSellingPricePerPerson] = useState(0);
  const [items, setItems] = useState<CostItem[]>(DEFAULT_ITEMS);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof CostItem, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleReset = () => {
    setGroupName(null);
    setGroupDate("");
    setTotalHajji(null);
    setSellingPricePerPerson(0);
    setItems(DEFAULT_ITEMS.map(i => ({ ...i, unitPrice: 0 })));
    toast.success("ক্যালকুলেটর রিসেট হয়েছে");
  };

  const pilgrimCount = totalHajji ?? 0;
  const costPerPerson = useMemo(() => items.reduce((s, i) => s + Number(i.unitPrice || 0), 0), [items]);
  const totalCost = costPerPerson * pilgrimCount;
  const profitPerPerson = sellingPricePerPerson - costPerPerson;
  const totalProfit = profitPerPerson * pilgrimCount;
  const totalRevenue = sellingPricePerPerson * pilgrimCount;

  const handleDownloadPdf = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 15;

      // Logo
      try {
        doc.addImage(logoImg, "PNG", margin, y, 18, 18);
      } catch {}

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Group Cost Calculator", margin + 22, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("TUBA ALHIJAZ", margin + 22, y + 13);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin, y + 7, { align: "right" });
      doc.setTextColor(0);

      y += 24;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Group Info
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Group Information", margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      const infoData = [
        ["Group Name", groupName || "-"],
        ["Date", groupDate || "-"],
        ["Total Pilgrims", pilgrimCount > 0 ? String(pilgrimCount) : "-"],
      ];
      (autoTable as any)(doc, {
        startY: y,
        head: [["Field", "Value"]],
        body: infoData,
        theme: "grid",
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Cost Breakdown
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Per Person Cost Breakdown", margin, y);
      y += 4;

      const activeItems = items.filter(i => i.description || i.unitPrice > 0);
      const costRows = activeItems.map((item, idx) => [
        String(idx + 1),
        item.description || "-",
        formatBDT(Number(item.unitPrice || 0)),
        formatBDT(Number(item.unitPrice || 0) * pilgrimCount),
      ]);
      costRows.push(["", "Total Cost Per Person", formatBDT(costPerPerson), formatBDT(totalCost)]);

      (autoTable as any)(doc, {
        startY: y,
        head: [["#", "Description", "Unit Price (BDT)", `Total (${pilgrimCount} pax)`]],
        body: costRows,
        theme: "grid",
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          2: { halign: "right" },
          3: { halign: "right" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.row.index === costRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.textColor = [200, 50, 50];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Check page space
      if (y > 220) {
        doc.addPage();
        y = 15;
      }

      // Summary
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Final Summary — ${groupName || "-"}`, margin, y);
      y += 4;

      const summaryRows = [
        ["Total Pilgrims", pilgrimCount > 0 ? String(pilgrimCount) : "-"],
        ["Cost Per Person", formatBDT(costPerPerson)],
        ["Selling Price Per Person", formatBDT(sellingPricePerPerson)],
        ["Profit Per Person", formatBDT(profitPerPerson)],
        ["", ""],
        [`Total Cost (${pilgrimCount} × ${formatBDT(costPerPerson)})`, formatBDT(totalCost)],
        [`Total Revenue (${pilgrimCount} × ${formatBDT(sellingPricePerPerson)})`, formatBDT(totalRevenue)],
        [`Total Profit (${pilgrimCount} × ${formatBDT(profitPerPerson)})`, formatBDT(totalProfit)],
      ];

      (autoTable as any)(doc, {
        startY: y,
        body: summaryRows,
        theme: "grid",
        margin: { left: margin, right: margin },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 90 },
          1: { halign: "right" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body") {
            const rowIdx = data.row.index;
            // Profit row
            if (rowIdx === 3 || rowIdx === 7) {
              data.cell.styles.fontStyle = "bold";
              if (data.column.index === 1) {
                data.cell.styles.textColor = totalProfit >= 0 ? [34, 139, 34] : [200, 50, 50];
              }
            }
            // Total profit row highlight
            if (rowIdx === 7) {
              data.cell.styles.fillColor = [240, 255, 240];
              data.cell.styles.fontSize = 10;
            }
            // Cost rows red
            if ((rowIdx === 1 || rowIdx === 5) && data.column.index === 1) {
              data.cell.styles.textColor = [200, 50, 50];
            }
            // Revenue rows blue
            if ((rowIdx === 2 || rowIdx === 6) && data.column.index === 1) {
              data.cell.styles.textColor = [30, 58, 138];
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // Profit banner
      if (totalProfit > 0 && y < 260) {
        doc.setFillColor(34, 139, 34);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 3, 3, "F");
        doc.setFontSize(8);
        doc.setTextColor(255);
        doc.setFont("helvetica", "normal");
        doc.text("Total Profit", pageWidth / 2, y + 5, { align: "center" });
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(formatBDT(totalProfit), pageWidth / 2, y + 12, { align: "center" });
        doc.setTextColor(0);
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140);
      doc.text("This is an estimate only. Actual costs may vary. | TUBA ALHIJAZ", pageWidth / 2, footerY, { align: "center" });

      const safeName = (groupName || "Calculator").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-") || "Calculator";
      doc.save(`${safeName}-Cost-Report.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Group Cost Calculator
        </h1>
      </div>

      {/* Group Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Group Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Group Name</Label>
            <Input value={groupName ?? ""} onChange={e => setGroupName(e.target.value || null)} placeholder="Group name" />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={groupDate} onChange={e => setGroupDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Total Pilgrims</Label>
            <Input
              type="number"
              value={totalHajji ?? ""}
              onChange={e => setTotalHajji(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Cost Items */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Per Person Cost</h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground tracking-wider px-1">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Description</div>
            <div className="col-span-3">Unit Price (BDT)</div>
            <div className="col-span-2 text-right">Total (BDT)</div>
          </div>

          {items.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-secondary/20 rounded-lg p-2">
              <div className="col-span-1 text-xs text-muted-foreground">{idx + 1}</div>
              <div className="col-span-6">
                <Input
                  value={item.description}
                  onChange={e => updateItem(item.id, "description", e.target.value)}
                  placeholder="Cost description"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={item.unitPrice || ""}
                  onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-sm font-medium">{formatBDT(Number(item.unitPrice || 0) * pilgrimCount)}</span>
                <button onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive ml-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Per person total */}
          <div className="border-t border-border pt-3 mt-2 grid grid-cols-12 gap-2 px-1">
            <div className="col-span-7 text-sm font-bold">Total Cost Per Person</div>
            <div className="col-span-3 text-sm font-bold text-destructive">{formatBDT(costPerPerson)}</div>
            <div className="col-span-2 text-sm font-bold text-destructive text-right">{formatBDT(totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Selling Price & Profit */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Package Price & Profit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs">Selling Price Per Person (BDT)</Label>
            <Input
              type="number"
              value={sellingPricePerPerson || ""}
              onChange={e => setSellingPricePerPerson(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-primary/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          📊 Final Summary ({groupName || "-"})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Total Pilgrims</p>
            <p className="text-lg font-bold text-foreground">{totalHajji ?? "-"}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Cost Per Person</p>
            <p className="text-lg font-bold text-destructive">{formatBDT(costPerPerson)}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Selling Per Person</p>
            <p className="text-lg font-bold text-primary">{formatBDT(sellingPricePerPerson)}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Profit Per Person</p>
            <p className={`text-lg font-bold ${profitPerPerson >= 0 ? "text-green-500" : "text-destructive"}`}>{formatBDT(profitPerPerson)}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cost ({pilgrimCount} × {formatBDT(costPerPerson)})</span>
            <span className="font-bold text-destructive">{formatBDT(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Revenue ({pilgrimCount} × {formatBDT(sellingPricePerPerson)})</span>
            <span className="font-bold text-primary">{formatBDT(totalRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-bold">Total Profit ({pilgrimCount} × {formatBDT(profitPerPerson)})</span>
            <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-500" : "text-destructive"}`}>{formatBDT(totalProfit)}</span>
          </div>
        </div>

        {totalProfit > 0 && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">Total Profit</p>
            <p className="text-2xl font-bold text-green-500">{formatBDT(totalProfit)}</p>
          </div>
        )}

        {sellingPricePerPerson > 0 && (
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Note: This is an estimate only. Actual costs may vary.
          </p>
        )}
      </div>

      {/* PDF Download & Reset buttons */}
      <div className="sticky bottom-0 z-10 -mx-2 px-2 py-3 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex justify-center gap-3">
        <Button size="lg" variant="outline" onClick={handleReset} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <RotateCcw className="h-5 w-5" /> Reset
        </Button>
        <Button size="lg" onClick={handleDownloadPdf} className="gap-2">
          <FileDown className="h-5 w-5" /> Download PDF Report
        </Button>
      </div>
    </div>
  );
}
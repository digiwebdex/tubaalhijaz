import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { formatBDT } from "@/lib/utils";


interface SupplierItem {
  id: string;
  supplier_agent_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
}

interface Props {
  supplierId: string;
  items: SupplierItem[];
  isViewer: boolean;
  onRefresh: () => void;
}

const emptyForm = { description: "", quantity: "", unit_price: "" };

export default function SupplierItemsManager({ supplierId, items, isViewer, onRefresh }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const grandTotal = items.reduce((s, i) => s + Number(i.total_amount || 0), 0);

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast({ title: "Enter a description", variant: "destructive" });
      return;
    }
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unit_price) || 0;
    if (qty <= 0 || price <= 0) {
      toast({ title: "Enter valid quantity and price", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      supplier_agent_id: supplierId,
      description: form.description.trim(),
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
    };

    if (editId) {
      const { error } = await apiClient.from("supplier_agent_items").update(payload).eq("id", editId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Item updated" });
    } else {
      const { error } = await apiClient.from("supplier_agent_items").insert(payload);
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Item added" });
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    onRefresh();
  };

  const startEdit = (item: SupplierItem) => {
    setForm({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("supplier_agent_items").delete().eq("id", deleteId);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item deleted" });
    setDeleteId(null);
    onRefresh();
  };

  const computedTotal = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Services / Items ({items.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">Total: {formatBDT(grandTotal)}</span>
              {!isViewer && (
                <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No items yet — add services/items</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">SL</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate (BDT)</TableHead>
                    <TableHead className="text-right">Total (BDT)</TableHead>
                    {!isViewer && <TableHead className="text-center w-20">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatBDT(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-bold">{formatBDT(item.total_amount)}</TableCell>
                      {!isViewer && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                              <Pencil className="h-3.5 w-3.5 text-amber-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/60 font-bold">
                    <TableCell colSpan={4} className="text-right">Grand Total =</TableCell>
                    <TableCell className="text-right text-primary">{formatBDT(grandTotal)}</TableCell>
                    {!isViewer && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Item" : "Add New Item/Service"}</DialogTitle>
            <DialogDescription>Enter the service or item details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Umrah Visa, Local Flight Ticket..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" min="0" step="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Unit Price *</label>
                <Input type="number" min="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} placeholder="0" />
              </div>
            </div>
            {computedTotal > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold text-primary">{formatBDT(computedTotal)}</p>
                <p className="text-xs text-muted-foreground">{form.quantity} × {formatBDT(parseFloat(form.unit_price) || 0)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>This item will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
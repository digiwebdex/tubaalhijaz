import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatBDT, cn } from "@/lib/utils";


export default function AdminChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("income");
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    const { data } = await apiClient.from("accounts" as any).select("*").order("type").order("name");
    setAccounts((data as any[]) || []);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const incomeAccounts = accounts.filter((a) => a.type === "income");
  const expenseAccounts = accounts.filter((a) => a.type === "expense");
  const assetAccounts = accounts.filter((a) => a.type === "asset");

  const totalIncome = incomeAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalExpense = expenseAccounts.reduce((s, a) => s + Number(a.balance), 0);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Enter account name"); return; }
    if (accounts.some((a) => a.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("Account already exists"); return;
    }
    setLoading(true);
    const { error } = await apiClient.from("accounts" as any).insert({ name: newName.trim(), type: newType, balance: 0 } as any);
    setLoading(false);
    if (error) { toast.error("Failed to add account"); return; }
    toast.success("Account added");
    setNewName("");
    fetchAccounts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete account "${name}"?`)) return;
    const { error } = await apiClient.from("accounts" as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Account deleted");
    fetchAccounts();
  };

  const renderTable = (title: string, items: any[], icon: React.ReactNode, color: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon} {title}
          <span className={cn("ml-auto text-sm font-bold", color)}>
            {formatBDT(items.reduce((s, a) => s + Number(a.balance), 0))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm">No accounts</TableCell></TableRow>
            )}
            {items.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className={cn("text-right font-mono", color)}>{formatBDT(a.balance)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id, a.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">Chart of Accounts</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Income</p>
          <p className="text-xl font-heading font-bold text-primary">{formatBDT(totalIncome)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-heading font-bold text-destructive">{formatBDT(totalExpense)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Net Profit</p>
          <p className={cn("text-xl font-heading font-bold", totalIncome - totalExpense >= 0 ? "text-primary" : "text-destructive")}>{formatBDT(totalIncome - totalExpense)}</p>
        </CardContent></Card>
      </div>

      {/* Add new account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add New Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Account name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={loading}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable("Income Accounts", incomeAccounts, <TrendingUp className="h-4 w-4 text-primary" />, "text-primary")}
        {renderTable("Expense Accounts", expenseAccounts, <TrendingDown className="h-4 w-4 text-destructive" />, "text-destructive")}
      </div>

      {assetAccounts.length > 0 && (
        <div className="max-w-lg">
          {renderTable("Asset Accounts", assetAccounts, <DollarSign className="h-4 w-4 text-foreground" />, "text-foreground")}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Smartphone, Banknote, CreditCard, Building2, Globe, Truck, Save, RefreshCw, Shield
} from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  name_bn: string;
  icon: string;
  category: "mfs" | "card" | "bank" | "gateway" | "cod";
  enabled: boolean;
  account_name: string;
  account_number: string;
  merchant_id: string;
  instructions: string;
  instructions_bn: string;
  charge_percent: number;
  min_amount: number;
  max_amount: number;
  api_key: string;
  api_secret: string;
  store_id: string;
  store_password: string;
  is_sandbox: boolean;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  // MFS
  { id: "bkash", name: "bKash", name_bn: "বিকাশ", icon: "bkash", category: "mfs", enabled: true, account_name: "", account_number: "", merchant_id: "", instructions: "Send money to the bKash number below", instructions_bn: "নিচের বিকাশ নম্বরে টাকা পাঠান", charge_percent: 1.85, min_amount: 50, max_amount: 200000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  { id: "nagad", name: "Nagad", name_bn: "নগদ", icon: "nagad", category: "mfs", enabled: true, account_name: "", account_number: "", merchant_id: "", instructions: "Send money to the Nagad number below", instructions_bn: "নিচের নগদ নম্বরে টাকা পাঠান", charge_percent: 1.5, min_amount: 50, max_amount: 200000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  { id: "rocket", name: "Rocket (DBBL)", name_bn: "রকেট", icon: "rocket", category: "mfs", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Send money to the Rocket number below", instructions_bn: "নিচের রকেট নম্বরে টাকা পাঠান", charge_percent: 1.8, min_amount: 50, max_amount: 200000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  { id: "upay", name: "Upay", name_bn: "উপায়", icon: "upay", category: "mfs", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Send money to the Upay number below", instructions_bn: "নিচের উপায় নম্বরে টাকা পাঠান", charge_percent: 1.5, min_amount: 50, max_amount: 100000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  // Card
  { id: "visa", name: "Visa Card", name_bn: "ভিসা কার্ড", icon: "visa", category: "card", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Pay with your Visa debit/credit card", instructions_bn: "আপনার ভিসা ডেবিট/ক্রেডিট কার্ডে পেমেন্ট করুন", charge_percent: 2.5, min_amount: 100, max_amount: 500000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  { id: "mastercard", name: "Mastercard", name_bn: "মাস্টারকার্ড", icon: "mastercard", category: "card", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Pay with your Mastercard", instructions_bn: "আপনার মাস্টারকার্ডে পেমেন্ট করুন", charge_percent: 2.5, min_amount: 100, max_amount: 500000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  // Bank
  { id: "bank_transfer", name: "Bank Transfer (EFTN/NPSB)", name_bn: "ব্যাংক ট্রান্সফার", icon: "bank", category: "bank", enabled: true, account_name: "", account_number: "", merchant_id: "", instructions: "Transfer to our bank account. Share screenshot as receipt.", instructions_bn: "আমাদের ব্যাংক একাউন্টে ট্রান্সফার করুন। রসিদ হিসেবে স্ক্রিনশট শেয়ার করুন।", charge_percent: 0, min_amount: 500, max_amount: 5000000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
  // Gateway
  { id: "sslcommerz", name: "SSLCommerz", name_bn: "এসএসএল কমার্জ", icon: "sslcommerz", category: "gateway", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Pay securely via SSLCommerz gateway", instructions_bn: "SSLCommerz গেটওয়ে দিয়ে নিরাপদে পেমেন্ট করুন", charge_percent: 2.0, min_amount: 10, max_amount: 500000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: true },
  { id: "aamarpay", name: "aamarPay", name_bn: "আমারপে", icon: "aamarpay", category: "gateway", enabled: false, account_name: "", account_number: "", merchant_id: "", instructions: "Pay via aamarPay gateway", instructions_bn: "আমারপে গেটওয়ে দিয়ে পেমেন্ট করুন", charge_percent: 2.0, min_amount: 10, max_amount: 500000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: true },
  // COD
  { id: "cod", name: "Cash on Delivery / Office", name_bn: "ক্যাশ অন ডেলিভারি / অফিস", icon: "cash", category: "cod", enabled: true, account_name: "", account_number: "", merchant_id: "", instructions: "Pay in cash at our office or upon delivery", instructions_bn: "আমাদের অফিসে বা ডেলিভারির সময় নগদ অর্থ প্রদান করুন", charge_percent: 0, min_amount: 0, max_amount: 10000000, api_key: "", api_secret: "", store_id: "", store_password: "", is_sandbox: false },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  mfs: { label: "Mobile Financial Services (MFS)", icon: Smartphone, color: "text-pink-600" },
  card: { label: "Debit/Credit Cards", icon: CreditCard, color: "text-blue-600" },
  bank: { label: "Bank Transfer", icon: Building2, color: "text-emerald-600" },
  gateway: { label: "Payment Gateways", icon: Globe, color: "text-purple-600" },
  cod: { label: "Cash on Delivery", icon: Truck, color: "text-amber-600" },
};

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "payment_methods")
      .maybeSingle();
    if (data?.setting_value) {
      const saved = data.setting_value as unknown as PaymentMethod[];
      // Merge saved with defaults (in case new methods were added)
      const merged = DEFAULT_METHODS.map((def) => {
        const found = saved.find((s: PaymentMethod) => s.id === def.id);
        return found ? { ...def, ...found } : def;
      });
      setMethods(merged);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("company_settings")
      .select("id")
      .eq("setting_key", "payment_methods")
      .maybeSingle();

    const payload = { setting_key: "payment_methods", setting_value: methods as unknown as Record<string, unknown> };

    if (existing) {
      await supabase.from("company_settings").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("company_settings").insert(payload);
    }
    toast.success("Payment methods saved successfully");
    setSaving(false);
  };

  const updateMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const enabledCount = methods.filter((m) => m.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Payment Methods
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure Bangladesh payment options — MFS, Cards, Bank, Gateways, COD
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {enabledCount} Active
          </Badge>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(CATEGORY_LABELS).map(([cat, { label, icon: Icon, color }]) => {
          const catMethods = methods.filter((m) => m.category === cat);
          const active = catMethods.filter((m) => m.enabled).length;
          return (
            <Card key={cat} className="border">
              <CardContent className="p-3 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                <p className="text-[11px] font-medium truncate">{label.split("(")[0].trim()}</p>
                <p className="text-xs text-muted-foreground">{active}/{catMethods.length} active</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs by Category */}
      <Tabs defaultValue="mfs">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {Object.entries(CATEGORY_LABELS).map(([cat, { label, icon: Icon }]) => (
            <TabsTrigger key={cat} value={cat} className="text-xs gap-1">
              <Icon className="h-3.5 w-3.5" />
              {label.split("(")[0].trim()}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CATEGORY_LABELS).map(([cat]) => (
          <TabsContent key={cat} value={cat} className="space-y-4">
            {methods
              .filter((m) => m.category === cat)
              .map((method) => (
                <Card key={method.id} className={`border ${method.enabled ? "border-primary/30 bg-primary/5" : "opacity-70"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{method.name}</CardTitle>
                        <span className="text-xs text-muted-foreground">({method.name_bn})</span>
                        {method.is_sandbox && (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                            <Shield className="h-3 w-3 mr-0.5" /> Sandbox
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{method.enabled ? "Active" : "Inactive"}</span>
                        <Switch
                          checked={method.enabled}
                          onCheckedChange={(v) => updateMethod(method.id, { enabled: v })}
                        />
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      Charge: {method.charge_percent}% | Min: ৳{method.min_amount.toLocaleString("en-IN")} | Max: ৳{method.max_amount.toLocaleString("en-IN")}
                    </CardDescription>
                  </CardHeader>

                  {method.enabled && (
                    <CardContent className="pt-0 space-y-4">
                      {/* Account Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Account Name</Label>
                          <Input
                            value={method.account_name}
                            onChange={(e) => updateMethod(method.id, { account_name: e.target.value })}
                            placeholder="e.g. TUBA ALHIJAZ"
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            {cat === "mfs" ? "Mobile Number" : cat === "bank" ? "Account Number" : "Account/Merchant ID"}
                          </Label>
                          <Input
                            value={method.account_number}
                            onChange={(e) => updateMethod(method.id, { account_number: e.target.value })}
                            placeholder={cat === "mfs" ? "01XXXXXXXXX" : "Account number"}
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Merchant ID</Label>
                          <Input
                            value={method.merchant_id}
                            onChange={(e) => updateMethod(method.id, { merchant_id: e.target.value })}
                            placeholder="Optional"
                            className="text-sm h-9"
                          />
                        </div>
                      </div>

                      {/* Fee & Limits */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Charge %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={method.charge_percent}
                            onChange={(e) => updateMethod(method.id, { charge_percent: parseFloat(e.target.value) || 0 })}
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Min Amount (৳)</Label>
                          <Input
                            type="number"
                            value={method.min_amount}
                            onChange={(e) => updateMethod(method.id, { min_amount: parseInt(e.target.value) || 0 })}
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Amount (৳)</Label>
                          <Input
                            type="number"
                            value={method.max_amount}
                            onChange={(e) => updateMethod(method.id, { max_amount: parseInt(e.target.value) || 0 })}
                            className="text-sm h-9"
                          />
                        </div>
                      </div>

                      {/* Gateway-specific API fields */}
                      {(cat === "gateway") && (
                        <div className="space-y-3 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground">API Configuration</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Store ID</Label>
                              <Input
                                value={method.store_id}
                                onChange={(e) => updateMethod(method.id, { store_id: e.target.value })}
                                placeholder="Store ID"
                                className="text-sm h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Store Password</Label>
                              <Input
                                type="password"
                                value={method.store_password}
                                onChange={(e) => updateMethod(method.id, { store_password: e.target.value })}
                                placeholder="Store Password"
                                className="text-sm h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">API Key</Label>
                              <Input
                                type="password"
                                value={method.api_key}
                                onChange={(e) => updateMethod(method.id, { api_key: e.target.value })}
                                placeholder="API Key"
                                className="text-sm h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">API Secret</Label>
                              <Input
                                type="password"
                                value={method.api_secret}
                                onChange={(e) => updateMethod(method.id, { api_secret: e.target.value })}
                                placeholder="API Secret"
                                className="text-sm h-9"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.is_sandbox}
                              onCheckedChange={(v) => updateMethod(method.id, { is_sandbox: v })}
                            />
                            <Label className="text-xs">Sandbox / Test Mode</Label>
                          </div>
                        </div>
                      )}

                      {/* Instructions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Instructions (EN)</Label>
                          <Textarea
                            value={method.instructions}
                            onChange={(e) => updateMethod(method.id, { instructions: e.target.value })}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Instructions (BN)</Label>
                          <Textarea
                            value={method.instructions_bn}
                            onChange={(e) => updateMethod(method.id, { instructions_bn: e.target.value })}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Floating Save */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="shadow-lg">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save All Payment Methods"}
        </Button>
      </div>
    </div>
  );
}

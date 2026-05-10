import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";
import { RefreshCw, TrendingUp, TrendingDown, Users, Package, BarChart3, Calendar } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { format, parseISO, getMonth, getYear, startOfMonth, subMonths } from "date-fns";
import { formatBDT } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const MONTHS_BN = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];

export default function AdminAnalyticsPage() {
  const canSeeProfit = useCanSeeProfit();
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(getYear(new Date())));

  useEffect(() => {
    const load = async () => {
      const [bk, pay, exp, pkg, ml, mlp] = await Promise.all([
        apiClient.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
        apiClient.from("payments").select("*").eq("status", "completed"),
        apiClient.from("expenses").select("*"),
        apiClient.from("packages").select("*"),
        apiClient.from("moallems").select("*"),
        apiClient.from("moallem_payments").select("*"),
      ]);
      setBookings(bk.data || []);
      setPayments(pay.data || []);
      setExpenses(exp.data || []);
      setPackages(pkg.data || []);
      setMoallems(ml.data || []);
      setMoallemPayments(mlp.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const years = useMemo(() => {
    const yrs = new Set<string>();
    bookings.forEach(b => yrs.add(String(getYear(new Date(b.created_at)))));
    payments.forEach(p => yrs.add(String(getYear(new Date(p.created_at)))));
    if (yrs.size === 0) yrs.add(String(getYear(new Date())));
    return Array.from(yrs).sort().reverse();
  }, [bookings, payments]);

  // Monthly revenue trends
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS_BN[i],
      revenue: 0, expenses: 0, profit: 0, bookings: 0,
    }));
    const yr = Number(selectedYear);
    bookings.filter(b => b.status !== "cancelled" && getYear(new Date(b.created_at)) === yr).forEach(b => {
      const m = getMonth(new Date(b.created_at));
      data[m].bookings += 1;
    });
    payments.filter(p => getYear(new Date(p.created_at)) === yr).forEach(p => {
      const m = getMonth(new Date(p.created_at));
      data[m].revenue += Number(p.amount);
    });
    expenses.filter(e => getYear(new Date(e.created_at)) === yr).forEach(e => {
      const m = getMonth(new Date(e.created_at));
      data[m].expenses += Number(e.amount);
    });
    data.forEach(d => { d.profit = d.revenue - d.expenses; });
    return data;
  }, [bookings, payments, expenses, selectedYear]);

  // Package-wise profit
  const packageData = useMemo(() => {
    const map: Record<string, { name: string; type: string; revenue: number; cost: number; bookings: number }> = {};
    bookings.forEach(b => {
      const pkgName = b.packages?.name || "Unknown";
      if (!map[pkgName]) map[pkgName] = { name: pkgName, type: b.packages?.type || "", revenue: 0, cost: 0, bookings: 0 };
      map[pkgName].revenue += Number(b.total_amount || 0);
      map[pkgName].cost += Number(b.total_cost || 0);
      map[pkgName].bookings += 1;
    });
    return Object.values(map).map(p => ({ ...p, profit: p.revenue - p.cost })).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Booking type distribution
  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const t = b.packages?.type || "other";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [bookings]);

  // Moallem performance
  const moallemData = useMemo(() => {
    const map: Record<string, { name: string; bookings: number; revenue: number; deposits: number }> = {};
    bookings.filter(b => b.moallem_id).forEach(b => {
      const ml = moallems.find(m => m.id === b.moallem_id);
      const name = ml?.name || "Unknown";
      if (!map[b.moallem_id]) map[b.moallem_id] = { name, bookings: 0, revenue: 0, deposits: 0 };
      map[b.moallem_id].bookings += 1;
      map[b.moallem_id].revenue += Number(b.total_amount || 0);
    });
    moallemPayments.forEach(mp => {
      if (map[mp.moallem_id]) map[mp.moallem_id].deposits += Number(mp.amount);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [bookings, moallems, moallemPayments]);

  // Seasonal pattern (booking count by month across all years)
  const seasonalData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS_BN[i], count: 0 }));
    bookings.forEach(b => {
      data[getMonth(new Date(b.created_at))].count += 1;
    });
    return data;
  }, [bookings]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">অ্যাডভান্সড অ্যানালিটিক্স</h1>
          <p className="text-sm text-muted-foreground">ব্যবসায়িক কর্মক্ষমতা বিশ্লেষণ</p>
        </div>
        <select className="bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">মোট আয়</span></div>
          <p className="text-xl font-bold text-emerald-600">{formatBDT(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs">মোট ব্যয়</span></div>
          <p className="text-xl font-bold text-destructive">{formatBDT(totalExpenses)}</p>
        </CardContent></Card>
        {canSeeProfit && <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="h-4 w-4" /><span className="text-xs">নেট প্রফিট</span></div>
          <p className={`text-xl font-bold ${totalRevenue - totalExpenses >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBDT(totalRevenue - totalExpenses)}</p>
        </CardContent></Card>}
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">মোট বুকিং</span></div>
          <p className="text-xl font-bold text-foreground">{bookings.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="revenue">আয়ের ট্রেন্ড</TabsTrigger>
          <TabsTrigger value="packages">প্যাকেজ বিশ্লেষণ</TabsTrigger>
          <TabsTrigger value="moallems">মোয়াল্লেম পারফরম্যান্স</TabsTrigger>
          <TabsTrigger value="seasonal">সিজনাল প্যাটার্ন</TabsTrigger>
        </TabsList>

        {/* Revenue Trends */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">মাসিক আয় ও ব্যয় ({selectedYear})</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatBDT(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="আয়" fill="#10b981" fillOpacity={0.3} stroke="#10b981" />
                    <Area type="monotone" dataKey="expenses" name="ব্যয়" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" />
                    {canSeeProfit && <Area type="monotone" dataKey="profit" name="প্রফিট" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">মাসিক বুকিং সংখ্যা ({selectedYear})</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="bookings" name="বুকিং" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Package Analysis */}
        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">প্যাকেজ টাইপ বিতরণ</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">প্যাকেজ-ভিত্তিক আয়</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packageData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v: number) => formatBDT(v)} />
                      <Bar dataKey="revenue" name="আয়" fill="#10b981" radius={[0, 4, 4, 0]} />
                      {canSeeProfit && <Bar dataKey="profit" name="প্রফিট" fill="#3b82f6" radius={[0, 4, 4, 0]} />}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Package table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">প্যাকেজ</th>
                    <th className="text-center px-4 py-3 font-medium">টাইপ</th>
                    <th className="text-center px-4 py-3 font-medium">বুকিং</th>
                    <th className="text-right px-4 py-3 font-medium">আয়</th>
                    {canSeeProfit && <th className="text-right px-4 py-3 font-medium">প্রফিট</th>}
                  </tr>
                </thead>
                <tbody>
                  {packageData.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2.5">{p.name}</td>
                      <td className="px-4 py-2.5 text-center capitalize">{p.type}</td>
                      <td className="px-4 py-2.5 text-center">{p.bookings}</td>
                      <td className="px-4 py-2.5 text-right">{formatBDT(p.revenue)}</td>
                      {canSeeProfit && <td className={`px-4 py-2.5 text-right font-medium ${p.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBDT(p.profit)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moallem Performance */}
        <TabsContent value="moallems" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">মোয়াল্লেম পারফরম্যান্স র‍্যাংকিং</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moallemData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: number) => formatBDT(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="মোট আয়" fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="deposits" name="জমা" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">মোয়াল্লেম</th>
                    <th className="text-center px-4 py-3 font-medium">বুকিং</th>
                    <th className="text-right px-4 py-3 font-medium">মোট আয়</th>
                    <th className="text-right px-4 py-3 font-medium">জমা</th>
                  </tr>
                </thead>
                <tbody>
                  {moallemData.map((m, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{m.name}</td>
                      <td className="px-4 py-2.5 text-center">{m.bookings}</td>
                      <td className="px-4 py-2.5 text-right">{formatBDT(m.revenue)}</td>
                      <td className="px-4 py-2.5 text-right">{formatBDT(m.deposits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Pattern */}
        <TabsContent value="seasonal">
          <Card>
            <CardHeader><CardTitle className="text-base">সিজনাল বুকিং প্যাটার্ন (সকল বছর)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="বুকিং সংখ্যা" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                সকল বছরের বুকিং ডেটা একত্রিত করে সিজনাল ট্রেন্ড দেখানো হচ্ছে
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

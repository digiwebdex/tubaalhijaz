import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Mail, MessageSquare, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id?: string;
  event_key: string;
  channel: "email" | "sms" | "whatsapp";
  language: "en" | "ar" | "bn";
  subject?: string | null;
  body: string;
  is_active: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  booking_confirmed: "Booking Confirmed / تأكيد الحجز",
  payment_received: "Payment Received / استلام الدفعة",
  payment_reminder: "Payment Reminder / تذكير بالدفع",
  visa_approved: "Visa Approved / موافقة التأشيرة",
};

const CHANNELS: Array<Template["channel"]> = ["email", "sms", "whatsapp"];
const LANGS: Array<{ k: Template["language"]; label: string; dir: "ltr" | "rtl" }> = [
  { k: "en", label: "English", dir: "ltr" },
  { k: "ar", label: "العربية", dir: "rtl" },
  { k: "bn", label: "বাংলা", dir: "ltr" },
];

const PLACEHOLDERS = ["{{name}}", "{{tracking_id}}", "{{travel_date}}", "{{amount}}", "{{due}}", "{{due_date}}"];

export default function AdminMessageTemplatesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [event, setEvent] = useState<string>("booking_confirmed");
  const [channel, setChannel] = useState<Template["channel"]>("email");
  const [draft, setDraft] = useState<Record<string, Template>>({});

  const load = async () => {
    const { data } = await apiClient.from("message_templates").select("*");
    setItems((data as Template[]) || []);
  };
  useEffect(() => { load(); }, []);

  const events = useMemo(() => {
    const set = new Set(items.map(i => i.event_key));
    Object.keys(EVENT_LABELS).forEach(k => set.add(k));
    return Array.from(set);
  }, [items]);

  const getTemplate = (lang: Template["language"]): Template => {
    const key = `${event}_${channel}_${lang}`;
    if (draft[key]) return draft[key];
    const found = items.find(i => i.event_key === event && i.channel === channel && i.language === lang);
    return found || { event_key: event, channel, language: lang, subject: "", body: "", is_active: true };
  };

  const update = (lang: Template["language"], patch: Partial<Template>) => {
    const key = `${event}_${channel}_${lang}`;
    setDraft(prev => ({ ...prev, [key]: { ...getTemplate(lang), ...patch } }));
  };

  const save = async (lang: Template["language"]) => {
    const t = getTemplate(lang);
    if (!t.body.trim()) return toast({ title: "Body is required", variant: "destructive" });
    const payload = { ...t };
    delete (payload as any).id;
    if (t.id) {
      await apiClient.from("message_templates").update(payload).eq("id", t.id);
    } else {
      // upsert pattern: try insert; if conflict, update
      const { error } = await apiClient.from("message_templates").insert(payload);
      if (error) {
        await apiClient.from("message_templates").update(payload)
          .eq("event_key", t.event_key).eq("channel", t.channel).eq("language", t.language);
      }
    }
    toast({ title: `Saved (${lang.toUpperCase()})` });
    setDraft(prev => { const n = { ...prev }; delete n[`${event}_${channel}_${lang}`]; return n; });
    load();
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F4C3A]">
          Message Templates <span className="text-base font-normal text-[#C9A96E]" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic',serif" }}>· قوالب الرسائل</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Bilingual templates for Email, SMS and WhatsApp — automatically used by the notification engine.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e} value={e}>{EVENT_LABELS[e] || e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={channel} onValueChange={v => setChannel(v as any)}>
              <TabsList>
                {CHANNELS.map(c => (
                  <TabsTrigger key={c} value={c} className="capitalize">
                    {c === "email" ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground mr-2">Insert:</span>
            {PLACEHOLDERS.map(p => (
              <Badge key={p} variant="outline" className="font-mono text-[10px] cursor-default">{p}</Badge>
            ))}
          </div>

          <Tabs defaultValue="en">
            <TabsList>
              {LANGS.map(l => (
                <TabsTrigger key={l.k} value={l.k}>
                  <Globe className="h-3 w-3 mr-1" /> {l.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {LANGS.map(l => {
              const t = getTemplate(l.k);
              return (
                <TabsContent key={l.k} value={l.k} className="space-y-3 pt-3">
                  {channel === "email" && (
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={t.subject || ""}
                        dir={l.dir}
                        style={l.k === "ar" ? { fontFamily: "'Noto Naskh Arabic',serif" } : undefined}
                        onChange={e => update(l.k, { subject: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Body</Label>
                    <Textarea
                      rows={8}
                      value={t.body}
                      dir={l.dir}
                      style={l.k === "ar" ? { fontFamily: "'Noto Naskh Arabic',serif" } : undefined}
                      onChange={e => update(l.k, { body: e.target.value })}
                    />
                    {channel === "sms" && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Length: {t.body.length} chars · {t.body.length > 160 ? `${Math.ceil(t.body.length / 153)} SMS parts` : "1 SMS"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={t.is_active} onCheckedChange={v => update(l.k, { is_active: v })} />
                      <span className="text-xs">{t.is_active ? "Active" : "Disabled"}</span>
                    </div>
                    <Button onClick={() => save(l.k)} className="bg-[#0F4C3A] hover:bg-[#1a6b50]">
                      <Save className="h-4 w-4 mr-1" /> Save {l.label}
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Coverage matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Event</th>
                  {CHANNELS.flatMap(c => LANGS.map(l => (
                    <th key={c + l.k} className="p-2 text-center">{c.toUpperCase()} · {l.k.toUpperCase()}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev} className="border-t">
                    <td className="p-2 font-medium">{EVENT_LABELS[ev] || ev}</td>
                    {CHANNELS.flatMap(c => LANGS.map(l => {
                      const has = items.some(i => i.event_key === ev && i.channel === c && i.language === l.k && i.is_active);
                      return (
                        <td key={c + l.k} className="p-2 text-center">
                          {has ? <span className="text-green-600">●</span> : <span className="text-gray-300">○</span>}
                        </td>
                      );
                    }))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

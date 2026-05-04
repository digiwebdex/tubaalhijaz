import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Globe, FileText, Code, RefreshCw, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";

interface FBPixelConfig {
  pixel_id: string;
  enabled: boolean;
  track_page_view: boolean;
  track_view_content: boolean;
  track_lead: boolean;
  track_purchase: boolean;
  track_initiate_checkout: boolean;
  track_search: boolean;
  track_contact: boolean;
  capi_enabled: boolean;
  test_event_code: string;
}

interface SeoSettings {
  site_title: string;
  site_description: string;
  site_keywords: string;
  og_image: string;
  base_url: string;
  google_analytics_id: string;
  google_search_console: string;
  facebook_pixel_id: string;
  facebook_pixel: FBPixelConfig;
  default_lang: string;
  auto_sitemap: boolean;
  robots_index: boolean;
  pages: Record<string, PageSeo>;
}

interface PageSeo {
  title: string;
  description: string;
  keywords: string;
  og_image: string;
  no_index: boolean;
}

const DEFAULT_PAGES: Record<string, { label: string; path: string }> = {
  home: { label: "হোম পেজ", path: "/" },
  packages: { label: "প্যাকেজ পেজ", path: "/packages" },
  hotels: { label: "হোটেল পেজ", path: "/hotels" },
  about: { label: "আমাদের সম্পর্কে", path: "/about" },
  contact: { label: "যোগাযোগ", path: "/contact" },
  booking: { label: "বুকিং পেজ", path: "/booking" },
  track: { label: "ট্র্যাকিং পেজ", path: "/track" },
};

const DEFAULT_FB_CONFIG: FBPixelConfig = {
  pixel_id: "",
  enabled: false,
  track_page_view: true,
  track_view_content: true,
  track_lead: true,
  track_purchase: true,
  track_initiate_checkout: true,
  track_search: false,
  track_contact: true,
  capi_enabled: false,
  test_event_code: "",
};

const DEFAULT_SEO: SeoSettings = {
  site_title: "TUBA ALHIJAZ",
  site_description: "তুবা আলহিজাজ - হজ্জ, উমরাহ ও ভিসা সেবায় বাংলাদেশের বিশ্বস্ত প্রতিষ্ঠান।",
  site_keywords: "হজ্জ, উমরাহ, ভিসা, ট্যুর, বাংলাদেশ, তুবা আলহিজাজ, hajj, umrah, visa, tour, tangail",
  og_image: "/assets/logo.png",
  base_url: "https://triptastic.com.bd",
  google_analytics_id: "",
  google_search_console: "",
  facebook_pixel_id: "",
  facebook_pixel: DEFAULT_FB_CONFIG,
  default_lang: "bn",
  auto_sitemap: true,
  robots_index: true,
  pages: {},
};

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<SeoSettings>(DEFAULT_SEO);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "seo_settings")
        .maybeSingle();

      if (data?.content) {
        setSettings({ ...DEFAULT_SEO, ...(data.content as unknown as SeoSettings) });
      }
    } catch (err) {
      console.error("Failed to load SEO settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("section_key", "seo_settings")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq("section_key", "seo_settings");
      } else {
        await supabase
          .from("site_content")
          .insert({ section_key: "seo_settings", content: settings as unknown as Record<string, unknown> });
      }
      toast.success("SEO সেটিংস সেভ হয়েছে");
    } catch (err) {
      toast.error("সেভ করতে ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SeoSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const updatePageSeo = (pageKey: string, field: keyof PageSeo, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [pageKey]: {
          title: "",
          description: "",
          keywords: "",
          og_image: "",
          no_index: false,
          ...prev.pages[pageKey],
          [field]: value,
        },
      },
    }));
  };

  const updateFBConfig = (field: keyof FBPixelConfig, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      facebook_pixel: { ...prev.facebook_pixel, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" /> SEO সেটিংস
          </h1>
          <p className="text-muted-foreground">সার্চ ইঞ্জিন অপটিমাইজেশন ও মেটা ট্যাগ ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </Button>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global"><Globe className="h-4 w-4 mr-1" /> গ্লোবাল</TabsTrigger>
          <TabsTrigger value="pages"><FileText className="h-4 w-4 mr-1" /> পেজ SEO</TabsTrigger>
          <TabsTrigger value="tracking"><Code className="h-4 w-4 mr-1" /> ট্র্যাকিং</TabsTrigger>
          <TabsTrigger value="status"><CheckCircle className="h-4 w-4 mr-1" /> স্ট্যাটাস</TabsTrigger>
        </TabsList>

        {/* Global SEO */}
        <TabsContent value="global" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>সাইট মেটা তথ্য</CardTitle>
              <CardDescription>সার্চ ইঞ্জিনে সাইটের ডিফল্ট তথ্য</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>সাইট টাইটেল</Label>
                  <Input value={settings.site_title} onChange={(e) => updateField("site_title", e.target.value)} />
                  <p className="text-xs text-muted-foreground">{settings.site_title.length}/60 অক্ষর</p>
                </div>
                <div className="space-y-2">
                  <Label>বেস URL</Label>
                  <Input value={settings.base_url} onChange={(e) => updateField("base_url", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>সাইট বিবরণ (Meta Description)</Label>
                <Textarea value={settings.site_description} onChange={(e) => updateField("site_description", e.target.value)} rows={3} />
                <p className="text-xs text-muted-foreground">{settings.site_description.length}/160 অক্ষর</p>
              </div>
              <div className="space-y-2">
                <Label>কীওয়ার্ড (কমা দিয়ে আলাদা)</Label>
                <Textarea value={settings.site_keywords} onChange={(e) => updateField("site_keywords", e.target.value)} rows={2} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>OG ইমেজ URL</Label>
                  <Input value={settings.og_image} onChange={(e) => updateField("og_image", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ডিফল্ট ভাষা</Label>
                  <Input value={settings.default_lang} onChange={(e) => updateField("default_lang", e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.robots_index} onCheckedChange={(v) => updateField("robots_index", v)} />
                  <Label>সার্চ ইঞ্জিন ইনডেক্সিং</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.auto_sitemap} onCheckedChange={(v) => updateField("auto_sitemap", v)} />
                  <Label>অটো সাইটম্যাপ</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Google সার্চ প্রিভিউ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-card max-w-xl">
                <p className="text-primary text-lg font-medium truncate">{settings.site_title}</p>
                <p className="text-accent-foreground text-sm">{settings.base_url}</p>
                <p className="text-muted-foreground text-sm line-clamp-2">{settings.site_description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per-page SEO */}
        <TabsContent value="pages" className="space-y-4 mt-4">
          {Object.entries(DEFAULT_PAGES).map(([key, { label, path }]) => {
            const pageSeo = settings.pages[key] || { title: "", description: "", keywords: "", og_image: "", no_index: false };
            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{label} <Badge variant="outline" className="ml-2">{path}</Badge></CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch checked={!pageSeo.no_index} onCheckedChange={(v) => updatePageSeo(key, "no_index", !v)} />
                      <Label className="text-xs">ইনডেক্স</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">টাইটেল (খালি = ডিফল্ট)</Label>
                      <Input value={pageSeo.title} onChange={(e) => updatePageSeo(key, "title", e.target.value)} placeholder="কাস্টম টাইটেল..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">কীওয়ার্ড</Label>
                      <Input value={pageSeo.keywords} onChange={(e) => updatePageSeo(key, "keywords", e.target.value)} placeholder="কীওয়ার্ড..." />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">বিবরণ</Label>
                    <Textarea value={pageSeo.description} onChange={(e) => updatePageSeo(key, "description", e.target.value)} rows={2} placeholder="কাস্টম বিবরণ..." />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tracking */}
        <TabsContent value="tracking" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Google অ্যানালিটিক্স</CardTitle>
              <CardDescription>Google Analytics ও Search Console কনফিগারেশন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Google Analytics ID (GA4)</Label>
                <Input value={settings.google_analytics_id} onChange={(e) => updateField("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Google Search Console Verification</Label>
                <Input value={settings.google_search_console} onChange={(e) => updateField("google_search_console", e.target.value)} placeholder="meta tag content value" />
              </div>
            </CardContent>
          </Card>

          {/* Facebook Pixel + CAPI */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facebook Pixel + Conversions API</CardTitle>
                  <CardDescription>ক্লায়েন্ট-সাইড পিক্সেল এবং সার্ভার-সাইড ট্র্যাকিং</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.facebook_pixel?.enabled || false} onCheckedChange={(v) => updateFBConfig("enabled", v)} />
                  <Label className="font-semibold">{settings.facebook_pixel?.enabled ? "চালু" : "বন্ধ"}</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facebook Pixel ID</Label>
                  <Input value={settings.facebook_pixel?.pixel_id || ""} onChange={(e) => updateFBConfig("pixel_id", e.target.value)} placeholder="XXXXXXXXXXXXXXX" />
                  <p className="text-xs text-muted-foreground">Facebook Events Manager থেকে পাবেন</p>
                </div>
                <div className="space-y-2">
                  <Label>Test Event Code (ঐচ্ছিক)</Label>
                  <Input value={settings.facebook_pixel?.test_event_code || ""} onChange={(e) => updateFBConfig("test_event_code", e.target.value)} placeholder="TEST12345" />
                  <p className="text-xs text-muted-foreground">Events Manager → Test Events থেকে পাবেন</p>
                </div>
              </div>

              {/* Event Toggles */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">ইভেন্ট ট্র্যাকিং</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "track_page_view" as const, label: "PageView", desc: "পেজ ভিজিট" },
                    { key: "track_view_content" as const, label: "ViewContent", desc: "প্যাকেজ/হোটেল দেখা" },
                    { key: "track_lead" as const, label: "Lead", desc: "যোগাযোগ ফর্ম" },
                    { key: "track_initiate_checkout" as const, label: "InitiateCheckout", desc: "বুকিং শুরু" },
                    { key: "track_purchase" as const, label: "Purchase", desc: "পেমেন্ট সম্পন্ন" },
                    { key: "track_contact" as const, label: "Contact", desc: "হোয়াটসঅ্যাপ ক্লিক" },
                    { key: "track_search" as const, label: "Search", desc: "সার্চ ইভেন্ট" },
                  ].map((evt) => (
                    <div key={evt.key} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                      <Switch
                        checked={settings.facebook_pixel?.[evt.key] ?? false}
                        onCheckedChange={(v) => updateFBConfig(evt.key, v)}
                      />
                      <div>
                        <p className="text-sm font-medium">{evt.label}</p>
                        <p className="text-xs text-muted-foreground">{evt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CAPI Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-semibold">Conversions API (Server-Side)</Label>
                    <p className="text-xs text-muted-foreground">সার্ভার থেকে Facebook-এ ইভেন্ট পাঠান — ব্রাউজার ব্লকার এড়াতে</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={settings.facebook_pixel?.capi_enabled || false} onCheckedChange={(v) => updateFBConfig("capi_enabled", v)} />
                    <Label>{settings.facebook_pixel?.capi_enabled ? "চালু" : "বন্ধ"}</Label>
                  </div>
                </div>
                {settings.facebook_pixel?.capi_enabled && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium">⚙️ সেটআপ নির্দেশনা:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Facebook Events Manager → Settings → Generate Access Token</li>
                      <li>Lovable Cloud-এ <code className="bg-muted px-1 rounded">FB_CONVERSIONS_API_TOKEN</code> সিক্রেট যোগ করুন</li>
                      <li>Lovable Cloud-এ <code className="bg-muted px-1 rounded">FB_PIXEL_ID</code> সিক্রেট যোগ করুন</li>
                    </ol>
                    <p className="text-xs mt-2">✅ ডুপ্লিকেশন প্রতিরোধে event_id ম্যাচিং স্বয়ংক্রিয়ভাবে কাজ করবে</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status */}
        <TabsContent value="status" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO স্ট্যাটাস চেকলিস্ট</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "সাইট টাইটেল সেট করা আছে", ok: !!settings.site_title },
                  { label: "Meta Description সেট করা আছে", ok: settings.site_description.length > 0 && settings.site_description.length <= 160 },
                  { label: "কীওয়ার্ড সেট করা আছে", ok: !!settings.site_keywords },
                  { label: "OG ইমেজ সেট করা আছে", ok: !!settings.og_image },
                  { label: "বেস URL সেট করা আছে", ok: !!settings.base_url },
                  { label: "সার্চ ইঞ্জিন ইনডেক্সিং চালু", ok: settings.robots_index },
                  { label: "Google Analytics কনফিগার করা আছে", ok: !!settings.google_analytics_id },
                  { label: "Search Console ভেরিফিকেশন", ok: !!settings.google_search_console },
                  { label: "Facebook Pixel কনফিগার করা আছে", ok: !!(settings.facebook_pixel?.enabled && settings.facebook_pixel?.pixel_id) },
                  { label: "Conversions API চালু", ok: !!settings.facebook_pixel?.capi_enabled },
                  { label: "সাইটম্যাপ চালু আছে", ok: settings.auto_sitemap },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.ok ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>দরকারী লিংক</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "সাইটম্যাপ দেখুন", url: `${settings.base_url}/sitemap.xml` },
                { label: "Robots.txt দেখুন", url: `${settings.base_url}/robots.txt` },
                { label: "Google PageSpeed Insights", url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(settings.base_url)}` },
                { label: "Google Rich Results Test", url: `https://search.google.com/test/rich-results?url=${encodeURIComponent(settings.base_url)}` },
              ].map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" /> {link.label}
                </a>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RotateCcw } from "lucide-react";

export default function RefundPolicy() {
  const { data: content } = useSiteContent("refund_policy");
  const { language } = useLanguage();
  const lc = content?.[language] || content?.bn || {};

  const title = lc?.title || "রিফান্ড নীতি";
  const lastUpdated = content?.last_updated || "২০২৬-০৩-২৬";
  const sections: { heading: string; body: string }[] = lc?.sections || [
    {
      heading: "রিফান্ড নীতির সারসংক্ষেপ",
      body: "তুবা আলহিজাজ গ্রাহক সন্তুষ্টিকে সর্বোচ্চ গুরুত্ব দেয়। নিচে আমাদের রিফান্ড নীতির বিস্তারিত বর্ণনা করা হলো। অনুগ্রহ করে বুকিং করার আগে এই নীতি মনোযোগ দিয়ে পড়ুন।"
    },
    {
      heading: "সম্পূর্ণ রিফান্ড (১০০%)",
      body: "• তুবা আলহিজাজ-এর পক্ষ থেকে সেবা বাতিল করা হলে\n• ভিসা প্রক্রিয়ায় তুবা আলহিজাজ-এর ত্রুটির কারণে ভিসা না হলে\n• প্যাকেজে উল্লেখিত সেবা সম্পূর্ণরূপে প্রদান না করা হলে"
    },
    {
      heading: "আংশিক রিফান্ড",
      body: "• যাত্রার ৩০+ দিন আগে বাতিল: ৯০% রিফান্ড\n• যাত্রার ১৫-৩০ দিন আগে বাতিল: ৭৫% রিফান্ড\n• যাত্রার ৭-১৫ দিন আগে বাতিল: ৫০% রিফান্ড\n• যাত্রার ৭ দিনের কম সময়ে বাতিল: ২৫% রিফান্ড"
    },
    {
      heading: "অফেরতযোগ্য খরচ",
      body: "• ভিসা প্রসেসিং ফি (দূতাবাসে জমা দেওয়ার পর)\n• এয়ারলাইন টিকেটের ক্যান্সেলেশন চার্জ\n• হোটেলের নো-শো চার্জ\n• ইমিগ্রেশন ও সরকারি ফি\n• বীমা প্রিমিয়াম"
    },
    {
      heading: "রিফান্ড প্রক্রিয়া",
      body: "রিফান্ড আবেদন লিখিতভাবে বা অফিসে সরাসরি জমা দিতে হবে। আবেদন প্রাপ্তির ৭-১৫ কার্যদিবসের মধ্যে রিফান্ড প্রক্রিয়া সম্পন্ন করা হবে। রিফান্ড মূল পেমেন্ট পদ্ধতিতে ফেরত দেওয়া হবে।"
    },
    {
      heading: "বিশেষ পরিস্থিতি",
      body: "মহামারী, প্রাকৃতিক দুর্যোগ বা সরকারি নিষেধাজ্ঞার কারণে যাত্রা বাতিল হলে, তুবা আলহিজাজ সম্পূর্ণ রিফান্ড অথবা ভবিষ্যৎ যাত্রার জন্য ক্রেডিট প্রদান করবে। এই ক্রেডিট ১ বছরের মধ্যে ব্যবহার করতে হবে।"
    },
    {
      heading: "যোগাযোগ",
      body: "রিফান্ড সংক্রান্ত যেকোনো প্রশ্নে যোগাযোগ করুন:\nফোন: +৮৮০ ১৭১১-৯২৫৪০০\nইমেইল: info@triptastic.com.bd\nঅফিস: ৪র্থ তলা, জেল রোড, মুন্সিপাড়া, দিনাজপুর সদর - ৫২০০"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <RotateCcw className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">সর্বশেষ আপডেট: {lastUpdated}</p>
          </div>
        </div>
        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-3">{s.heading}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

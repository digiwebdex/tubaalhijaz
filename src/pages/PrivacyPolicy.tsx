import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const { data: content } = useSiteContent("privacy_policy");
  const { language } = useLanguage();
  const lc = content?.[language] || content?.bn || {};

  const title = lc?.title || "গোপনীয়তা নীতি";
  const lastUpdated = content?.last_updated || "২০২৬-০৩-২৬";
  const sections: { heading: string; body: string }[] = lc?.sections || [
    {
      heading: "তথ্য সংগ্রহ",
      body: "তুবা আলহিজাজ আপনার নাম, ফোন নম্বর, ইমেইল, পাসপোর্ট নম্বর, ঠিকানা এবং জরুরি যোগাযোগের তথ্য সংগ্রহ করে থাকে। এই তথ্যগুলো শুধুমাত্র হজ্জ ও উমরাহ বুকিং, ভিসা প্রসেসিং এবং ট্রাভেল সেবা প্রদানের জন্য ব্যবহৃত হয়।"
    },
    {
      heading: "তথ্যের ব্যবহার",
      body: "আপনার প্রদত্ত তথ্য শুধুমাত্র বুকিং নিশ্চিতকরণ, পেমেন্ট প্রসেসিং, ভিসা আবেদন, হোটেল রিজার্ভেশন, ফ্লাইট বুকিং এবং গ্রাহক সেবা উন্নত করার জন্য ব্যবহৃত হয়। আমরা কখনোই আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।"
    },
    {
      heading: "তথ্যের নিরাপত্তা",
      body: "আমরা আপনার তথ্যের নিরাপত্তা নিশ্চিত করতে আধুনিক এনক্রিপশন প্রযুক্তি এবং সুরক্ষিত সার্ভার ব্যবহার করি। আপনার পাসওয়ার্ড এনক্রিপ্টেড আকারে সংরক্ষিত থাকে এবং কোনো কর্মীর পক্ষে তা দেখা সম্ভব নয়।"
    },
    {
      heading: "কুকিজ ও ট্র্যাকিং",
      body: "আমাদের ওয়েবসাইট ব্যবহারকারীর অভিজ্ঞতা উন্নত করতে কুকিজ ব্যবহার করে। এটি আপনার ব্রাউজিং প্যাটার্ন বিশ্লেষণ করে ওয়েবসাইটকে আরও ব্যবহারবান্ধব করতে সাহায্য করে।"
    },
    {
      heading: "তৃতীয় পক্ষের সেবা",
      body: "আমরা ভিসা প্রসেসিং, এয়ারলাইন্স এবং হোটেল বুকিংয়ের জন্য তৃতীয় পক্ষের সেবা প্রদানকারীদের সাথে শুধুমাত্র প্রয়োজনীয় তথ্য শেয়ার করি। এই সেবা প্রদানকারীরাও আপনার তথ্যের গোপনীয়তা বজায় রাখতে বাধ্য।"
    },
    {
      heading: "যোগাযোগ",
      body: "গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: ফোন: +৮৮০ ১৭১১-৯২৫৪০০, ইমেইল: info@triptastic.com.bd"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
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

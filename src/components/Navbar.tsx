import { useState, useEffect } from "react";
import { Menu, X, Phone, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/tuba-logo.png";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMenuVisibility } from "@/components/admin/MenuVisibilityManager";
import LanguageToggle from "@/components/LanguageToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { data: content } = useBulkSiteContent("navbar");
  const { language, t } = useLanguage();
  const { visibility: menuVisibility } = useMenuVisibility();

  const phone = content?.phone || "+966 53 491 9814";

  const allNavLinks = [
    { key: "home", label: t("nav.home"), href: "#hero" },
    { key: "services", label: t("nav.services"), href: "#services" },
    { key: "transport", label: language === "bn" ? "ট্রান্সপোর্ট" : "Transport", href: "#transport" },
    { key: "catering", label: language === "bn" ? "ক্যাটারিং" : "Catering", href: "#catering" },
    { key: "hotels", label: t("nav.hotels"), href: "/hotels" },
    { key: "about", label: t("nav.about"), href: "#about" },
    { key: "contact", label: t("nav.contact"), href: "#contact" },
  ];

  const navLinks = allNavLinks.filter((link) => menuVisibility[link.key] !== false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const id = href.slice(1);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        if (id === "hero") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }
      }
      setOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container mx-auto flex items-center justify-between h-24 px-4">
        <button onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center cursor-pointer py-2">
          <img src={logo} alt="TUBA ALHIJAZ Logo" className="block h-14 w-auto max-w-[200px] object-contain lg:h-16" />
        </button>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors tracking-wide uppercase"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageToggle />

          <a href={`tel:${phone.replace(/[\s-]/g, "")}`} className="flex items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" />
            {phone}
          </a>

          <button
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <User className="h-4 w-4" />
            {user ? t("nav.dashboard") : t("nav.signIn")}
          </button>
        </div>

        {/* Mobile: lang toggle + hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <LanguageToggle variant="compact" />
          <button onClick={() => setOpen(!open)} className="text-foreground p-2">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-b border-border overflow-hidden shadow-soft"
          >
            <div className="flex flex-col p-4 gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary py-2 uppercase tracking-wide"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => { setOpen(false); navigate(user ? "/dashboard" : "/auth"); }}
                className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2.5 rounded-md hover:bg-primary/90 transition-colors w-full justify-center"
              >
                <User className="h-4 w-4" />
                {user ? t("nav.dashboard") : t("nav.signIn")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

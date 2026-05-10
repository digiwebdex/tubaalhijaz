import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import logoEn from "@/assets/logo-nobg.png";
import logoBn from "@/assets/logo-bangla.png";
import { Shield, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const passwordRules = [
    { label: t("auth.passwordRules.length"), test: (p: string) => p.length >= 8 },
    { label: t("auth.passwordRules.upper"), test: (p: string) => /[A-Z]/.test(p) },
    { label: t("auth.passwordRules.lower"), test: (p: string) => /[a-z]/.test(p) },
    { label: t("auth.passwordRules.number"), test: (p: string) => /\d/.test(p) },
    { label: t("auth.passwordRules.special"), test: (p: string) => /[!@#$%^&*(),.?\":{}|<>]/.test(p) },
  ];

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    const { data: { subscription } } = apiClient.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isPasswordStrong = passwordRules.every((r) => r.test(password));

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("reset.matchError"));
      return;
    }
    if (!isPasswordStrong) {
      toast.error(t("reset.requirementsError"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await apiClient.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("reset.success"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("reset.invalidLink")}</p>
          <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
            {t("reset.goToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-4">
            <img src={language === "bn" ? logoBn : logoEn} alt="Logo" className="h-14 w-auto object-contain" />
          </a>
          <h1 className="font-heading text-2xl font-bold mt-4">{t("reset.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("reset.subtitle")}</p>
        </div>

        <form onSubmit={handleReset} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("reset.newPassword")}</label>
            <div className="relative">
              <Shield className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)} className="w-full bg-secondary border border-border rounded-md pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t("reset.placeholder")} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {rule.test(password) ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className={rule.test(password) ? "text-emerald-500" : "text-muted-foreground"}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t("reset.confirmPassword")}</label>
            <input type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder={t("reset.confirmPlaceholder")} />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">{t("reset.noMatch")}</p>
            )}
          </div>
          <button type="submit" disabled={loading || !isPasswordStrong || password !== confirmPassword}
            className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50">
            {loading ? t("reset.updating") : t("reset.updateButton")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

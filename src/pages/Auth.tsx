import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
const api = apiClient.auth;
import { toast } from "sonner";
import logo from "@/assets/tuba-logo.png";
import { Eye, EyeOff, Phone, Mail, Shield, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";

type AuthMode = "login" | "register" | "forgot" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [resetEmail, setResetEmail] = useState("");

  const inputClass =
    "w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  const passwordRules = [
    { label: t("auth.passwordRules.length"), test: (p: string) => p.length >= 8 },
    { label: t("auth.passwordRules.upper"), test: (p: string) => /[A-Z]/.test(p) },
    { label: t("auth.passwordRules.lower"), test: (p: string) => /[a-z]/.test(p) },
    { label: t("auth.passwordRules.number"), test: (p: string) => /\d/.test(p) },
    { label: t("auth.passwordRules.special"), test: (p: string) => /[!@#$%^&*(),.?\":{}|<>]/.test(p) },
  ];

  const isPasswordStrong = passwordRules.every((r) => r.test(password));

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await api.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const roles = data?.user?.roles || [];
      const isAdminRole = roles.some((r: string) => ["admin", "manager", "staff", "accountant", "booking", "cms", "viewer"].includes(r));
      toast.success(t("auth.welcomeBackToast"));
      navigate(isAdminRole ? "/admin" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong) {
      toast.error(t("auth.meetPwReq"));
      return;
    }
    if (phone.trim()) {
      const phoneErr = getPhoneError(phone, true);
      if (phoneErr) { toast.error(phoneErr); return; }
    }
    setLoading(true);
    try {
      const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
      const { error } = await api.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), phone: normalizedPhone },
        },
      });
      if (error) throw error;
      toast.success(t("auth.accountCreated"));
      setMode("login");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleaned = otpPhone.trim().replace(/[^\d+]/g, "");
    if (cleaned.length < 10) {
      toast.error(language === "bn" ? "সঠিক ফোন নম্বর দিন" : "Enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await apiClient.functions.invoke("send-otp", {
        body: { phone: cleaned, action: "send" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      toast.success(language === "bn" ? "OTP পাঠানো হয়েছে!" : "OTP sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "OTP পাঠাতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error(language === "bn" ? "৬ সংখ্যার OTP দিন" : "Enter 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const cleaned = otpPhone.trim().replace(/[^\d+]/g, "");
      const { data, error } = await apiClient.functions.invoke("send-otp", {
        body: { phone: cleaned, action: "verify", code: otpCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.access_token && data?.refresh_token) {
        // Set session with the tokens
        const { error: sessionError } = await apiClient.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;
        toast.success(language === "bn" ? "সফলভাবে লগইন হয়েছে!" : "Successfully logged in!");
        navigate("/dashboard");
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err: any) {
      toast.error(err.message || "OTP যাচাই ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await api.resetPasswordForEmail(resetEmail.trim());
      if (error) throw error;
      toast.success(t("auth.resetLinkSent"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-4">
            <img src={logo} alt="TUBA ALHIJAZ Logo" className="h-14 w-14 rounded-md object-contain bg-white p-1 border border-border shadow-sm" />
            <div className="text-left">
              <span className="font-heading text-xl font-bold text-primary">TUBA ALHIJAZ</span>
              <span className="block text-xs tracking-[0.25em] text-muted-foreground uppercase">Travel Hub</span>
            </div>
          </a>
          <h1 className="font-heading text-2xl font-bold mt-4">
            {mode === "login" && t("auth.welcomeBack")}
            {mode === "register" && t("auth.createAccount")}
            {mode === "forgot" && t("auth.resetPassword")}
            {mode === "otp" && (language === "bn" ? "ফোনে লগইন করুন" : "Login with Phone")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" && t("auth.signInDesc")}
            {mode === "register" && t("auth.registerDesc")}
            {mode === "forgot" && t("auth.forgotDesc")}
            {mode === "otp" && (language === "bn" ? "বুকিং করার সময় যে নম্বর দিয়েছিলেন সেটি দিন" : "Enter the phone number you used for booking")}
          </p>
        </div>

        {/* OTP / Email toggle for login — OTP disabled for now. Set to true to re-enable. */}
        {OTP_LOGIN_ENABLED && (mode === "login" || mode === "otp") && (
          <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setOtpSent(false); setOtpCode(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              {language === "bn" ? "ইমেইল" : "Email"}
            </button>
            <button
              onClick={() => { setMode("otp"); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "otp" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              {language === "bn" ? "ফোন OTP" : "Phone OTP"}
            </button>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleEmailLogin} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pl-10`} placeholder={t("auth.yourEmail")} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.password")}</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-10 pr-10`} placeholder={t("auth.yourPassword")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                {t("auth.forgotPassword")}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50">
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>
        )}

        {mode === "otp" && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === "bn" ? "ফোন নম্বর" : "Phone Number"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={otpPhone}
                      onChange={(e) => handlePhoneChange(e.target.value, setOtpPhone)}
                      className={`${inputClass} pl-10`}
                      placeholder="01XXXXXXXXX"
                      maxLength={15}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {language === "bn"
                      ? "বুকিং করার সময় যে ফোন নম্বর দিয়েছিলেন সেটি লিখুন"
                      : "Enter the phone number you used during booking"}
                  </p>
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading || otpPhone.trim().length < 10}
                  className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
                >
                  {loading
                    ? (language === "bn" ? "পাঠানো হচ্ছে..." : "Sending...")
                    : (language === "bn" ? "OTP পাঠান" : "Send OTP")}
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "bn"
                      ? `${otpPhone} নম্বরে OTP পাঠানো হয়েছে`
                      : `OTP sent to ${otpPhone}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === "bn" ? "OTP কোড" : "OTP Code"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                    placeholder="••••••"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
                >
                  {loading
                    ? (language === "bn" ? "যাচাই হচ্ছে..." : "Verifying...")
                    : (language === "bn" ? "যাচাই করুন ও লগইন করুন" : "Verify & Login")}
                </button>
                <button
                  onClick={() => { setOtpSent(false); setOtpCode(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {language === "bn" ? "অন্য নম্বর ব্যবহার করুন" : "Use a different number"}
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full text-sm text-primary hover:underline py-1"
                >
                  {language === "bn" ? "আবার OTP পাঠান" : "Resend OTP"}
                </button>
              </>
            )}
          </div>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.fullName")}</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={inputClass} placeholder={t("auth.enterFullName")} maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pl-10`} placeholder={t("auth.yourEmail")} maxLength={255} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.phoneNumber")}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type="tel" required value={phone} onChange={(e) => handlePhoneChange(e.target.value, setPhone)}
                  className={`${inputClass} pl-10`} placeholder="01XXXXXXXXX" maxLength={15} />
                {phone.trim() && getPhoneError(phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(phone)}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.password")}</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-10 pr-10`} placeholder={t("auth.createStrongPw")} />
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
            <button type="submit" disabled={loading || !isPasswordStrong}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50">
              {loading ? t("auth.creatingAccount") : t("auth.createAccountBtn")}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("auth.emailAddress")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  className={`${inputClass} pl-10`} placeholder={t("auth.yourEmail")} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50">
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground mt-4 space-y-1">
          {(mode === "login" || mode === "otp") && (
            <p>{t("auth.noAccount")}{" "}
              <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">{t("auth.signUp")}</button>
            </p>
          )}
          {mode === "register" && (
            <p>{t("auth.hasAccount")}{" "}
              <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">{t("auth.signIn")}</button>
            </p>
          )}
          {mode === "forgot" && (
            <p>
              <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">{t("auth.backToSignIn")}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

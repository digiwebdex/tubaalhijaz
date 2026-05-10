import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Package, Users, CreditCard, Check, User, FileText, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import bkashLogo from "@/assets/payment/bkash.png";
import nagadLogo from "@/assets/payment/nagad.png";
import bankTransferLogo from "@/assets/payment/bank-transfer.png";
import sslcommerzLogo from "@/assets/payment/sslcommerz.png";

const PAYMENT_LOGOS: Record<string, string> = {
  bkash: bkashLogo,
  nagad: nagadLogo,
  bank_transfer: bankTransferLogo,
  bank: bankTransferLogo,
  sslcommerz: sslcommerzLogo,
  aamarpay: sslcommerzLogo,
};
import BookingStepIndicator from "@/components/booking/BookingStepIndicator";
import PersonalDetailsStep, { type PersonalInfo } from "@/components/booking/PersonalDetailsStep";
import DocumentUploadStep, { type UploadedDoc } from "@/components/booking/DocumentUploadStep";
import BookingSuccess from "@/components/booking/BookingSuccess";
import { useLanguage } from "@/i18n/LanguageContext";

const FALLBACK_PAYMENT_METHODS = [
  {
    id: "bkash",
    name: "bKash",
    name_bn: "বিকাশ",
    icon: "🟣",
    category: "mfs",
    enabled: true,
    account_name: "",
    account_number: "",
    instructions: "Send money to our bKash number",
    instructions_bn: "আমাদের বিকাশ নম্বরে টাকা পাঠান",
    charge_percent: 0,
  },
  {
    id: "nagad",
    name: "Nagad",
    name_bn: "নগদ",
    icon: "🟠",
    category: "mfs",
    enabled: true,
    account_name: "",
    account_number: "",
    instructions: "Send money to our Nagad number",
    instructions_bn: "আমাদের নগদ নম্বরে টাকা পাঠান",
    charge_percent: 0,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    name_bn: "ব্যাংক ট্রান্সফার",
    icon: "🏦",
    category: "bank",
    enabled: true,
    account_name: "",
    account_number: "",
    instructions: "Transfer to our bank account and share receipt",
    instructions_bn: "আমাদের ব্যাংক একাউন্টে ট্রান্সফার করে রসিদ শেয়ার করুন",
    charge_percent: 0,
  },
  {
    id: "cod",
    name: "Cash / Office",
    name_bn: "ক্যাশ / অফিস",
    icon: "💵",
    category: "cod",
    enabled: true,
    account_name: "",
    account_number: "",
    instructions: "Pay at office or later",
    instructions_bn: "অফিসে বা পরে পেমেন্ট করুন",
    charge_percent: 0,
  },
];

const Booking = () => {
  const { t } = useLanguage();

  const STEPS = [
    { label: t("booking.package") || "প্যাকেজ", icon: <Package className="h-4 w-4" /> },
    { label: t("booking.details") || "বিবরণ", icon: <User className="h-4 w-4" /> },
    { label: t("booking.documents") || "ডকুমেন্ট", icon: <Upload className="h-4 w-4" /> },
    { label: t("booking.payment") || "পেমেন্ট", icon: <CreditCard className="h-4 w-4" /> },
    { label: t("booking.confirm") || "নিশ্চিত", icon: <Check className="h-4 w-4" /> },
  ];

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const packageId = searchParams.get("package");

  const [user, setUser] = useState<any>(null);
  const [pkg, setPkg] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const [numTravelers, setNumTravelers] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "",
    phone: "",
    passportNumber: "",
    address: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  // Pre-booking registration gate (for unauthenticated users)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [createdBooking, setCreatedBooking] = useState<{ id: string; tracking_id: string } | null>(null);

  const normalizePaymentMethods = (value: unknown) => {
    let methods: unknown = value;

    if (methods && typeof methods === "object" && !Array.isArray(methods)) {
      const maybeWrapped = methods as Record<string, unknown>;
      if (Array.isArray(maybeWrapped.methods)) methods = maybeWrapped.methods;
      else if (Array.isArray(maybeWrapped.data)) methods = maybeWrapped.data;
      else if (Array.isArray(maybeWrapped.setting_value)) methods = maybeWrapped.setting_value;
    }

    if (typeof methods === "string") {
      try {
        methods = JSON.parse(methods);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(methods)) return [];

    return methods
      .filter((method: any) => {
        if (!method) return false;
        if (method.enabled === undefined) return true;
        return method.enabled === true || method.enabled === "true" || method.enabled === 1 || method.enabled === "1";
      })
      .map((method: any, index: number) => ({
        ...method,
        id: method.id || `payment-${index}`,
        enabled: Boolean(method.enabled),
        charge_percent: Number(method.charge_percent || 0),
      }));
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profile } = await apiClient
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        if (profile) {
          setPersonalInfo({
            fullName: profile.full_name || "",
            phone: profile.phone || "",
            passportNumber: profile.passport_number || "",
            address: profile.address || "",
          });
          setEmail(session.user.email || "");
        }
      }

      const [pkgRes, planRes] = await Promise.all([
        packageId
          ? apiClient.from("packages").select("*").eq("id", packageId).eq("is_active", true).single()
          : Promise.resolve({ data: null }),
        apiClient.from("installment_plans").select("*").eq("is_active", true).order("num_installments"),
      ]);

      setPkg(pkgRes.data);
      setPlans(planRes.data || []);

      let methods: any[] = [];
      // Try VPS API first
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const pmResponse = await fetch(`${apiUrl}/public/payment-methods`);
        if (pmResponse.ok) {
          methods = normalizePaymentMethods(await pmResponse.json());
        }
      } catch (error) {
        console.error("Failed to load payment methods from API", error);
      }
      // Fallback: try Supabase company_settings directly
      if (methods.length === 0) {
        try {
          const { data: settingsData } = await apiClient
            .from("company_settings")
            .select("setting_value")
            .eq("setting_key", "payment_methods")
            .single();
          if (settingsData?.setting_value) {
            methods = normalizePaymentMethods(settingsData.setting_value);
          }
        } catch (error) {
          console.error("Failed to load payment methods from DB", error);
        }
      }

      if (methods.length === 0) {
        methods = FALLBACK_PAYMENT_METHODS;
      }

      setPaymentMethods(methods);
      setSelectedPaymentMethod((current) => {
        if (current && methods.some((method) => method.id === current)) return current;
        return methods[0]?.id ?? null;
      });

      setLoading(false);
    };
    init();
  }, [packageId]);

  const totalAmount = pkg ? Number(pkg.price) * numTravelers : 0;

  const validateStep = (): boolean => {
    if (step === 0 && !pkg) {
      toast.error(t("booking.selectPackage"));
      return false;
    }
    if (step === 1) {
      if (!personalInfo.fullName.trim()) {
        toast.error(t("booking.nameRequired"));
        return false;
      }
      if (!personalInfo.phone.trim()) {
        toast.error(t("booking.phoneRequired"));
        return false;
      }
    }
    // Step 2 (documents) is optional - no validation needed
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleRegisterAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { toast.error(t("auth.fullName") + " required"); return; }
    if (!regEmail.trim()) { toast.error(t("auth.email") + " required"); return; }
    if (regPassword.length < 8) {
      toast.error(t("auth.passwordRules.length") || "Password must be at least 8 characters");
      return;
    }
    setRegistering(true);
    try {
      const { data, error } = await apiClient.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: { data: { full_name: regName.trim(), phone: regPhone.trim() } },
      });
      if (error) throw new Error(error.message);

      // Auto-login: signUp already stored tokens via TokenManager. Hydrate booking form.
      const newUser = data?.user;
      setUser(newUser);
      setEmail(regEmail.trim());
      setPersonalInfo((prev) => ({
        ...prev,
        fullName: regName.trim() || prev.fullName,
        phone: regPhone.trim() || prev.phone,
      }));
      toast.success(t("auth.accountCreated") || "Account created! You're now logged in.");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleSubmit = async () => {
    if (!pkg) return;
    setSubmitting(true);
    try {
      const response = await apiClient.functions.invoke("create-guest-booking", {
        body: {
          fullName: personalInfo.fullName.trim(),
          phone: personalInfo.phone.trim(),
          email: email.trim() || null,
          address: personalInfo.address.trim() || null,
          passportNumber: personalInfo.passportNumber.trim() || null,
          packageId: pkg.id,
          numTravelers,
          notes: notes.trim() || null,
          installmentPlanId: selectedPlan || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (!result?.success) throw new Error(result?.error || "Booking failed");

      // Upload documents if any
      if (uploadedDocs.length > 0 && result.booking_id) {
        const userId = user?.id || result.user_id || "00000000-0000-0000-0000-000000000000";
        for (const doc of uploadedDocs) {
          const ext = doc.file.name.split(".").pop();
          const filePath = `${userId}/${result.booking_id}/${doc.type}_${Date.now()}.${ext}`;
          
          await apiClient.storage.from("booking-documents").upload(filePath, doc.file);
          await apiClient.from("booking_documents").insert({
            booking_id: result.booking_id,
            user_id: userId,
            document_type: doc.type,
            file_name: doc.file.name,
            file_path: filePath,
            file_size: doc.file.size,
          });
        }
      }

      setCreatedBooking({ id: result.booking_id, tracking_id: result.tracking_id });
      toast.success(`Booking created! Tracking ID: ${result.tracking_id}`);
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32 text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  const inputClass =
    "w-full bg-background border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <button
            onClick={() => (step > 0 && !createdBooking ? prevStep() : navigate(-1))}
            className="text-sm text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> {t("booking.back")}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">{t("booking.bookNow")}</span>
            <h1 className="text-3xl md:text-4xl font-bold mt-3 mb-3">
              {t("booking.completeYour")} <span className="text-gradient-gold">{t("booking.booking")}</span>
            </h1>
            {!user && (
              <p className="text-xs text-muted-foreground">
                {t("booking.noAccountNeeded") || "অ্যাকাউন্ট ছাড়াই বুকিং করুন!"} <Link to="/auth" className="text-primary hover:underline">{t("nav.signIn")}</Link>
              </p>
            )}
          </motion.div>

          {!pkg && !createdBooking ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">{t("booking.noPackage")}</p>
              <Link to="/packages" className="text-primary hover:underline">{t("booking.browsePackages")}</Link>
            </div>
          ) : createdBooking ? (
            <BookingSuccess
              bookingId={createdBooking.id}
              trackingId={createdBooking.tracking_id}
              userId={user?.id || ""}
            />
          ) : (
            <>
              <BookingStepIndicator steps={STEPS} currentStep={step} />

              {/* Step 0: Package & Travelers */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" /> {t("booking.packageDetails")}
                    </h2>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{pkg.type} • {pkg.duration_days} {t("common.days")}</p>
                      </div>
                      <p className="text-xl font-bold text-primary">
                        ৳{Number(pkg.price).toLocaleString("en-IN")}
                        <span className="text-xs text-muted-foreground font-normal"> {t("common.perPerson")}</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> {t("booking.travelers")}
                    </h2>
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-muted-foreground">{t("booking.numTravelers")}</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={numTravelers}
                        onChange={(e) => setNumTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="mt-4 p-4 bg-secondary/50 rounded-lg flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("booking.totalAmount")}</span>
                      <span className="text-lg font-bold text-primary">৳{totalAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Personal Details */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <PersonalDetailsStep info={personalInfo} onChange={setPersonalInfo} />
                  {!user && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <label className="text-sm text-muted-foreground mb-1 block">
                        {t("booking.email") || "ইমেইল (ঐচ্ছিক)"}
                      </label>
                      <input
                        type="email"
                        maxLength={100}
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Document Upload */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <DocumentUploadStep documents={uploadedDocs} onChange={setUploadedDocs} />
                </motion.div>
              )}

              {/* Step 3: Payment Plan */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" /> {t("booking.paymentPlan")}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("booking.payLaterNote") || "এখনই পেমেন্ট করতে হবে না। আপনি পরে পেমেন্ট করতে পারবেন।"}
                    </p>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(null)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          !selectedPlan ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{t("booking.fullPayment")}</p>
                            <p className="text-xs text-muted-foreground">{t("booking.fullPaymentDesc")}</p>
                          </div>
                          {!selectedPlan && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                      {plans.map((plan) => (
                        <button
                          type="button"
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{plan.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {plan.num_installments} {t("booking.installments")} • ৳{Math.round(totalAmount / plan.num_installments).toLocaleString("en-IN")}{t("booking.perMonth")}
                              </p>
                            </div>
                            {selectedPlan === plan.id && <Check className="h-5 w-5 text-primary" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Methods */}
                  {paymentMethods.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" /> {t("booking.paymentMethod") || "পেমেন্ট মাধ্যম"}
                      </h2>
                      <div className="space-y-3">
                        {paymentMethods.map((method: any) => {
                          const isSelected = selectedPaymentMethod === method.id;
                          const categoryLabel = method.category === 'mfs' ? 'Mobile' : method.category === 'cod' ? 'Office' : method.category === 'bank' ? 'Bank' : method.category === 'card' ? 'Card' : method.category === 'gateway' ? 'Online' : '';
                          const categoryColor = method.category === 'mfs' ? 'bg-emerald-100 text-emerald-700' : method.category === 'cod' ? 'bg-green-100 text-green-700' : method.category === 'bank' ? 'bg-blue-100 text-blue-700' : method.category === 'card' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700';
                          return (
                            <button
                              type="button"
                              key={method.id}
                              onClick={() => setSelectedPaymentMethod(method.id)}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/40 hover:shadow-sm"
                              }`}
                            >
                              {PAYMENT_LOGOS[method.id] ? (
                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 p-1.5">
                                  <img src={PAYMENT_LOGOS[method.id]} alt={method.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                                  {method.icon || "💳"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{method.name_bn || method.name}</span>
                                  {categoryLabel && (
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor}`}>{categoryLabel}</span>
                                  )}
                                </div>
                                {method.account_number && (
                                  <p className="text-xs font-mono text-muted-foreground">{method.account_number}</p>
                                )}
                                {!method.account_number && (method.instructions_bn || method.instructions) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {method.instructions_bn || method.instructions}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedPaymentMethod && (() => {
                        const m = paymentMethods.find((pm: any) => pm.id === selectedPaymentMethod);
                        return m ? (
                          <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-2">
                            <p className="text-sm font-semibold text-foreground">{m.name_bn || m.name} — {t("booking.paymentInfo") || "পেমেন্ট তথ্য"}</p>
                            {m.account_number && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{t("booking.accountNumber") || "অ্যাকাউন্ট নম্বর"}:</span>
                                <span className="font-mono font-bold text-foreground text-base tracking-wide">{m.account_number}</span>
                              </div>
                            )}
                            {m.account_name && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{t("booking.accountName") || "অ্যাকাউন্ট নাম"}:</span>
                                <span className="font-semibold text-foreground">{m.account_name}</span>
                              </div>
                            )}
                            {m.charge_percent > 0 && (
                              <p className="text-xs text-orange-600">💡 চার্জ: {m.charge_percent}%</p>
                            )}
                            {(m.instructions_bn || m.instructions) && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.instructions_bn || m.instructions}</p>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div>
                    <textarea
                      placeholder={t("booking.specialRequests")}
                      maxLength={500}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Confirm */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" /> {t("booking.bookingSummary")}
                    </h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.package")}</span>
                        <span className="font-medium">{pkg.name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.type")}</span>
                        <span className="font-medium capitalize">{pkg.type}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.travelers")}</span>
                        <span className="font-medium">{numTravelers}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.name")}</span>
                        <span className="font-medium">{personalInfo.fullName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.phone")}</span>
                        <span className="font-medium">{personalInfo.phone}</span>
                      </div>
                      {personalInfo.passportNumber && (
                        <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-muted-foreground">{t("booking.passport")}</span>
                          <span className="font-medium">{personalInfo.passportNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.documents") || "ডকুমেন্ট"}</span>
                        <span className="font-medium">{uploadedDocs.length} {t("booking.filesUploaded") || "টি ফাইল"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.paymentPlan")}</span>
                        <span className="font-medium">
                          {selectedPlan ? plans.find((p) => p.id === selectedPlan)?.name : t("booking.fullPayment")}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{t("booking.paymentStatus") || "পেমেন্ট স্ট্যাটাস"}</span>
                        <span className="font-medium text-primary">{t("booking.notPaid") || "পরে পেমেন্ট করবেন"}</span>
                      </div>
                      <div className="flex justify-between py-3 bg-secondary/50 rounded-lg px-3 mt-2">
                        <span className="font-medium">{t("booking.totalAmount")}</span>
                        <span className="text-lg font-bold text-primary">৳{totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex-1 py-3 rounded-md text-sm font-semibold border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    {t("booking.previous")}
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={nextStep}
                    className="flex-1 py-3 rounded-md text-sm font-semibold bg-gradient-gold text-primary-foreground hover:opacity-90 transition-opacity shadow-gold inline-flex items-center justify-center gap-2"
                  >
                    {t("booking.next")} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-md text-sm font-semibold bg-gradient-gold text-primary-foreground hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
                  >
                    {submitting ? t("booking.processing") : `${t("booking.confirmBooking")} — ৳${totalAmount.toLocaleString("en-IN")}`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Booking;

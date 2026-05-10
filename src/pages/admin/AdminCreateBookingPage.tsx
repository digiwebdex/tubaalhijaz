import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Phone, Mail, MapPin, FileText, Plus, Trash2, Upload, X, CheckCircle, File } from "lucide-react";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

interface FamilyMember {
  id: string;
  full_name: string;
  passport_number: string;
  package_id: string;
  selling_price: string;
  discount: string;
}

// Parse string to number, defaulting to 0 for empty/invalid
const num = (v: string | number): number => {
  if (v === "" || v === undefined || v === null) return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : Math.max(0, n);
};

const DOC_TYPES = [
  { key: "passport", label: "Passport Copy" },
  { key: "nid", label: "NID Copy" },
  { key: "photo", label: "Photo" },
];

export default function AdminCreateBookingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"individual" | "family">("individual");

  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  
  // Document upload state
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_address: "",
    guest_passport: "",
    package_id: "",
    selling_price_per_person: "",
    cost_price_per_person: "",
    commission_per_person: "",
    discount: "",
    paid_amount: "",
    payment_method: "cash",
    wallet_account_id: "",
    status: "pending",
    notes: "",
    moallem_id: "",
    supplier_agent_id: "",
  });

  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.from("packages").select("id, name, type, price, duration_days").eq("is_active", true).order("name"),
      apiClient.from("moallems").select("id, name, phone, status").eq("status", "active").order("name"),
      apiClient.from("accounts" as any).select("*").eq("type", "asset"),
      apiClient.from("supplier_agents").select("id, agent_name, company_name, phone, status").eq("status", "active").order("agent_name"),
    ]).then(([pkgRes, moaRes, walletRes, supRes]) => {
      setPackages(pkgRes.data || []);
      const moallemsList = moaRes.data || [];
      setMoallems(moallemsList);
      const wallets = (walletRes.data as any[]) || [];
      setWalletAccounts(wallets);
      setSuppliers(supRes.data || []);
      // Auto-assign default Moallem "TUBA ALHIJAZ"
      const defaultMoallem = moallemsList.find((m: any) => m.name === "TUBA ALHIJAZ");
      // Auto-assign default wallet based on initial payment method (cash)
      const defaultWallet = wallets.find((w: any) => w.name === "Cash");
      setForm((prev) => ({
        ...prev,
        moallem_id: defaultMoallem?.id || prev.moallem_id,
        wallet_account_id: defaultWallet?.id || prev.wallet_account_id,
      }));
    });
  }, []);

  const handleCustomerSelect = (customer: any | null) => {
    if (customer) {
      setSelectedCustomerId(customer.user_id);
      setForm((prev) => ({
        ...prev,
        guest_name: customer.full_name || "",
        guest_phone: customer.phone || "",
        guest_email: customer.email || "",
        guest_address: customer.address || "",
        guest_passport: customer.passport_number || "",
      }));
    } else {
      setSelectedCustomerId(null);
      setForm((prev) => ({ ...prev, guest_name: "", guest_phone: "", guest_email: "", guest_address: "", guest_passport: "" }));
    }
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    setForm((prev) => ({
      ...prev,
      package_id: packageId,
      selling_price_per_person: pkg ? String(pkg.price) : prev.selling_price_per_person,
    }));
  };

  // Family member helpers
  const addMember = () => {
    setMembers([...members, {
      id: crypto.randomUUID(),
      full_name: "",
      passport_number: "",
      package_id: form.package_id || "",
      selling_price: form.selling_price_per_person || "",
      discount: "",
    }]);
  };

  const updateMember = (id: string, field: keyof FamilyMember, value: string) => {
    setMembers(members.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      if (field === "package_id") {
        const pkg = packages.find(p => p.id === value);
        if (pkg) updated.selling_price = String(pkg.price);
      }
      return updated;
    }));
  };

  const removeMember = (id: string) => setMembers(members.filter(m => m.id !== id));

  // Calculations
  const sellingPrice = num(form.selling_price_per_person);
  const costPrice = num(form.cost_price_per_person);
  const commissionPP = num(form.commission_per_person);
  const discountVal = num(form.discount);
  const paidAmount = num(form.paid_amount);
  const individualFinalPrice = Math.max(0, sellingPrice - discountVal);
  const familyTotal = members.reduce((s, m) => s + Math.max(0, num(m.selling_price) - num(m.discount)), 0);
  const totalSellingPrice = bookingType === "family" ? familyTotal : individualFinalPrice;
  const numTravelers = bookingType === "family" ? members.length : 1;
  const totalCost = costPrice * numTravelers;
  const totalCommission = commissionPP * numTravelers;
  const estimatedProfit = totalSellingPrice - totalCost - totalCommission;
  const dueAmount = Math.max(0, totalSellingPrice - paidAmount);

  const handleDocSelect = (docType: string, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setDocFiles(prev => ({ ...prev, [docType]: file }));
  };

  const uploadDocuments = async (bookingId: string, userId: string) => {
    const filesToUpload = Object.entries(docFiles).filter(([_, file]) => file !== null);
    if (filesToUpload.length === 0) return;

    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('rk_access_token');

    for (const [docType, file] of filesToUpload) {
      if (!file) continue;
      setDocUploading(docType);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'booking-documents');
        formData.append('path', `${bookingId}/${docType}_${Date.now()}.${file.name.split('.').pop() || 'pdf'}`);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }
        const uploadData = await uploadRes.json();

        await apiClient.from("booking_documents").insert({
          booking_id: bookingId,
          user_id: userId,
          document_type: docType,
          file_name: file.name,
          file_path: uploadData.file_path,
          file_size: file.size,
        });

        setUploadedDocs(prev => ({ ...prev, [docType]: file.name }));
      } catch (err: any) {
        toast.error(`Failed to upload ${docType}: ${err.message}`);
      }
    }
    setDocUploading(null);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) { toast.error("Please select a customer"); return; }
    if (bookingType === "individual" && !form.package_id) { toast.error("Please select a package"); return; }
    if (bookingType === "family" && members.length === 0) { toast.error("Please add family members"); return; }
    if (bookingType === "family") {
      for (let i = 0; i < members.length; i++) {
        if (!members[i].full_name.trim()) { toast.error(`Traveler ${i + 1}: Name is required`); return; }
        if (!members[i].passport_number.trim()) { toast.error(`Traveler ${i + 1}: Passport number is required`); return; }
        if (!members[i].package_id) { toast.error(`Traveler ${i + 1}: Package is required`); return; }
      }
    }
    if (totalSellingPrice <= 0) { toast.error("Total selling price must be greater than 0"); return; }
    if (paidAmount > totalSellingPrice) { toast.error("Paid amount cannot exceed total price"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const guestName = bookingType === "family" && members.length > 0
        ? members.map(m => m.full_name.trim()).filter(Boolean).join(", ") || form.guest_name.trim()
        : form.guest_name.trim();
      const guestPassport = bookingType === "family" && members.length > 0
        ? members.map(m => m.passport_number.trim()).filter(Boolean).join(", ") || form.guest_passport.trim() || null
        : form.guest_passport.trim() || null;

      // Build insert object - only include fields with meaningful values
      const bookingData: Record<string, any> = {
        booking_type: bookingType,
        guest_name: guestName,
        guest_phone: form.guest_phone.trim(),
        package_id: bookingType === "individual" ? form.package_id : (members[0]?.package_id || form.package_id || packages[0]?.id),
        num_travelers: numTravelers,
        total_amount: totalSellingPrice,
        status: form.status,
        user_id: selectedCustomerId,
      };

      // Only add optional fields if they have values
      if (form.guest_email.trim()) bookingData.guest_email = form.guest_email.trim();
      if (form.guest_address?.trim()) bookingData.guest_address = form.guest_address.trim();
      if (guestPassport) bookingData.guest_passport = guestPassport;
      if (form.notes.trim()) bookingData.notes = form.notes.trim();
      if (form.moallem_id) bookingData.moallem_id = form.moallem_id;
      if (form.supplier_agent_id) bookingData.supplier_agent_id = form.supplier_agent_id;

      // Financial fields
      bookingData.selling_price_per_person = sellingPrice;
      bookingData.cost_price_per_person = costPrice;
      bookingData.commission_per_person = commissionPP;
      bookingData.total_cost = totalCost;
      bookingData.total_commission = totalCommission;
      bookingData.profit_amount = estimatedProfit;
      bookingData.paid_amount = paidAmount;
      bookingData.due_amount = dueAmount;
      if (bookingType === "individual" && discountVal > 0) bookingData.discount = discountVal;

      const { data: booking, error } = await apiClient.from("bookings").insert(bookingData as any).select("id, tracking_id").single();
      if (error) throw error;

      // Insert family members
      if (bookingType === "family" && members.length > 0 && booking) {
        const memberRows = members.map(m => ({
          booking_id: booking.id,
          full_name: m.full_name.trim(),
          passport_number: m.passport_number.trim() || null,
          package_id: m.package_id || null,
          selling_price: num(m.selling_price),
          discount: num(m.discount),
          final_price: Math.max(0, num(m.selling_price) - num(m.discount)),
        }));

        const { error: membersError } = await apiClient.from("booking_members" as any).insert(memberRows);
        if (membersError) {
          await apiClient.from("bookings").delete().eq("id", booking.id);
          throw new Error(membersError.message || "Failed to save traveler details");
        }
      }

      // Initial payment
      if (paidAmount > 0 && booking) {
        await apiClient.from("payments").insert({
          booking_id: booking.id,
          user_id: selectedCustomerId || session.user.id,
          customer_id: selectedCustomerId,
          amount: paidAmount,
          status: "completed",
          payment_method: form.payment_method || "cash",
          installment_number: 1,
          paid_at: new Date().toISOString(),
          wallet_account_id: form.wallet_account_id || null,
          notes: "Initial payment (admin booking)",
        });
      }

      // Upload documents if any selected
      if (booking) {
        await uploadDocuments(booking.id, selectedCustomerId || session.user.id);
      }

      toast.success(`Booking created! Tracking ID: ${booking?.tracking_id}`);
      navigate("/admin/bookings");
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = packages.find((p) => p.id === form.package_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/bookings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-heading text-xl font-bold">Create New Booking</h2>
      </div>

      {/* Booking Type Toggle */}
      <div className="bg-card border border-border rounded-xl p-4">
        <label className="text-xs text-muted-foreground block mb-2">Booking Type</label>
        <div className="flex gap-2">
          {(["individual", "family"] as const).map(type => (
            <button key={type} onClick={() => setBookingType(type)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${bookingType === type ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"}`}>
              {type === "individual" ? "Individual" : "Family"}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Selection */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Select Customer *
        </h3>
        <p className="text-xs text-muted-foreground">Create the customer in the Customers module first, then select here.</p>
        <CustomerSearchSelect onSelect={handleCustomerSelect} selectedId={selectedCustomerId} />

        {selectedCustomerId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-secondary/50 rounded-lg p-3">
            <div><span className="text-muted-foreground text-xs">Name:</span> <span className="font-medium">{form.guest_name}</span></div>
            <div><span className="text-muted-foreground text-xs">Phone:</span> <span className="font-medium">{form.guest_phone}</span></div>
            {form.guest_email && <div><span className="text-muted-foreground text-xs">Email:</span> <span>{form.guest_email}</span></div>}
            {form.guest_passport && <div><span className="text-muted-foreground text-xs">Passport:</span> <span>{form.guest_passport}</span></div>}
          </div>
        )}
      </div>

      {/* Individual Booking */}
      {bookingType === "individual" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Package & Pricing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Package *</label>
              <select className={inputClass} value={form.package_id} onChange={(e) => handlePackageChange(e.target.value)}>
                <option value="">-- Select Package --</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type}) — BDT {Number(p.price).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Selling Price (BDT)</label>
              <input className={inputClass} type="number" min={0} value={form.selling_price_per_person}
                placeholder="0"
                onChange={(e) => setForm(f => ({ ...f, selling_price_per_person: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Discount (BDT)</label>
              <input className={inputClass} type="number" min={0} value={form.discount}
                placeholder="0"
                onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Final Price (BDT)</label>
              <div className={`${inputClass} bg-muted/50 font-bold text-foreground`}>BDT {individualFinalPrice.toLocaleString("en-IN")}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Cost Price / Person (BDT)</label>
              <input className={inputClass} type="number" min={0} value={form.cost_price_per_person}
                placeholder="0"
                onChange={(e) => setForm(f => ({ ...f, cost_price_per_person: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Commission / Person (BDT)</label>
              <input className={inputClass} type="number" min={0} value={form.commission_per_person}
                placeholder="0"
                onChange={(e) => setForm(f => ({ ...f, commission_per_person: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Family Booking */}
      {bookingType === "family" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Family Members ({members.length})
            </h3>
            <button onClick={addMember} className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">
              <Plus className="h-3 w-3" /> Add Member
            </button>
          </div>

          {members.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No members added. Click the button above.</p>
          )}

          {members.map((m, idx) => (
            <div key={m.id} className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Member #{idx + 1}</span>
                <button onClick={() => removeMember(m.id)} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                  <input className={inputClass} value={m.full_name} onChange={(e) => updateMember(m.id, "full_name", e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Passport</label>
                  <input className={inputClass} value={m.passport_number} onChange={(e) => updateMember(m.id, "passport_number", e.target.value)} placeholder="Passport number" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Package</label>
                  <select className={inputClass} value={m.package_id} onChange={(e) => updateMember(m.id, "package_id", e.target.value)}>
                    <option value="">-- Package --</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} — BDT {Number(p.price).toLocaleString("en-IN")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Selling Price (BDT)</label>
                  <input className={inputClass} type="number" min={0} value={m.selling_price}
                    placeholder="0"
                    onChange={(e) => updateMember(m.id, "selling_price", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Discount (BDT)</label>
                  <input className={inputClass} type="number" min={0} value={m.discount}
                    placeholder="0"
                    onChange={(e) => updateMember(m.id, "discount", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Final Price</label>
                  <div className={`${inputClass} bg-muted/30 font-bold`}>BDT {Math.max(0, num(m.selling_price) - num(m.discount)).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>
          ))}

          {members.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Total Selling:</span>{" "}
              <span className="font-bold text-foreground">BDT {familyTotal.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground ml-3">({members.length} members)</span>
            </div>
          )}
        </div>
      )}

      {/* Document Upload */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Upload Documents (Optional)
        </h3>
        <p className="text-xs text-muted-foreground">Upload passport, NID, and photo. Max 5MB per file. Supported: PDF, JPG, PNG.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DOC_TYPES.map(doc => (
            <div key={doc.key} className="border border-dashed border-border rounded-lg p-4 text-center space-y-2">
              <File className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">{doc.label}</p>
              {docFiles[doc.key] ? (
                <div className="space-y-1">
                  <p className="text-xs text-primary truncate">{docFiles[doc.key]!.name}</p>
                  <button onClick={() => setDocFiles(prev => ({ ...prev, [doc.key]: null }))}
                    className="text-xs text-destructive hover:underline flex items-center gap-1 mx-auto">
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
              ) : uploadedDocs[doc.key] ? (
                <div className="flex items-center gap-1 justify-center text-xs text-primary">
                  <CheckCircle className="h-3 w-3" /> Uploaded
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs.current[doc.key]?.click()}
                  className="text-xs bg-secondary hover:bg-muted text-foreground px-3 py-1.5 rounded-md transition-colors">
                  Choose File
                </button>
              )}
              <input
                ref={el => { fileInputRefs.current[doc.key] = el; }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleDocSelect(doc.key, e.target.files?.[0] || null)}
              />
              {docUploading === doc.key && (
                <p className="text-xs text-primary animate-pulse">Uploading...</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Moallem & Payment */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Additional Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Supplier Agent (Optional)</label>
            <select className={inputClass} value={form.supplier_agent_id} onChange={(e) => setForm({ ...form, supplier_agent_id: e.target.value })}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.agent_name} {s.company_name ? `(${s.company_name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Moallem (Optional)</label>
            <select className={inputClass} value={form.moallem_id} onChange={(e) => setForm({ ...form, moallem_id: e.target.value })}>
              <option value="">-- Select Moallem --</option>
              {moallems.map((m) => (
                <option key={m.id} value={m.id}>{m.name} {m.phone ? `(${m.phone})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Paid Amount (BDT)</label>
            <input className={inputClass} type="number" min={0} max={totalSellingPrice} value={form.paid_amount}
              placeholder="0"
              onChange={(e) => setForm(f => ({ ...f, paid_amount: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
            <select className={inputClass} value={form.payment_method} onChange={(e) => {
              const method = e.target.value;
              const walletMap: Record<string, string> = { cash: "Cash", manual: "Cash", bank: "Bank", bank_transfer: "Bank", bkash: "bKash", nagad: "Nagad" };
              const matchedWallet = walletAccounts.find((w: any) => w.name === walletMap[method]);
              setForm({ ...form, payment_method: method, wallet_account_id: matchedWallet?.id || "" });
            }}>
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Wallet Account</label>
            <select className={inputClass} value={form.wallet_account_id} onChange={(e) => setForm({ ...form, wallet_account_id: e.target.value })}>
              <option value="">-- Select Wallet * --</option>
              {walletAccounts.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name} — BDT {Number(w.balance || 0).toLocaleString("en-IN")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["pending", "confirmed", "visa_processing", "ticket_issued", "completed", "cancelled"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional info..." maxLength={500} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{form.guest_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium">{bookingType === "individual" ? "Individual" : `Family (${members.length} members)`}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Selling</p>
            <p className="font-heading font-bold text-foreground">BDT {totalSellingPrice.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className={`font-heading font-bold ${dueAmount > 0 ? "text-destructive" : "text-foreground"}`}>BDT {dueAmount.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate("/admin/bookings")}
          className="px-5 py-2.5 text-sm rounded-md bg-secondary text-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 text-sm rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50 flex items-center gap-2">
          <Save className="h-4 w-4" />
          {loading ? "Creating..." : "Create Booking"}
        </button>
      </div>
    </div>
  );
}

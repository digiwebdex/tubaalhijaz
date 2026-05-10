import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BilingualInvoicePdf, BilingualInvoiceData } from "@/components/admin/BilingualInvoicePdf";

export default function AdminBilingualInvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState<BilingualInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: b } = await apiClient.from("bookings").select("*").eq("id", id).single();
      if (!b) { setLoading(false); return; }
      const { data: pkg } = await apiClient.from("packages").select("title, price").eq("id", b.package_id).single();
      let customer: any = null;
      if (b.user_id && b.user_id !== "00000000-0000-0000-0000-000000000000") {
        const { data: c } = await apiClient.from("profiles").select("full_name, phone, email, address").eq("id", b.user_id).single();
        customer = c;
      }
      setData({
        invoice_no: b.tracking_id || `INV-${String(b.id).slice(0, 8).toUpperCase()}`,
        issued_at: b.created_at,
        customer_name: customer?.full_name || b.guest_name,
        customer_phone: customer?.phone || b.guest_phone,
        customer_email: customer?.email || b.guest_email,
        customer_address: customer?.address || b.guest_address,
        passport_no: b.guest_passport,
        package_name: pkg?.title || "Umrah Package",
        package_name_ar: pkg?.title_ar || "باقة العمرة",
        num_travelers: b.num_travelers,
        subtotal: Number(b.total_amount) + Number(b.discount || 0),
        discount: Number(b.discount || 0),
        total: Number(b.total_amount),
        paid: Number(b.paid_amount),
        due: Number(b.due_amount),
        notes: b.notes,
      });
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading invoice…</div>;
  if (!data) return <div className="p-12 text-center text-muted-foreground">Invoice not found.</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center px-4 print-hide">
        <Button asChild variant="outline" size="sm"><Link to="/admin/bookings"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>
        <Button onClick={() => window.print()} size="sm" className="bg-[#0F4C3A] hover:bg-[#1a6b50]">
          <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
        </Button>
      </div>
      <div className="shadow-2xl">
        <BilingualInvoicePdf data={data} />
      </div>
    </div>
  );
}

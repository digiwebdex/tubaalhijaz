import { useEffect, useState } from "react";
import QRCode from "qrcode";
import logo from "@/assets/tuba-logo.png";

interface Voucher {
  id: string;
  voucher_no: string;
  agent_name?: string;
  agent_country?: string;
  umrah_company?: string;
  group_name?: string;
  makkah_hotel?: string;
  madinah_hotel?: string;
  agreement_number?: string;
  check_in_date?: string;
  check_out_date?: string;
  nights?: number;
  total_rooms?: number;
  transport_company?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  num_pilgrims?: number;
  arrival_flight?: string;
  departure_flight?: string;
  airline?: string;
  flight_number?: string;
  airport?: string;
  flight_date?: string;
  flight_time?: string;
  makkah_supervisor?: string;
  madinah_supervisor?: string;
  ops_24h_phone?: string;
  notes?: string;
  issued_at?: string;
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB") : "—";

export function TransportVoucherPdf({ voucher: v }: { voucher: Voucher }) {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    const url = `${window.location.origin}/verify-voucher/${v.voucher_no}`;
    QRCode.toDataURL(url, { width: 140, margin: 1, color: { dark: "#1a3a2a", light: "#ffffff" } })
      .then(setQr).catch(() => {});
  }, [v.voucher_no]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .voucher-print, .voucher-print * { visibility: visible !important; }
          .voucher-print {
            position: absolute !important; left: 0; top: 0;
            width: 100% !important; max-width: none !important;
            margin: 0 !important; padding: 0 !important;
          }
          .print-hide { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="voucher-print bg-white text-[#1a1a1a] p-8 mx-auto" style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Manrope', 'Noto Naskh Arabic', sans-serif" }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 border-[#C9A96E] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Tuba Al Hijaz" className="h-16 w-16 object-contain" />
            <div>
              <div className="text-2xl font-bold text-[#0F4C3A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Tuba Al Hijaz
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Travel & Tourism — Umrah Operations</div>
              <div className="text-[10px] text-gray-500">Makkah · Madinah · Jeddah · Dhaka</div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#0F4C3A] text-white px-4 py-2 rounded">
              <div className="text-[10px] uppercase tracking-widest opacity-80">Transport Voucher</div>
              <div className="text-lg font-bold tracking-wider" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                قسيمة النقل
              </div>
            </div>
            <div className="text-xs mt-2 font-mono font-bold text-[#C9A96E]">{v.voucher_no}</div>
            <div className="text-[10px] text-gray-500">Issued: {fmtDate(v.issued_at)}</div>
          </div>
        </div>

        {/* Agent + QR */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <SectionHeader en="Agent Information" ar="بيانات الوكيل" />
            <Grid2>
              <Row en="Agent Name" ar="اسم الوكيل" v={v.agent_name} />
              <Row en="Country" ar="الدولة" v={v.agent_country} />
              <Row en="Umrah Company" ar="شركة العمرة" v={v.umrah_company} />
              <Row en="Group Name" ar="اسم المجموعة" v={v.group_name} />
            </Grid2>
          </div>
          <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded p-2">
            {qr && <img src={qr} alt="QR" className="w-28 h-28" />}
            <div className="text-[9px] text-gray-500 mt-1 text-center">Scan to verify</div>
          </div>
        </div>

        {/* Hotels */}
        <SectionHeader en="Hotel Information" ar="بيانات الفنادق" />
        <Grid2>
          <Row en="Makkah Hotel" ar="فندق مكة" v={v.makkah_hotel} />
          <Row en="Madinah Hotel" ar="فندق المدينة" v={v.madinah_hotel} />
          <Row en="Agreement No" ar="رقم الاتفاقية" v={v.agreement_number} />
          <Row en="Total Rooms" ar="عدد الغرف" v={v.total_rooms} />
          <Row en="Check-in" ar="تاريخ الوصول" v={fmtDate(v.check_in_date)} />
          <Row en="Check-out" ar="تاريخ المغادرة" v={fmtDate(v.check_out_date)} />
          <Row en="Nights" ar="عدد الليالي" v={v.nights} />
        </Grid2>

        {/* Transport */}
        <SectionHeader en="Transport Information" ar="بيانات النقل" />
        <Grid2>
          <Row en="Transport Company" ar="شركة النقل" v={v.transport_company} />
          <Row en="Vehicle Type" ar="نوع الحافلة" v={v.vehicle_type} />
          <Row en="Driver Name" ar="اسم السائق" v={v.driver_name} />
          <Row en="Driver Phone" ar="جوال السائق" v={v.driver_phone} />
          <Row en="Number of Pilgrims" ar="عدد المعتمرين" v={v.num_pilgrims} highlight />
        </Grid2>

        {/* Flight */}
        <SectionHeader en="Flight Information" ar="بيانات الرحلة" />
        <Grid2>
          <Row en="Airline" ar="شركة الطيران" v={v.airline} />
          <Row en="Flight Number" ar="رقم الرحلة" v={v.flight_number} />
          <Row en="Arrival Flight" ar="رحلة الوصول" v={v.arrival_flight} />
          <Row en="Departure Flight" ar="رحلة المغادرة" v={v.departure_flight} />
          <Row en="Airport" ar="المطار" v={v.airport} />
          <Row en="Date" ar="التاريخ" v={fmtDate(v.flight_date)} />
          <Row en="Time" ar="الوقت" v={v.flight_time} />
        </Grid2>

        {/* Supervisors */}
        <SectionHeader en="Operations Supervisors" ar="بيانات المشرفين" />
        <Grid2>
          <Row en="Makkah Supervisor" ar="مشرف مكة" v={v.makkah_supervisor} />
          <Row en="Madinah Supervisor" ar="مشرف المدينة" v={v.madinah_supervisor} />
          <Row en="Operations 24h" ar="العمليات 24 ساعة" v={v.ops_24h_phone} highlight />
        </Grid2>

        {/* Internal Movements example table */}
        <SectionHeader en="Internal Movements" ar="التحركات الداخلية" />
        <table className="w-full text-[11px] border border-gray-300 mb-4">
          <thead className="bg-[#0F4C3A] text-white">
            <tr>
              <th className="p-1.5 text-center w-8">#</th>
              <th className="p-1.5 text-left">From / من</th>
              <th className="p-1.5 text-left">To / إلى</th>
              <th className="p-1.5 text-center w-20">Date</th>
              <th className="p-1.5 text-center w-16">Time</th>
              <th className="p-1.5 text-left">Vehicle / المركبة</th>
            </tr>
          </thead>
          <tbody>
            {[
              { f: "Jeddah Airport", t: "Makkah Hotel" },
              { f: "Makkah Hotel", t: "Makkah Ziyara" },
              { f: "Makkah", t: "Madinah" },
              { f: "Madinah Hotel", t: "Madinah Ziyara" },
              { f: "Madinah", t: "Jeddah Airport" },
            ].map((m, i) => (
              <tr key={i} className="border-t border-gray-200">
                <td className="p-1.5 text-center font-bold text-[#C9A96E]">{i + 1}</td>
                <td className="p-1.5">{m.f}</td>
                <td className="p-1.5">{m.t}</td>
                <td className="p-1.5 text-center text-gray-500">—</td>
                <td className="p-1.5 text-center text-gray-500">—</td>
                <td className="p-1.5 text-gray-500">{v.vehicle_type || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {v.notes && (
          <div className="mb-4 p-2 bg-amber-50 border-l-4 border-[#C9A96E] text-[11px]">
            <strong>Notes / ملاحظات:</strong> {v.notes}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-[#C9A96E] pt-3 mt-6 grid grid-cols-3 gap-4 text-center text-[10px] text-gray-600">
          <div>
            <div className="border-b border-gray-400 mx-auto w-32 h-10"></div>
            <div className="mt-1">Operations Manager</div>
            <div dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>مدير العمليات</div>
          </div>
          <div>
            <div className="border-b border-gray-400 mx-auto w-32 h-10"></div>
            <div className="mt-1">Authorized Signature</div>
            <div dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>توقيع معتمد</div>
          </div>
          <div>
            <div className="border-b border-gray-400 mx-auto w-32 h-10"></div>
            <div className="mt-1">Stamp / Seal</div>
            <div dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>الختم</div>
          </div>
        </div>

        <div className="mt-4 text-center text-[9px] text-gray-400">
          tubaalhijaz.com · This is a computer-generated voucher · هذه قسيمة صادرة إلكترونياً
        </div>
      </div>
    </>
  );
}

function SectionHeader({ en, ar }: { en: string; ar: string }) {
  return (
    <div className="bg-gradient-to-r from-[#0F4C3A] to-[#1a6b50] text-white px-3 py-1.5 mb-2 mt-3 flex justify-between items-center">
      <span className="text-xs font-bold uppercase tracking-wider">{en}</span>
      <span className="text-sm" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>{ar}</span>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-[11px]">{children}</div>;
}

function Row({ en, ar, v, highlight }: { en: string; ar: string; v: any; highlight?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-dotted border-gray-300 py-1 ${highlight ? "bg-amber-50 px-2" : ""}`}>
      <div>
        <span className="font-semibold text-[#0F4C3A]">{en}</span>
        <span className="text-gray-400 mx-1">/</span>
        <span dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>{ar}</span>
      </div>
      <div className={`font-medium ${highlight ? "text-[#C9A96E] font-bold" : ""}`}>{v ?? "—"}</div>
    </div>
  );
}

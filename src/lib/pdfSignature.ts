import { supabase } from "@/lib/api";
import defaultSignatureImg from "@/assets/default-signature.png";

export interface SignatureData {
  authorized_name: string;
  designation: string;
  signature_base64: string;
  stamp_base64: string;
}

function loadImageBase64(url: string): Promise<string> {
  if (!url) return Promise.resolve("");
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = url;
  });
}

let cachedSignature: SignatureData | null = null;
let cacheTime = 0;

export async function getSignatureData(): Promise<SignatureData> {
  // Cache for 5 minutes
  if (cachedSignature && Date.now() - cacheTime < 5 * 60 * 1000) {
    return cachedSignature;
  }

  const { data } = await supabase
    .from("company_settings")
    .select("setting_value")
    .eq("setting_key", "signature")
    .maybeSingle();

  const val = (data?.setting_value as any) || {};
  
  let [signature_base64, stamp_base64] = await Promise.all([
    loadImageBase64(val.signature_url || ""),
    loadImageBase64(val.stamp_url || ""),
  ]);

  // Use default signature image as fallback if none configured
  if (!signature_base64) {
    signature_base64 = await loadImageBase64(defaultSignatureImg);
  }

  cachedSignature = {
    authorized_name: val.authorized_name || "TUBA ALHIJAZ",
    designation: val.designation || "",
    signature_base64,
    stamp_base64,
  };
  cacheTime = Date.now();

  return cachedSignature;
}

export function clearSignatureCache() {
  cachedSignature = null;
  cacheTime = 0;
}

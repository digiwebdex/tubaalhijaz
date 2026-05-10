import { apiClient } from "@/lib/apiClient";

// ─── Types ───
export interface FBPixelConfig {
  pixel_id: string;
  enabled: boolean;
  track_page_view: boolean;
  track_view_content: boolean;
  track_lead: boolean;
  track_purchase: boolean;
  track_initiate_checkout: boolean;
  track_search: boolean;
  track_contact: boolean;
  capi_enabled: boolean;
  test_event_code: string;
}

export const DEFAULT_FB_CONFIG: FBPixelConfig = {
  pixel_id: "",
  enabled: false,
  track_page_view: true,
  track_view_content: true,
  track_lead: true,
  track_purchase: true,
  track_initiate_checkout: true,
  track_search: false,
  track_contact: true,
  capi_enabled: false,
  test_event_code: "",
};

// ─── Client-side Pixel ───
let pixelInitialized = false;
let currentPixelId = "";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function initFBPixel(pixelId: string) {
  if (!pixelId || pixelInitialized && currentPixelId === pixelId) return;

  // Inject fbevents.js
  if (!window.fbq) {
    const n: any = (window.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", pixelId);
  pixelInitialized = true;
  currentPixelId = pixelId;
}

export function trackFBEvent(
  eventName: string,
  params?: Record<string, any>,
  options?: { eventID?: string }
) {
  if (!pixelInitialized || !window.fbq) return;
  if (options?.eventID) {
    window.fbq("track", eventName, params || {}, { eventID: options.eventID });
  } else {
    window.fbq("track", eventName, params);
  }
}

export function trackFBCustomEvent(
  eventName: string,
  params?: Record<string, any>
) {
  if (!pixelInitialized || !window.fbq) return;
  window.fbq("trackCustom", eventName, params);
}

// ─── Generate unique event ID for deduplication ───
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Server-side CAPI call ───
export async function sendServerEvent(event: {
  event_name: string;
  event_id: string;
  event_time?: number;
  user_data?: {
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, any>;
  event_source_url?: string;
  action_source?: string;
  test_event_code?: string;
}) {
  try {
    const { data, error } = await apiClient.functions.invoke("fb-conversions-api", {
      body: event,
    });
    if (error) console.warn("CAPI error:", error);
    return data;
  } catch (err) {
    console.warn("CAPI send failed:", err);
  }
}

// ─── Cookie helpers for fbp/fbc ───
export function getFBCookies() {
  const cookies = document.cookie.split(";").reduce((acc, c) => {
    const [key, val] = c.trim().split("=");
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);

  return {
    fbp: cookies["_fbp"] || "",
    fbc: cookies["_fbc"] || new URLSearchParams(window.location.search).get("fbclid")
      ? `fb.1.${Date.now()}.${new URLSearchParams(window.location.search).get("fbclid")}`
      : "",
  };
}

// ─── Combined track (client + server) ───
export async function trackDualEvent(
  eventName: string,
  params?: Record<string, any>,
  userData?: { email?: string; phone?: string; name?: string },
  capiEnabled = false
) {
  const eventId = generateEventId();

  // Client-side
  trackFBEvent(eventName, params, { eventID: eventId });

  // Server-side (if enabled)
  if (capiEnabled) {
    const { fbp, fbc } = getFBCookies();
    const userDataHashed: Record<string, string> = {};
    if (userData?.email) userDataHashed.em = userData.email;
    if (userData?.phone) userDataHashed.ph = userData.phone;
    if (userData?.name) {
      const parts = userData.name.split(" ");
      userDataHashed.fn = parts[0] || "";
      userDataHashed.ln = parts.slice(1).join(" ") || "";
    }
    if (fbp) userDataHashed.fbp = fbp;
    if (fbc) userDataHashed.fbc = fbc;
    userDataHashed.client_user_agent = navigator.userAgent;

    await sendServerEvent({
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      user_data: userDataHashed,
      custom_data: params,
      event_source_url: window.location.href,
      action_source: "website",
    });
  }
}

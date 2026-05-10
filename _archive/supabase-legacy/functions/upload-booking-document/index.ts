import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const bookingId = formData.get("booking_id") as string;
    const trackingId = formData.get("tracking_id") as string;
    const documentType = formData.get("document_type") as string;
    const file = formData.get("file") as File;

    if (!bookingId || !trackingId || !documentType || !file) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id, tracking_id, document_type, file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify booking exists with matching tracking_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, guest_name")
      .eq("id", bookingId)
      .eq("tracking_id", trackingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found or tracking ID mismatch" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = booking.user_id || "00000000-0000-0000-0000-000000000000";
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/${bookingId}/${documentType}_${Date.now()}.${ext}`;

    // Upload to storage using service role
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert document record
    const { error: insertError } = await supabase
      .from("booking_documents")
      .insert({
        booking_id: bookingId,
        user_id: userId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });

    if (insertError) {
      console.error("Document record insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save document record: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, file_path: filePath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Upload edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pw = "";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  for (const b of arr) pw += chars[b % chars.length];
  // Ensure it meets password rules
  return "Rk" + pw + "1!";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      fullName,
      phone,
      email,
      address,
      passportNumber,
      packageId,
      numTravelers,
      notes,
      installmentPlanId,
    } = await req.json();

    if (!fullName || !phone || !packageId || !numTravelers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fullName, phone, packageId, numTravelers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get package to calculate total
    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("id, price, name")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) {
      return new Response(
        JSON.stringify({ error: "Package not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAmount = Number(pkg.price) * numTravelers;

    // Check if there's a logged-in user from the auth header
    let userId: string | null = null;
    let autoCreated = false;
    let tempPassword: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      if (authUser?.id) {
        userId = authUser.id;
      }
    }

    // AUTO ACCOUNT CREATION: If no logged-in user and email is provided
    if (!userId && email?.trim()) {
      const trimmedEmail = email.trim().toLowerCase();
      console.log("Auto account creation: checking for existing user with email:", trimmedEmail);

      // Check if user already exists with this email
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("listUsers error:", JSON.stringify(listError));
      }
      console.log("Found users count:", existingUsers?.users?.length || 0);
      
      const existingUser = existingUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === trimmedEmail
      );

      if (existingUser) {
        // Attach to existing user
        userId = existingUser.id;
        console.log("Attached to existing user:", userId);
      } else {
        // Create new account with temporary password
        tempPassword = generateTempPassword();
        console.log("Creating new user for:", trimmedEmail);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: trimmedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            auto_created: true,
          },
        });

        if (createError) {
          console.error("Auto account creation error:", JSON.stringify(createError));
          // Don't fail the booking, just proceed without account
        } else if (newUser?.user) {
          console.log("User created successfully:", newUser.user.id);
          userId = newUser.user.id;
          autoCreated = true;

          // Assign 'user' role
          await supabase.from("user_roles").insert({
            user_id: userId,
            role: "user",
          });

          // Update profile with additional details
          await supabase.from("profiles").update({
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: trimmedEmail,
            passport_number: passportNumber?.trim() || null,
            address: address?.trim() || null,
            notes: "Auto-created from guest booking",
          }).eq("user_id", userId);
        }
      }
    }

    // Auto-assign "TRIP TASTIC" moallem for online bookings
    let defaultMoallemId: string | null = null;
    const { data: defaultMoallem } = await supabase
      .from("moallems")
      .select("id")
      .eq("name", "TRIP TASTIC")
      .eq("status", "active")
      .limit(1)
      .single();
    if (defaultMoallem) {
      defaultMoallemId = defaultMoallem.id;
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        package_id: packageId,
        total_amount: totalAmount,
        num_travelers: numTravelers,
        installment_plan_id: installmentPlanId || null,
        notes: notes?.trim() || null,
        guest_name: fullName.trim(),
        guest_phone: phone.trim(),
        guest_email: email?.trim() || null,
        guest_address: address?.trim() || null,
        guest_passport: passportNumber?.trim() || null,
        status: "pending",
        paid_amount: 0,
        due_amount: totalAmount,
        selling_price_per_person: Number(pkg.price),
        moallem_id: defaultMoallemId,
      })
      .select("id, tracking_id")
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return new Response(
        JSON.stringify({ error: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate installment schedule if plan selected
    if (installmentPlanId) {
      const { data: plan } = await supabase
        .from("installment_plans")
        .select("num_installments")
        .eq("id", installmentPlanId)
        .single();

      if (plan) {
        const paymentUserId = userId || "00000000-0000-0000-0000-000000000000";
        await supabase.rpc("generate_installment_schedule", {
          p_booking_id: booking.id,
          p_total_amount: totalAmount,
          p_num_installments: plan.num_installments,
          p_user_id: paymentUserId,
        });
      }
    }

    // If user is logged in (not auto-created), update their profile
    if (userId && !autoCreated) {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          passport_number: passportNumber?.trim() || null,
          address: address?.trim() || null,
        })
        .eq("user_id", userId);
    }

    // SEND EMAIL NOTIFICATION with booking details + login credentials
    if (email?.trim()) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@example.com";

      if (resendKey) {
        const loginSection = autoCreated && tempPassword
          ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Login Email</td><td style="padding:8px;border:1px solid #ddd">${email.trim()}</td></tr>
             <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Temporary Password</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-size:16px;background:#fff3cd">${tempPassword}</td></tr>
             <tr><td colspan="2" style="padding:12px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-size:13px">
               ⚠️ Please change your password after first login for security.
             </td></tr>`
          : "";

        const subject = autoCreated
          ? `🎉 Booking Created + Your Account — ${booking.tracking_id}`
          : `📋 Booking Created — ${booking.tracking_id}`;

        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;border-radius:8px">
          <h2 style="color:#b8860b">Booking Confirmation</h2>
          <p>Dear <strong>${fullName.trim()}</strong>,</p>
          <p>Your booking for <strong>${pkg.name}</strong> has been successfully created!</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Tracking ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-size:16px;color:#b8860b">${booking.tracking_id}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package</td><td style="padding:8px;border:1px solid #ddd">${pkg.name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Travelers</td><td style="padding:8px;border:1px solid #ddd">${numTravelers}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total Amount</td><td style="padding:8px;border:1px solid #ddd">৳${totalAmount.toLocaleString()}</td></tr>
            ${loginSection}
          </table>
          <div style="background:#e3f2fd;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:0;font-size:14px"><strong>📍 Track Without Login:</strong> Visit our tracking page and enter your Tracking ID <strong>${booking.tracking_id}</strong> or your phone number.</p>
            ${autoCreated ? `<p style="margin:8px 0 0;font-size:14px"><strong>🔐 Full Dashboard Access:</strong> <a href="https://triptastic.com.bd/auth" style="color:#b8860b">Login here</a> with your email and temporary password to view full booking details, payment history, and manage documents.</p>` : ""}
          </div>
          <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"/>
          <p style="font-size:12px;color:#888">TRIP TASTIC — Your trusted Hajj & Umrah partner</p>
        </div>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: fromEmail, to: [email.trim()], subject, html }),
          });
          console.log("Email sent to:", email.trim());
        } catch (e) {
          console.error("Email send error:", e);
        }

        // Log email notification
        if (userId) {
          try {
            await supabase.from("notification_logs").insert({
              user_id: userId,
              booking_id: booking.id,
              event_type: "booking_created",
              channel: "email",
              recipient: email.trim(),
              subject,
              message: html,
              status: "sent",
            });
          } catch (logErr) {
            console.error("Email notification log error:", logErr);
          }
        }
      }
    }

    // SEND SMS NOTIFICATION with tracking ID
    if (phone?.trim()) {
      const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID") || "8809617618686";

      if (smsApiKey) {
        const smsMessage = `TRIP TASTIC: Your booking is confirmed!\nTracking ID: ${booking.tracking_id}\nPackage: ${pkg.name}\nTravelers: ${numTravelers}\nTotal: BDT ${totalAmount.toLocaleString()}\nTrack: triptastic.com.bd/track?id=${booking.tracking_id}`;

        try {
          const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${smsApiKey}&type=text&number=${phone.trim()}&senderid=${smsSenderId}&message=${encodeURIComponent(smsMessage)}`;
          const smsRes = await fetch(smsUrl);
          const smsResult = await smsRes.text();
          console.log("SMS sent to:", phone.trim(), "Result:", smsResult);
        } catch (e) {
          console.error("SMS send error:", e);
        }

        // Log SMS notification
        if (userId) {
          try {
            await supabase.from("notification_logs").insert({
              user_id: userId,
              booking_id: booking.id,
              event_type: "booking_created",
              channel: "sms",
              recipient: phone.trim(),
              subject: "Booking Confirmation SMS",
              message: smsMessage,
              status: "sent",
            });
          } catch (logErr) {
            console.error("SMS notification log error:", logErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        tracking_id: booking.tracking_id,
        auto_created: autoCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

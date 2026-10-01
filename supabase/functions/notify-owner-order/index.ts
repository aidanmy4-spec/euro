import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.order_id;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the order with its items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, order_type, payment_method, total_price, pickup_date, pickup_time, notes, created_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("item_name, item_price, quantity, comment")
      .eq("order_id", orderId);

    if (itemsError) throw new Error(`Failed to fetch order items: ${itemsError.message}`);

    // Fetch all notification phone numbers
    const { data: notifNumbers } = await supabase
      .from("order_notification_numbers")
      .select("label, phone_number")
      .order("created_at", { ascending: true });

    const phoneNumbers: string[] = (notifNumbers || []).map((n: { label: string; phone_number: string }) => n.phone_number);

    // Fetch Twilio config from the database
    const { data: twilioConfig } = await supabase
      .from("twilio_config")
      .select("account_sid, auth_token, from_number, enabled")
      .eq("setting_key", "main")
      .maybeSingle();

    const twilioAccountSid = twilioConfig?.account_sid || Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    const twilioAuthToken = twilioConfig?.auth_token || Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const twilioFromNumber = twilioConfig?.from_number || Deno.env.get("TWILIO_FROM_NUMBER") || "";
    const twilioEnabled = twilioConfig?.enabled ?? false;

    // Build the SMS message
    const itemList = (items || []).map((item: { item_name: string; item_price: string; quantity: number; comment?: string }) => {
      const base = `  ${item.quantity}x ${item.item_name} (${item.item_price})`;
      return item.comment ? `${base} — ${item.comment}` : base;
    }).join("\n");

    const totalPriceFormatted = `$${Number(order.total_price).toFixed(2)}`;
    const paymentLabel = order.payment_method === "check" ? "Check" : "Cash";
    const typeLabel = order.order_type === "bakery" ? "Bakery" : "Menu";
    const pickupStr = order.pickup_date ? `Pickup: ${order.pickup_date}${order.pickup_time ? ` at ${order.pickup_time}` : ''}` : "Pickup: ASAP";
    const notesStr = order.notes ? `\nNotes: ${order.notes}` : "";

    const message = `New ${typeLabel} order from ${order.customer_name}!\n${itemList}\nTotal: ${totalPriceFormatted}\nPayment: ${paymentLabel}\n${pickupStr}\nPhone: ${order.customer_phone}${notesStr}`;

    const results: Array<{ to: string; sent: boolean; error: string | null }> = [];
    let anySent = false;
    let firstError: string | null = null;

    if (twilioEnabled && twilioAccountSid && twilioAuthToken && twilioFromNumber && phoneNumbers.length > 0) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      for (const toNumber of phoneNumbers) {
        try {
          const params = new URLSearchParams();
          params.append("To", toNumber);
          params.append("From", twilioFromNumber);
          params.append("Body", message);

          const twilioResp = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (twilioResp.ok) {
            results.push({ to: toNumber, sent: true, error: null });
            anySent = true;
          } else {
            const errText = await twilioResp.text();
            results.push({ to: toNumber, sent: false, error: `Twilio error: ${errText}` });
            if (!firstError) firstError = `Twilio error: ${errText}`;
          }
        } catch (err) {
          results.push({ to: toNumber, sent: false, error: `Fetch failed: ${err.message}` });
          if (!firstError) firstError = `Fetch failed: ${err.message}`;
        }
      }
    } else {
      const missing: string[] = [];
      if (!twilioEnabled) missing.push("Twilio is turned off");
      if (!twilioAccountSid) missing.push("Account SID not set");
      if (!twilioAuthToken) missing.push("Auth Token not set");
      if (!twilioFromNumber) missing.push("From number not set");
      if (phoneNumbers.length === 0) missing.push("No notification numbers added");
      firstError = missing.join(", ");
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        sms_sent: anySent,
        sms_error: firstError,
        sms_results: results,
        message_preview: message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

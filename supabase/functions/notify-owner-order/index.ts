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
      .select("id, customer_name, customer_phone, order_type, payment_method, total_price, pickup_date, notes, created_at")
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
      .select("item_name, item_price, quantity")
      .eq("order_id", orderId);

    if (itemsError) throw new Error(`Failed to fetch order items: ${itemsError.message}`);

    // Fetch the owner's notification phone number
    const { data: notifSettings } = await supabase
      .from("notification_settings")
      .select("notification_phone")
      .eq("setting_key", "main")
      .maybeSingle();

    const ownerPhone = notifSettings?.notification_phone;

    // Also check site_settings for online ordering being enabled
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("online_ordering_enabled")
      .eq("setting_key", "main")
      .maybeSingle();

    // Build the SMS message
    const itemList = (items || []).map((item: { item_name: string; item_price: string; quantity: number; comment?: string }) => {
      const base = `  ${item.quantity}x ${item.item_name} (${item.item_price})`;
      return item.comment ? `${base} — ${item.comment}` : base;
    }).join("\n");

    const totalPriceFormatted = `$${Number(order.total_price).toFixed(2)}`;
    const paymentLabel = order.payment_method === "check" ? "Check" : "Cash";
    const typeLabel = order.order_type === "bakery" ? "Bakery" : "Menu";
    const pickupStr = order.pickup_date ? `Pickup: ${order.pickup_date}` : "Pickup: ASAP";
    const notesStr = order.notes ? `\nNotes: ${order.notes}` : "";

    const message = `New ${typeLabel} order from ${order.customer_name}!\n${itemList}\nTotal: ${totalPriceFormatted}\nPayment: ${paymentLabel}\n${pickupStr}\nPhone: ${order.customer_phone}${notesStr}`;

    // Try to send SMS via Twilio if credentials are configured
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    let smsSent = false;
    let smsError: string | null = null;

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber && ownerPhone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
        const params = new URLSearchParams();
        params.append("To", ownerPhone);
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
          smsSent = true;
        } else {
          const errText = await twilioResp.text();
          smsError = `Twilio error: ${errText}`;
        }
      } catch (err) {
        smsError = `Twilio fetch failed: ${err.message}`;
      }
    } else {
      smsError = "Twilio not configured or owner phone not set";
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        sms_sent: smsSent,
        sms_error: smsError,
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

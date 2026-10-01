import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { crypto } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const token = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const keyData = sa.private_key.replace(/\\n/g, "\n");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    strToPemDer(keyData),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(token));
  const jwt = `${token}.${base64url(new Uint8Array(signature))}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Failed to get Google access token");
  return data.access_token;
}

function strToPemDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN.*?-----/g, "").replace(/-----END.*?-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().slice(0, 10);

    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const spreadsheetId = Deno.env.get("GOOGLE_SPREADSHEET_ID");

    if (!serviceAccountKey || !spreadsheetId) {
      return new Response(
        JSON.stringify({
          error: "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SPREADSHEET_ID secrets.",
          date: targetDate,
          shifts: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: events, error: eventsError } = await supabase.rpc("get_daily_shift_summary", { p_date: targetDate });
    if (eventsError) throw new Error(`Database error: ${eventsError.message}`);

    const shifts = (events || []) as Array<{
      display_name: string;
      role: string;
      clock_in: string | null;
      clock_out: string | null;
      break_minutes: number;
      total_minutes: number;
      notes: string | null;
    }>;

    const dateObj = new Date(targetDate + "T00:00:00");
    const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const rows = [
      [dateLabel],
      ["Staff", "Role", "Clock In", "Clock Out", "Break (min)", "Total Hours", "Notes"],
      ...shifts.map((s) => [
        s.display_name,
        s.role,
        s.clock_in || "—",
        s.clock_out || "—",
        String(s.break_minutes || 0),
        ((s.total_minutes || 0) / 60).toFixed(2),
        s.notes || "",
      ]),
    ];

    const accessToken = await getGoogleAccessToken(serviceAccountKey);

    const appendResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    if (!appendResp.ok) {
      const errText = await appendResp.text();
      throw new Error(`Google Sheets API error: ${errText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        shiftsExported: shifts.length,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
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

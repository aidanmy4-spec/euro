/*
# Phases 2–4 restaurant operations

1. New tables
- `customer_contacts`: names and contact details collected from orders and club signups, with separate email and text consent.
- `inquiries`: bakery pre-orders and catering inquiries, including pickup date, order notes, and workflow status.
- `holiday_pages`: seasonal bakery pages that can be published or hidden.
- `promotions`: scheduled banners, coupons, and event announcements.
- `photo_assets`: owner-managed photo URLs and captions for future content updates.
- `staff_members`: active staff roster with roles and a protected kiosk PIN hash.
- `clock_events`: staff clock-in and clock-out history.
- `activity_logs`: owner-facing record of management changes.

2. Security
- Row-level security is enabled on every new table.
- Public visitors can submit bakery, catering, and club forms but cannot read customer data.
- Public visitors can read only published seasonal pages, active promotions, and photo content.
- Only the claimed owner can read or manage private submissions, staff records, activity history, and published content.
- Staff kiosk clock actions use a server-side PIN verification function and never expose PIN hashes.

3. Important notes
- Customer consent is stored separately for email and text so future outreach can honor the exact permission given.
- Email and texting delivery still require a provider connection; the inbox is live immediately and keeps every request available to the owner.
- No existing tables or user data are removed or renamed.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text CHECK (email IS NULL OR char_length(email) BETWEEN 5 AND 254),
  phone text CHECK (phone IS NULL OR char_length(phone) BETWEEN 7 AND 30),
  email_consent boolean NOT NULL DEFAULT false,
  sms_consent boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'bakery_order', 'catering', 'club')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type text NOT NULL CHECK (inquiry_type IN ('bakery_order', 'catering')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
  pickup_date date,
  pickup_time text,
  details text NOT NULL CHECK (char_length(details) BETWEEN 5 AND 4000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.holiday_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 2 AND 500),
  coupon_code text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  image_url text NOT NULL CHECK (char_length(image_url) BETWEEN 8 AND 2000),
  alt_text text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 2 AND 120),
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON public.inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_contacts_created_idx ON public.customer_contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS promotions_schedule_idx ON public.promotions (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS clock_events_staff_created_idx ON public.clock_events (staff_id, created_at DESC);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read customer contacts" ON public.customer_contacts;
CREATE POLICY "Owners can read customer contacts" ON public.customer_contacts FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Visitors can submit customer contacts" ON public.customer_contacts;
CREATE POLICY "Visitors can submit customer contacts" ON public.customer_contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Owners can update customer contacts" ON public.customer_contacts;
CREATE POLICY "Owners can update customer contacts" ON public.customer_contacts FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete customer contacts" ON public.customer_contacts;
CREATE POLICY "Owners can delete customer contacts" ON public.customer_contacts FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can read inquiries" ON public.inquiries;
CREATE POLICY "Owners can read inquiries" ON public.inquiries FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Visitors can submit inquiries" ON public.inquiries;
CREATE POLICY "Visitors can submit inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Owners can update inquiries" ON public.inquiries;
CREATE POLICY "Owners can update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete inquiries" ON public.inquiries;
CREATE POLICY "Owners can delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read published holiday pages" ON public.holiday_pages;
CREATE POLICY "Public can read published holiday pages" ON public.holiday_pages FOR SELECT TO anon, authenticated USING (is_published = true OR public.is_owner());
DROP POLICY IF EXISTS "Owners can insert holiday pages" ON public.holiday_pages;
CREATE POLICY "Owners can insert holiday pages" ON public.holiday_pages FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update holiday pages" ON public.holiday_pages;
CREATE POLICY "Owners can update holiday pages" ON public.holiday_pages FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete holiday pages" ON public.holiday_pages;
CREATE POLICY "Owners can delete holiday pages" ON public.holiday_pages FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read active promotions" ON public.promotions;
CREATE POLICY "Public can read active promotions" ON public.promotions FOR SELECT TO anon, authenticated USING ((is_published = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now())) OR public.is_owner());
DROP POLICY IF EXISTS "Owners can insert promotions" ON public.promotions;
CREATE POLICY "Owners can insert promotions" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update promotions" ON public.promotions;
CREATE POLICY "Owners can update promotions" ON public.promotions FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete promotions" ON public.promotions;
CREATE POLICY "Owners can delete promotions" ON public.promotions FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read published photos" ON public.photo_assets;
CREATE POLICY "Public can read published photos" ON public.photo_assets FOR SELECT TO anon, authenticated USING (is_published = true OR public.is_owner());
DROP POLICY IF EXISTS "Owners can insert photos" ON public.photo_assets;
CREATE POLICY "Owners can insert photos" ON public.photo_assets FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update photos" ON public.photo_assets;
CREATE POLICY "Owners can update photos" ON public.photo_assets FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete photos" ON public.photo_assets;
CREATE POLICY "Owners can delete photos" ON public.photo_assets FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can read staff" ON public.staff_members;
CREATE POLICY "Owners can read staff" ON public.staff_members FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Owners can insert staff" ON public.staff_members;
CREATE POLICY "Owners can insert staff" ON public.staff_members FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update staff" ON public.staff_members;
CREATE POLICY "Owners can update staff" ON public.staff_members FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete staff" ON public.staff_members;
CREATE POLICY "Owners can delete staff" ON public.staff_members FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can read clock events" ON public.clock_events;
CREATE POLICY "Owners can read clock events" ON public.clock_events FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "No direct clock event inserts" ON public.clock_events;
CREATE POLICY "No direct clock event inserts" ON public.clock_events FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct clock event updates" ON public.clock_events;
CREATE POLICY "No direct clock event updates" ON public.clock_events FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Owners can delete clock events" ON public.clock_events;
CREATE POLICY "Owners can delete clock events" ON public.clock_events FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can read activity logs" ON public.activity_logs;
CREATE POLICY "Owners can read activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Owners can insert activity logs" ON public.activity_logs;
CREATE POLICY "Owners can insert activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_owner() AND actor_user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can update activity logs" ON public.activity_logs;
CREATE POLICY "Owners can update activity logs" ON public.activity_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Owners can delete activity logs" ON public.activity_logs;
CREATE POLICY "Owners can delete activity logs" ON public.activity_logs FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.clock_staff(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.staff_members;
  v_last_event text;
  v_new_event text;
BEGIN
  IF p_pin IS NULL OR char_length(p_pin) < 4 OR char_length(p_pin) > 12 THEN
    RAISE EXCEPTION 'Invalid kiosk entry';
  END IF;
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN
    RAISE EXCEPTION 'Invalid kiosk entry';
  END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  v_new_event := CASE WHEN v_last_event = 'clock_in' THEN 'clock_out' ELSE 'clock_in' END;
  INSERT INTO public.clock_events (staff_id, event_type) VALUES (v_staff.id, v_new_event);
  RETURN jsonb_build_object('name', v_staff.display_name, 'event_type', v_new_event, 'created_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clock_staff(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_staff(text) TO anon, authenticated;

INSERT INTO public.holiday_pages (title, slug, description, is_published)
VALUES
  ('Easter Bakery', 'easter-bakery', 'Seasonal breads, pastries, and celebration treats for your Easter table.', false),
  ('Christmas Bakery', 'christmas-bakery', 'Holiday cookies, nut rolls, cakes, and giftable bakery favorites.', false),
  ('Paczki Day', 'paczki-day', 'A special day for traditional filled pastries and European bakery favorites.', false)
ON CONFLICT (slug) DO NOTHING;
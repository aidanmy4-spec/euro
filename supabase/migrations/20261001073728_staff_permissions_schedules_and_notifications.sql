/*
# Staff access, schedules, and notification settings

1. Modified tables
- `staff_members`: adds permission flags for viewing the order inbox, viewing the bakery calendar, managing orders, and managing bakery content.

2. New tables
- `staff_schedules`: owner-managed shifts that are visible to signed-in staff kiosk sessions.
- `notification_settings`: the owner-managed email address and phone number used for future order notifications.

3. New secure functions
- `staff_dashboard`: validates a staff PIN server-side and returns only that staff member's safe dashboard data, recent clock history, schedules, and permission-limited orders.
- `staff_update_order`: lets staff with the matching permission update an order status without exposing the database directly.
- `staff_add_order`: lets staff with the matching permission add a bakery order through a server-side checked function.

4. Security
- Staff permissions are owner-only writable columns.
- Schedule and notification records are owner-only through row-level security.
- Staff functions never return PIN hashes or unrestricted customer records.
- Existing customer and owner data remains unchanged.
*/

ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS can_view_inbox boolean NOT NULL DEFAULT true;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS can_view_calendar boolean NOT NULL DEFAULT true;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS can_manage_orders boolean NOT NULL DEFAULT false;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS can_manage_bakery boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, schedule_date)
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  setting_key text PRIMARY KEY DEFAULT 'main' CHECK (setting_key = 'main'),
  notification_email text,
  notification_phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read schedules" ON public.staff_schedules;
CREATE POLICY "Owners can read schedules" ON public.staff_schedules FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Owners can insert schedules" ON public.staff_schedules;
CREATE POLICY "Owners can insert schedules" ON public.staff_schedules FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update schedules" ON public.staff_schedules;
CREATE POLICY "Owners can update schedules" ON public.staff_schedules FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete schedules" ON public.staff_schedules;
CREATE POLICY "Owners can delete schedules" ON public.staff_schedules FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can read notification settings" ON public.notification_settings;
CREATE POLICY "Owners can read notification settings" ON public.notification_settings FOR SELECT TO authenticated USING (public.is_owner());
DROP POLICY IF EXISTS "Owners can insert notification settings" ON public.notification_settings;
CREATE POLICY "Owners can insert notification settings" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update notification settings" ON public.notification_settings;
CREATE POLICY "Owners can update notification settings" ON public.notification_settings FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete notification settings" ON public.notification_settings;
CREATE POLICY "Owners can delete notification settings" ON public.notification_settings FOR DELETE TO authenticated USING (public.is_owner());

CREATE OR REPLACE FUNCTION public.staff_dashboard(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.staff_members;
  v_last_event text;
  v_active_since timestamptz;
  v_events jsonb;
  v_schedules jsonb;
  v_inquiries jsonb;
BEGIN
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,12}$' THEN
    RAISE EXCEPTION 'Invalid kiosk entry';
  END IF;
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN
    RAISE EXCEPTION 'Invalid kiosk entry';
  END IF;

  SELECT event_type, created_at INTO v_last_event, v_active_since
  FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  IF v_last_event <> 'clock_in' THEN v_active_since := NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('event_type', event_type, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_events FROM (SELECT event_type, created_at FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 20) history;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', schedule_date, 'start_time', start_time, 'end_time', end_time, 'notes', notes) ORDER BY schedule_date), '[]'::jsonb)
  INTO v_schedules FROM public.staff_schedules WHERE staff_id = v_staff.id AND schedule_date >= current_date - 1;

  IF v_staff.can_view_inbox THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'inquiry_type', inquiry_type, 'full_name', full_name, 'pickup_date', pickup_date, 'pickup_time', pickup_time, 'details', details, 'status', status, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_inquiries FROM (SELECT id, inquiry_type, full_name, pickup_date, pickup_time, details, status, created_at FROM public.inquiries ORDER BY created_at DESC LIMIT 50) orders;
  ELSE
    v_inquiries := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'staff', jsonb_build_object('id', v_staff.id, 'display_name', v_staff.display_name, 'role', v_staff.role, 'can_view_inbox', v_staff.can_view_inbox, 'can_view_calendar', v_staff.can_view_calendar, 'can_manage_orders', v_staff.can_manage_orders, 'can_manage_bakery', v_staff.can_manage_bakery),
    'active_since', v_active_since,
    'events', v_events,
    'schedules', CASE WHEN v_staff.can_view_calendar THEN v_schedules ELSE '[]'::jsonb END,
    'inquiries', v_inquiries
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_update_order(p_pin text, p_inquiry_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_staff public.staff_members;
BEGIN
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL OR NOT v_staff.can_manage_orders THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.inquiries SET status = p_status, updated_at = now() WHERE id = p_inquiry_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_add_order(p_pin text, p_name text, p_email text, p_phone text, p_pickup_date date, p_pickup_time text, p_details text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_staff public.staff_members; v_id uuid;
BEGIN
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL OR NOT v_staff.can_manage_orders THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF char_length(p_name) < 2 OR char_length(p_email) < 5 OR char_length(p_phone) < 7 OR char_length(p_details) < 5 THEN RAISE EXCEPTION 'Invalid order'; END IF;
  INSERT INTO public.inquiries (inquiry_type, full_name, email, phone, pickup_date, pickup_time, details)
  VALUES ('bakery_order', p_name, p_email, p_phone, p_pickup_date, p_pickup_time, p_details) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_dashboard(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.staff_update_order(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.staff_add_order(text, text, text, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_dashboard(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_order(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_add_order(text, text, text, text, date, text, text) TO anon, authenticated;
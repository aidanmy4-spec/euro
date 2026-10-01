/*
# Add named staff sign-in

1. New function
- `staff_sign_in`: verifies a staff name and PIN together, clocks the staff member in when needed, and returns the same limited dashboard data used by the kiosk.

2. Security
- Name and PIN are checked inside a SECURITY DEFINER function.
- No PIN hash or unrestricted customer data is returned.
*/

CREATE OR REPLACE FUNCTION public.staff_sign_in(p_name text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_staff public.staff_members; v_last_event text;
BEGIN
  IF p_name IS NULL OR char_length(trim(p_name)) < 2 OR p_pin IS NULL OR p_pin !~ '^[0-9]{4,12}$' THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND lower(trim(display_name)) = lower(trim(p_name)) AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  IF v_last_event IS DISTINCT FROM 'clock_in' THEN INSERT INTO public.clock_events (staff_id, event_type) VALUES (v_staff.id, 'clock_in'); END IF;
  RETURN public.staff_dashboard(p_pin);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_sign_in(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_sign_in(text, text) TO anon, authenticated;
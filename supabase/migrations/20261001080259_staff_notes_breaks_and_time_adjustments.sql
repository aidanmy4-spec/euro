/*
# Staff notes, breaks, and owner time adjustments

1. Modified tables
- `clock_events`: adds notes and allows clock-in, clock-out, break-start, and break-end events.

2. New secure functions
- `staff_clock_action`: records a clock action with an optional note after validating the staff PIN and the current event sequence.
- `owner_update_clock_event`: lets the authenticated owner correct an event time, event type, or note.

3. Staff sign-in change
- Staff sign-in now matches the first name only, while the existing stored display name remains unchanged.

4. Security
- Staff actions still require the matching active staff PIN.
- Owner corrections require the owner session and do not expose PINs.
- Existing clock history is preserved.
*/

ALTER TABLE public.clock_events ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE public.clock_events DROP CONSTRAINT IF EXISTS clock_events_event_type_check;
ALTER TABLE public.clock_events ADD CONSTRAINT clock_events_event_type_check CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end'));

CREATE OR REPLACE FUNCTION public.staff_sign_in(p_name text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_staff public.staff_members; v_last_event text;
BEGIN
  IF p_name IS NULL OR char_length(trim(p_name)) < 2 OR p_pin IS NULL OR p_pin !~ '^[0-9]{4,12}$' THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND split_part(lower(trim(display_name)), ' ', 1) = lower(trim(p_name)) AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  IF v_last_event IS DISTINCT FROM 'clock_in' AND v_last_event IS DISTINCT FROM 'break_end' THEN INSERT INTO public.clock_events (staff_id, event_type) VALUES (v_staff.id, 'clock_in'); END IF;
  RETURN public.staff_dashboard(p_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_clock_action(p_pin text, p_action text, p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_staff public.staff_members; v_last_event text;
BEGIN
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  IF p_action NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN RAISE EXCEPTION 'Invalid clock action'; END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  IF p_action = 'clock_in' AND v_last_event IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Already clocked in'; END IF;
  IF p_action = 'clock_out' AND v_last_event NOT IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_start' AND v_last_event <> 'clock_in' THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_end' AND v_last_event <> 'break_start' THEN RAISE EXCEPTION 'Not on break'; END IF;
  INSERT INTO public.clock_events (staff_id, event_type, notes) VALUES (v_staff.id, p_action, left(coalesce(p_note, ''), 500));
  RETURN public.staff_dashboard(p_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_update_clock_event(p_event_id uuid, p_event_type text, p_created_at timestamptz, p_note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_event_type NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN RAISE EXCEPTION 'Invalid event'; END IF;
  UPDATE public.clock_events SET event_type = p_event_type, created_at = p_created_at, notes = left(coalesce(p_note, ''), 500) WHERE id = p_event_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_clock_action(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owner_update_clock_event(uuid, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_clock_action(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owner_update_clock_event(uuid, text, timestamptz, text) TO authenticated;
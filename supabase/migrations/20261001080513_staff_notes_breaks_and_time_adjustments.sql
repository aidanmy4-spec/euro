/*
# Return staff time status and notes

1. Modified function
- `staff_dashboard` now returns the current event status and each clock event note.
- Active duration remains tied to the most recent clock-in or break-end event.

2. Security
- The function continues to return only the signed-in staff member's safe dashboard data.
*/

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
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,12}$' THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT * INTO v_staff FROM public.staff_members WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  SELECT event_type, created_at INTO v_last_event, v_active_since FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 1;
  IF v_last_event NOT IN ('clock_in', 'break_end') THEN v_active_since := NULL; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('event_type', event_type, 'created_at', created_at, 'notes', notes) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_events FROM (SELECT event_type, created_at, notes FROM public.clock_events WHERE staff_id = v_staff.id ORDER BY created_at DESC LIMIT 20) history;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', schedule_date, 'start_time', start_time, 'end_time', end_time, 'notes', notes) ORDER BY schedule_date), '[]'::jsonb)
  INTO v_schedules FROM public.staff_schedules WHERE staff_id = v_staff.id AND schedule_date >= current_date - 1;
  IF v_staff.can_view_inbox THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'inquiry_type', inquiry_type, 'full_name', full_name, 'pickup_date', pickup_date, 'pickup_time', pickup_time, 'details', details, 'status', status, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_inquiries FROM (SELECT id, inquiry_type, full_name, pickup_date, pickup_time, details, status, created_at FROM public.inquiries ORDER BY created_at DESC LIMIT 50) orders;
  ELSE v_inquiries := '[]'::jsonb; END IF;
  RETURN jsonb_build_object(
    'staff', jsonb_build_object('id', v_staff.id, 'display_name', v_staff.display_name, 'role', v_staff.role, 'can_view_calendar', v_staff.can_view_calendar),
    'current_status', v_last_event,
    'active_since', v_active_since,
    'events', v_events,
    'schedules', CASE WHEN v_staff.can_view_calendar THEN v_schedules ELSE '[]'::jsonb END,
    'inquiries', v_inquiries
  );
END;
$$;
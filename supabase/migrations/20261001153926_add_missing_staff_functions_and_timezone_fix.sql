/*
# Add missing staff functions, time_off_requests table, and fix timezone handling

## What this does
1. Creates `time_off_requests` table for staff to request time off
2. Creates `owner_week_clock_grid` function — returns a weekly grid of clock events for all staff, with times converted to America/New_York timezone
3. Creates `staff_manager_week_grid` — same grid but requires manager PIN
4. Creates `owner_clock_action` — lets owner clock a staff member in/out/break
5. Creates `staff_manager_clock_action` — same but requires manager PIN
6. Creates `staff_manager_update_clock_event` — lets manager edit a time entry
7. Creates `staff_manager_update_time_off` — lets manager approve/deny time off
8. Creates `staff_request_time_off` — lets staff submit a time-off request
9. Creates `owner_delete_staff_member` — deletes staff and all related data
10. Creates `owner_save_schedule` — saves shifts for multiple staff at once
11. Creates `owner_update_schedule` — updates a single shift

## Timezone fix
All grid functions return times in America/New_York timezone using `AT TIME ZONE`.
The `clock_in_raw` and `clock_out_raw` fields return local datetime strings (YYYY-MM-DDTHH:MM)
so the HTML `datetime-local` input displays the correct local time without double conversion.

## Security
- Owner functions check `is_owner()` and are granted to `authenticated`
- Manager functions verify the PIN matches an active manager and are granted to `anon, authenticated`
- Staff function `staff_request_time_off` verifies PIN and is granted to `anon, authenticated`
*/

-- ============================================================
-- 1. time_off_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_time_off" ON public.time_off_requests;
CREATE POLICY "anon_select_time_off" ON public.time_off_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_time_off" ON public.time_off_requests;
CREATE POLICY "anon_insert_time_off" ON public.time_off_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_time_off" ON public.time_off_requests;
CREATE POLICY "auth_update_time_off" ON public.time_off_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_time_off" ON public.time_off_requests;
CREATE POLICY "auth_delete_time_off" ON public.time_off_requests FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 2. owner_week_clock_grid — weekly grid with local timezone
-- ============================================================
CREATE OR REPLACE FUNCTION public.owner_week_clock_grid(p_week_start date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end date := p_week_start + 6;
  v_result json;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT json_agg(json_build_object(
    'staff_id', s.id,
    'display_name', s.display_name,
    'role', s.role,
    'current_status', sub.current_status,
    'active_since', sub.active_since,
    'days', COALESCE(sub.days, '[]'::json)
  ))
  INTO v_result
  FROM public.staff_members s
  LEFT JOIN LATERAL (
    SELECT
      ce.event_type AS current_status,
      ce.created_at AS active_since,
      (
        SELECT json_agg(json_build_object(
          'date', d.dt::text,
          'day_name', to_char(d.dt, 'Day'),
          'clock_in', ci_disp.disp,
          'clock_in_raw', ci_disp.raw,
          'clock_in_event_id', ci_disp.event_id,
          'clock_out', co_disp.disp,
          'clock_out_raw', co_disp.raw,
          'clock_out_event_id', co_disp.event_id,
          'break_start', br_disp.disp,
          'break_end', be_disp.disp,
          'notes', day_notes.notes,
          'is_currently_in', (ci_disp.event_id IS NOT NULL AND co_disp.event_id IS NULL),
          'current_status', CASE WHEN ci_disp.event_id IS NOT NULL AND co_disp.event_id IS NULL THEN ce.event_type ELSE NULL END
        ))
        FROM generate_series(p_week_start, v_week_end, '1 day'::interval) AS d(dt)
        LEFT JOIN LATERAL (
          SELECT
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp,
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI') AS raw,
            ev.id AS event_id
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'clock_in'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) ci_disp ON true
        LEFT JOIN LATERAL (
          SELECT
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp,
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI') AS raw,
            ev.id AS event_id
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'clock_out'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) co_disp ON true
        LEFT JOIN LATERAL (
          SELECT to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'break_start'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) br_disp ON true
        LEFT JOIN LATERAL (
          SELECT to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'break_end'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) be_disp ON true
        LEFT JOIN LATERAL (
          SELECT string_agg(ev.notes, ' | ') AS notes
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
            AND ev.notes IS NOT NULL
            AND ev.notes <> ''
        ) day_notes ON true
      ) AS days
    FROM public.clock_events ce
    WHERE ce.staff_id = s.id
    ORDER BY ce.created_at DESC
    LIMIT 1
  ) sub ON true
  WHERE s.is_active = true;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_week_clock_grid(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_week_clock_grid(date) TO authenticated;

-- ============================================================
-- 3. staff_manager_week_grid — same grid but requires manager PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_manager_week_grid(p_pin text, p_week_start date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.staff_members;
  v_week_end date := p_week_start + 6;
  v_result json;
BEGIN
  SELECT * INTO v_staff FROM public.staff_members
  WHERE is_active = true AND role = 'manager' AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT json_agg(json_build_object(
    'staff_id', s.id,
    'display_name', s.display_name,
    'role', s.role,
    'current_status', sub.current_status,
    'active_since', sub.active_since,
    'days', COALESCE(sub.days, '[]'::json)
  ))
  INTO v_result
  FROM public.staff_members s
  LEFT JOIN LATERAL (
    SELECT
      ce.event_type AS current_status,
      ce.created_at AS active_since,
      (
        SELECT json_agg(json_build_object(
          'date', d.dt::text,
          'day_name', to_char(d.dt, 'Day'),
          'clock_in', ci_disp.disp,
          'clock_in_raw', ci_disp.raw,
          'clock_in_event_id', ci_disp.event_id,
          'clock_out', co_disp.disp,
          'clock_out_raw', co_disp.raw,
          'clock_out_event_id', co_disp.event_id,
          'break_start', br_disp.disp,
          'break_end', be_disp.disp,
          'notes', day_notes.notes,
          'is_currently_in', (ci_disp.event_id IS NOT NULL AND co_disp.event_id IS NULL),
          'current_status', CASE WHEN ci_disp.event_id IS NOT NULL AND co_disp.event_id IS NULL THEN ce.event_type ELSE NULL END
        ))
        FROM generate_series(p_week_start, v_week_end, '1 day'::interval) AS d(dt)
        LEFT JOIN LATERAL (
          SELECT
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp,
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI') AS raw,
            ev.id AS event_id
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'clock_in'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) ci_disp ON true
        LEFT JOIN LATERAL (
          SELECT
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp,
            to_char(ev.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI') AS raw,
            ev.id AS event_id
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'clock_out'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) co_disp ON true
        LEFT JOIN LATERAL (
          SELECT to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'break_start'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) br_disp ON true
        LEFT JOIN LATERAL (
          SELECT to_char(ev.created_at AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS disp
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND ev.event_type = 'break_end'
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
          ORDER BY ev.created_at ASC
          LIMIT 1
        ) be_disp ON true
        LEFT JOIN LATERAL (
          SELECT string_agg(ev.notes, ' | ') AS notes
          FROM public.clock_events ev
          WHERE ev.staff_id = s.id
            AND (ev.created_at AT TIME ZONE 'America/New_York')::date = d.dt
            AND ev.notes IS NOT NULL
            AND ev.notes <> ''
        ) day_notes ON true
      ) AS days
    FROM public.clock_events ce
    WHERE ce.staff_id = s.id
    ORDER BY ce.created_at DESC
    LIMIT 1
  ) sub ON true
  WHERE s.is_active = true;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_manager_week_grid(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_manager_week_grid(text, date) TO anon, authenticated;

-- ============================================================
-- 4. owner_clock_action — owner clocks a staff member in/out/break
-- ============================================================
CREATE OR REPLACE FUNCTION public.owner_clock_action(p_staff_id uuid, p_action text, p_note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_event text;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_action NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN RAISE EXCEPTION 'Invalid clock action'; END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = p_staff_id ORDER BY created_at DESC LIMIT 1;
  IF p_action = 'clock_in' AND v_last_event IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Already clocked in'; END IF;
  IF p_action = 'clock_out' AND v_last_event NOT IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_start' AND v_last_event <> 'clock_in' THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_end' AND v_last_event <> 'break_start' THEN RAISE EXCEPTION 'Not on break'; END IF;
  INSERT INTO public.clock_events (staff_id, event_type, notes) VALUES (p_staff_id, p_action, left(coalesce(p_note, ''), 500));
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_clock_action(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_clock_action(uuid, text, text) TO authenticated;

-- ============================================================
-- 5. staff_manager_clock_action — manager clocks a staff member
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_manager_clock_action(p_pin text, p_staff_id uuid, p_action text, p_note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mgr public.staff_members;
  v_last_event text;
BEGIN
  SELECT * INTO v_mgr FROM public.staff_members
  WHERE is_active = true AND role = 'manager' AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_mgr.id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_action NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN RAISE EXCEPTION 'Invalid clock action'; END IF;
  SELECT event_type INTO v_last_event FROM public.clock_events WHERE staff_id = p_staff_id ORDER BY created_at DESC LIMIT 1;
  IF p_action = 'clock_in' AND v_last_event IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Already clocked in'; END IF;
  IF p_action = 'clock_out' AND v_last_event NOT IN ('clock_in', 'break_end') THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_start' AND v_last_event <> 'clock_in' THEN RAISE EXCEPTION 'Not clocked in'; END IF;
  IF p_action = 'break_end' AND v_last_event <> 'break_start' THEN RAISE EXCEPTION 'Not on break'; END IF;
  INSERT INTO public.clock_events (staff_id, event_type, notes) VALUES (p_staff_id, p_action, left(coalesce(p_note, ''), 500));
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_manager_clock_action(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_manager_clock_action(text, uuid, text, text) TO anon, authenticated;

-- ============================================================
-- 6. staff_manager_update_clock_event — manager edits a time entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_manager_update_clock_event(p_pin text, p_event_id uuid, p_event_type text, p_created_at timestamptz, p_note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mgr public.staff_members;
BEGIN
  SELECT * INTO v_mgr FROM public.staff_members
  WHERE is_active = true AND role = 'manager' AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_mgr.id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_event_type NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN RAISE EXCEPTION 'Invalid event'; END IF;
  UPDATE public.clock_events SET event_type = p_event_type, created_at = p_created_at, notes = left(coalesce(p_note, ''), 500) WHERE id = p_event_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_manager_update_clock_event(text, uuid, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_manager_update_clock_event(text, uuid, text, timestamptz, text) TO anon, authenticated;

-- ============================================================
-- 7. staff_manager_update_time_off — manager approves/denies time off
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_manager_update_time_off(p_pin text, p_request_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mgr public.staff_members;
BEGIN
  SELECT * INTO v_mgr FROM public.staff_members
  WHERE is_active = true AND role = 'manager' AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_mgr.id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('approved', 'denied') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.time_off_requests SET status = p_status WHERE id = p_request_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_manager_update_time_off(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_manager_update_time_off(text, uuid, text) TO anon, authenticated;

-- ============================================================
-- 8. staff_request_time_off — staff submits a time-off request
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_request_time_off(p_pin text, p_start_date date, p_end_date date, p_reason text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.staff_members;
BEGIN
  SELECT * INTO v_staff FROM public.staff_members
  WHERE is_active = true AND crypt(p_pin, pin_hash) = pin_hash LIMIT 1;
  IF v_staff.id IS NULL THEN RAISE EXCEPTION 'Invalid kiosk entry'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN RAISE EXCEPTION 'Invalid date range'; END IF;
  INSERT INTO public.time_off_requests (staff_id, start_date, end_date, reason) VALUES (v_staff.id, p_start_date, p_end_date, left(coalesce(p_reason, ''), 500));
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_request_time_off(text, date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_request_time_off(text, date, date, text) TO anon, authenticated;

-- ============================================================
-- 9. owner_delete_staff_member — deletes staff and all related data
-- ============================================================
CREATE OR REPLACE FUNCTION public.owner_delete_staff_member(p_staff_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.time_off_requests WHERE staff_id = p_staff_id;
  DELETE FROM public.staff_schedules WHERE staff_id = p_staff_id;
  DELETE FROM public.clock_events WHERE staff_id = p_staff_id;
  DELETE FROM public.staff_members WHERE id = p_staff_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_delete_staff_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_delete_staff_member(uuid) TO authenticated;

-- ============================================================
-- 10. owner_save_schedule — saves shifts for multiple staff
-- ============================================================
CREATE OR REPLACE FUNCTION public.owner_save_schedule(p_staff_ids uuid[], p_start_date date, p_end_date date, p_start_time text, p_end_time text, p_notes text DEFAULT '')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_staff_id uuid;
  v_date date;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOREACH v_staff_id IN ARRAY p_staff_ids LOOP
    v_date := p_start_date;
    WHILE v_date <= p_end_date LOOP
      INSERT INTO public.staff_schedules (staff_id, schedule_date, start_time, end_time, notes)
      VALUES (v_staff_id, v_date, p_start_time, p_end_time, left(coalesce(p_notes, ''), 500));
      v_count := v_count + 1;
      v_date := v_date + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_save_schedule(uuid[], date, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_save_schedule(uuid[], date, date, text, text, text) TO authenticated;

-- ============================================================
-- 11. owner_update_schedule — updates a single shift
-- ============================================================
CREATE OR REPLACE FUNCTION public.owner_update_schedule(p_schedule_id uuid, p_start_time text, p_end_time text, p_notes text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.staff_schedules SET start_time = p_start_time, end_time = p_end_time, notes = left(coalesce(p_notes, ''), 500), updated_at = now() WHERE id = p_schedule_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_update_schedule(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_update_schedule(uuid, text, text, text) TO authenticated;

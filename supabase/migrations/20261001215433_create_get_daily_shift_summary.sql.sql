/*
# Create get_daily_shift_summary function

## What this does
Creates a SECURITY DEFINER function that gathers all clock events for a given
date and returns a per-staff summary with clock-in time, clock-out time, break
duration, and total worked minutes — formatted for the Google Sheets daily
export.

## Details
1. Queries clock_events joined with staff_members for the given date (in
   America/New_York timezone).
2. For each staff member who has events that day, computes:
   - display_name and role
   - earliest clock_in time (formatted as HH:MM AM/PM)
   - latest clock_out time (formatted as HH:MM AM/PM)
   - total break minutes (break_start to break_end pairs)
   - total worked minutes (clock_in to clock_out, minus breaks)
   - concatenated notes
3. Returns a table-valued function.

## Security
- SECURITY DEFINER so the edge function (using service role) can call it.
- No auth check needed since it's called server-side with the service role key.
*/

CREATE OR REPLACE FUNCTION public.get_daily_shift_summary(p_date date)
RETURNS TABLE (
  display_name text,
  role text,
  clock_in text,
  clock_out text,
  break_minutes integer,
  total_minutes integer,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH day_events AS (
    SELECT
      s.id AS staff_id,
      s.display_name,
      s.role,
      e.event_type,
      (e.created_at AT TIME ZONE 'America/New_York')::time AS event_time,
      e.notes
    FROM public.clock_events e
    JOIN public.staff_members s ON s.id = e.staff_id
    WHERE (e.created_at AT TIME ZONE 'America/New_York')::date = p_date
  ),
  staff_summary AS (
    SELECT
      de.staff_id,
      de.display_name,
      de.role,
      MIN(CASE WHEN de.event_type = 'clock_in' THEN de.event_time END) AS clock_in_time,
      MAX(CASE WHEN de.event_type = 'clock_out' THEN de.event_time END) AS clock_out_time,
      MAX(CASE WHEN de.event_type = 'break_start' THEN de.event_time END) AS break_start_time,
      MAX(CASE WHEN de.event_type = 'break_end' THEN de.event_time END) AS break_end_time,
      string_agg(DISTINCT de.notes, ' ' ORDER BY de.notes) FILTER (WHERE de.notes IS NOT NULL AND de.notes <> '') AS all_notes
    FROM day_events de
    GROUP BY de.staff_id, de.display_name, de.role
  )
  SELECT
    ss.display_name,
    ss.role,
    CASE WHEN ss.clock_in_time IS NOT NULL
      THEN to_char(ss.clock_in_time, 'HH:MI AM')
      ELSE NULL
    END AS clock_in,
    CASE WHEN ss.clock_out_time IS NOT NULL
      THEN to_char(ss.clock_out_time, 'HH:MI AM')
      ELSE NULL
    END AS clock_out,
    CASE WHEN ss.break_start_time IS NOT NULL AND ss.break_end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ss.break_end_time - ss.break_start_time))::integer / 60
      ELSE 0
    END AS break_minutes,
    CASE WHEN ss.clock_in_time IS NOT NULL AND ss.clock_out_time IS NOT NULL
      THEN (EXTRACT(EPOCH FROM (ss.clock_out_time - ss.clock_in_time))::integer / 60)
           - CASE WHEN ss.break_start_time IS NOT NULL AND ss.break_end_time IS NOT NULL
                  THEN EXTRACT(EPOCH FROM (ss.break_end_time - ss.break_start_time))::integer / 60
                  ELSE 0 END
      ELSE 0
    END AS total_minutes,
    ss.all_notes AS notes
  FROM staff_summary ss
  WHERE ss.clock_in_time IS NOT NULL
  ORDER BY ss.display_name;
END;
$$;
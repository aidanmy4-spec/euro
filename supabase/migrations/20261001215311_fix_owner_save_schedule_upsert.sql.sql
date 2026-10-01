/*
# Fix owner_save_schedule to upsert instead of insert

## Problem
The `owner_save_schedule` function used plain `INSERT INTO staff_schedules`.
The table has a unique constraint on `(staff_id, schedule_date)`, so saving
a shift for someone who already has one on that date raised a unique-violation
error — the control panel showed "Could not save those shifts."

## Fix
Changed `INSERT` to `INSERT ... ON CONFLICT (staff_id, schedule_date) DO UPDATE`
so re-saving a shift for the same person/day updates the existing row instead
of erroring.

## Security
No security changes — the function still checks `is_owner()` and runs as
SECURITY DEFINER with the same grants.
*/

CREATE OR REPLACE FUNCTION public.owner_save_schedule(
  p_staff_ids uuid[],
  p_start_date date,
  p_end_date date,
  p_start_time text,
  p_end_time text,
  p_notes text DEFAULT ''
) RETURNS integer
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
      VALUES (v_staff_id, v_date, p_start_time, p_end_time, left(coalesce(p_notes, ''), 500))
      ON CONFLICT (staff_id, schedule_date) DO UPDATE
      SET start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          notes = EXCLUDED.notes,
          updated_at = now();
      v_count := v_count + 1;
      v_date := v_date + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;
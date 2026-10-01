/*
# Fix schedule save time cast and staff creation gen_salt

## Issue 1: Schedule save - type mismatch
The `owner_save_schedule` function inserts `p_start_time` and `p_end_time` (text)
into `start_time` and `end_time` columns (time without time zone) without casting.
PostgreSQL cannot implicitly cast text to time in an INSERT expression.

Fix: Cast `p_start_time::time` and `p_end_time::time` in the INSERT.

## Issue 2: Staff creation - gen_salt not found
The `create_staff_member` function uses `gen_salt('bf')` from the pgcrypto extension.
The function's `search_path` is set to `'public'` but pgcrypto functions are in the
`extensions` schema (or `pg_catalog`). Setting search_path to just 'public' hides them.

Fix: Change search_path to `'public', 'extensions'` so gen_salt and crypt are found.
Also applied to owner_save_schedule for safety, though it doesn't use pgcrypto.
*/

-- Fix owner_save_schedule: cast text params to time
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
SET search_path TO 'public', 'extensions'
AS $function$
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
      VALUES (v_staff_id, v_date, p_start_time::time, p_end_time::time, left(coalesce(p_notes, ''), 500))
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
$function$;

-- Fix create_staff_member: search_path includes extensions schema for gen_salt/crypt
CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_name text,
  p_role text,
  p_pin text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_staff public.staff_members;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_name IS NULL OR char_length(p_name) < 2 OR char_length(p_name) > 120 THEN
    RAISE EXCEPTION 'Invalid staff name';
  END IF;
  IF p_role NOT IN ('manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid staff role';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,12}$' THEN
    RAISE EXCEPTION 'Invalid staff PIN';
  END IF;
  INSERT INTO public.staff_members (display_name, role, pin_hash)
  VALUES (p_name, p_role, crypt(p_pin, gen_salt('bf')))
  RETURNING id, display_name, role, is_active INTO v_staff;
  RETURN jsonb_build_object('id', v_staff.id, 'display_name', v_staff.display_name, 'role', v_staff.role, 'is_active', v_staff.is_active);
END;
$function$;

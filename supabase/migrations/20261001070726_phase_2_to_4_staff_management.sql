/*
# Add secure staff creation

1. New function
- `create_staff_member`: lets the signed-in owner create a staff or manager kiosk account while hashing the PIN in the database.

2. Security
- The function checks `auth.uid()` through the existing owner authorization function.
- Anonymous callers and non-owners are rejected.
- The PIN is never stored or returned in plain text.
*/

CREATE OR REPLACE FUNCTION public.create_staff_member(p_name text, p_role text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.create_staff_member(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_member(text, text, text) TO authenticated;
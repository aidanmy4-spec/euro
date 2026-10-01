/*
# Add a temporary staff preview account

1. Temporary access
- Adds a schedule-only staff member named `Temporary` with code `2468` so the owner can preview the staff page immediately.

2. Security
- The account has no order or bakery management permissions.
- The owner can turn the account off from Staff tools after previewing it.
- The code is stored as a database hash, never as plain text.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff_members WHERE lower(display_name) = 'temporary') THEN
    INSERT INTO public.staff_members (display_name, role, pin_hash, is_active, can_view_inbox, can_view_calendar, can_manage_orders, can_manage_bakery)
    VALUES ('Temporary', 'staff', crypt('2468', gen_salt('bf')), true, false, true, false, false);
  END IF;
END $$;
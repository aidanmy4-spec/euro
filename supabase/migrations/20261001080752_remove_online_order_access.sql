/*
# Remove unused online order actions

1. Security change
- Revokes public execution from staff order functions that are no longer used after removing the order inbox and online bakery ordering screens.

2. Data safety
- Existing inquiries and order history remain stored.
- No tables or rows are deleted.
*/

REVOKE EXECUTE ON FUNCTION public.staff_update_order(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.staff_add_order(text, text, text, text, date, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clock_staff(text) FROM PUBLIC, anon, authenticated;
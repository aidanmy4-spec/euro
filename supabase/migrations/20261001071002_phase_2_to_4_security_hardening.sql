/*
# Remove default public execute access from owner bootstrap

1. Security change
- Removes PostgreSQL's default PUBLIC execute permission from the owner-claim helper.
- Only authenticated sessions may call the helper.

2. Important note
- The kiosk clock function remains available to anonymous visitors by design and is protected by server-side PIN checks.
*/

REVOKE EXECUTE ON FUNCTION public.claim_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner() TO authenticated;
/*
# Harden public function and read policies

1. Security changes
- Anonymous visitors can no longer call the owner-claim helper.
- Public read policies for menu, specials, seasonal pages, promotions, and photos no longer evaluate the owner helper.
- Authenticated owner policies retain access to hidden and unpublished management content.

2. Important notes
- The staff kiosk function remains public by design so a shared kiosk can work without an owner login; it validates a PIN server-side and returns only the staff name and clock action.
- Existing owner and customer data is unchanged.
*/

REVOKE EXECUTE ON FUNCTION public.claim_owner() FROM anon;

DROP POLICY IF EXISTS "Public can read visible menu" ON public.menu_items;
CREATE POLICY "Public can read visible menu" ON public.menu_items FOR SELECT TO anon USING (is_visible = true);
DROP POLICY IF EXISTS "Owners can read all menu" ON public.menu_items;
CREATE POLICY "Owners can read all menu" ON public.menu_items FOR SELECT TO authenticated USING (is_visible = true OR public.is_owner());

DROP POLICY IF EXISTS "Public can read published specials" ON public.daily_specials;
CREATE POLICY "Public can read published specials" ON public.daily_specials FOR SELECT TO anon USING (is_published = true);
DROP POLICY IF EXISTS "Owners can read all specials" ON public.daily_specials;
CREATE POLICY "Owners can read all specials" ON public.daily_specials FOR SELECT TO authenticated USING (is_published = true OR public.is_owner());

DROP POLICY IF EXISTS "Public can read published holiday pages" ON public.holiday_pages;
CREATE POLICY "Public can read published holiday pages" ON public.holiday_pages FOR SELECT TO anon USING (is_published = true);
DROP POLICY IF EXISTS "Owners can read all holiday pages" ON public.holiday_pages;
CREATE POLICY "Owners can read all holiday pages" ON public.holiday_pages FOR SELECT TO authenticated USING (is_published = true OR public.is_owner());

DROP POLICY IF EXISTS "Public can read active promotions" ON public.promotions;
CREATE POLICY "Public can read active promotions" ON public.promotions FOR SELECT TO anon USING (is_published = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS "Owners can read all promotions" ON public.promotions;
CREATE POLICY "Owners can read all promotions" ON public.promotions FOR SELECT TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read published photos" ON public.photo_assets;
CREATE POLICY "Public can read published photos" ON public.photo_assets FOR SELECT TO anon USING (is_published = true);
DROP POLICY IF EXISTS "Owners can read all photos" ON public.photo_assets;
CREATE POLICY "Owners can read all photos" ON public.photo_assets FOR SELECT TO authenticated USING (is_published = true OR public.is_owner());
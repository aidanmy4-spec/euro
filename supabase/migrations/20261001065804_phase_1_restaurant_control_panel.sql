/*
# Phase 1 restaurant control panel data

1. New tables
- `owner_accounts`: identifies the first authenticated account as the restaurant owner.
- `site_hours`: one editable row for each day of the week, including closed days.
- `menu_items`: public menu items with category, price, description, and visibility controls.
- `daily_specials`: scheduled breakfast and daily specials for the public homepage.

2. Security
- Row-level security is enabled on every table.
- Public visitors can read published hours, visible menu items, and active specials.
- Only the claimed owner account can create, update, or delete management data.
- A one-time `claim_owner` function safely claims the first signed-in account and cannot be used by later accounts.

3. Important notes
- Authentication uses Supabase email/password accounts; no custom password table is created.
- The public site remains readable without signing in, while all management writes require the owner session.
- Seed content is included for the restaurant's published hours, menu highlights, and breakfast special.
*/

CREATE TABLE IF NOT EXISTS public.owner_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role = 'owner'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key text NOT NULL UNIQUE CHECK (day_key IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  day_label text NOT NULL,
  open_time time,
  close_time time,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  special_date date NOT NULL DEFAULT current_date,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.owner_accounts WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.claim_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.owner_accounts) THEN
    RETURN EXISTS (SELECT 1 FROM public.owner_accounts WHERE user_id = auth.uid());
  END IF;

  INSERT INTO public.owner_accounts (user_id) VALUES (auth.uid());
  RETURN true;
END;
$$;

ALTER TABLE public.owner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_specials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own account" ON public.owner_accounts;
CREATE POLICY "Owners can view own account" ON public.owner_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can update own account" ON public.owner_accounts;
CREATE POLICY "Owners can update own account" ON public.owner_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can delete own account" ON public.owner_accounts;
CREATE POLICY "Owners can delete own account" ON public.owner_accounts FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can insert account through claim" ON public.owner_accounts;
CREATE POLICY "Owners can insert account through claim" ON public.owner_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_owner());

DROP POLICY IF EXISTS "Public can read hours" ON public.site_hours;
CREATE POLICY "Public can read hours" ON public.site_hours FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Owners can insert hours" ON public.site_hours;
CREATE POLICY "Owners can insert hours" ON public.site_hours FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update hours" ON public.site_hours;
CREATE POLICY "Owners can update hours" ON public.site_hours FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete hours" ON public.site_hours;
CREATE POLICY "Owners can delete hours" ON public.site_hours FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read visible menu" ON public.menu_items;
CREATE POLICY "Public can read visible menu" ON public.menu_items FOR SELECT TO anon, authenticated USING (is_visible = true OR public.is_owner());
DROP POLICY IF EXISTS "Owners can insert menu" ON public.menu_items;
CREATE POLICY "Owners can insert menu" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update menu" ON public.menu_items;
CREATE POLICY "Owners can update menu" ON public.menu_items FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete menu" ON public.menu_items;
CREATE POLICY "Owners can delete menu" ON public.menu_items FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "Public can read published specials" ON public.daily_specials;
CREATE POLICY "Public can read published specials" ON public.daily_specials FOR SELECT TO anon, authenticated USING (is_published = true OR public.is_owner());
DROP POLICY IF EXISTS "Owners can insert specials" ON public.daily_specials;
CREATE POLICY "Owners can insert specials" ON public.daily_specials FOR INSERT TO authenticated WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can update specials" ON public.daily_specials;
CREATE POLICY "Owners can update specials" ON public.daily_specials FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS "Owners can delete specials" ON public.daily_specials;
CREATE POLICY "Owners can delete specials" ON public.daily_specials FOR DELETE TO authenticated USING (public.is_owner());

GRANT EXECUTE ON FUNCTION public.claim_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;

INSERT INTO public.site_hours (day_key, day_label, open_time, close_time)
VALUES
  ('monday', 'Monday', '07:00', '15:00'),
  ('tuesday', 'Tuesday', '07:00', '15:00'),
  ('wednesday', 'Wednesday', '07:00', '15:00'),
  ('thursday', 'Thursday', '07:00', '15:00'),
  ('friday', 'Friday', '07:00', '19:00'),
  ('saturday', 'Saturday', '07:00', '15:00'),
  ('sunday', 'Sunday', '07:00', '15:00')
ON CONFLICT (day_key) DO NOTHING;

INSERT INTO public.menu_items (category, name, description, price, sort_order)
SELECT * FROM (VALUES
  ('Breakfast', 'European Breakfast Plate', 'Two eggs, breakfast potatoes, toast, and your choice of bacon or sausage.', '$12.95', 1),
  ('Breakfast', 'House-Made French Toast', 'Thick-cut bread, cinnamon, powdered sugar, and warm fruit.', '$10.95', 2),
  ('Lunch', 'Chicken Paprikash', 'Tender chicken in a rich paprika sauce, served with dumplings.', '$15.95', 3),
  ('Lunch', 'Reuben on Rye', 'House-style corned beef, sauerkraut, Swiss, and dressing.', '$14.95', 4),
  ('Bakery', 'Fresh-Baked Pastries', 'Ask about today''s danishes, kolaches, cookies, and seasonal treats.', 'Market', 5)
) AS seed(category, name, description, price, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items);

INSERT INTO public.daily_specials (title, description, special_date)
SELECT 'Breakfast served all day', 'Join us for a warm, made-to-order breakfast every day of the week.', current_date
WHERE NOT EXISTS (SELECT 1 FROM public.daily_specials);
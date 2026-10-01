/*
# Add online ordering system and create missing site_settings table

## What this migration does
1. Creates `site_settings` table (referenced by code but missing from DB) with columns for join_family, seasonal_nav, and online_ordering toggles
2. Creates `orders` table to store customer orders placed through the website
3. Creates `order_items` table to store individual line items within each order
4. Creates `contact_messages` table (referenced by code but missing from DB)
5. Creates `review_settings` table (referenced by code but missing from DB)
6. Enables RLS and adds policies for all new tables
7. Creates a SECURITY DEFINER function to submit orders from the public website

## New tables

### `site_settings`
- `setting_key` (text, primary key, default 'main')
- `join_family_enabled` (boolean, default true)
- `seasonal_nav_enabled` (boolean, default true)
- `online_ordering_enabled` (boolean, default false)
- `updated_at` (timestamptz)

### `orders`
- `id` (uuid, primary key)
- `customer_name` (text, required)
- `customer_phone` (text, required)
- `customer_email` (text, optional)
- `order_type` (text, required) - 'menu' or 'bakery'
- `payment_method` (text, required) - 'cash' or 'check'
- `total_price` (numeric, required)
- `pickup_date` (date, optional)
- `notes` (text, optional)
- `status` (text, default 'new')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `order_items`
- `id` (uuid, primary key)
- `order_id` (uuid, foreign key to orders, cascade delete)
- `menu_item_id` (uuid, nullable, foreign key to menu_items)
- `item_name` (text, required)
- `item_price` (text, required)
- `quantity` (integer, default 1)
- `created_at` (timestamptz)

### `contact_messages`
- `id` (uuid, primary key)
- `full_name` (text, required)
- `email` (text, required)
- `phone` (text, optional)
- `message` (text, required)
- `status` (text, default 'new')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `review_settings`
- `setting_key` (text, primary key, default 'main')
- `google_business_url` (text, default '')
- `updated_at` (timestamptz)

## Security
- RLS enabled on all new tables
- site_settings: owners can read/update; anon can read (needed for homepage toggles)
- orders: owners can read/update/delete; anon can insert only via submit_order function
- order_items: owners can read/delete
- contact_messages: anon can insert; owners can read/update/delete
- review_settings: owners can read/update; anon can read
- submit_order function is SECURITY DEFINER, callable by anon
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  setting_key text PRIMARY KEY DEFAULT 'main',
  join_family_enabled boolean NOT NULL DEFAULT true,
  seasonal_nav_enabled boolean NOT NULL DEFAULT true,
  online_ordering_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Owners can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;

CREATE POLICY "Owners can read site settings" ON public.site_settings FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- Insert default row
INSERT INTO public.site_settings (setting_key) VALUES ('main') ON CONFLICT DO NOTHING;

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text DEFAULT '',
  order_type text NOT NULL DEFAULT 'menu',
  payment_method text NOT NULL DEFAULT 'cash',
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  pickup_date date,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can update orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;

CREATE POLICY "Owners can read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owners can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_owner());

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_price text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Owners can delete order items" ON public.order_items;

CREATE POLICY "Owners can read order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.is_owner());

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Owners can read contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Owners can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Owners can delete contact messages" ON public.contact_messages;

CREATE POLICY "Anon can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners can read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owners can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_owner());

-- Create review_settings table
CREATE TABLE IF NOT EXISTS public.review_settings (
  setting_key text PRIMARY KEY DEFAULT 'main',
  google_business_url text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read review settings" ON public.review_settings;
DROP POLICY IF EXISTS "Owners can update review settings" ON public.review_settings;
DROP POLICY IF EXISTS "Public can read review settings" ON public.review_settings;

CREATE POLICY "Owners can read review settings" ON public.review_settings FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can update review settings" ON public.review_settings FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Public can read review settings" ON public.review_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.review_settings (setting_key) VALUES ('main') ON CONFLICT DO NOTHING;

-- Create submit_order function
CREATE OR REPLACE FUNCTION public.submit_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT '',
  p_order_type text DEFAULT 'menu',
  p_payment_method text DEFAULT 'cash',
  p_total_price numeric DEFAULT 0,
  p_pickup_date date DEFAULT NULL,
  p_notes text DEFAULT '',
  p_items jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  IF p_customer_name IS NULL OR char_length(p_customer_name) < 2 THEN
    RAISE EXCEPTION 'A name is required';
  END IF;
  IF p_customer_phone IS NULL OR char_length(p_customer_phone) < 7 THEN
    RAISE EXCEPTION 'A valid phone number is required';
  END IF;
  IF p_payment_method NOT IN ('cash', 'check') THEN
    RAISE EXCEPTION 'Payment method must be cash or check';
  END IF;
  IF p_order_type NOT IN ('menu', 'bakery') THEN
    RAISE EXCEPTION 'Order type must be menu or bakery';
  END IF;

  INSERT INTO public.orders (customer_name, customer_phone, customer_email, order_type, payment_method, total_price, pickup_date, notes)
  VALUES (p_customer_name, p_customer_phone, p_customer_email, p_order_type, p_payment_method, p_total_price, p_pickup_date, p_notes)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (order_id, menu_item_id, item_name, item_price, quantity)
    VALUES (
      v_order_id,
      NULLIF(v_item->>'menu_item_id', '')::uuid,
      v_item->>'item_name',
      v_item->>'item_price',
      COALESCE((v_item->>'quantity')::integer, 1)
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order TO anon, authenticated;

-- Grant SELECT on site_settings and review_settings to anon (for public reads)
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.review_settings TO anon;

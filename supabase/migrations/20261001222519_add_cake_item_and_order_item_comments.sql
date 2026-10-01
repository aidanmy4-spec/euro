/*
# Add Cake bakery item, comment column to order_items, and update submit_order

## Changes
1. Add "Cake" item to Bakery category
2. Add `comment` column to `order_items` table for per-item customer notes
3. Update `submit_order` function to accept and store per-item comments
*/

-- Add Cake item to Bakery category
INSERT INTO public.menu_items (category, name, description, price, is_visible, sort_order)
VALUES ('Bakery', 'Cake', 'Custom cake order — tell us what you want', 'Market', true, 200)
ON CONFLICT DO NOTHING;

-- Add comment column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS comment text DEFAULT '';

-- Update submit_order to handle per-item comments
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
    INSERT INTO public.order_items (order_id, menu_item_id, item_name, item_price, quantity, comment)
    VALUES (
      v_order_id,
      NULLIF(v_item->>'menu_item_id', '')::uuid,
      v_item->>'item_name',
      v_item->>'item_price',
      COALESCE((v_item->>'quantity')::integer, 1),
      COALESCE(v_item->>'comment', '')
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order TO anon, authenticated;

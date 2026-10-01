/*
# Add pickup_time to orders

## Changes
1. Adds `pickup_time` (text) column to `orders` table — stores the customer's preferred pickup time.
2. Recreates `submit_order` function with the new `p_pickup_time` parameter.
   The function must be dropped and recreated because the signature changed.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_time text DEFAULT '';

DROP FUNCTION IF EXISTS public.submit_order(text, text, text, text, text, numeric, date, text, jsonb);

CREATE FUNCTION public.submit_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT '',
  p_order_type text DEFAULT 'menu',
  p_payment_method text DEFAULT 'cash',
  p_total_price numeric DEFAULT 0,
  p_pickup_date date DEFAULT NULL,
  p_notes text DEFAULT '',
  p_items jsonb DEFAULT '[]'::jsonb,
  p_pickup_time text DEFAULT ''
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

  INSERT INTO public.orders (customer_name, customer_phone, customer_email, order_type, payment_method, total_price, pickup_date, pickup_time, notes)
  VALUES (p_customer_name, p_customer_phone, p_customer_email, p_order_type, p_payment_method, p_total_price, p_pickup_date, p_pickup_time, p_notes)
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

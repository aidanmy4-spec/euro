/*
# Add Twilio config and multi-number order notifications

## What this migration does
1. Creates `twilio_config` table to store the owner's Twilio credentials and from-number
   so they can be entered from the control panel instead of requiring manual secret setup.
2. Creates `order_notification_numbers` table to store multiple phone numbers (with labels)
   that receive a text message when a new online order is placed.
3. Migrates any existing single phone number from `notification_settings` into the new table.
4. Enables RLS with owner-only access on both new tables.

## New tables

### `twilio_config`
- `setting_key` (text, primary key, default 'main')
- `account_sid` (text) — Twilio account SID
- `auth_token` (text) — Twilio auth token
- `from_number` (text) — Twilio phone number to send from
- `enabled` (boolean, default false)
- `updated_at` (timestamptz)

### `order_notification_numbers`
- `id` (uuid, primary key)
- `label` (text, required) — friendly name like "Owner" or "Kitchen"
- `phone_number` (text, required) — the number to text
- `created_at` (timestamptz)

## Security
- RLS enabled on both tables, owner-only CRUD (uses existing public.is_owner() function).
- The anon role cannot read Twilio credentials or notification numbers.
*/

CREATE TABLE IF NOT EXISTS public.twilio_config (
  setting_key text PRIMARY KEY DEFAULT 'main',
  account_sid text DEFAULT '',
  auth_token text DEFAULT '',
  from_number text DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.twilio_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read twilio config" ON public.twilio_config;
DROP POLICY IF EXISTS "Owners can update twilio config" ON public.twilio_config;

CREATE POLICY "Owners can read twilio config" ON public.twilio_config FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can update twilio config" ON public.twilio_config FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

INSERT INTO public.twilio_config (setting_key) VALUES ('main') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.order_notification_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  phone_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_notification_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read notification numbers" ON public.order_notification_numbers;
DROP POLICY IF EXISTS "Owners can insert notification numbers" ON public.order_notification_numbers;
DROP POLICY IF EXISTS "Owners can delete notification numbers" ON public.order_notification_numbers;

CREATE POLICY "Owners can read notification numbers" ON public.order_notification_numbers FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owners can insert notification numbers" ON public.order_notification_numbers FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "Owners can delete notification numbers" ON public.order_notification_numbers FOR DELETE TO authenticated USING (public.is_owner());

-- Migrate any existing single phone number from notification_settings into the new table
INSERT INTO public.order_notification_numbers (label, phone_number)
SELECT 'Owner', notification_phone
FROM public.notification_settings
WHERE setting_key = 'main'
  AND notification_phone IS NOT NULL
  AND notification_phone <> ''
  AND NOT EXISTS (SELECT 1 FROM public.order_notification_numbers);

-- =============================================
-- Schema Migration V2: Drive Plan Feature
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Create facilities lookup/cache table
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  facility_name text NOT NULL,
  facility_address text,
  latitude double precision,
  longitude double precision,
  geocode_status text DEFAULT 'pending' CHECK (geocode_status IN ('pending', 'resolved', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, facility_name)
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facilities"
  ON public.facilities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facilities"
  ON public.facilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facilities"
  ON public.facilities FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Add facility_id to call_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'facility_id'
  ) THEN
    ALTER TABLE public.call_logs ADD COLUMN facility_id uuid REFERENCES public.facilities(id);
  END IF;
END $$;

-- 3. Create drive_plans table
CREATE TABLE IF NOT EXISTS public.drive_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  plan_json jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);

ALTER TABLE public.drive_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drive plans"
  ON public.drive_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive plans"
  ON public.drive_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive plans"
  ON public.drive_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Service role policy for cron job (allows inserting/updating plans for any user)
CREATE POLICY "Service role can manage all drive plans"
  ON public.drive_plans FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all facilities"
  ON public.facilities FOR ALL
  USING (true)
  WITH CHECK (true);

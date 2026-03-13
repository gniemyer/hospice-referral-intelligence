-- =============================================
-- Schema Migration V4: Add organization_id to call_logs and voice_notes
-- Run this in the Supabase SQL Editor
-- =============================================

-- Add organization_id to call_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.call_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- Add organization_id to voice_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_notes' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.voice_notes ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- Add organization_id to drive_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drive_plans' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.drive_plans ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- =============================================
-- Schema Migration V3: Core Platform Tables
-- Organizations, Roles, Physicians
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Organizations table (multi-tenant support)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE, -- URL-friendly identifier
  address text,
  city text,
  state text,
  zip text,
  phone text,
  npi text, -- National Provider Identifier for the hospice
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Members of an org can view their org
CREATE POLICY "Org members can view own org"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );


-- 2. Organization Members junction table (users <-> orgs with roles)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'marketer'
    CHECK (role IN ('admin', 'director', 'marketer', 'admissions_nurse', 'office_manager', 'executive')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of their own org
CREATE POLICY "Users can view own org members"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members AS om
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can view their own membership
CREATE POLICY "Users can view own membership"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Admins/directors can manage members
CREATE POLICY "Admins can manage org members"
  ON public.organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members AS om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'director')
    )
  );


-- 3. Roles reference table (defines permissions per role)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (they're reference data)
CREATE POLICY "Anyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

-- Seed default roles
INSERT INTO public.roles (name, display_name, description, permissions) VALUES
  ('admin', 'Administrator', 'Full access to organization settings, users, and all data',
   '["manage_org", "manage_users", "view_all_data", "manage_settings", "view_reports"]'::jsonb),
  ('director', 'Sales Director', 'Manages marketers, views all referral data and reports',
   '["manage_marketers", "view_all_data", "view_reports", "manage_territories"]'::jsonb),
  ('marketer', 'Hospice Marketer', 'Records visits, manages referral sources, views own data',
   '["record_visits", "manage_own_data", "view_own_reports", "manage_contacts"]'::jsonb),
  ('admissions_nurse', 'Admissions Nurse', 'Manages patient intake, eligibility, and admissions workflow',
   '["manage_admissions", "view_referrals", "manage_patients", "view_own_reports"]'::jsonb),
  ('office_manager', 'Office Manager', 'Manages scheduling, compliance docs, and operations',
   '["manage_scheduling", "manage_compliance", "view_reports", "manage_operations"]'::jsonb),
  ('executive', 'Executive', 'Read-only access to dashboards, reports, and analytics',
   '["view_all_data", "view_reports", "view_analytics"]'::jsonb)
ON CONFLICT (name) DO NOTHING;


-- 4. Physicians table (referral source contacts)
CREATE TABLE IF NOT EXISTS public.physicians (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text, -- MD, DO, NP, PA, etc.
  specialty text,
  npi text, -- Physician NPI
  phone text,
  fax text,
  email text,
  preferred_contact_method text DEFAULT 'phone'
    CHECK (preferred_contact_method IN ('phone', 'fax', 'email', 'in_person')),
  notes text,
  referral_potential text DEFAULT 'unknown'
    CHECK (referral_potential IN ('high', 'medium', 'low', 'unknown')),
  last_contact_date timestamptz,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;

-- Org members can view physicians in their org
CREATE POLICY "Org members can view physicians"
  ON public.physicians FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can add physicians
CREATE POLICY "Org members can insert physicians"
  ON public.physicians FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can update physicians
CREATE POLICY "Org members can update physicians"
  ON public.physicians FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );


-- 5. Add organization_id to profiles (link users to orgs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;


-- 6. Add organization_id to facilities (shared facility directory per org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.facilities ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;


-- 7. Service role policies for backend operations
CREATE POLICY "Service role full access organizations"
  ON public.organizations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access org members"
  ON public.organization_members FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access physicians"
  ON public.physicians FOR ALL USING (true) WITH CHECK (true);

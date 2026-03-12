-- ============================================================
-- Hospice Referral Intelligence — Database Schema
-- Run this in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- 1. Extend the auth.users table with a public profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  organization text,
  role text default 'marketer',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Voice Notes table
create table public.voice_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  audio_url text,
  transcription text,
  created_at timestamptz default now()
);

alter table public.voice_notes enable row level security;

create policy "Users can view own voice notes"
  on public.voice_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own voice notes"
  on public.voice_notes for insert
  with check (auth.uid() = user_id);


-- 3. Call Logs table
create table public.call_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  voice_note_id uuid references public.voice_notes on delete set null,
  facility_name text,
  contact_name text,
  contact_role text,
  discussion_summary text,
  referral_signal boolean default false,
  follow_up_date text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  created_at timestamptz default now()
);

alter table public.call_logs enable row level security;

create policy "Users can view own call logs"
  on public.call_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own call logs"
  on public.call_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own call logs"
  on public.call_logs for update
  using (auth.uid() = user_id);


-- 4. Storage bucket for audio files
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false);

create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'voice-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

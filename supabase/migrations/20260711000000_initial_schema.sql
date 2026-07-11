-- Initial Supabase schema for GPA calculator
-- Tables: profiles, grades, share_codes, events, errors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table: stores user profile and class configuration
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_id text NOT NULL,
    name text,
    target_gpa numeric,
    classes jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, local_id)
);

COMMENT ON TABLE public.profiles IS 'User profiles and GPA class configurations.';

-- Grades table: stores course grades linked to a profile
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_local_id text NOT NULL,
    course_name text NOT NULL,
    score numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grades IS 'Course grades associated with a user profile.';

-- Share codes table: stores shareable payloads accessible by code
CREATE TABLE IF NOT EXISTS public.share_codes (
    code text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

COMMENT ON TABLE public.share_codes IS 'Short-lived shareable codes and payloads.';

-- Events table: analytics/events logged by authenticated users
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    properties jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS 'User-triggered analytics events.';

-- Errors table: client-side error reports
CREATE TABLE IF NOT EXISTS public.errors (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    message text NOT NULL,
    stack text,
    component text,
    url text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.errors IS 'Client error reports for debugging.';

-- Helper function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_grades_updated_at ON public.grades;
CREATE TRIGGER set_grades_updated_at
    BEFORE UPDATE ON public.grades
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own ON public.profiles
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Grades RLS policies
DROP POLICY IF EXISTS grades_select_own ON public.grades;
CREATE POLICY grades_select_own ON public.grades
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS grades_insert_own ON public.grades;
CREATE POLICY grades_insert_own ON public.grades
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS grades_update_own ON public.grades;
CREATE POLICY grades_update_own ON public.grades
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS grades_delete_own ON public.grades;
CREATE POLICY grades_delete_own ON public.grades
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Share codes RLS policies
DROP POLICY IF EXISTS share_codes_select_by_code ON public.share_codes;
CREATE POLICY share_codes_select_by_code ON public.share_codes
    FOR SELECT TO anon, authenticated
    USING (code = code);

DROP POLICY IF EXISTS share_codes_insert_own ON public.share_codes;
CREATE POLICY share_codes_insert_own ON public.share_codes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS share_codes_update_own ON public.share_codes;
CREATE POLICY share_codes_update_own ON public.share_codes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS share_codes_delete_own ON public.share_codes;
CREATE POLICY share_codes_delete_own ON public.share_codes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Events RLS policies
DROP POLICY IF EXISTS events_select_own ON public.events;
CREATE POLICY events_select_own ON public.events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS events_insert_own ON public.events;
CREATE POLICY events_insert_own ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Errors RLS policies
DROP POLICY IF EXISTS errors_select_own ON public.errors;
CREATE POLICY errors_select_own ON public.errors
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS errors_insert_own ON public.errors;
CREATE POLICY errors_insert_own ON public.errors
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

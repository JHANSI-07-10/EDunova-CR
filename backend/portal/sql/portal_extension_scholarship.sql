-- Safe table check for existing portal_scholarship in case public view hasn't run yet
CREATE TABLE IF NOT EXISTS public.portal_scholarship (
    id SERIAL PRIMARY KEY,
    name varchar(200) NOT NULL,
    description text NOT NULL,
    eligibility text NOT NULL,
    coverage_percent integer NOT NULL
);

-- Scholarship Applications
CREATE TABLE IF NOT EXISTS public.portal_scholarship_application (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL REFERENCES public.auth_user(id) ON DELETE CASCADE,
    scheme_id integer NOT NULL REFERENCES public.portal_scholarship(id) ON DELETE CASCADE,
    status varchar(50) NOT NULL DEFAULT 'Pending', -- Pending | Verified | Approved | Rejected
    academic_gpa numeric(4,2) NOT NULL,
    attendance_percentage numeric(5,2) NOT NULL,
    income_certificate_url text,
    other_certificate_url text,
    rejection_reason text,
    applied_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    verified_by_id integer REFERENCES public.auth_user(id) ON DELETE SET NULL,
    UNIQUE(student_id, scheme_id)
);

-- Scholarship Renewals
CREATE TABLE IF NOT EXISTS public.portal_scholarship_renewal (
    id SERIAL PRIMARY KEY,
    application_id integer NOT NULL REFERENCES public.portal_scholarship_application(id) ON DELETE CASCADE,
    status varchar(50) NOT NULL DEFAULT 'Pending', -- Pending | Approved | Rejected
    academic_gpa numeric(4,2) NOT NULL,
    attendance_percentage numeric(5,2) NOT NULL,
    documents_url text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by_id integer REFERENCES public.auth_user(id) ON DELETE SET NULL
);

-- Indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_scholarship_app_student ON public.portal_scholarship_application(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_app_scheme  ON public.portal_scholarship_application(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_renewal_app ON public.portal_scholarship_renewal(application_id);

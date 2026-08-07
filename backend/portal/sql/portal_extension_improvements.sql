-- ============================================================================
-- EduNova portal improvements: audit trail IP, notification preferences,
-- performance indexes, and data-quality constraints.
--
-- Additive + idempotent (every object guarded with IF NOT EXISTS / ADD COLUMN
-- IF NOT EXISTS), so it is safe to (re-)apply via:
--     python manage.py apply_portal_schema
-- ============================================================================

-- 1) Audit trail: capture the actor's IP address on every audit-log row.
ALTER TABLE public.portal_audit_log ADD COLUMN IF NOT EXISTS ip_address varchar(45);
-- Speed up "recent activity by this user" queries used by the admin audit UI.
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.portal_audit_log(actor_id);

-- 2) Notification preferences: which channels a user has opted into.
--    One row per user; absent rows default to every channel enabled.
CREATE TABLE IF NOT EXISTS public.portal_notification_preference (
    user_id       integer PRIMARY KEY REFERENCES public.auth_user(id) ON DELETE CASCADE,
    email_enabled boolean NOT NULL DEFAULT true,
    sms_enabled   boolean NOT NULL DEFAULT false,
    push_enabled  boolean NOT NULL DEFAULT true,
    in_app_enabled boolean NOT NULL DEFAULT true,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3) Performance indexes on the hottest portal tables. All are safely additive.
CREATE INDEX IF NOT EXISTS idx_payment_student_paid     ON public.portal_payment(student_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_fee_structure    ON public.portal_payment(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_result_exam_student      ON public.portal_result(exam_schedule_id, student_id);
CREATE INDEX IF NOT EXISTS idx_leave_user_status        ON public.portal_leave(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_recipient   ON public.portal_notification(recipient_type, target_class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_receiver         ON public.portal_message(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_book_title_author        ON public.portal_book(title, author);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date    ON public.portal_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_homework_class_due       ON public.portal_homework(class_id, due_date);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_class      ON public.portal_exam_schedule(class_id, exam_date);
CREATE INDEX IF NOT EXISTS idx_assignment_class         ON public.portal_assignment(class_id);
CREATE INDEX IF NOT EXISTS idx_submission_assignment    ON public.portal_assignment_submission(assignment_id);
CREATE INDEX IF NOT EXISTS idx_library_transaction_book ON public.portal_library_transaction(book_id, borrower_id);
CREATE INDEX IF NOT EXISTS idx_course_content_course    ON public.portal_course_content(course_id);
CREATE INDEX IF NOT EXISTS idx_certificate_student      ON public.portal_certificate(student_id);
CREATE INDEX IF NOT EXISTS idx_class_teacher_teacher    ON public.portal_class_teacher(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_allocation_cls  ON public.portal_academic_allocation(class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class_day      ON public.portal_timetable(class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_inventory_category       ON public.portal_inventory(category);
CREATE INDEX IF NOT EXISTS idx_medical_log_date         ON public.portal_medical_log(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_log_host         ON public.portal_visitor_log(host_user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_student           ON public.portal_alumni(student_id);
CREATE INDEX IF NOT EXISTS idx_ptm_booking_teacher      ON public.portal_ptm_booking(teacher_id);
CREATE INDEX IF NOT EXISTS idx_parent_feedback_status   ON public.portal_parent_feedback(status);
CREATE INDEX IF NOT EXISTS idx_hall_ticket_student      ON public.portal_hall_ticket(student_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject    ON public.portal_question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_document_class   ON public.portal_teacher_document(class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_course              ON public.portal_quiz(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_quiz       ON public.portal_quiz_question(quiz_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_student  ON public.portal_course_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class_year    ON public.portal_student_enrollment(class_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_profile_updated          ON public.portal_user_profile(updated_at);
CREATE INDEX IF NOT EXISTS idx_route_search             ON public.portal_route(route_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance      ON public.portal_vehicle(maintenance_status);
CREATE INDEX IF NOT EXISTS idx_hostel_type              ON public.portal_hostel(type);
CREATE INDEX IF NOT EXISTS idx_room_hostel              ON public.portal_room(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_allocation_room   ON public.portal_hostel_allocation(room_id);
CREATE INDEX IF NOT EXISTS idx_subject_code             ON public.portal_subject(subject_code);

-- 4) Data-quality: forbid logically impossible values BEFORE they can be written.
--    Only applied when the constraint is absent AND no existing row violates it,
--    so applying to a populated database never fails on historical data.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_amount_positive')
       AND NOT EXISTS (SELECT 1 FROM public.portal_payment WHERE amount_paid IS NOT NULL AND amount_paid < 0) THEN
        ALTER TABLE public.portal_payment
            ADD CONSTRAINT ck_payment_amount_positive CHECK (amount_paid IS NULL OR amount_paid >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_room_capacity_positive')
       AND NOT EXISTS (SELECT 1 FROM public.portal_room WHERE capacity IS NOT NULL AND capacity < 0) THEN
        ALTER TABLE public.portal_room
            ADD CONSTRAINT ck_room_capacity_positive CHECK (capacity IS NULL OR capacity >= 0);
    END IF;
END $$;
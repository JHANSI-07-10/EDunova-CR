from datetime import date
import copy
from django.db import connection
import logging

logger = logging.getLogger("edunova")
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    extend_schema,
    inline_serializer,
)
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response

from .views import table_exists, row, rows, serialise, validate_leave_dates, EXAM_NAME_CHOICES
from .roles import IsTeacher
from .doc_schemas import (
    DetailErrorSerializer,
    ValidationErrorSerializer,
    IdDetailResponseSerializer,
    LeaveRequestSerializer,
    LeaveSubmitResponseSerializer,
    MultiRouteAutoSchema,
    ERROR_RESPONSES,
)


# ---------------------------------------------------------------------------
# Documentation-only response serializers (no DRF serializers exist: raw SQL)
# ---------------------------------------------------------------------------

_SuccessDetail = inline_serializer(
    name="SuccessDetailResponse",
    fields={"detail": serializers.CharField(help_text="Human readable result message.")},
)

_TeacherProfile = inline_serializer(
    name="TeacherProfile",
    fields={
        "id": serializers.IntegerField(help_text="Django auth user id."),
        "name": serializers.CharField(help_text="Full name of the teacher."),
        "email": serializers.EmailField(allow_blank=True),
        "user_type": serializers.CharField(help_text="Always 'Teacher'."),
        "phone_number": serializers.CharField(allow_blank=True, required=False),
        "employee_code": serializers.CharField(allow_blank=True, required=False),
        "qualification": serializers.CharField(allow_blank=True, required=False),
        "specialization": serializers.CharField(allow_blank=True, required=False),
        "date_of_joining": serializers.DateField(
            required=False, allow_null=True, help_text="Date the teacher joined."
        ),
    },
)

_UpcomingExamItem = inline_serializer(
    name="TeacherUpcomingExamItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "exam_date": serializers.DateField(),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
    },
)

_TodaysTimetableItem = inline_serializer(
    name="TeacherTodaysTimetableItem",
    fields={
        "id": serializers.IntegerField(),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
        "start_time": serializers.TimeField(),
        "end_time": serializers.TimeField(),
    },
)

_AttendanceFlagItem = inline_serializer(
    name="TeacherAttendanceFlagItem",
    fields={
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
        "marked_count": serializers.IntegerField(),
        "roster_count": serializers.IntegerField(),
        "complete": serializers.BooleanField(help_text="Attendance fully marked for today."),
    },
)

_TeacherDashboard = inline_serializer(
    name="TeacherDashboard",
    fields={
        "total_classes": serializers.IntegerField(),
        "pending_grading": serializers.IntegerField(),
        "upcoming_exams": serializers.ListSerializer(child=_UpcomingExamItem),
        "unread_messages": serializers.IntegerField(),
        "today": serializers.DateField(),
        "todays_timetable": serializers.ListSerializer(
            child=_TodaysTimetableItem, required=False
        ),
        "attendance_flags": serializers.ListSerializer(child=_AttendanceFlagItem),
    },
)

_TeacherClassItem = inline_serializer(
    name="TeacherClassItem",
    fields={
        "id": serializers.CharField(help_text="Allocation id; 'ct-<class_id>' for class-teacher rows."),
        "class_id": serializers.IntegerField(),
        "class_name": serializers.CharField(),
        "subject_id": serializers.IntegerField(),
        "subject_name": serializers.CharField(),
        "student_count": serializers.IntegerField(),
    },
)

_StudentRosterItem = inline_serializer(
    name="TeacherStudentRosterItem",
    fields={
        "student": serializers.IntegerField(help_text="Student (auth user) id."),
        "student_name": serializers.CharField(),
        "admission_number": serializers.CharField(required=False, allow_null=True),
        "roll_number": serializers.CharField(required=False, allow_null=True),
    },
)

_AttendanceRecord = inline_serializer(
    name="TeacherAttendanceRecord",
    fields={
        "student": serializers.IntegerField(help_text="Student (auth user) id."),
        "student_name": serializers.CharField(),
        "admission_number": serializers.CharField(required=False, allow_null=True),
        "status": serializers.CharField(help_text="Present / Absent / Late / etc."),
        "remarks": serializers.CharField(required=False, allow_blank=True),
    },
)

_AttendanceRecordsResponse = inline_serializer(
    name="TeacherAttendanceRecordsResponse",
    fields={"records": serializers.ListSerializer(child=_AttendanceRecord)},
)

_AttendanceItem = inline_serializer(
    name="TeacherAttendanceMarkItem",
    fields={
        "student": serializers.IntegerField(help_text="Student (auth user) id."),
        "status": serializers.CharField(
            required=False, default="Present", help_text="Present/Absent/Late/Leaver/Leave."
        ),
        "remarks": serializers.CharField(required=False, allow_blank=True),
    },
)

_AttendanceMarkRequest = inline_serializer(
    name="TeacherAttendanceMarkRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "date": serializers.DateField(
            required=False, help_text="Defaults to the current date."
        ),
        "records": serializers.ListSerializer(child=copy.deepcopy(_AttendanceItem)),
    },
)

_HomeworkItem = inline_serializer(
    name="TeacherHomeworkItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_null=True),
        "assigned_date": serializers.DateField(),
        "due_date": serializers.DateField(required=False, allow_null=True),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
    },
)

_HomeworkCreateRequest = inline_serializer(
    name="TeacherHomeworkCreateRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "subject_id": serializers.IntegerField(
            required=False, allow_null=True, help_text="Pass 0 or omit for Class Administration."
        ),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_blank=True),
        "assigned_date": serializers.DateField(required=False),
        "due_date": serializers.DateField(required=False, allow_null=True),
    },
)

_AssignmentItem = inline_serializer(
    name="TeacherAssignmentItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_null=True),
        "file_url": serializers.URLField(required=False, allow_null=True),
        "max_marks": serializers.FloatField(required=False, allow_null=True),
        "due_date": serializers.DateField(required=False, allow_null=True),
        "assignment_type": serializers.CharField(),
        "quiz_questions": serializers.JSONField(required=False, allow_null=True),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
        "submission_count": serializers.IntegerField(),
        "graded_count": serializers.IntegerField(),
    },
)

_QuizQuestionItem = inline_serializer(
    name="TeacherQuizQuestionItem",
    fields={
        "question_text": serializers.CharField(),
        "options": serializers.ListField(child=serializers.CharField()),
        "correct_answer": serializers.CharField(required=False, allow_blank=True),
    },
)

_AssignmentCreateRequest = inline_serializer(
    name="TeacherAssignmentCreateRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "subject_id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_blank=True),
        "file_url": serializers.URLField(required=False, allow_blank=True),
        "max_marks": serializers.FloatField(required=False, default=100),
        "due_date": serializers.DateField(required=False, allow_null=True),
        "assignment_type": serializers.ChoiceField(
            choices=["File", "MCQ"], required=False, default="File"
        ),
        "quiz_questions": serializers.ListSerializer(
            child=copy.deepcopy(_QuizQuestionItem), required=False, default=[]
        ),
    },
)

_AssignmentPatchRequest = inline_serializer(
    name="TeacherAssignmentPatchRequest",
    fields={
        "title": serializers.CharField(required=False, allow_blank=True),
        "description": serializers.CharField(required=False, allow_blank=True),
        "file_url": serializers.URLField(required=False, allow_blank=True),
        "max_marks": serializers.FloatField(required=False),
        "due_date": serializers.DateField(required=False, allow_null=True),
        "assignment_type": serializers.ChoiceField(choices=["File", "Assignment"], required=False),
        "quiz_questions": serializers.ListSerializer(
            child=copy.deepcopy(_QuizQuestionItem), required=False
        ),
    },
)

_SubmissionItem = inline_serializer(
    name="TeacherSubmissionItem",
    fields={
        "id": serializers.IntegerField(),
        "submission_url": serializers.URLField(required=False, allow_null=True),
        "submitted_at": serializers.DateTimeField(),
        "marks_obtained": serializers.FloatField(required=False, allow_null=True),
        "teacher_feedback": serializers.CharField(required=False, allow_blank=True),
        "grade": serializers.CharField(required=False, allow_null=True),
        "student": serializers.IntegerField(),
        "student_name": serializers.CharField(),
        "admission_number": serializers.CharField(required=False, allow_null=True),
    },
)

_SubmissionGradeRequest = inline_serializer(
    name="TeacherSubmissionGradeRequest",
    fields={
        "marks_obtained": serializers.FloatField(required=False, allow_null=True),
        "teacher_feedback": serializers.CharField(required=False, allow_blank=True),
    },
)

_QuestionItem = inline_serializer(
    name="TeacherQuestionBankItem",
    fields={
        "id": serializers.IntegerField(),
        "difficulty_level": serializers.CharField(),
        "question_text": serializers.CharField(),
        "answer_schema": serializers.JSONField(required=False, allow_null=True),
        "subject_id": serializers.IntegerField(),
        "subject_name": serializers.CharField(),
    },
)

_QuestionCreateRequest = inline_serializer(
    name="TeacherQuestionCreateRequest",
    fields={
        "subject_id": serializers.IntegerField(),
        "difficulty_level": serializers.CharField(required=False, default="Medium"),
        "question_text": serializers.CharField(),
        "answer_schema": serializers.JSONField(required=False, default={}),
    },
)

_exam_schedule_item = inline_serializer(
    name="TeacherExamScheduleItem",
    fields={
        "id": serializers.IntegerField(),
        "exam_name": serializers.CharField(),
        "exam_type": serializers.CharField(),
        "exam_date": serializers.DateField(),
        "start_time": serializers.TimeField(),
        "duration_minutes": serializers.IntegerField(),
        "max_marks": serializers.FloatField(),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
    },
)

_ExamCreateRequest = inline_serializer(
    name="TeacherExamCreateRequest",
    fields={
        "class_id": serializers.IntegerField(),
        "subject_id": serializers.IntegerField(),
        "exam_name": serializers.CharField(help_text="Must be from the allowed exam cycle names."),
        "exam_type": serializers.ChoiceField(
            choices=["Unit_Test", "Term_Exam", "Board_Exam"], required=False, default="Unit_Test"
        ),
        "exam_date": serializers.DateField(required=False),
        "start_time": serializers.TimeField(required=False, default="09:00"),
        "duration_minutes": serializers.IntegerField(required=False, default=60),
        "max_marks": serializers.FloatField(required=False, default=100),
    },
)

_MarksEntryRowItem = inline_serializer(
    name="TeacherMarksEntryRowItem",
    fields={
        "student": serializers.IntegerField(help_text="Student (auth user) id."),
        "student_name": serializers.CharField(),
        "admission_number": serializers.CharField(required=False, allow_null=True),
        "marks_obtained": serializers.FloatField(required=False, allow_null=True),
        "grade_letter": serializers.CharField(required=False, allow_null=True),
        "remarks": serializers.CharField(required=False, allow_blank=True),
        "published": serializers.BooleanField(),
    },
)

_MarksEntryExamItem = inline_serializer(
    name="TeacherMarksEntryExamItem",
    fields={
        "id": serializers.IntegerField(required=False, allow_null=True),
        "exam_name": serializers.CharField(required=False),
        "max_marks": serializers.FloatField(required=False),
        "class_name": serializers.CharField(required=False),
        "subject_name": serializers.CharField(required=False),
    },
)

_MarksEntryResponse = inline_serializer(
    name="TeacherMarksEntryResponse",
    fields={
        "exam": _MarksEntryExamItem,
        "rows": serializers.ListSerializer(child=_MarksEntryRowItem),
    },
)

_MarksEntryRow = inline_serializer(
    name="TeacherMarksEntryRow",
    fields={
        "id": serializers.CharField(help_text="Student (auth user) id."),
        "student": serializers.IntegerField(help_text="Student (auth user) id.", required=False, allow_null=True),
        "marks_obtained": serializers.FloatField(required=False, allow_null=True),
        "grade_letter": serializers.CharField(required=False, allow_blank=True),
        "remarks": serializers.CharField(required=False, allow_blank=True),
    },
)

_MarksEntrySubmitRequest = inline_serializer(
    name="TeacherMarksEntrySubmitRequest",
    fields={
        "exam_schedule_id": serializers.IntegerField(),
        "entries": serializers.ListSerializer(child=copy.deepcopy(_MarksEntryRow), required=False, help_text="Marks rows (modern key)."),
        "rows": serializers.ListSerializer(child=copy.deepcopy(_MarksEntryRow), required=False, help_text="Marks rows (legacy key)."),
        "submit": serializers.BooleanField(required=False, default=True),
    },
)

_PerformanceStudentItem = inline_serializer(
    name="TeacherPerformanceStudentItem",
    fields={
        "student_id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "average_marks": serializers.FloatField(),
        "exams_taken": serializers.IntegerField(),
        "attendance_percentage": serializers.FloatField(),
    },
)

_PerformanceResponse = inline_serializer(
    name="TeacherPerformanceResponse",
    fields={
        "class_average": serializers.FloatField(),
        "students": serializers.ListSerializer(child=_PerformanceStudentItem),
    },
)

_MessageItem = inline_serializer(
    name="TeacherMessageItem",
    fields={
        "id": serializers.IntegerField(),
        "sender": serializers.IntegerField(),
        "receiver": serializers.IntegerField(),
        "message_text": serializers.CharField(),
        "created_at": serializers.DateTimeField(),
        "sender_name": serializers.CharField(required=False),
        "receiver_name": serializers.CharField(required=False),
    },
)

_MessageSendRequest = inline_serializer(
    name="TeacherMessageSendRequest",
    fields={
        "receiver": serializers.IntegerField(help_text="Recipient (auth user) id."),
        "message_text": serializers.CharField(),
    },
)

_ContactItem = inline_serializer(
    name="TeacherContactItem",
    fields={
        "id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "role": serializers.CharField(),
    },
)

_NoticeItem = inline_serializer(
    name="TeacherNoticeItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "content": serializers.CharField(required=False, allow_null=True),
        "created_at": serializers.DateTimeField(required=False, allow_null=True),
        "file_attachment_url": serializers.URLField(required=False, allow_null=True),
        "is_pinned": serializers.BooleanField(),
    },
)

_TeacherLeaveItem = inline_serializer(
    name="TeacherLeaveItem",
    fields={
        "id": serializers.IntegerField(),
        "leave_type": serializers.CharField(),
        "start_date": serializers.DateField(),
        "end_date": serializers.DateField(),
        "reason": serializers.CharField(required=False, allow_blank=True),
        "status": serializers.CharField(),
    },
)

_TimetableItem = inline_serializer(
    name="TeacherTimetableItem",
    fields={
        "id": serializers.IntegerField(),
        "day_of_week": serializers.CharField(),
        "start_time": serializers.TimeField(),
        "end_time": serializers.TimeField(),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
    },
)

_DocumentItem = inline_serializer(
    name="TeacherDocumentItem",
    fields={
        "id": serializers.IntegerField(),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(required=False, allow_null=True),
    },
)

_DocumentCreateRequest = inline_serializer(
    name="TeacherDocumentCreateRequest",
    fields={
        "class_id": serializers.IntegerField(required=False, allow_null=True),
        "subject_id": serializers.IntegerField(required=False, allow_null=True),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(required=False, allow_blank=True),
    },
)

_AdmissionEnquiryItem = inline_serializer(
    name="TeacherAdmissionEnquiryItem",
    fields={
        "registration_number": serializers.CharField(),
        "applicant_name": serializers.CharField(required=False, allow_null=True),
        "date_of_birth": serializers.DateField(required=False, allow_null=True),
        "gender": serializers.CharField(required=False, allow_null=True),
        "target_class": serializers.CharField(required=False, allow_null=True),
        "parent_name": serializers.CharField(required=False, allow_null=True),
        "parent_phone": serializers.CharField(required=False, allow_null=True),
        "parent_email": serializers.EmailField(required=False, allow_null=True),
        "scholarship_applied": serializers.BooleanField(required=False),
        "status": serializers.CharField(),
        "rejection_reason": serializers.CharField(required=False, allow_null=True),
        "submitted_at": serializers.DateTimeField(required=False, allow_null=True),
    },
)

_AdmissionReviewRequest = inline_serializer(
    name="TeacherAdmissionReviewRequest",
    fields={
        "registration_number": serializers.CharField(),
        "action": serializers.ChoiceField(
            choices=["recommend_advance", "recommend_reject"],
            help_text="Interview recommendation to submit.",
        ),
        "remarks": serializers.CharField(required=False, allow_blank=True),
    },
)

_AdmissionReviewResponse = inline_serializer(
    name="TeacherAdmissionReviewResponse",
    fields={
        "detail": serializers.CharField(),
        "status": serializers.CharField(required=False),
    },
)

_ScanQuestion = inline_serializer(
    name="TeacherScanQuestion",
    fields={
        "question_text": serializers.CharField(),
        "options": serializers.ListField(child=serializers.CharField()),
        "correct_answer": serializers.CharField(required=False),
    },
)

_PdfScanResponse = inline_serializer(
    name="TeacherPdfScanResponse",
    fields={"questions": serializers.ListSerializer(child=copy.deepcopy(_ScanQuestion), required=False)},
)

_PdfScanRequest = inline_serializer(
    name="TeacherPdfScanRequest",
    fields={"file": serializers.FileField(help_text="PDF file to extract questions from.")},
)

_LmsCourseItem = inline_serializer(
    name="TeacherLmsCourseItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_null=True),
        "class_name": serializers.CharField(),
        "subject_name": serializers.CharField(),
        "class_id": serializers.IntegerField(),
        "subject_id": serializers.IntegerField(),
    },
)

_LmsChapterItem = inline_serializer(
    name="TeacherLmsChapterItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_blank=True),
        "sort_order": serializers.IntegerField(),
    },
)

_ChapterCreateRequest = inline_serializer(
    name="TeacherLmsChapterCreateRequest",
    fields={
        "course_id": serializers.IntegerField(required=False, allow_null=True),
        "class_id": serializers.IntegerField(required=False, allow_null=True),
        "subject_id": serializers.IntegerField(required=False, allow_null=True),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, default=""),
        "sort_order": serializers.IntegerField(required=False, default=0),
        "pdf_url": serializers.URLField(required=False, allow_null=True),
    },
)

_ChapterUpdateRequest = inline_serializer(
    name="TeacherLmsChapterUpdateRequest",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(required=False),
        "description": serializers.CharField(required=False, default=""),
        "pdf_url": serializers.URLField(required=False, allow_blank=True),
    },
)

_LmsLessonItem = inline_serializer(
    name="TeacherLmsLessonItem",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, allow_blank=True),
        "sort_order": serializers.IntegerField(),
    },
)

_LessonCreateRequest = inline_serializer(
    name="TeacherLmsLessonCreateRequest",
    fields={
        "chapter_id": serializers.IntegerField(),
        "title": serializers.CharField(),
        "description": serializers.CharField(required=False, default=""),
        "sort_order": serializers.IntegerField(required=False, default=0),
    },
)

_LessonUpdateRequest = inline_serializer(
    name="TeacherLmsLessonUpdateRequest",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(required=False),
        "description": serializers.CharField(required=False, default=""),
    },
)

_LmsResourceItem = inline_serializer(
    name="TeacherLmsResourceItem",
    fields={
        "id": serializers.IntegerField(),
        "content_type": serializers.CharField(),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(required=False, allow_null=True),
        "description": serializers.CharField(required=False, allow_blank=True),
        "due_date": serializers.CharField(required=False, allow_null=True),
        "max_marks": serializers.FloatField(required=False, allow_null=True),
        "quiz_id": serializers.IntegerField(required=False, allow_null=True),
        "assignment_id": serializers.IntegerField(required=False, allow_null=True),
        "visible_from": serializers.CharField(required=False, allow_null=True),
    },
)

_ResourceCreateRequest = inline_serializer(
    name="TeacherLmsResourceCreateRequest",
    fields={
        "course_id": serializers.IntegerField(),
        "lesson_id": serializers.IntegerField(),
        "content_type": serializers.ChoiceField(
            choices=["PDF", "Quiz", "Assignment", "Video", "Link"], required=False, default="PDF"
        ),
        "title": serializers.CharField(),
        "resource_url": serializers.URLField(required=False, allow_blank=True),
        "description": serializers.CharField(required=False, default=""),
        "due_date": serializers.CharField(required=False, allow_null=True),
        "max_marks": serializers.FloatField(required=False, allow_null=True),
        "visible_from": serializers.CharField(required=False),
        "questions": serializers.ListSerializer(child=copy.deepcopy(_QuizQuestionItem), required=False),
    },
)

_ResourceUpdateRequest = inline_serializer(
    name="TeacherLmsResourceUpdateRequest",
    fields={
        "id": serializers.IntegerField(),
        "title": serializers.CharField(required=False, allow_blank=True),
        "resource_url": serializers.URLField(required=False, allow_blank=True),
        "description": serializers.CharField(required=False, default=""),
        "due_date": serializers.CharField(required=False, allow_null=True),
        "max_marks": serializers.FloatField(required=False, allow_null=True),
    },
)


# ---------------------------------------------------------------------------
# Path-aware operation ids for APIViews registered on BOTH a list and a detail
# route (QuestionBankView, AssignmentSubmissionsView). drf-spectacular would
# otherwise emit operationId collision warnings and auto-suffix the ids.
# The base MultiRouteAutoSchema lives in doc_schemas.py and is reused by the
# admin portal views that share the same multi-route shape.
# ---------------------------------------------------------------------------

class _QuestionBankRouteSchema(MultiRouteAutoSchema):
    OPERATION_IDS = {
        ("GET", ("teacher", "question-bank")): "TeacherQuestionBankList",
        ("POST", ("teacher", "question-bank")): "TeacherQuestionBankCreate",
        ("DELETE", ("teacher", "question-bank")): "TeacherQuestionBankRemoveAll",
        ("GET", ("teacher", "question-bank", "{question_id}")): "TeacherQuestionBankDetail",
        ("POST", ("teacher", "question-bank", "{question_id}")): "TeacherQuestionBankDetailCreate",
        ("DELETE", ("teacher", "question-bank", "{question_id}")): "TeacherQuestionBankDelete",
    }


class _AssignmentSubmissionsMultiViewSchema(MultiRouteAutoSchema):
    OPERATION_IDS = {
        ("GET", ("teacher", "assignments", "{assignment_id}", "submissions")): "TeacherAssignmentSubmissions",
        ("PATCH", ("teacher", "assignments", "{assignment_id}", "submissions")): "TeacherAssignmentSubmissionBulk",
        ("GET", ("teacher", "assignments", "{assignment_id}", "submissions", "{submission_id}")): "TeacherAssignmentSubmissionView",
        ("PATCH", ("teacher", "assignments", "{assignment_id}", "submissions", "{submission_id}")): "TeacherAssignmentSubmissionDetail",
    }


# ---------------------------------------------------------------------------
# Example payloads used across several create/update endpoints
# ---------------------------------------------------------------------------

_HOMEWORK_CREATE_EXAMPLE = OpenApiExample(
    "HomeworkCreate",
    value={
        "class_id": 3,
        "subject_id": 5,
        "title": "Chapter 4 exercises",
        "description": "Solve questions 1-10 from the textbook.",
        "assigned_date": "2026-08-06",
        "due_date": "2026-08-13",
    },
)

_ATTENDANCE_MARK_EXAMPLE = OpenApiExample(
    "AttendanceMark",
    value={
        "class_id": 3,
        "date": "2026-08-06",
        "records": [
            {"student": 11, "status": "Present", "remarks": ""},
            {"student": 12, "status": "Absent", "remarks": "On medical leave"},
        ],
    },
)

_LEAVE_REQUEST_EXAMPLE = OpenApiExample(
    "LeaveRequestExample",
    value={
        "leave_type": "Sick",
        "start_date": "2026-08-10",
        "end_date": "2026-08-11",
        "reason": "Fever and rest advised by doctor.",
    },
)

_QUESTION_CREATE_EXAMPLE = OpenApiExample(
    "QuestionCreate",
    value={
        "subject_id": 5,
        "difficulty_level": "Medium",
        "question_text": "What is the capital of France?",
        "answer_schema": {"options": ["Paris", "Lyon", "Marseille", "Nice"], "correct": "Paris"},
    },
)

_MARKS_ENTRY_EXAMPLE = OpenApiExample(
    "MarksEntry",
    value={
        "exam_schedule_id": 7,
        "submit": True,
        "entries": [
            {"student": 11, "marks_obtained": 87, "remarks": "Well done"},
            {"student": 12, "marks_obtained": 64},
        ],
    },
)


class TeacherMixin:
    # RBAC: only accounts whose resolved role is 'Teacher' pass.
    permission_classes = [IsTeacher]


def teacher_classes(user_id):
    if not table_exists("portal_academic_allocation"):
        return []
    # Union class allocations with class teacher mappings
    sql = """
        SELECT DISTINCT c.id AS class_id, c.name || '-' || c.section AS class_name,
               (SELECT COUNT(*) FROM portal_student_enrollment se WHERE se.class_id=c.id)::int AS student_count
        FROM portal_class c
        LEFT JOIN portal_academic_allocation aa ON aa.class_id=c.id
        LEFT JOIN portal_class_teacher ct ON ct.class_id=c.id
        WHERE aa.teacher_id=%s OR ct.teacher_id=%s
        ORDER BY class_name
    """
    data = rows(sql, [user_id, user_id])
    
    result = []
    for r in data:
        allocations = rows(
            """
            SELECT aa.id, aa.subject_id, s.name AS subject_name
            FROM portal_academic_allocation aa
            JOIN portal_subject s ON s.id=aa.subject_id
            WHERE aa.teacher_id=%s AND aa.class_id=%s
            """, [user_id, r["class_id"]]
        )
        if allocations:
            for a in allocations:
                result.append({
                    "id": a["id"],
                    "class_id": r["class_id"],
                    "class_name": r["class_name"],
                    "subject_id": a["subject_id"],
                    "subject_name": a["subject_name"],
                    "student_count": r["student_count"]
                })
        else:
            result.append({
                "id": f"ct-{r['class_id']}",
                "class_id": r["class_id"],
                "class_name": r["class_name"],
                "subject_id": 0,
                "subject_name": "Class Administration",
                "student_count": r["student_count"]
            })
    return result


class TeacherProfileView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherProfile",
        summary="Teacher profile",
        description="Returns the authenticated teacher's profile including contact, employee and academic details.",
        tags=["Teacher"],
        responses={**ERROR_RESPONSES, 200: _TeacherProfile},
    )
    def get(self, request):
        u = request.user
        profile = {
            "id": u.id,
            "name": u.get_full_name().strip() or u.username,
            "email": u.email,
            "user_type": "Teacher",
            "phone_number": "",
            "employee_code": "—",
            "qualification": "",
            "specialization": "",
            "date_of_joining": None,
        }
        if table_exists("portal_user_profile"):
            p = row("SELECT phone_number FROM portal_user_profile WHERE user_id=%s", [u.id])
            if p: profile.update(p)
        if table_exists("portal_teacher_profile"):
            t = row("SELECT employee_code, qualification, specialization, date_of_joining FROM portal_teacher_profile WHERE user_id=%s", [u.id])
            if t: profile.update(t)
        return Response(serialise(profile))


class TeacherDashboardView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherDashboard",
        summary="Teacher dashboard overview",
        description="Returns teaching summary: class count, pending grading, upcoming exams, unread messages, today's timetable and attendance flags.",
        tags=["Teacher"],
        responses={**ERROR_RESPONSES, 200: _TeacherDashboard},
    )
    def get(self, request):
        uid = request.user.id
        classes = teacher_classes(uid)
        today = date.today()
        todays_timetable = []
        if table_exists("portal_timetable"):
            todays_timetable = rows(
                """
                SELECT t.id, c.name || '-' || c.section AS class_name, s.name AS subject_name,
                       t.start_time, t.end_time
                FROM portal_timetable t
                JOIN portal_class c ON c.id=t.class_id
                JOIN portal_subject s ON s.id=t.subject_id
                WHERE t.teacher_id=%s AND lower(t.day_of_week)=lower(to_char(current_date, 'FMDay'))
                ORDER BY t.start_time
                """, [uid]
            )
        upcoming_exams = []
        if table_exists("portal_exam_schedule"):
            upcoming_exams = rows(
                """
                SELECT e.id, e.exam_name, e.exam_date, c.name || '-' || c.section AS class_name, s.name AS subject_name
                FROM portal_exam_schedule e
                JOIN portal_class c ON c.id=e.class_id
                JOIN portal_subject s ON s.id=e.subject_id
                WHERE e.teacher_id=%s AND e.exam_date >= current_date
                ORDER BY e.exam_date ASC LIMIT 8
                """, [uid]
            )
        pending_grading = 0
        if table_exists("portal_assignment_submission"):
            p = row(
                """
                SELECT COUNT(*)::int AS count
                FROM portal_assignment_submission sub
                JOIN portal_assignment a ON a.id=sub.assignment_id
                WHERE a.teacher_id=%s AND sub.marks_obtained IS NULL
                """, [uid]
            )
            pending_grading = p["count"] if p else 0
        unread_messages = 0
        if table_exists("portal_message"):
            m = row("SELECT COUNT(*)::int AS count FROM portal_message WHERE receiver_id=%s AND is_read=false", [uid])
            unread_messages = m["count"] if m else 0
        attendance_flags = []
        if table_exists("portal_attendance"):
            for c in classes:
                marked = row("SELECT COUNT(*)::int AS count FROM portal_attendance WHERE class_id=%s AND date=current_date", [c["class_id"]])
                attendance_flags.append({
                    "class_name": c["class_name"],
                    "subject_name": c["subject_name"],
                    "marked_count": marked["count"] if marked else 0,
                    "roster_count": c["student_count"],
                    "complete": (marked["count"] if marked else 0) >= c["student_count"] and c["student_count"] > 0,
                })
        return Response(serialise({
            "total_classes": len(classes),
            "pending_grading": pending_grading,
            "upcoming_exams": upcoming_exams,
            "unread_messages": unread_messages,
            "today": today.isoformat(),
            "todays_timetable": todays_timetable,
            "attendance_flags": attendance_flags,
        }))


class MyClassesView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherMyClasses",
        summary="My classes",
        description="Lists every class the teacher is allocated to, together with the taught subject and enrolment count.",
        tags=["Teacher"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_TeacherClassItem),
        },
    )
    def get(self, request):
        return Response(serialise(teacher_classes(request.user.id)))


class ClassRosterView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherClassRoster",
        summary="Class roster",
        description="Returns the enrolled students of a class with admission and roll numbers.",
        tags=["Teacher"],
        parameters=[
            OpenApiParameter(
                name="class_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
            ),
        ],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_StudentRosterItem),
        },
    )
    def get(self, request, class_id):
        if not table_exists("portal_student_enrollment"):
            return Response([])
        data = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number, se.roll_number
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            WHERE se.class_id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [class_id]
        )
        return Response(serialise(data))


class AttendanceView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherAttendance",
        summary="Today's attendance for a class",
        description="Returns the attendance status of every student in the class for the current date. Falls back to the first allocated class when class_id is omitted.",
        tags=["Academic"],
        parameters=[
            OpenApiParameter(
                name="class_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Class id. Defaults to the teacher's first allocated class.",
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _AttendanceRecordsResponse},
    )
    def get(self, request):
        class_id = request.query_params.get("class_id")
        if not class_id:
            classes = teacher_classes(request.user.id)
            class_id = classes[0]["class_id"] if classes else None
        if not class_id:
            return Response({"records": []})
        roster = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number,
                   COALESCE(a.status, 'Present') AS status,
                   COALESCE(a.remarks, '') AS remarks
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            LEFT JOIN portal_attendance a ON a.student_id=u.id AND a.class_id=se.class_id AND a.date=current_date
            WHERE se.class_id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [class_id]
        ) if table_exists("portal_student_enrollment") else []
        return Response(serialise({"records": roster}))

    @extend_schema(
        operation_id="TeacherAttendanceSubmit",
        summary="Mark attendance",
        description="Inserts or upserts attendance records for a class and date in a single call.",
        tags=["Academic"],
        request=_AttendanceMarkRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
        examples=[_ATTENDANCE_MARK_EXAMPLE],
    )
    def post(self, request):
        class_id = request.data.get("class_id")
        date_value = request.data.get("date") or date.today().isoformat()
        records = request.data.get("records", [])
        if not table_exists("portal_attendance"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            for rec in records:
                cursor.execute(
                    """
                    INSERT INTO portal_attendance (student_id, class_id, date, status, marked_by, remarks)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (student_id, class_id, date)
                    DO UPDATE SET status=EXCLUDED.status, marked_by=EXCLUDED.marked_by, remarks=EXCLUDED.remarks
                    """,
                    [rec.get("student"), class_id, date_value, rec.get("status", "Present"), request.user.id, rec.get("remarks", "")],
                )
        return Response({"detail": "Attendance synced successfully."})


class HomeworkView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherHomework",
        summary="List homework",
        description="Returns all homework assigned by the teacher, newest due date first.",
        tags=["Academic"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_HomeworkItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_homework"):
            return Response([])
        data = rows(
            """
            SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                   c.name || '-' || c.section AS class_name, COALESCE(s.name, 'General') AS subject_name
            FROM portal_homework h
            JOIN portal_class c ON c.id=h.class_id
            LEFT JOIN portal_subject s ON s.id=h.subject_id
            WHERE h.teacher_id=%s ORDER BY h.due_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="TeacherHomeworkCreate",
        summary="Assign homework",
        description="Creates a new homework entry for a class and subject.",
        tags=["Academic"],
        request=_HomeworkCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
        examples=[_HOMEWORK_CREATE_EXAMPLE],
    )
    def post(self, request):
        if not table_exists("portal_homework"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        if not subject_id or str(subject_id) == "0":
            subject_id = None
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_homework (class_id, subject_id, teacher_id, title, description, assigned_date, due_date)
                   VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, data.get("title"), data.get("description"), data.get("assigned_date") or date.today(), data.get("due_date")],
            )
            hid = cursor.fetchone()[0]
        return Response({"id": hid, "detail": "Homework assigned."})


class AssignmentView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherAssignmentList",
        summary="List assignments",
        description="Returns every assignment created by the teacher with submission and grading counts.",
        tags=["Academic"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_AssignmentItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_assignment"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.title, a.description, a.file_url, a.max_marks, a.due_date, a.assignment_type, a.quiz_questions,
                   c.name || '-' || c.section AS class_name, s.name AS subject_name,
                   (SELECT COUNT(*) FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id)::int AS submission_count,
                   (SELECT COUNT(*) FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id AND sub.marks_obtained IS NOT NULL)::int AS graded_count
            FROM portal_assignment a
            JOIN portal_class c ON c.id=a.class_id
            JOIN portal_subject s ON s.id=a.subject_id
            WHERE a.teacher_id=%s ORDER BY a.due_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))

    @extend_schema(
        operation_id="TeacherAssignmentCreate",
        summary="Create assignment",
        description="Creates a new assignment (file or MCQ based) for a class and subject.",
        tags=["Academic"],
        request=_AssignmentCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
        examples=[_QUESTION_CREATE_EXAMPLE],
    )
    def post(self, request):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        if not class_id:
            return Response({"detail": "class_id is required."}, status=400)
        if not subject_id or str(subject_id) == "0":
            return Response({"detail": "A valid subject is required. Assignments cannot be created for Class Administration."}, status=400)
        assignment_type = data.get("assignment_type", "File")
        import json
        quiz_questions = json.dumps(data.get("quiz_questions", []))
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_assignment (class_id, subject_id, teacher_id, title, description, file_url, max_marks, due_date, assignment_type, quiz_questions)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, data.get("title"), data.get("description"), data.get("file_url"), data.get("max_marks") or 100, data.get("due_date"), assignment_type, quiz_questions],
            )
            aid = cursor.fetchone()[0]
        return Response({"id": aid, "detail": "Assignment created."})


class AssignmentDetailView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherAssignmentDetailUpdate",
        summary="Update assignment",
        description="Partially updates the fields of an existing assignment.",
        tags=["Academic"],
        parameters=[
            OpenApiParameter(
                name="assignment_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
            ),
        ],
        request=_AssignmentPatchRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def patch(self, request, assignment_id):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        import json
        with connection.cursor() as cursor:
            cursor.execute(
                """UPDATE portal_assignment 
                   SET title=%s, description=%s, file_url=%s, max_marks=%s, due_date=%s, assignment_type=%s, quiz_questions=%s
                   WHERE id=%s""",
                [
                    data.get("title"),
                    data.get("description"),
                    data.get("file_url"),
                    data.get("max_marks") or 100,
                    data.get("due_date"),
                    data.get("assignment_type", "File"),
                    json.dumps(data.get("quiz_questions", [])),
                    assignment_id
                ]
            )
        return Response({"detail": "Assignment updated."})

    @extend_schema(
        operation_id="TeacherAssignmentDetailDelete",
        summary="Delete assignment",
        description="Deletes an existing assignment.",
        tags=["Academic"],
        parameters=[
            OpenApiParameter(
                name="assignment_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def delete(self, request, assignment_id):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [assignment_id])
        return Response({"detail": "Assignment deleted."})


class AssignmentSubmissionsView(TeacherMixin, APIView):
    # Mounted on both the submissions list route and the submission detail route.
    schema = _AssignmentSubmissionsMultiViewSchema()
    @extend_schema(
        summary="List assignment submissions",
        description="Returns all submissions for an assignment (optionally addressed via the submission detail route).",
        tags=["Academic"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_SubmissionItem),
        },
    )
    def get(self, request, assignment_id, submission_id=None):
        if not table_exists("portal_assignment_submission"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT sub.id, sub.submission_url, sub.submitted_at, sub.marks_obtained, sub.teacher_feedback, sub.grade,
                   u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number
            FROM portal_assignment_submission sub
            JOIN auth_user u ON u.id=sub.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            WHERE sub.assignment_id=%s ORDER BY sub.submitted_at DESC
            """, [assignment_id]
        )))

    @extend_schema(
        summary="Grade a submission",
        description="Records marks and feedback for a single student submission and derives a letter grade.",
        tags=["Academic"],
        request=_SubmissionGradeRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def patch(self, request, assignment_id, submission_id):
        if not table_exists("portal_assignment_submission"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        
        marks = request.data.get("marks_obtained")
        assign = row("SELECT max_marks FROM portal_assignment WHERE id=%s", [assignment_id])
        grade = None
        if marks is not None and assign and assign.get("max_marks"):
            try:
                pct = (float(marks) / float(assign["max_marks"])) * 100
                if pct >= 90: grade = 'A+'
                elif pct >= 80: grade = 'A'
                elif pct >= 70: grade = 'B'
                elif pct >= 60: grade = 'C'
                elif pct >= 50: grade = 'D'
                else: grade = 'F'
            except Exception:
                pass

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_assignment_submission SET marks_obtained=%s, teacher_feedback=%s, grade=%s WHERE id=%s AND assignment_id=%s",
                [marks, request.data.get("teacher_feedback", ""), grade, submission_id, assignment_id],
            )
        return Response({"detail": "Submission graded."})


class QuestionBankView(TeacherMixin, APIView):
    # Mounted on both the question-bank list route and the question detail route.
    schema = _QuestionBankRouteSchema()
    @extend_schema(
        summary="List question bank",
        description="Returns every question the teacher authored, or a single question via the detail route.",
        tags=["Examination"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_QuestionItem),
        },
    )
    def get(self, request, question_id=None):
        if not table_exists("portal_question_bank"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT q.id, q.difficulty_level, q.question_text, q.answer_schema, s.id AS subject_id, s.name AS subject_name
            FROM portal_question_bank q JOIN portal_subject s ON s.id=q.subject_id
            WHERE q.teacher_id=%s ORDER BY q.id DESC
            """, [request.user.id]
        )))

    @extend_schema(
        summary="Add a question",
        description="Inserts a new question into the question bank.",
        tags=["Examination"],
        request=_QuestionCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
        examples=[_QUESTION_CREATE_EXAMPLE],
    )
    def post(self, request, question_id=None):
        if not table_exists("portal_question_bank"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_question_bank (subject_id, teacher_id, difficulty_level, question_text, answer_schema) VALUES (%s,%s,%s,%s,%s::jsonb) RETURNING id",
                [request.data.get("subject_id"), request.user.id, request.data.get("difficulty_level", "Medium"), request.data.get("question_text"), request.data.get("answer_schema", "{}")],
            )
            qid = cursor.fetchone()[0]
        return Response({"id": qid, "detail": "Question added."})

    @extend_schema(
        summary="Remove a question",
        description="Deletes a question the teacher authored by id.",
        tags=["Examination"],
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def delete(self, request, question_id):
        if table_exists("portal_question_bank"):
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM portal_question_bank WHERE id=%s AND teacher_id=%s", [question_id, request.user.id])
        return Response({"detail": "Question removed."})


class TeacherExamView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherExamList",
        summary="List exams",
        description="Returns the exam schedule entries for the teacher, newest first.",
        tags=["Examination"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_exam_schedule_item),
        },
    )
    def get(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.start_time, e.duration_minutes, e.max_marks,
                   c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_exam_schedule e JOIN portal_class c ON c.id=e.class_id JOIN portal_subject s ON s.id=e.subject_id
            WHERE e.teacher_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )))

    @extend_schema(
        operation_id="TeacherExamCreate",
        summary="Schedule exam",
        description="Schedules an exam for a class and subject. exam_name must be one of the configured exam cycle names.",
        tags=["Examination"],
        request=_ExamCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response({"detail": "Portal schema has not been applied.", "exam_name_choices": EXAM_NAME_CHOICES}, status=400)
        data = request.data
        exam_name = (data.get("exam_name") or "").strip()
        if exam_name not in EXAM_NAME_CHOICES:
            return Response(
                {"detail": f"exam_name must be one of {EXAM_NAME_CHOICES}.",
                 "exam_name_choices": EXAM_NAME_CHOICES},
                status=400,
            )
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_exam_schedule (class_id, subject_id, teacher_id, exam_name, exam_type, exam_date, start_time, duration_minutes, max_marks)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, exam_name, data.get("exam_type", "Unit_Test"), data.get("exam_date"), data.get("start_time", "09:00"), data.get("duration_minutes") or 60, data.get("max_marks") or 100],
            )
            eid = cursor.fetchone()[0]
        return Response({"id": eid, "detail": "Exam scheduled."})


class MarksEntryView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherMarksEntry",
        summary="Marks entry sheet",
        description="Returns the student roster with existing marks for an exam schedule, ready for grading.",
        tags=["Examination"],
        parameters=[
            OpenApiParameter(
                name="exam_schedule_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _MarksEntryResponse},
    )
    def get(self, request):
        exam_id = request.query_params.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_exam_schedule"):
            return Response({"exam": None, "rows": []})
        exam = row("SELECT e.id, e.exam_name, e.max_marks, c.name || '-' || c.section AS class_name, s.name AS subject_name FROM portal_exam_schedule e JOIN portal_class c ON c.id=e.class_id JOIN portal_subject s ON s.id=e.subject_id WHERE e.id=%s", [exam_id])
        if not exam:
            return Response({"exam": None, "rows": []})
        data = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number, r.marks_obtained, r.grade_letter, r.remarks,
                   CASE WHEN r.id IS NULL THEN false ELSE true END AS published
            FROM portal_student_enrollment se
            JOIN portal_exam_schedule e ON e.class_id=se.class_id
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            LEFT JOIN portal_result r ON r.student_id=u.id AND r.exam_schedule_id=e.id
            WHERE e.id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [exam_id]
        ) if table_exists("portal_student_enrollment") else []
        return Response(serialise({"exam": exam, "rows": data}))

    @extend_schema(
        operation_id="TeacherMarksEntrySubmit",
        summary="Submit marks",
        description="Upserts marks (and grades) for all students of an exam schedule, then publishes or saves as draft.",
        tags=["Examination"],
        request=_MarksEntrySubmitRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
        examples=[_MARKS_ENTRY_EXAMPLE],
    )
    def post(self, request):
        if not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        exam_id = request.data.get("exam_schedule_id")
        # Accept both 'entries' (frontend key) and 'rows' (legacy)
        marks_rows = request.data.get("entries") or request.data.get("rows", [])
        submit = request.data.get("submit", True)
        exam = row("SELECT max_marks FROM portal_exam_schedule WHERE id=%s", [exam_id])
        max_marks = exam["max_marks"] if exam else 100
        with connection.cursor() as cursor:
            for r in marks_rows:
                raw = r.get("marks_obtained")
                if raw is None or raw == "":
                    continue
                marks = float(raw)
                pct = (marks / max_marks) * 100 if max_marks else 0
                grade = r.get("grade_letter") or ("A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F")
                cursor.execute(
                    """
                    INSERT INTO portal_result (student_id, exam_schedule_id, marks_obtained, grade_letter, grade_points, remarks)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (student_id, exam_schedule_id)
                    DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, grade_letter=EXCLUDED.grade_letter, grade_points=EXCLUDED.grade_points, remarks=EXCLUDED.remarks
                    """, [r.get("student"), exam_id, marks, grade, round(pct/10, 2), r.get("remarks", "")]
                )
        detail = "Marks submitted for publication." if submit else "Marks saved as draft."
        return Response({"detail": detail})


class PerformanceAnalyticsView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherPerformanceAnalytics",
        summary="Performance analytics",
        description="Returns per-student average marks, exams taken and attendance percentage for a class, plus the class average.",
        tags=["Examination"],
        parameters=[
            OpenApiParameter(
                name="class_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
            OpenApiParameter(
                name="subject_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _PerformanceResponse},
    )
    def get(self, request):
        class_id = request.query_params.get("class_id")
        subject_id = request.query_params.get("subject_id")
        if not class_id:
            return Response({"class_average": 0, "students": []})
        data = rows(
            """
            SELECT u.id AS student_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
              COALESCE(ROUND(AVG(r.marks_obtained),1),0) AS average_marks,
              COUNT(r.id)::int AS exams_taken,
              COALESCE(ROUND(AVG(CASE WHEN a.status='Present' THEN 100 ELSE 0 END),1),0) AS attendance_percentage
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_exam_schedule e ON e.class_id=se.class_id AND (%s IS NULL OR e.subject_id=%s)
            LEFT JOIN portal_result r ON r.student_id=u.id AND r.exam_schedule_id=e.id
            LEFT JOIN portal_attendance a ON a.student_id=u.id AND a.class_id=se.class_id
            WHERE se.class_id=%s
            GROUP BY u.id, name ORDER BY name
            """, [subject_id, subject_id, class_id]
        ) if table_exists("portal_student_enrollment") else []
        class_avg = round(sum(float(s["average_marks"] or 0) for s in data) / len(data), 1) if data else 0
        return Response(serialise({"class_average": class_avg, "students": data}))


class MessageThreadView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherMessageThread",
        summary="Message threads",
        description="Returns the latest message with each contact, or the full thread with a specific user when `with` is supplied.",
        tags=["Teacher"],
        parameters=[
            OpenApiParameter(
                name="with",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Other user id to load the full conversation with.",
            ),
        ],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_MessageItem),
        },
    )
    def get(self, request):
        other = request.query_params.get("with")
        if not table_exists("portal_message"):
            return Response([])
        if other:
            data = rows(
                """
                SELECT m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at,
                       su.username AS sender_name, ru.username AS receiver_name
                FROM portal_message m JOIN auth_user su ON su.id=m.sender_id JOIN auth_user ru ON ru.id=m.receiver_id
                WHERE (m.sender_id=%s AND m.receiver_id=%s) OR (m.sender_id=%s AND m.receiver_id=%s)
                ORDER BY m.created_at
                """, [request.user.id, other, other, request.user.id]
            )
        else:
            data = rows(
                """
                SELECT DISTINCT ON (CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END)
                       m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at,
                       su.username AS sender_name, ru.username AS receiver_name
                FROM portal_message m JOIN auth_user su ON su.id=m.sender_id JOIN auth_user ru ON ru.id=m.receiver_id
                WHERE m.sender_id=%s OR m.receiver_id=%s
                ORDER BY CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END, m.created_at DESC
                """, [request.user.id, request.user.id, request.user.id, request.user.id]
            )
        return Response(serialise(data))

    @extend_schema(
        operation_id="TeacherMessageThreadSend",
        summary="Send message",
        description="Sends a message to another portal user.",
        tags=["Teacher"],
        request=_MessageSendRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        if not table_exists("portal_message"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        receiver = request.data.get("receiver") if isinstance(request.data, dict) else None
        message_text = request.data.get("message_text") if isinstance(request.data, dict) else None
        if not receiver or not message_text:
            return Response({"detail": "receiver and message_text are required."}, status=400)
        try:
            receiver = int(receiver)
        except (TypeError, ValueError):
            return Response({"detail": "receiver must be a user id (integer)."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_message (sender_id, receiver_id, message_text) VALUES (%s,%s,%s) RETURNING id", [request.user.id, receiver, message_text])
            mid = cursor.fetchone()[0]
        return Response({"id": mid, "detail": "Message sent."}, status=201)


class MyContactsView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherMyContacts",
        summary="My contacts",
        description="Returns up to 50 portal users the teacher can message, excluding the teacher themself.",
        tags=["Teacher"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_ContactItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_user_profile"):
            return Response([])
        data = rows("SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name, p.user_type AS role FROM auth_user u JOIN portal_user_profile p ON p.user_id=u.id WHERE u.id<>%s ORDER BY name LIMIT 50", [request.user.id])
        return Response(serialise(data))


class NoticeListView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherNoticeList",
        summary="Published notices",
        description="Returns published public notices from the CMS.",
        tags=["Teacher"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_NoticeItem),
        },
    )
    def get(self, request):
        if table_exists("cms_newspost"):
            data = rows("SELECT id, title, content, published_date AS created_at, NULL AS file_attachment_url, false AS is_pinned FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC")
            return Response(serialise(data))
        return Response([])


class LeaveView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherLeaveList",
        summary="My leave requests",
        description="Returns the leave requests submitted by the teacher, newest first.",
        tags=["Teacher"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_TeacherLeaveItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        return Response(serialise(rows("SELECT id, leave_type, start_date, end_date, reason, status FROM portal_leave WHERE user_id=%s ORDER BY start_date DESC", [request.user.id])))

    @extend_schema(
        operation_id="TeacherLeaveCreate",
        summary="Submit a leave request",
        description="Submits a new leave request on behalf of the teacher.",
        tags=["Teacher"],
        request=LeaveRequestSerializer,
        responses={**ERROR_RESPONSES, 200: LeaveSubmitResponseSerializer},
        examples=[_LEAVE_REQUEST_EXAMPLE],
    )
    def post(self, request):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        err, start, end = validate_leave_dates(request.data)
        if err:
            return err
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_leave (user_id, leave_type, start_date, end_date, reason) VALUES (%s,%s,%s,%s,%s) RETURNING id", [request.user.id, request.data.get("leave_type"), start, end, request.data.get("reason")])
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Leave request submitted."}, status=201)


class TeacherTimetableView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherTimetable",
        summary="My timetable",
        description="Returns the full weekly timetable for the teacher.",
        tags=["Timetable"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_TimetableItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_timetable"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.day_of_week, t.start_time, t.end_time, c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_timetable t JOIN portal_class c ON c.id=t.class_id JOIN portal_subject s ON s.id=t.subject_id
            WHERE t.teacher_id=%s ORDER BY t.day_of_week, t.start_time
            """, [request.user.id]
        )
        return Response(serialise(data))


class TeacherDocumentsView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherDocuments",
        summary="My documents",
        description="Returns the teaching documents uploaded by the teacher.",
        tags=["Teacher"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_DocumentItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_teacher_document"):
            return Response([])
        return Response(serialise(rows("SELECT id, content_type, title, resource_url FROM portal_teacher_document WHERE teacher_id=%s ORDER BY created_at DESC", [request.user.id])))

    @extend_schema(
        operation_id="TeacherDocumentsCreate",
        summary="Upload document",
        description="Registers a teaching document (PDF, worksheet, etc.) for a class and subject.",
        tags=["Teacher"],
        request=_DocumentCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        if not table_exists("portal_teacher_document"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_teacher_document (teacher_id, class_id, subject_id, content_type, title, resource_url) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id", [request.user.id, class_id, subject_id, data.get("content_type"), data.get("title"), data.get("resource_url")])
            did = cursor.fetchone()[0]
        return Response({"id": did, "detail": "Document uploaded."})


class TeacherAdmissionsReviewView(TeacherMixin, APIView):
    """
    Teacher views admission enquiries in Verification/Screening,
    provides interview remarks, counselling feedback, and submits recommendations.
    """
    @extend_schema(
        operation_id="TeacherAdmissionsReview",
        summary="Admission enquiries for review",
        description="Returns admission enquiries in Verification or Screening stage awaiting a teacher interview recommendation.",
        tags=["Admissions"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_AdmissionEnquiryItem),
        },
    )
    def get(self, request):
        from apps.admissions.models import AdmissionEnquiry
        qs = AdmissionEnquiry.objects.filter(status__in=["Verification", "Screening"]).order_by("-submitted_at")
        data = list(qs.values(
            "registration_number", "applicant_name", "date_of_birth", "gender", "target_class",
            "parent_name", "parent_phone", "parent_email", "scholarship_applied", "status",
            "rejection_reason", "submitted_at"
        ))
        return Response(serialise(data))

    @extend_schema(
        operation_id="TeacherAdmissionsReviewSubmit",
        summary="Submit interview recommendation",
        description="Records interview feedback and advances or rejects an admission enquiry based on the teacher's recommendation.",
        tags=["Admissions"],
        request=_AdmissionReviewRequest,
        responses={
            **ERROR_RESPONSES,
            200: _AdmissionReviewResponse,
            404: DetailErrorSerializer,
        },
    )
    def post(self, request):
        from apps.admissions.models import AdmissionEnquiry
        from .admin_views import NEXT_STATUS
        reg_num = request.data.get("registration_number")
        action = request.data.get("action")  # "recommend_advance" or "recommend_reject"
        remarks = request.data.get("remarks", "").strip()

        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=reg_num)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Enquiry not found."}, status=404)

        if enquiry.status not in ["Verification", "Screening"]:
            return Response({"detail": "Enquiry is not in Verification or Screening stage."}, status=400)

        # Store remarks in rejection_reason field
        if remarks:
            enquiry.rejection_reason = f"[Teacher Interview Feedback]: {remarks}"

        if action == "recommend_reject":
            enquiry.status = "Rejected"
            enquiry.reviewed_by = f"Teacher: {request.user.username}"
            enquiry.save()
            return Response({"detail": "Application rejected based on interview recommendation.", "status": "Rejected"})

        elif action == "recommend_advance":
            nxt = NEXT_STATUS.get(enquiry.status)
            if not nxt:
                return Response({"detail": "Cannot advance status."}, status=400)
            enquiry.status = nxt
            enquiry.reviewed_by = f"Teacher: {request.user.username}"
            enquiry.save()
            return Response({"detail": f"Application advanced to {nxt} based on interview recommendation.", "status": nxt})

        return Response({"detail": "Invalid action."}, status=400)


class AssignmentScanPDFView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherAssignmentScanPdf",
        summary="Scan PDF for questions",
        description="Uploads a PDF, extracts multiple-choice questions and returns them for use in an MCQ assignment.",
        tags=["Academic"],
        request=_PdfScanRequest,
        responses={
            **ERROR_RESPONSES,
            200: _PdfScanResponse,
            400: ValidationErrorSerializer,
        },
    )
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "No file uploaded."}, status=400)

        # 1. Extract text using pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(uploaded_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            return Response({"detail": f"Failed to read PDF file: {str(e)}"}, status=400)

        if not text.strip():
            return Response({"detail": "The PDF file is empty or contains no extractable text."}, status=400)

        # 2. Try parsing with Gemini if API key is present
        import os
        gemini_key = os.environ.get("GEMINI_API_KEY")
        questions = None

        if gemini_key:
            try:
                import urllib.request
                import json
                
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                
                prompt = (
                    "You are an expert assessment parser. Extract multiple-choice questions from the following text. "
                    "Return a JSON object with a single root key 'questions' containing an array of objects. "
                    "Each question object MUST contain the following properties:\n"
                    "1. 'question_text' (string): The text of the question.\n"
                    "2. 'options' (array of exactly 4 strings): The options/choices.\n"
                    "3. 'correct_answer' (string): The correct option value (must match one of the options exactly).\n"
                    "If correct answers are not explicitly defined in the text, determine the correct answer yourself. "
                    "Format the response strictly as valid JSON matching the specified schema. Output NO markdown formatting or text besides the raw JSON.\n\n"
                    f"Text to parse:\n{text}"
                )
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                
                with urllib.request.urlopen(req, timeout=25) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    content = res_body["candidates"][0]["content"]["parts"][0]["text"]
                    
                    content_clean = content.strip()
                    if content_clean.startswith("```json"):
                        content_clean = content_clean[7:]
                    if content_clean.endswith("```"):
                        content_clean = content_clean[:-3]
                    content_clean = content_clean.strip()
                    
                    parsed = json.loads(content_clean)
                    if "questions" in parsed and isinstance(parsed["questions"], list):
                        questions = parsed["questions"]
            except Exception as e:
                logger.exception("Gemini parsing failed, falling back to rule-based parser. Error: %s", e)

        # 3. Fallback to rule-based parsing if Gemini wasn't used or failed
        if not questions:
            questions = self.parse_questions_fallback(text)

        return Response({"questions": questions})

    def parse_questions_fallback(self, text):
        import re
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        questions = []
        current_q = None
        
        q_re = re.compile(r'^(?:Q(?:uestion)?\s*\d+[\.:\)]|\d+[\.:\)])\s*(.*)', re.IGNORECASE)
        opt_re = re.compile(r'^\s*[\(\[]?([A-Da-d])[\)\]\.]?\s+(.*)')
        ans_re = re.compile(r'^\s*(?:Correct\s+Answer|Correct\s+Option|Correct|Answer|Ans|Option)\s*[:\.-]?\s*([A-Da-d]|\S+)', re.IGNORECASE)

        for line in lines:
            q_match = q_re.match(line)
            if q_match:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "question_text": q_match.group(1).strip(),
                    "options": ["", "", "", ""],
                    "correct_answer": ""
                }
                continue

            if not current_q:
                continue

            opt_match = opt_re.match(line)
            if opt_match:
                letter = opt_match.group(1).upper()
                opt_text = opt_match.group(2).strip()
                idx = ord(letter) - ord('A')
                if 0 <= idx < 4:
                    current_q["options"][idx] = opt_text
                continue

            ans_match = ans_re.match(line)
            if ans_match:
                ans_val = ans_match.group(1).strip().upper()
                if len(ans_val) == 1 and 'A' <= ans_val <= 'D':
                    idx = ord(ans_val) - ord('A')
                    current_q["correct_answer"] = current_q["options"][idx]
                else:
                    current_q["correct_answer"] = ans_match.group(1).strip()
                continue

            if not any(current_q["options"]):
                current_q["question_text"] += " " + line
            else:
                last_idx = -1
                for idx in range(3, -1, -1):
                    if current_q["options"][idx]:
                        last_idx = idx
                        break
                if last_idx != -1:
                    current_q["options"][last_idx] += " " + line

        if current_q:
            questions.append(current_q)

        cleaned_questions = []
        for q in questions:
            if not q["question_text"].strip():
                continue
            
            for idx in range(4):
                if not q["options"][idx].strip():
                    q["options"][idx] = f"Option {chr(65+idx)}"
                    
            o_clean = [o.strip().lower() for o in q["options"]]
            ans_clean = q["correct_answer"].strip().lower()
            
            if ans_clean in o_clean:
                q["correct_answer"] = q["options"][o_clean.index(ans_clean)]
        return cleaned_questions


class TeacherLmsCoursesView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherLmsCourses",
        summary="LMS courses",
        description="Returns the courses for the teacher's allocated subjects, creating them on demand if missing.",
        tags=["LMS"],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_LmsCourseItem),
        },
    )
    def get(self, request):
        if not table_exists("portal_academic_allocation") or not table_exists("portal_course"):
            return Response([])
        
        # Auto-create courses for any allocated subjects if they do not exist
        allocations = rows(
            """
            SELECT aa.class_id, aa.subject_id, c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_academic_allocation aa
            JOIN portal_class c ON c.id = aa.class_id
            JOIN portal_subject s ON s.id = aa.subject_id
            WHERE aa.teacher_id = %s
            """, [request.user.id]
        )
        for a in allocations:
            exist = row("SELECT id FROM portal_course WHERE class_id=%s AND subject_id=%s", [a["class_id"], a["subject_id"]])
            if not exist:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_course (class_id, subject_id, title, description) VALUES (%s,%s,%s,%s)",
                        [a["class_id"], a["subject_id"], f"{a['subject_name']} - {a['class_name']}", f"Course materials for {a['subject_name']}"]
                    )

        # Return all allocated courses
        courses = rows(
            """
            SELECT c.id, c.title, c.description, cl.name || '-' || cl.section AS class_name, s.name AS subject_name,
                   cl.id AS class_id, s.id AS subject_id
            FROM portal_course c
            JOIN portal_class cl ON cl.id = c.class_id
            JOIN portal_subject s ON s.id = c.subject_id
            JOIN portal_academic_allocation aa ON aa.class_id = c.class_id AND aa.subject_id = c.subject_id
            WHERE aa.teacher_id = %s ORDER BY cl.name, cl.section, s.name
            """,
            [request.user.id]
        )
        return Response(serialise(courses))


class TeacherLmsChaptersView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherLmsChapters",
        summary="List chapters",
        description="Returns the chapters of an LMS course.",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="course_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_LmsChapterItem),
        },
    )
    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id or not table_exists("portal_chapter"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, sort_order FROM portal_chapter WHERE course_id=%s ORDER BY sort_order, id", [course_id])))

    @extend_schema(
        operation_id="TeacherLmsChaptersCreate",
        summary="Create chapter",
        description="Creates a chapter in a course (optionally resolving or creating the course from class + subject).",
        tags=["LMS"],
        request=_ChapterCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        d = request.data
        course_id = d.get("course_id")
        class_id = d.get("class_id")
        subject_id = d.get("subject_id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        sort_order = d.get("sort_order", 0)
        pdf_url = d.get("pdf_url")

        if not course_id and class_id and subject_id:
            # Find course
            exist = row("SELECT id FROM portal_course WHERE class_id=%s AND subject_id=%s", [class_id, subject_id])
            if exist:
                course_id = exist["id"]
            else:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_course (class_id, subject_id, title) VALUES (%s,%s,%s) RETURNING id",
                        [class_id, subject_id, "Subject Course"]
                    )
                    course_id = cursor.fetchone()[0]

        if not course_id or not title:
            return Response({"detail": "course_id (or class_id + subject_id) and title are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_chapter (course_id, title, description, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                [course_id, title, description, sort_order]
            )
            cid = cursor.fetchone()[0]

            if pdf_url:
                cursor.execute(
                    """
                    INSERT INTO portal_course_content (course_id, chapter_id, content_type, title, resource_url, description)
                    VALUES (%s,%s,'PDF',%s,%s,'Chapter syllabus/intro document')
                    """,
                    [course_id, cid, f"{title} PDF Notes", pdf_url]
                )

        return Response({"id": cid, "detail": "Chapter created."})

    @extend_schema(
        operation_id="TeacherLmsChaptersUpdate",
        summary="Update chapter",
        description="Updates a chapter's title, description and optional PDF link.",
        tags=["LMS"],
        request=_ChapterUpdateRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def put(self, request):
        d = request.data
        cid = d.get("id") or request.query_params.get("id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        pdf_url = d.get("pdf_url")

        if not cid or not title:
            return Response({"detail": "id and title are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_chapter SET title=%s, description=%s WHERE id=%s",
                [title, description, cid]
            )
            if pdf_url:
                # Update chapter resource if it exists, otherwise create it
                exist = row("SELECT id FROM portal_course_content WHERE chapter_id=%s AND lesson_id IS NULL", [cid])
                if exist:
                    cursor.execute(
                        "UPDATE portal_course_content SET resource_url=%s, title=%s WHERE id=%s",
                        [pdf_url, f"{title} PDF Notes", exist["id"]]
                    )
                else:
                    # Fetch course_id first
                    ch = row("SELECT course_id FROM portal_chapter WHERE id=%s", [cid])
                    cursor.execute(
                        """
                        INSERT INTO portal_course_content (course_id, chapter_id, content_type, title, resource_url, description)
                        VALUES (%s,%s,'PDF',%s,%s,'Chapter syllabus/intro document')
                        """,
                        [ch["course_id"], cid, f"{title} PDF Notes", pdf_url]
                    )
        return Response({"detail": "Chapter updated."})

    @extend_schema(
        operation_id="TeacherLmsChaptersDelete",
        summary="Delete chapter",
        description="Deletes a chapter by its id (passed as a query parameter).",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def delete(self, request):
        chapter_id = request.query_params.get("id")
        if not chapter_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_chapter WHERE id=%s", [chapter_id])
        return Response({"detail": "Chapter deleted."})


class TeacherLmsLessonsView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherLmsLessons",
        summary="List lessons",
        description="Returns the lessons of a chapter.",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="chapter_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_LmsLessonItem),
        },
    )
    def get(self, request):
        chapter_id = request.query_params.get("chapter_id")
        if not chapter_id or not table_exists("portal_lesson"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, sort_order FROM portal_lesson WHERE chapter_id=%s ORDER BY sort_order, id", [chapter_id])))

    @extend_schema(
        operation_id="TeacherLmsLessonsCreate",
        summary="Create lesson",
        description="Creates a lesson inside a chapter.",
        tags=["LMS"],
        request=_LessonCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        d = request.data
        chapter_id = d.get("chapter_id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        sort_order = d.get("sort_order", 0)
        if not chapter_id or not title:
            return Response({"detail": "chapter_id and title are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_lesson (chapter_id, title, description, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                [chapter_id, title, description, sort_order]
            )
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Lesson created."})

    @extend_schema(
        operation_id="TeacherLmsLessonsUpdate",
        summary="Update lesson",
        description="Updates a lesson's title and description.",
        tags=["LMS"],
        request=_LessonUpdateRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def put(self, request):
        d = request.data
        lid = d.get("id") or request.query_params.get("id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        if not lid or not title:
            return Response({"detail": "id and title are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_lesson SET title=%s, description=%s WHERE id=%s",
                [title, description, lid]
            )
        return Response({"detail": "Lesson updated."})

    @extend_schema(
        operation_id="TeacherLmsLessonsDelete",
        summary="Delete lesson",
        description="Deletes a lesson by its id (passed as a query parameter).",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def delete(self, request):
        lesson_id = request.query_params.get("id")
        if not lesson_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_lesson WHERE id=%s", [lesson_id])
        return Response({"detail": "Lesson deleted."})


class TeacherLmsResourcesView(TeacherMixin, APIView):
    @extend_schema(
        operation_id="TeacherLmsResources",
        summary="List lesson resources",
        description="Returns the course content resources attached to a lesson.",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="lesson_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={
            **ERROR_RESPONSES,
            200: serializers.ListSerializer(child=_LmsResourceItem),
        },
    )
    def get(self, request):
        lesson_id = request.query_params.get("lesson_id")
        if not lesson_id or not table_exists("portal_course_content"):
            return Response([])
        return Response(serialise(rows("SELECT id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from FROM portal_course_content WHERE lesson_id=%s ORDER BY sort_order, id", [lesson_id])))

    @extend_schema(
        operation_id="TeacherLmsResourcesCreate",
        summary="Upload lesson resource",
        description="Uploads a resource (PDF, Quiz, Assignment, Video or Link) to a lesson, creating linked quiz/assignment records as needed.",
        tags=["LMS"],
        request=_ResourceCreateRequest,
        responses={**ERROR_RESPONSES, 200: IdDetailResponseSerializer},
    )
    def post(self, request):
        d = request.data
        course_id = d.get("course_id")
        lesson_id = d.get("lesson_id")
        content_type = d.get("content_type", "PDF")
        title = d.get("title", "").strip()
        resource_url = d.get("resource_url", "").strip()
        description = d.get("description", "").strip()
        due_date = d.get("due_date")
        max_marks = d.get("max_marks")
        visible_from = d.get("visible_from")

        if not course_id or not lesson_id or not title:
            return Response({"detail": "course_id, lesson_id, and title are required."}, status=400)

        course = row("SELECT class_id, subject_id FROM portal_course WHERE id=%s", [course_id])
        if not course:
            return Response({"detail": "Course not found."}, status=404)

        quiz_id = None
        assignment_id = None

        with connection.cursor() as cursor:
            # Check if this resource is an Assignment
            if content_type == "Assignment":
                # Create a record in portal_assignment
                cursor.execute(
                    """
                    INSERT INTO portal_assignment (class_id, subject_id, teacher_id, title, description, file_url, max_marks, due_date)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """,
                    [course["class_id"], course["subject_id"], request.user.id, title, description or "Course Assignment", resource_url, max_marks or 100, due_date or "2026-12-31T23:59:59Z"]
                )
                assignment_id = cursor.fetchone()[0]

            # Check if this resource is a Quiz
            elif content_type == "Quiz":
                # Create a record in portal_quiz
                cursor.execute(
                    "INSERT INTO portal_quiz (course_id, title, duration_minutes, passing_score) VALUES (%s,%s,30,40) RETURNING id",
                    [course_id, title]
                )
                quiz_id = cursor.fetchone()[0]
                
                # Insert questions if provided
                questions = d.get("questions", [])
                for q in questions:
                    import json
                    cursor.execute(
                        "INSERT INTO portal_quiz_question (quiz_id, question_text, options, correct_answer) VALUES (%s,%s,%s,%s)",
                        [quiz_id, q.get("question_text"), json.dumps(q.get("options", [])), q.get("correct_answer")]
                    )

            # Insert into portal_course_content
            cursor.execute(
                """
                INSERT INTO portal_course_content (course_id, lesson_id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                [course_id, lesson_id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from or "now()"]
            )
            rid = cursor.fetchone()[0]

        return Response({"id": rid, "detail": "Resource uploaded and added to lesson."})

    @extend_schema(
        operation_id="TeacherLmsResourcesUpdate",
        summary="Update lesson resource",
        description="Updates a resource's title, url, description, due date and max marks, keeping linked assignments/quizzes in sync.",
        tags=["LMS"],
        request=_ResourceUpdateRequest,
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def put(self, request):
        d = request.data
        rid = d.get("id") or request.query_params.get("id")
        title = d.get("title", "").strip()
        resource_url = d.get("resource_url", "").strip()
        description = d.get("description", "").strip()
        due_date = d.get("due_date")
        max_marks = d.get("max_marks")
        
        if not rid or not title:
            return Response({"detail": "id and title are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE portal_course_content 
                SET title=%s, resource_url=COALESCE(NULLIF(%s, ''), resource_url), 
                    description=%s, due_date=%s, max_marks=%s
                WHERE id=%s
                """,
                [title, resource_url, description, due_date, max_marks, rid]
            )
            
            # If this is linked to an assignment, update assignment details too!
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [rid])
            if ref and ref.get("assignment_id"):
                cursor.execute(
                    """
                    UPDATE portal_assignment 
                    SET title=%s, description=%s, file_url=COALESCE(NULLIF(%s, ''), file_url), 
                        max_marks=%s, due_date=%s
                    WHERE id=%s
                    """,
                    [title, description, resource_url, max_marks or 100, due_date or "2026-12-31T23:59:59Z", ref["assignment_id"]]
                )
            if ref and ref.get("quiz_id"):
                cursor.execute(
                    "UPDATE portal_quiz SET title=%s WHERE id=%s",
                    [title, ref["quiz_id"]]
                )
        return Response({"detail": "Resource updated successfully."})

    @extend_schema(
        operation_id="TeacherLmsResourcesDelete",
        summary="Delete lesson resource",
        description="Deletes a resource by its id (passed as a query parameter), cleaning up any linked quiz or assignment.",
        tags=["LMS"],
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={**ERROR_RESPONSES, 200: _SuccessDetail},
    )
    def delete(self, request):
        resource_id = request.query_params.get("id")
        if not resource_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            # Fetch quiz_id/assignment_id if exists to clean up references
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [resource_id])
            cursor.execute("DELETE FROM portal_course_content WHERE id=%s", [resource_id])
            if ref:
                if ref.get("quiz_id"):
                    cursor.execute("DELETE FROM portal_quiz WHERE id=%s", [ref["quiz_id"]])
                if ref.get("assignment_id"):
                    cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [ref["assignment_id"]])
        return Response({"detail": "Resource deleted."})



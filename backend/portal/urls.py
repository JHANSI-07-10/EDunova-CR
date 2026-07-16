from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import auth_views, teacher_views, views, parent_views, admin_views, facilities_views, exam_extras_views, lms_extras_views

urlpatterns = [
    # Auth (credentials -> OTP -> JWT), shared by every portal
    path("auth/login/", auth_views.login_step1, name="login-step1"),
    path("auth/verify-otp/", auth_views.login_step2_verify_otp, name="login-verify-otp"),
    path("auth/resend-otp/", auth_views.resend_otp, name="resend-otp"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("upload/", views.FileUploadView.as_view(), name="file-upload"),

    # Student portal
    path("student/profile/", views.ProfileView.as_view()),
    path("student/ai-chat/", views.StudentAIChatView.as_view(), name="student-ai-chat"),
    path("student/dashboard/", views.DashboardView.as_view()),
    path("student/attendance/", views.AttendanceListView.as_view()),
    path("student/leaves/", views.StudentLeaveView.as_view()),
    path("student/timetable/", views.TimetableView.as_view()),
    path("student/homework/", views.HomeworkListView.as_view()),
    path("student/assignments/", views.AssignmentListView.as_view()),
    path("student/assignments/<int:assignment_id>/submit/", views.AssignmentSubmitView.as_view()),
    path("student/courses/", views.CourseListView.as_view()),
    path("student/quizzes/<int:quiz_id>/", views.QuizDetailView.as_view()),
    path("student/exams/", views.ExamListView.as_view()),
    path("student/exams/attempt/", exam_extras_views.StudentExamAttemptView.as_view()),
    path("student/exams/revaluation/", exam_extras_views.RevaluationRequestView.as_view()),
    path("student/supplementary/", exam_extras_views.SupplementaryRegistrationView.as_view()),
    path("student/academic-certificates/", exam_extras_views.AcademicCertificateView.as_view()),
    path("student/hall-tickets/", views.HallTicketListView.as_view()),
    path("student/results/", views.ResultListView.as_view()),
    path("student/fees/", views.FeesView.as_view()),
    path("student/fees/pay/", views.InitiatePaymentView.as_view()),
    path("student/library/", views.LibraryView.as_view()),
    path("student/library/search/", views.BookSearchView.as_view()),
    path("student/certificates/", views.CertificateListView.as_view()),
    path("student/announcements/", views.AnnouncementListView.as_view()),
    path("student/events/", views.EventListView.as_view()),
    path("student/hostel/", facilities_views.StudentHostelView.as_view()),
    path("student/transport/", facilities_views.StudentTransportView.as_view()),
    path("student/medical-records/", facilities_views.StudentMedicalView.as_view()),
    path("student/report-card/", exam_extras_views.StudentReportCardView.as_view()),
    path("lms/forum-topics/", lms_extras_views.ForumTopicListView.as_view()),
    path("lms/forum-topics/<int:topic_id>/", lms_extras_views.ForumTopicDetailView.as_view()),
    path("lms/forum-topics/<int:topic_id>/reply/", lms_extras_views.ForumPostView.as_view()),
    path("lms/notes/", lms_extras_views.DigitalNoteView.as_view()),
    path("lms/mark-complete/", lms_extras_views.MarkContentCompleteView.as_view()),
    path("lms/analytics/", lms_extras_views.CourseAnalyticsView.as_view()),
    path("student/ai-tutor/", lms_extras_views.StudentAITutorView.as_view()),

    # Teacher portal — mirrors the "Teacher Portal — Detailed Flowchart"
    path("teacher/profile/", teacher_views.TeacherProfileView.as_view()),
    path("teacher/dashboard/", teacher_views.TeacherDashboardView.as_view()),
    path("teacher/classes/", teacher_views.MyClassesView.as_view()),
    path("teacher/classes/<int:class_id>/roster/", teacher_views.ClassRosterView.as_view()),
    path("teacher/attendance/", teacher_views.AttendanceView.as_view()),
    path("teacher/homework/", teacher_views.HomeworkView.as_view()),
    path("teacher/assignments/", teacher_views.AssignmentView.as_view()),
    path("teacher/assignments/scan-pdf/", teacher_views.AssignmentScanPDFView.as_view()),
    path("teacher/assignments/<int:assignment_id>/", teacher_views.AssignmentDetailView.as_view()),
    path("teacher/assignments/<int:assignment_id>/submissions/", teacher_views.AssignmentSubmissionsView.as_view()),
    path("teacher/assignments/<int:assignment_id>/submissions/<int:submission_id>/", teacher_views.AssignmentSubmissionsView.as_view()),
    path("teacher/question-bank/", teacher_views.QuestionBankView.as_view()),
    path("teacher/question-bank/<int:question_id>/", teacher_views.QuestionBankView.as_view()),
    path("teacher/exams/", teacher_views.TeacherExamView.as_view()),
    path("teacher/marks-entry/", teacher_views.MarksEntryView.as_view()),
    path("teacher/performance/", teacher_views.PerformanceAnalyticsView.as_view()),
    path("teacher/question-papers/", teacher_views.QuestionPaperView.as_view()),
    path("teacher/invigilation-duty/", teacher_views.InvigilationDutyView.as_view()),
    path("teacher/revaluation/", exam_extras_views.RevaluationRequestView.as_view()),
    path("teacher/supplementary/", exam_extras_views.SupplementaryRegistrationView.as_view()),
    path("teacher/messages/", teacher_views.MessageThreadView.as_view()),
    path("teacher/contacts/", teacher_views.MyContactsView.as_view()),
    path("teacher/notices/", teacher_views.NoticeListView.as_view()),
    path("teacher/leaves/", teacher_views.LeaveView.as_view()),
    path("teacher/admissions-review/", teacher_views.TeacherAdmissionsReviewView.as_view()),
    path("teacher/timetable/", teacher_views.TeacherTimetableView.as_view()),
    path("teacher/documents/", teacher_views.TeacherDocumentsView.as_view()),
    path("teacher/lms/courses/", teacher_views.TeacherLmsCoursesView.as_view()),
    path("teacher/lms/chapters/", teacher_views.TeacherLmsChaptersView.as_view()),
    path("teacher/lms/lessons/", teacher_views.TeacherLmsLessonsView.as_view()),
    path("teacher/lms/resources/", teacher_views.TeacherLmsResourcesView.as_view()),
    path("teacher/lms/ai-usage/", lms_extras_views.TeacherAIUsageView.as_view()),

    # Parent portal
    path("parent/profile/", parent_views.ParentProfileView.as_view()),
    path("parent/dashboard/", parent_views.ParentDashboardView.as_view()),
    path("parent/children/", parent_views.ChildrenListView.as_view()),
    path("parent/attendance/", parent_views.ChildAttendanceView.as_view()),
    path("parent/homework/", parent_views.ChildHomeworkView.as_view()),
    path("parent/results/", parent_views.ChildResultsView.as_view()),
    path("parent/exams/revaluation/", exam_extras_views.RevaluationRequestView.as_view()),
    path("parent/exams/certificates/", exam_extras_views.AcademicCertificateView.as_view()),
    path("parent/fees/", parent_views.ChildFeesView.as_view()),
    path("parent/fees/pay/", parent_views.ChildFeesPayView.as_view()),
    path("parent/documents/", parent_views.ChildDocumentsView.as_view()),
    path("parent/transport/", parent_views.ChildTransportView.as_view()),
    path("parent/hostel/", facilities_views.ChildHostelView.as_view()),
    path("parent/teachers/", parent_views.TeacherContactsView.as_view()),
    path("parent/messages/", parent_views.MessageThreadView.as_view()),
    path("parent/notifications/", parent_views.NotificationListView.as_view()),
    path("parent/leaves/", parent_views.LeaveRequestView.as_view()),
    path("parent/ptm/", parent_views.PtmBookingView.as_view()),
    path("parent/feedback/", parent_views.FeedbackView.as_view()),
    path("parent/lms/progress/", parent_views.ParentLmsProgressView.as_view()),

    # Admin portal
    path("admin-portal/dashboard/", admin_views.AdminDashboardView.as_view()),
    path("admin-portal/admissions/", admin_views.AdmissionListView.as_view()),
    path("admin-portal/admissions/<str:registration_number>/action/", admin_views.AdmissionActionView.as_view()),
    path("admin-portal/users/", admin_views.UserListView.as_view()),
    path("admin-portal/users/<int:user_id>/", admin_views.UserDetailView.as_view()),
    path("admin-portal/users/<int:user_id>/reset-password/", admin_views.UserDetailView.as_view()),
    path("admin-portal/roles/", admin_views.RolesView.as_view()),
    path("admin-portal/classes/", admin_views.ClassView.as_view()),
    path("admin-portal/timetable/", admin_views.AdminTimetableView.as_view()),
    path("admin-portal/timetable/publish/", admin_views.AdminTimetablePublishView.as_view()),
    path("admin-portal/enrollments/", admin_views.ClassEnrollmentView.as_view()),
    path("admin-portal/class-teachers/", admin_views.ClassTeacherAssignView.as_view()),
    path("admin-portal/subjects/", admin_views.SubjectView.as_view()),
    # Transport — Vehicles
    path("admin-portal/vehicles/", admin_views.VehicleView.as_view()),
    # Transport — Routes
    path("admin-portal/routes/", admin_views.RouteView.as_view()),
    # Transport — Student Allocations
    path("admin-portal/transport-allocations/", admin_views.TransportAllocationView.as_view()),
    # Transport — Drivers
    path("admin-portal/transport/drivers/", admin_views.DriverView.as_view()),
    # Transport — Attendants
    path("admin-portal/transport/attendants/", admin_views.AttendantView.as_view()),
    # Transport — Pickup / Drop Points
    path("admin-portal/transport/pickup-points/", admin_views.PickupPointView.as_view()),
    # Transport — Passes
    path("admin-portal/transport/passes/", admin_views.TransportPassView.as_view()),
    # Transport — Trip Logs
    path("admin-portal/transport/trips/", admin_views.TripLogView.as_view()),
    # Transport — Notifications / Alerts
    path("admin-portal/transport/notifications/", admin_views.TransportNotificationView.as_view()),
    # Transport — Settings
    path("admin-portal/transport/settings/", admin_views.TransportSettingsView.as_view()),
    # Transport — Reports
    path("admin-portal/transport/reports/", admin_views.TransportReportsView.as_view()),
    # Transport — Live Fleet Map (latest GPS ping per vehicle)
    path("admin-portal/transport/live-map/", admin_views.LiveBusMapView.as_view()),
    # Transport — Transport Fees
    path("admin-portal/transport/fees/", admin_views.TransportFeeView.as_view()),
    path("admin-portal/fee-structures/", admin_views.FeeStructureView.as_view()),
    path("admin-portal/payments/", admin_views.PaymentListView.as_view()),
    path("admin-portal/library/books/", admin_views.LibraryBookView.as_view()),
    path("admin-portal/library/issue/", admin_views.LibraryIssueView.as_view()),
    path("admin-portal/library/return/<int:transaction_id>/", admin_views.LibraryReturnView.as_view()),
    path("admin-portal/notices/", admin_views.NoticeBroadcastView.as_view()),
    path("admin-portal/leaves/", admin_views.LeaveApprovalListView.as_view()),
    path("admin-portal/leaves/<int:leave_id>/decide/", admin_views.LeaveApprovalListView.as_view()),
    path("admin-portal/reports/", admin_views.ReportsView.as_view()),
    path("admin-portal/audit-log/", admin_views.AuditLogListView.as_view()),
    path("admin-portal/backup/export/", admin_views.BackupExportView.as_view()),
    path("admin-portal/lms/analytics/", admin_views.AdminLmsAnalyticsView.as_view()),
    path("admin-portal/lms/ai-usage/", lms_extras_views.AdminAIUsageView.as_view()),

    # Hostel module
    path("admin-portal/hostels/", facilities_views.HostelView.as_view()),
    path("admin-portal/rooms/", facilities_views.RoomView.as_view()),
    path("admin-portal/hostel-allocations/", facilities_views.HostelAllocationView.as_view()),
    path("admin-portal/hostel-allocations/<int:allocation_id>/vacate/", facilities_views.HostelVacateView.as_view()),
    path("hostels/applications/", facilities_views.HostelApplicationView.as_view()),
    path("hostels/leaves/", facilities_views.HostelLeaveView.as_view()),
    path("hostels/complaints/", facilities_views.HostelComplaintView.as_view()),
    path("hostels/fees/", facilities_views.HostelFeeView.as_view()),
    path("hostels/reports/", facilities_views.HostelReportsView.as_view()),

    # Inventory module
    path("admin-portal/inventory/", facilities_views.InventoryView.as_view()),
    path("admin-portal/payroll/", facilities_views.PayrollView.as_view()),

    # Visitor Management
    path("admin-portal/visitors/", facilities_views.VisitorLogView.as_view()),
    path("admin-portal/visitors/<int:visitor_id>/checkout/", facilities_views.VisitorCheckoutView.as_view()),

    # Alumni Registry
    path("admin-portal/alumni/", facilities_views.AlumniView.as_view()),

    # Medical Records
    path("admin-portal/medical-logs/", facilities_views.MedicalLogView.as_view()),

    # Exam extras: rank lists + report cards
    path("admin-portal/rank-list/", exam_extras_views.RankListView.as_view()),
    path("admin-portal/rank-list/overall/", exam_extras_views.OverallRankListView.as_view()),
    path("admin-portal/report-card/", exam_extras_views.ReportCardView.as_view()),

    # Campus & Visit Locations Module
    path("campuses/", views.PublicCampusView.as_view()),
    path("campuses/visit/", views.PublicCampusVisitView.as_view()),
    path("campuses/nearest/", views.NearestCampusView.as_view()),
    path("admin-portal/campuses/", admin_views.AdminCampusView.as_view()),
    path("admin-portal/campuses/<int:campus_id>/", admin_views.AdminCampusDetailView.as_view()),
    path("admin-portal/campuses/visits/", admin_views.AdminCampusVisitsView.as_view()),
    path("admin-portal/campuses/visits/<int:visit_id>/status/", admin_views.AdminCampusVisitsView.as_view()),
    path("cms/scholarships/", views.PublicScholarshipsView.as_view()),

    # Admin exams management & publication
    path("admin-portal/exams/", exam_extras_views.AdminExamActionView.as_view()),
    path("admin-portal/exams/<int:exam_id>/action/", exam_extras_views.AdminExamActionView.as_view()),
    path("admin-portal/exams/seating/", exam_extras_views.TimetableSeatingConflictView.as_view()),
    path("admin-portal/exams/revaluation/", exam_extras_views.RevaluationRequestView.as_view()),
    path("admin-portal/exams/supplementary/", exam_extras_views.SupplementaryRegistrationView.as_view()),
    path("admin-portal/exams/certificates/", exam_extras_views.AcademicCertificateView.as_view()),
]


# Scholarships
from django.urls import path
from . import scholarship_views
urlpatterns += [
    path('student/scholarships/', scholarship_views.ScholarshipStudentApplicationView.as_view()),
    path('student/scholarships/renew/', scholarship_views.ScholarshipRenewalView.as_view()),
    path('admin-portal/scholarships/', scholarship_views.ScholarshipAdminActionView.as_view()),
    path('admin-portal/scholarships/renew/', scholarship_views.ScholarshipRenewalView.as_view()),
    path('parent/scholarships/', scholarship_views.ScholarshipParentView.as_view()),
]

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from apps.cms.models import (
    SchoolSettings, AcademicProgram, Department, SchoolStat, WhyChooseItem,
    TechnologyPartner, CMSPage, FAQ, ScholarshipInfo, FacultyMember,
)


class Command(BaseCommand):
    help = "Seed the public portal with EduNova's actual requirements-doc content"

    def handle(self, *args, **options):
        SchoolSettings.objects.update_or_create(
            pk=1,
            defaults=dict(
                legal_name="EduNova Global Academy Private Limited",
                tagline="Inspiring Minds. Building Futures.",
                website_domain="www.edunovaacademy.edu.in",
                company_type="Private Limited Educational Institution",
                established_year=2015,
                admissions_open=True,
                admissions_academic_year="2026-2027",
            ),
        )

        campuses = [
            dict(name="Head Office (Dwarka)", address="EduNova Education Campus, Sector 21, Dwarka", city="New Delhi", state="Delhi", country="India", postal_code="110075", latitude=28.5921, longitude=77.0460, phone="+91-11-4567890", email="info@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in", office_hours="9:00 AM - 5:00 PM", is_headquarters=True),
            dict(name="Noida Campus", address="Plot No. 12, Sector 62", city="Noida", state="Uttar Pradesh", country="India", postal_code="201301", latitude=28.5355, longitude=77.3910, phone="+91-120-6543210", email="noida@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in/noida", office_hours="8:00 AM - 4:00 PM"),
            dict(name="Gurugram Campus", address="Sector 45, Near Huda City Centre", city="Gurugram", state="Haryana", country="India", postal_code="122003", latitude=28.4595, longitude=77.0266, phone="+91-124-7890123", email="gurugram@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in/gurugram", office_hours="8:00 AM - 4:00 PM"),
            dict(name="Faridabad Campus", address="Mathura Road, Sector 31", city="Faridabad", state="Haryana", country="India", postal_code="121003", latitude=28.4089, longitude=77.3178, phone="+91-129-4561230", email="faridabad@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in/faridabad", office_hours="8:00 AM - 4:00 PM"),
            dict(name="Jaipur Campus", address="Mansarovar, Shipra Path", city="Jaipur", state="Rajasthan", country="India", postal_code="302020", latitude=26.9124, longitude=75.7873, phone="+91-141-8904561", email="jaipur@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in/jaipur", office_hours="8:00 AM - 4:00 PM"),
            dict(name="Lucknow Campus", address="Gomti Nagar, Bypass Road", city="Lucknow", state="Uttar Pradesh", country="India", postal_code="226010", latitude=26.8467, longitude=80.9462, phone="+91-522-7890124", email="lucknow@edunovaacademy.edu.in", website="www.edunovaacademy.edu.in/lucknow", office_hours="8:00 AM - 4:00 PM"),
        ]
        for c in campuses:
            Campus.objects.update_or_create(name=c.pop("name"), defaults=c)

        programs = [
            "Pre Primary", "Middle School", "High School", "Senior Secondary",
            "Cambridge Curriculum", "CBSE", "International Programs",
            "STEM Education", "Skill Development",
        ]
        for i, name in enumerate(programs):
            AcademicProgram.objects.update_or_create(name=name, defaults={"sort_order": i})

        departments = [
            "Academic Affairs", "Admissions", "Student Services", "Transport",
            "Library", "Finance", "Accounts", "Human Resources",
            "IT Department", "Examination Cell", "Sports", "Hostel",
            "Medical Center", "Research", "Innovation Lab",
        ]
        for name in departments:
            Department.objects.get_or_create(name=name)

        stats = [
            ("Students", "6,500+"), ("Employees", "620+"), ("Teachers", "350+"),
            ("Smart Classrooms", "45+"), ("Science Labs", "18"),
            ("Computer Labs", "6"), ("Innovation Centers", "2"),
            ("Board Results", "98%"), ("Digital Campus", "100%"),
        ]
        for i, (label, value) in enumerate(stats):
            SchoolStat.objects.update_or_create(label=label, defaults={"value": value, "sort_order": i})

        why_choose = [
            "Smart Campus", "Digital Classrooms", "Experienced Faculty",
            "AI Learning Analytics", "Parent Mobile App", "Online Fee Payments",
            "Digital Attendance", "CBSE Curriculum", "Robotics Lab",
            "STEM Education", "Career Counseling", "24x7 Parent Support",
        ]
        for i, title in enumerate(why_choose):
            WhyChooseItem.objects.update_or_create(title=title, defaults={"sort_order": i})

        partners = [
            "Google Workspace", "Microsoft Education", "AWS Educate",
            "Cisco Networking Academy", "Intel Education",
            "Adobe Creative Cloud", "Oracle Academy", "Zoom", "Moodle",
            "OpenAI Education",
        ]
        for i, name in enumerate(partners):
            TechnologyPartner.objects.update_or_create(name=name, defaults={"sort_order": i})

        pages = {
            "about": ("About EduNova", (
                "EduNova Global Academy Private Limited is one of India's leading "
                "educational institutions offering holistic education through "
                "innovative teaching methodologies, digital transformation, and "
                "advanced academic management systems."
            )),
            "privacy-policy": ("Privacy Policy", "Privacy policy content goes here."),
            "terms": ("Terms & Conditions", "Terms & conditions content goes here."),
            "student-life": ("Student Life", "Student life content goes here."),
            "infrastructure": ("Infrastructure", "Infrastructure content goes here."),
            "facilities": ("Facilities", "Facilities content goes here."),
            "sports": ("Sports", "Sports content goes here."),
            "careers": ("Careers", "Careers content goes here."),
            "library": ("Library", "Public-facing library info goes here."),
            "transport": ("Transport", "Public-facing transport info goes here."),
            "hostel": ("Hostel", "Public-facing hostel info goes here."),
        }
        for slug, (title, content) in pages.items():
            CMSPage.objects.update_or_create(slug=slug, defaults={"title": title, "content_html": content})

        faqs = [
            ("What curricula does EduNova offer?", "We offer CBSE and Cambridge curricula across our campuses."),
            ("How do I apply for admission?", "Visit the Admissions page and complete the online registration form."),
            ("Does EduNova offer scholarships?", "Yes — see the Scholarships section on the Admissions page for eligibility."),
        ]
        for i, (q, a) in enumerate(faqs):
            FAQ.objects.update_or_create(question=q, defaults={"answer": a, "sort_order": i})

        ScholarshipInfo.objects.update_or_create(
            name="Merit Scholarship",
            defaults={
                "description": "Awarded to students with outstanding academic performance.",
                "eligibility": "Minimum 90% in previous academic year.",
                "coverage_percent": 50,
                "sort_order": 0,
            },
        )

        # Open positions for the Careers page (submit via /api/cms/jobs/<id>/apply/)
        from apps.cms.models import JobPosting

        open_jobs = [
            ("English Teacher", "Academic Affairs", "Responsible for classroom teaching, lesson planning, assessments, and student mentoring."),
            ("STEM Faculty", "Innovation Lab", "Guide students in STEM projects, robotics, practical learning, and innovation activities."),
            ("Admissions Counsellor", "Admissions", "Support admission enquiries, parent communication, documentation, and application follow-up."),
        ]
        for title, dept_name, desc in open_jobs:
            dept = Department.objects.filter(name__iexact=dept_name).first()
            JobPosting.objects.update_or_create(
                title=title,
                defaults={"department": dept, "description": desc, "is_open": True},
            )

        # --- Sample content below is placeholder — replace via /admin/ once
        # real testimonials/news/events/achievements are available. It
        # exists only so the homepage doesn't render empty during dev. ---
        from apps.cms.models import Testimonial, NewsPost, Event, Achievement
        import datetime

        sample_testimonials = [
            ("Anjali Rao", "Parent", "The digital attendance and fee payment features have made staying on top of my daughter's school life so much easier."),
            ("Rohit Sen", "Alumnus, Class of 2022", "The STEM and robotics programs at EduNova gave me a real head start before engineering college."),
            ("Priya Nair", "Student, Grade 11", "The AI tutor and online LMS help me revise at my own pace outside class hours."),
        ]
        for i, (name, role, msg) in enumerate(sample_testimonials):
            Testimonial.objects.update_or_create(author_name=name, defaults={"role": role, "message": msg, "sort_order": i})

        today = datetime.date.today()
        sample_news = [
            ("EduNova Wins State-Level Robotics Championship", "Our senior robotics team secured first place at the state-level competition, showcasing months of work in the Innovation Lab."),
            ("New AI-Powered Learning Analytics Dashboard Launched", "Parents and teachers can now track personalized learning progress through our new analytics dashboard."),
        ]
        for i, (title, content) in enumerate(sample_news):
            NewsPost.objects.update_or_create(
                slug=title.lower().replace(" ", "-")[:50],
                defaults={"title": title, "content": content, "published_date": today - datetime.timedelta(days=i * 5)},
            )

        sample_events = [
            ("Annual Sports Day", "Inter-house athletics and team sports competitions.", today + datetime.timedelta(days=20), "EduNova Sports Complex"),
            ("Science & Innovation Fair", "Student-led exhibitions from the Innovation Lab and Science Labs.", today + datetime.timedelta(days=35), "Main Auditorium"),
        ]
        for title, desc, edate, venue in sample_events:
            Event.objects.update_or_create(title=title, defaults={"description": desc, "event_date": edate, "venue": venue})

        sample_achievements = [
            ("98% Board Examination Results", "Highest-ever pass percentage achieved this academic year.", today - datetime.timedelta(days=60)),
            ("National Science Olympiad — 12 Medals", "Students brought home 12 medals across categories.", today - datetime.timedelta(days=90)),
        ]
        for title, desc, adate in sample_achievements:
            Achievement.objects.update_or_create(title=title, defaults={"description": desc, "achievement_date": adate})

        # --- Faculty directory (with photos) --------------------------------- #
        # Copies the person photos bundled in the frontend's public/images into
        # MEDIA_ROOT/faculty under clean names, then creates/updates the member
        # records. Skips gracefully if the images folder isn't present (CI).
        frontend_images = Path(settings.BASE_DIR).parent / "frontend" / "public" / "images"
        media_faculty = Path(settings.MEDIA_ROOT) / "faculty"
        media_faculty.mkdir(parents=True, exist_ok=True)

        # source glob -> clean destination filename in media/faculty/
        photo_map = [
            ("Man_in_Academic_Office_2K_202607130959.jpeg", "dr_ramesh_kumar.jpeg"),
            ("Woman_Principal_in_Office_202607130959.jpeg", "meera_nandakumar.jpeg"),
            ("*Nandita*", "nandita_iyer.jpeg"),
            ("Man_in_modern_office_202607130959.jpeg", "arjun_mehta.jpeg"),
            ("meera.jpeg", "kavya_reddy.jpeg"),
        ]
        copied = {}
        for pattern, dest in photo_map:
            matches = list(frontend_images.glob(pattern)) if frontend_images.is_dir() else []
            if matches:
                try:
                    shutil.copyfile(matches[0], media_faculty / dest)
                    copied[dest] = f"faculty/{dest}"
                except OSError:
                    pass

        faculty_seed = [
            {
                "first_name": "Dr. Ramesh", "last_name": "Kumar",
                "designation": "Principal", "photo": copied.get("dr_ramesh_kumar.jpeg", ""),
                "email": "ramesh.kumar@edunova.edu.in",
                "qualification_detail": "Ph.D. Educational Leadership, M.Ed.",
                "experience_years": 22,
                "specializations": "Leadership, Curriculum Design, Educational Technology",
                "achievements": "Awarded National Best Principal 2023 by the Indian Education Council.",
                "bio": "Dr. Kumar has led EduNova since 2015, championing digital classrooms and personalised learning at scale.",
            },
            {
                "first_name": "Meera", "last_name": "Nandakumar",
                "designation": "Vice Principal", "photo": copied.get("meera_nandakumar.jpeg", ""),
                "email": "meera.nandakumar@edunova.edu.in",
                "qualification_detail": "M.A. English, B.Ed.",
                "experience_years": 18,
                "specializations": "Academics, Teacher Mentoring, Student Counselling",
                "achievements": "Spearheaded EduNova's teacher-mentoring programme, improving board results by 12%.",
                "bio": "An educator at heart, Ms. Nandakumar oversees academics and mentors every new faculty member.",
            },
            {
                "first_name": "Nandita", "last_name": "Iyer",
                "designation": "Cambridge Coordinator", "photo": copied.get("nandita_iyer.jpeg", ""),
                "email": "nandita.iyer@edunova.edu.in",
                "qualification_detail": "M.Sc. Chemistry, PGCE (Cambridge)",
                "experience_years": 12,
                "specializations": "Cambridge Curriculum, International Programmes, STEM",
                "achievements": "Led the school's Cambridge accreditation process.",
                "bio": "Nandita coordinates the Cambridge and international streams, bringing global best practices to the classroom.",
            },
            {
                "first_name": "Arjun", "last_name": "Mehta",
                "designation": "Head of STEM & Robotics", "photo": copied.get("arjun_mehta.jpeg", ""),
                "email": "arjun.mehta@edunova.edu.in",
                "qualification_detail": "M.Tech Robotics & AI",
                "experience_years": 9,
                "specializations": "Robotics, Artificial Intelligence, Coding",
                "achievements": "Teams under Arjun have won 3 state-level robotics championships.",
                "bio": "Arjun runs the Innovation Lab and teaches students to build, code and compete with robots.",
            },
            {
                "first_name": "Kavya", "last_name": "Reddy",
                "designation": "Senior Mathematics Teacher", "photo": copied.get("kavya_reddy.jpeg", ""),
                "email": "kavya.reddy@edunova.edu.in",
                "qualification_detail": "M.Sc. Mathematics, B.Ed.",
                "experience_years": 8,
                "specializations": "Mathematics, Olympiad Coaching, Vedic Maths",
                "achievements": "Coached 40+ students to National Mathematics Olympiad medals.",
                "bio": "Kavya makes mathematics visual and intuitive, from foundational algebra to olympiad-level problem solving.",
            },
        ]
        for i, member in enumerate(faculty_seed):
            defaults = {k: v for k, v in member.items() if k not in ("first_name", "last_name")}
            defaults["sort_order"] = i
            defaults["is_active"] = True
            FacultyMember.objects.update_or_create(
                first_name=member["first_name"],
                last_name=member["last_name"],
                defaults=defaults,
            )

        self.stdout.write(self.style.SUCCESS("Public portal seed data loaded."))

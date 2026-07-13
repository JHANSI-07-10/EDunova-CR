from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from apps.cms.models import (
    SchoolSettings, AcademicProgram, Department, SchoolStat, WhyChooseItem,
    TechnologyPartner, CMSPage, FAQ, ScholarshipInfo,
)

# Real campus/event photos already checked into frontend/public — reused here
# so seeded News/Events have contextually relevant cover images instead of
# rendering blank.
FRONTEND_PUBLIC_DIR = Path(__file__).resolve().parents[5] / "frontend" / "public"


def _attach_image(instance, field_name, filename):
    """Copy an existing frontend/public asset into the model's ImageField."""
    src = FRONTEND_PUBLIC_DIR / filename
    if not src.exists() or getattr(instance, field_name):
        return
    with open(src, "rb") as f:
        getattr(instance, field_name).save(filename, File(f), save=True)


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
            ),
        )

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

        # --- Sample content below is placeholder — replace via /admin/ once
        # real testimonials/news/events/achievements are available. It
        # exists only so the homepage doesn't render empty during dev. ---
        from apps.cms.models import Testimonial, NewsPost, Event, Achievement, LeadershipMember
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
            ("EduNova Wins State-Level Robotics Championship", "Our senior robotics team secured first place at the state-level competition, showcasing months of work in the Innovation Lab.", "physics-3.jpeg"),
            ("New AI-Powered Learning Analytics Dashboard Launched", "Parents and teachers can now track personalized learning progress through our new analytics dashboard.", "student-1.jpeg"),
            ("Students Shine at the Academic Innovation Symposium", "EduNova students presented smart-city and sustainability projects to a panel of judges and industry guests.", "physics-1.jpeg"),
        ]
        for i, (title, content, image) in enumerate(sample_news):
            post, _ = NewsPost.objects.update_or_create(
                slug=title.lower().replace(" ", "-")[:50],
                defaults={"title": title, "content": content, "published_date": today - datetime.timedelta(days=i * 5)},
            )
            _attach_image(post, "cover_image", image)

        sample_events = [
            ("Annual Sports Day", "Inter-house athletics and team sports competitions.", today + datetime.timedelta(days=20), "EduNova Sports Complex", "trophy-1.jpeg"),
            ("Science & Innovation Fair", "Student-led exhibitions from the Innovation Lab and Science Labs.", today + datetime.timedelta(days=35), "Main Auditorium", "physics-2.jpeg"),
            ("Digital Library Open House", "A guided tour of the digital library's e-book collection and study spaces.", today + datetime.timedelta(days=10), "EduNova Digital Library", "library-1.jpeg"),
        ]
        for title, desc, edate, venue, image in sample_events:
            event, _ = Event.objects.update_or_create(title=title, defaults={"description": desc, "event_date": edate, "venue": venue})
            _attach_image(event, "cover_image", image)

        sample_achievements = [
            ("98% Board Examination Results", "Highest-ever pass percentage achieved this academic year.", today - datetime.timedelta(days=60), "trophy-1.jpeg"),
            ("National Science Olympiad — 12 Medals", "Students brought home 12 medals across categories.", today - datetime.timedelta(days=90), "trophy-2.jpeg"),
            ("STEM Innovation Recognition", "Students were recognized for robotics, science projects, creativity, and innovation-based learning.", today - datetime.timedelta(days=30), "physics-1.jpeg"),
        ]
        for title, desc, adate, image in sample_achievements:
            achievement, _ = Achievement.objects.update_or_create(title=title, defaults={"description": desc, "achievement_date": adate})
            _attach_image(achievement, "cover_image", image)

        sample_leadership = [
            ("Dr. Rajesh Malhotra", "Founder & Chairman", "Dedicated founder guiding EduNova Academy’s vision and long-term educational strategy.", "images/Man_in_Academic_Office_2K_202607130959.jpeg"),
            ("Anita Kapoor", "Managing Director", "Directs institutional operations, strategic partnerships, and administrative efficiency.", "fstudent.jpeg"),
            ("Dr. Meera Sharma", "Principal", "Academic leader focused on digital education, student excellence, innovation, and holistic learning.", "images/Woman_Principal_in_Office_202607130959.jpeg"),
            ("Arjun Verma", "Academic Director", "Leads curriculum planning, academic quality, assessment strategy, and teacher development programs.", "images/Man_in_modern_office_202607130959.jpeg"),
            ("Ms. Nandita Iyer", "Cambridge Coordinator", "Supports international curriculum delivery, inquiry-based learning, and global academic standards.", "images/Nandita_Iyer_Cambridge_Coordinat…_2K_202607130959.jpeg"),
            ("Nisha Bansal", "Vice Principal", "Supports school administration, discipline, student affairs, and co-curricular programs.", "fstudent.jpeg"),
            ("Rohan Khanna", "IT Director", "Drives digital transformation, campus ERP systems, online LMS, and technology integrations.", "student.jpeg"),
            ("Sanjay Mehta", "Finance Head", "Manages financial planning, fee management, accounting compliance, and resource allocation.", "student-1.jpeg"),
            ("Priya Arora", "Admissions Director", "Coordinates admissions processes, outreach, student registration, and parent onboarding.", "Campus.jpeg"),
        ]
        LeadershipMember.objects.all().delete()
        for i, (name, designation, bio, photo) in enumerate(sample_leadership):
            member, _ = LeadershipMember.objects.update_or_create(
                name=name,
                defaults={"designation": designation, "bio": bio, "sort_order": i}
            )
            _attach_image(member, "photo", photo)

        self.stdout.write(self.style.SUCCESS("Public portal seed data loaded."))

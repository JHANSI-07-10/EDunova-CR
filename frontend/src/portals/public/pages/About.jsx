import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Heart,
  TrendingUp,
  Award,
  Calendar,
  Globe,
  Settings,
  Shield,
  Layers,
  MapPin
} from 'lucide-react'
import FadeIn from '../../../components/FadeIn'

const LEADERSHIP = [
  { name: 'Dr. Rajesh Malhotra', role: 'Founder & Chairman' },
  { name: 'Anita Kapoor', role: 'Managing Director' },
  { name: 'Dr. Meera Sharma', role: 'Principal' },
  { name: 'Arjun Verma', role: 'Academic Director' },
  { name: 'Nisha Bansal', role: 'Vice Principal' },
  { name: 'Rohan Khanna', role: 'IT Director' },
  { name: 'Sanjay Mehta', role: 'Finance Head' },
  { name: 'Priya Arora', role: 'Admissions Director' },
]

const STATS = [
  { label: 'Students', value: '6,500+' },
  { label: 'Employees', value: '620+' },
  { label: 'Teachers', value: '350+' },
  { label: 'Smart Classrooms', value: '45+' },
  { label: 'Science Labs', value: '18' },
  { label: 'Computer Labs', value: '6' },
  { label: 'Innovation Centers', value: '2' },
  { label: 'Board Results', value: '98%' },
  { label: 'Digital Campus', value: '100%' },
  { label: 'School Buses', value: '150+' },
]

const CORE_VALUES = [
  'Academic Excellence', 'Integrity', 'Innovation', 'Discipline',
  'Leadership', 'Creativity', 'Respect', 'Responsibility',
  'Inclusiveness', 'Continuous Learning'
]

const WHY_CHOOSE = [
  'Smart Campus', 'Digital Classrooms', 'Experienced Faculty', 'AI Learning Analytics',
  'Parent Mobile App', 'Online Fee Payments', 'Digital Attendance', 'CBSE Curriculum',
  'Robotics Lab', 'STEM Education', 'Career Counseling', '24×7 Parent Support'
]

const TECH_PARTNERS = [
  'Google Workspace', 'Microsoft Education', 'AWS Educate', 'Cisco Networking Academy',
  'Intel Education', 'Adobe Creative Cloud', 'Oracle Academy', 'Zoom', 'Moodle', 'OpenAI Education'
]

const ALTERNATIVE_TAGLINES = [
  'Education Beyond Classrooms',
  'Excellence Through Innovation',
  'Empowering Every Learner',
  'Learn. Lead. Succeed.'
]

export default function About() {
  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white bg-primary">
        <img
          src="/Campus.jpeg"
          alt="EduNova Global Academy Campus"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/75 to-primary/40" />

        <div className="relative z-10 section py-32 max-w-7xl mx-auto px-6">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-xs mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur border border-white/20">
              <Sparkles size={13} /> About EduNova Global Academy
            </p>

            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Building Future-Ready Learners Through Excellence and Innovation
            </h1>

            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              EduNova Global Academy Private Limited is a premium educational institution integrating classroom learning with artificial intelligence, cloud technologies, and advanced ERP solutions.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/admissions" className="inline-flex items-center gap-2 bg-accent hover:bg-orange-600 text-white font-subheading font-bold px-6 py-3.5 rounded-xl shadow-xl transition-all duration-300">
                Start Application <ArrowRight size={18} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Overview Block */}
      <section className="section py-20 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <FadeIn>
          <div>
            <p className="font-subheading font-semibold text-secondary uppercase text-xs tracking-wider mb-2">
              Company Overview
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-6">
              EduNova Academy Private Limited
            </h2>
            <p className="font-body text-text-secondary leading-relaxed mb-5">
              EduNova Global Academy is a premium educational institution delivering world-class education through modern teaching methodologies, digital classrooms, and AI-powered academic management systems.
            </p>
            <p className="font-body text-text-secondary leading-relaxed mb-8">
              Established in <strong>2015</strong>, we combine academic excellence with technology-driven education. From our Headquarters at Noida and branches across Dwarka and NCR, we offer Pre-Primary, Primary, Middle, High, and Senior Secondary programs.
            </p>

            <h3 className="font-heading text-lg font-bold text-primary mb-3">Our Core Taglines:</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {ALTERNATIVE_TAGLINES.map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-text-primary font-medium bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="/EduNova.jpeg"
              alt="EduNova Classroom"
              className="w-full h-[450px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur rounded-2xl p-5 shadow-lg">
              <h3 className="font-heading font-bold text-primary text-lg mb-1">
                Headquarters
              </h3>
              <p className="font-body text-xs text-text-secondary flex items-center gap-1.5">
                <MapPin size={14} className="text-secondary" /> EduNova Education Campus, Sector 21, Dwarka, New Delhi - 110075, India
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Vision & Mission */}
      <section className="bg-slate-50 py-16">
        <div className="section max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          <FadeIn>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <ShieldCheck size={24} className="text-accent" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-primary mb-3">Our Mission</h3>
                <p className="font-body text-text-secondary leading-relaxed text-sm">
                  To provide high-quality education through modern digital learning environments that inspire creativity, leadership, innovation, and lifelong learning.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-5">
                  <GraduationCap size={24} className="text-secondary" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-primary mb-3">Our Vision</h3>
                <p className="font-body text-text-secondary leading-relaxed text-sm">
                  To become one of Asia's most innovative educational institutions by integrating technology, academic excellence, and holistic student development.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="font-subheading font-semibold text-accent uppercase text-xs tracking-wider mb-2">Values</p>
            <h2 className="font-heading text-3xl font-bold text-text-primary">Our Core Values</h2>
            <p className="font-body text-text-secondary text-sm mt-3">The behavioral foundation and principles that guide our institutional standards.</p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {CORE_VALUES.map((val, idx) => (
            <FadeIn key={val} delay={idx * 40}>
              <div className="bg-white border border-slate-100 hover:border-secondary rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-all duration-300">
                <p className="font-subheading font-bold text-sm text-primary">{val}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Why Choose EduNova & Technology Partners */}
      <section className="bg-slate-50 py-20">
        <div className="section max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
          {/* Why Choose */}
          <FadeIn>
            <div>
              <h3 className="font-heading text-2xl font-bold text-primary mb-6">Why Choose EduNova?</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {WHY_CHOOSE.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-text-primary font-medium bg-white rounded-xl p-3 border border-slate-200/50">
                    <CheckCircle2 size={16} className="text-secondary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Tech Partners */}
          <FadeIn delay={100}>
            <div>
              <h3 className="font-heading text-2xl font-bold text-primary mb-6">Technology Partners</h3>
              <p className="font-body text-xs text-text-secondary mb-6 leading-relaxed">
                We team up with the world's leading technology and educational providers to power our digital classrooms and learning portals.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TECH_PARTNERS.map((partner) => (
                  <div key={partner} className="bg-white border border-slate-200/40 rounded-xl p-4 flex items-center justify-center text-center shadow-xs">
                    <p className="font-subheading font-semibold text-xs text-slate-700">{partner}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Business Statistics Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-heading text-3xl font-bold text-text-primary">EduNova in Numbers</h2>
            <p className="font-body text-sm text-text-secondary mt-2">Key operational statistics of our digital school system.</p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {STATS.map((stat, idx) => (
            <FadeIn key={stat.label} delay={idx * 30}>
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
                <p className="font-numbers text-3xl font-extrabold text-secondary mb-1">{stat.value}</p>
                <p className="text-xs text-text-secondary font-medium">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Leadership Team Grid */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="font-subheading font-semibold text-secondary uppercase text-xs tracking-wider mb-2">Leadership</p>
              <h2 className="font-heading text-3xl font-bold text-text-primary">Our Leadership Team</h2>
              <p className="font-body text-sm text-text-secondary mt-2">Meet the administrative team guiding EduNova Global Academy.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {LEADERSHIP.map((member, idx) => (
              <FadeIn key={member.name} delay={idx * 40}>
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h4 className="font-heading font-bold text-base text-ink-primary">{member.name}</h4>
                  <p className="text-xs text-secondary font-semibold mt-1">{member.role}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Branch Campuses List */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-heading text-3xl font-bold text-text-primary">Our Branch Campuses</h2>
            <p className="font-body text-sm text-text-secondary mt-2">Delivering education across Noida, Gurugram, Faridabad, Jaipur, and Lucknow.</p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Noida', 'Gurugram', 'Faridabad', 'Jaipur', 'Lucknow'].map((campus, idx) => (
            <FadeIn key={campus} delay={idx * 50}>
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm hover:border-secondary transition-all">
                <Building2 size={24} className="text-secondary mx-auto mb-3" />
                <h4 className="font-heading font-bold text-sm text-primary">{campus} Campus</h4>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>
    </main>
  )
}
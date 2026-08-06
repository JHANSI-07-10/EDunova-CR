import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  BookOpen,
  Users,
  School,
  ArrowRight,
  BarChart3,
  Atom,
  Brain,
  Globe2,
  Sparkles,
  CheckCircle2,
  Download,
  ChevronRight,
} from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

const LEVEL_ICONS = {
  'Pre Primary': School,
  'Middle School': BookOpen,
  'High School': GraduationCap,
  'Senior Secondary': Brain,
  'Primary': School,
}

const LEVEL_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
]

export default function Academics() {
  const [stats, setStats] = useState(null)
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [statsRes, levelsRes, classesRes, subjectsRes] = await Promise.allSettled([
          client.get('/api/website/stats/'),
          client.get('/api/website/levels/'),
          client.get('/api/website/classes/'),
          client.get('/api/website/subjects/'),
        ])
        if (cancelled) return
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (levelsRes.status === 'fulfilled') setLevels(levelsRes.value.data)
        if (classesRes.status === 'fulfilled') setClasses(classesRes.value.data)
        if (subjectsRes.status === 'fulfilled') setSubjects(subjectsRes.value.data)
      } catch {
        // ignore — sections fall back gracefully
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const featuredClasses = classes.slice(0, 6)
  const featuredSubjects = subjects.slice(0, 6)

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img
          src="/images/student.jpeg"
          alt="EduNova academic programs"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/30" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <GraduationCap size={16} /> Academics at EduNova
            </p>

            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Academic Programs Designed for Future-Ready Learners
            </h1>

            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              From Pre-Primary to Senior Secondary, EduNova Global Academy offers
              comprehensive academic programs supported by experienced faculty,
              modern infrastructure, and digital learning systems.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/admissions" className="inline-flex items-center gap-2 btn-primary">
                Apply for Admission <ArrowRight size={18} />
              </Link>
              <Link
                to="/faculty"
                className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors"
              >
                Meet Our Faculty
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="bg-bg-light">
          <div className="section">
            <FadeIn>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Classes', value: stats.classes, icon: School, color: 'text-primary' },
                  { label: 'Subjects', value: stats.subjects, icon: BookOpen, color: 'text-secondary' },
                  { label: 'Faculty', value: stats.faculty, icon: Users, color: 'text-accent' },
                  { label: 'Students', value: stats.students, icon: GraduationCap, color: 'text-highlight' },
                ].map(({ label, value, icon: Icon, color }, index) => (
                  <FadeIn key={label} delay={index * 60}>
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center hover:shadow-lg transition-shadow">
                      <div className={`w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3`}>
                        <Icon size={24} className={color} />
                      </div>
                      <p className="font-numbers text-3xl md:text-4xl font-extrabold text-primary">
                        {value}
                      </p>
                      <p className="font-body text-sm text-text-secondary mt-1">{label}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Academic Levels */}
      {levels.length > 0 && (
        <section className="section">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-3">
                Academic Levels
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Programs for Every Stage of Learning
              </h2>
              <p className="font-body text-text-secondary leading-relaxed">
                Explore our academic levels designed to nurture students from
                foundational years through senior secondary education.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level, index) => {
              const Icon = LEVEL_ICONS[level.name] || BookOpen
              const gradient = LEVEL_COLORS[index % LEVEL_COLORS.length]
              return (
                <FadeIn key={level.id} delay={index * 50}>
                  <Link
                    to={`/academics/classes?level=${level.id}`}
                    className="group block bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5`}>
                      <Icon size={27} className="text-white" />
                    </div>

                    <h3 className="font-subheading font-bold text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                      {level.name}
                    </h3>

                    {level.description && (
                      <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
                        {level.description}
                      </p>
                    )}

                    <span className="inline-flex items-center gap-1 font-subheading font-bold text-sm text-accent">
                      View Classes <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </FadeIn>
              )
            })}
          </div>
        </section>
      )}

      {/* Featured Classes */}
      {featuredClasses.length > 0 && (
        <section className="bg-bg-light">
          <div className="section">
            <FadeIn>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-3">
                    Our Classes
                  </p>
                  <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
                    Featured Academic Classes
                  </h2>
                </div>
                <Link
                  to="/academics/classes"
                  className="hidden md:inline-flex items-center gap-2 font-subheading font-bold text-accent hover:text-primary transition-colors"
                >
                  View All Classes <ArrowRight size={18} />
                </Link>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredClasses.map((cls, index) => (
                <FadeIn key={cls.id} delay={index * 50}>
                  <Link
                    to={`/academics/classes/${cls.id}`}
                    className="group block bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    {cls.cover_image_url && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={cls.cover_image_url}
                          alt={`${cls.name} ${cls.section}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        {cls.academic_level && (
                          <span className="inline-block bg-primary/10 text-primary text-xs font-subheading font-bold px-3 py-1 rounded-full">
                            {cls.academic_level}
                          </span>
                        )}
                        {cls.curriculum && (
                          <span className="inline-block bg-secondary/10 text-secondary text-xs font-subheading font-bold px-3 py-1 rounded-full">
                            {cls.curriculum}
                          </span>
                        )}
                      </div>

                      <h3 className="font-subheading font-bold text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                        {cls.name} {cls.section && `- ${cls.section}`}
                      </h3>

                      {cls.description && (
                        <p className="font-body text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">
                          {cls.description}
                        </p>
                      )}

                      {cls.subjects && cls.subjects.length > 0 && (
                        <p className="font-body text-xs text-text-secondary">
                          {cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>

            <div className="text-center mt-8 md:hidden">
              <Link
                to="/academics/classes"
                className="inline-flex items-center gap-2 font-subheading font-bold text-accent"
              >
                View All Classes <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Subjects */}
      {featuredSubjects.length > 0 && (
        <section className="section">
          <FadeIn>
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="font-subheading font-semibold text-accent uppercase text-sm mb-3">
                  Our Subjects
                </p>
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
                  Explore Our Academic Subjects
                </h2>
              </div>
              <Link
                to="/academics/subjects"
                className="hidden md:inline-flex items-center gap-2 font-subheading font-bold text-accent hover:text-primary transition-colors"
              >
                View All Subjects <ArrowRight size={18} />
              </Link>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredSubjects.map((subject, index) => (
              <FadeIn key={subject.id} delay={index * 50}>
                <Link
                  to={`/academics/subjects/${subject.id}`}
                  className="group block bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  {subject.cover_image_url && (
                    <div className="h-44 overflow-hidden">
                      <img
                        src={subject.cover_image_url}
                        alt={subject.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {subject.subject_code && (
                        <span className="inline-block bg-primary/10 text-primary text-xs font-subheading font-bold px-3 py-1 rounded-full">
                          {subject.subject_code}
                        </span>
                      )}
                      {subject.type && (
                        <span className="inline-block bg-accent/10 text-accent text-xs font-subheading font-bold px-3 py-1 rounded-full capitalize">
                          {subject.type}
                        </span>
                      )}
                    </div>

                    <h3 className="font-subheading font-bold text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                      {subject.name}
                    </h3>

                    {subject.description && (
                      <p className="font-body text-sm text-text-secondary leading-relaxed line-clamp-2">
                        {subject.description}
                      </p>
                    )}
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Link
              to="/academics/subjects"
              className="inline-flex items-center gap-2 font-subheading font-bold text-accent"
            >
              View All Subjects <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="bg-bg-light">
        <div className="section">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-3">
                Quick Links
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
                Explore Our Academic Resources
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'View All Classes', desc: 'Browse all available classes across every academic level.', icon: School, to: '/academics/classes', color: 'from-blue-500 to-blue-600' },
              { title: 'View All Subjects', desc: 'Explore the complete list of academic subjects offered.', icon: BookOpen, to: '/academics/subjects', color: 'from-emerald-500 to-emerald-600' },
              { title: 'Meet Our Faculty', desc: 'Discover experienced educators and academic leaders.', icon: Users, to: '/faculty', color: 'from-violet-500 to-violet-600' },
              { title: 'Download Resources', desc: 'Access academic documents, calendars, and guides.', icon: Download, to: '/downloads', color: 'from-amber-500 to-amber-600' },
            ].map(({ title, desc, icon: Icon, to, color }, index) => (
              <FadeIn key={title} delay={index * 50}>
                <Link
                  to={to}
                  className="group block bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5`}>
                    <Icon size={27} className="text-white" />
                  </div>

                  <h3 className="font-subheading font-bold text-primary text-lg mb-2 group-hover:text-accent transition-colors">
                    {title}
                  </h3>

                  <p className="font-body text-sm text-text-secondary leading-relaxed">
                    {desc}
                  </p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white">
        <div className="section text-center max-w-4xl">
          <FadeIn>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Start Your Academic Journey with EduNova
            </h2>

            <p className="font-body text-blue-100 leading-relaxed mb-8">
              Choose a future-ready academic environment built on excellence,
              innovation, discipline, creativity, and digital transformation.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admissions" className="btn-primary">
                Start Application
              </Link>

              <Link
                to="/contact"
                className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors"
              >
                Contact Admissions
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}

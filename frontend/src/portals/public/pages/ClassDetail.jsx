import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  GraduationCap,
  ArrowRight,
  ChevronRight,
  Home,
  Users,
  Calendar,
  BookOpen,
  FlaskConical,
  Target,
  ClipboardCheck,
  Building2,
  Dumbbell,
  Award,
  School,
  Clock,
  Layers,
  Star,
} from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

const TABS = [
  { key: 'overview', label: 'Overview', icon: GraduationCap },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'curriculum', label: 'Curriculum', icon: Layers },
  { key: 'facilities', label: 'Facilities', icon: Building2 },
  { key: 'activities', label: 'Activities', icon: Dumbbell },
  { key: 'assessment', label: 'Assessment', icon: ClipboardCheck },
]

export default function ClassDetail() {
  const { id } = useParams()
  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setActiveTab('overview')
    client.get(`/api/website/classes/${id}/`)
      .then(({ data }) => { if (!cancelled) setCls(data) })
      .catch((err) => { if (!cancelled) setError(err?.response?.status === 404 ? 'Class not found.' : 'Failed to load class details.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-text-secondary">Loading class details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <School size={32} className="text-red-400" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">{error}</h2>
          <Link to="/academics/classes" className="btn-primary inline-flex items-center gap-2">
            Browse All Classes <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  if (!cls) return null

  return (
    <main className="bg-white">
      {/* Breadcrumbs */}
      <div className="bg-bg-light border-b border-gray-100">
        <div className="section py-3">
          <nav className="flex items-center gap-1.5 text-xs font-body text-text-secondary flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors inline-flex items-center gap-1">
              <Home size={12} /> Home
            </Link>
            <ChevronRight size={12} />
            <Link to="/academics" className="hover:text-primary transition-colors">Academics</Link>
            <ChevronRight size={12} />
            <Link to="/academics/classes" className="hover:text-primary transition-colors">Classes</Link>
            <ChevronRight size={12} />
            <span className="text-text-primary font-semibold">{cls.name} {cls.section && `- ${cls.section}`}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        {cls.cover_image_url ? (
          <img
            src={cls.cover_image_url}
            alt={`${cls.name} ${cls.section}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src="/images/Campus.jpeg"
            alt={`${cls.name} ${cls.section}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-24">
          <FadeIn>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {cls.academic_level && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white text-xs font-subheading font-bold px-3 py-1 rounded-full">
                  <GraduationCap size={12} /> {cls.academic_level}
                </span>
              )}
              {cls.curriculum && (
                <span className="inline-flex items-center gap-1.5 bg-highlight/20 backdrop-blur text-highlight text-xs font-subheading font-bold px-3 py-1 rounded-full">
                  {cls.curriculum}
                </span>
              )}
            </div>

            <h1 className="font-heading text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              {cls.name} {cls.section && `- ${cls.section}`}
            </h1>

            {cls.description && (
              <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-6">
                {cls.description}
              </p>
            )}

            <Link to="/admissions" className="inline-flex items-center gap-2 btn-primary">
              Apply for Admission <ArrowRight size={18} />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Content Area */}
      <section className="section">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <FadeIn>
              <div className="flex gap-1 overflow-x-auto pb-1 mb-8 border-b border-gray-100">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-subheading font-semibold rounded-t-xl transition-all whitespace-nowrap ${
                      activeTab === key
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </FadeIn>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <FadeIn>
                <div className="space-y-8">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
                      About This Class
                    </h3>
                    <p className="font-body text-text-secondary leading-relaxed">
                      {cls.description || 'No description available for this class.'}
                    </p>
                  </div>

                  {cls.learning_objectives && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3 flex items-center gap-2">
                        <Target size={18} className="text-secondary" />
                        Learning Objectives
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.learning_objectives}
                      </p>
                    </div>
                  )}

                  {cls.academic_approach && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3 flex items-center gap-2">
                        <Star size={18} className="text-secondary" />
                        Academic Approach
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.academic_approach}
                      </p>
                    </div>
                  )}

                  {cls.learning_outcomes && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3 flex items-center gap-2">
                        <Award size={18} className="text-secondary" />
                        Learning Outcomes
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.learning_outcomes}
                      </p>
                    </div>
                  )}

                  {cls.promotion_policy && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3">
                        Promotion Policy
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.promotion_policy}
                      </p>
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Subjects */}
            {activeTab === 'subjects' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-6">
                    Subjects in This Class
                  </h3>

                  {cls.subjects && cls.subjects.length > 0 ? (
                    <div className="space-y-3">
                      {cls.subjects.map((subject, index) => (
                        <div
                          key={subject.subject_id || index}
                          className="flex items-center gap-4 bg-bg-light rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen size={18} className="text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-subheading font-bold text-primary text-sm">
                                {subject.name}
                              </h4>
                              {subject.subject_code && (
                                <span className="text-xs font-body text-text-secondary bg-gray-100 px-2 py-0.5 rounded">
                                  {subject.subject_code}
                                </span>
                              )}
                            </div>
                            <p className="font-body text-xs text-text-secondary capitalize">
                              Type: {subject.type}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {subject.is_compulsory && (
                              <span className="inline-block bg-secondary/10 text-secondary text-xs font-subheading font-bold px-2.5 py-1 rounded-full">
                                Compulsory
                              </span>
                            )}
                            <Link
                              to={`/academics/subjects/${subject.subject_id}`}
                              className="text-accent hover:text-primary transition-colors"
                            >
                              <ChevronRight size={18} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No subjects information available for this class.
                    </p>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Curriculum */}
            {activeTab === 'curriculum' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-6">
                    Curriculum Details
                  </h3>

                  {cls.curriculum && cls.curriculum.length > 0 ? (
                    <div className="space-y-6">
                      {cls.curriculum.map((curr, index) => (
                        <div
                          key={curr.id || index}
                          className="bg-bg-light rounded-2xl p-6 border border-gray-100"
                        >
                          <h4 className="font-subheading font-bold text-primary text-lg mb-3">
                            {curr.curriculum_name}
                          </h4>
                          {curr.syllabus_description && (
                            <p className="font-body text-text-secondary leading-relaxed mb-3 whitespace-pre-line">
                              {curr.syllabus_description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No curriculum details available for this class.
                    </p>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Facilities */}
            {activeTab === 'facilities' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
                    Facilities
                  </h3>
                  {cls.facilities ? (
                    <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.facilities}
                      </p>
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No facilities information available for this class.
                    </p>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Activities */}
            {activeTab === 'activities' && (
              <FadeIn>
                <div className="space-y-8">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
                      Activities
                    </h3>
                    {cls.activities ? (
                      <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                        <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                          {cls.activities}
                        </p>
                      </div>
                    ) : (
                      <p className="font-body text-text-secondary text-center py-10">
                        No activities information available for this class.
                      </p>
                    )}
                  </div>

                  {cls.co_curricular && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-4">
                        Co-Curricular Activities
                      </h4>
                      <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                        <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                          {cls.co_curricular}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Assessment */}
            {activeTab === 'assessment' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
                    Assessment Pattern
                  </h3>
                  {cls.assessment_pattern ? (
                    <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {cls.assessment_pattern}
                      </p>
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No assessment information available for this class.
                    </p>
                  )}
                </div>
              </FadeIn>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <FadeIn delay={100}>
              <aside className="space-y-6 lg:sticky lg:top-6">
                {/* Quick Facts */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-heading text-lg font-bold text-primary mb-5">
                    Quick Facts
                  </h3>
                  <div className="space-y-4">
                    {cls.section && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Layers size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Section</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.section}</p>
                        </div>
                      </div>
                    )}

                    {cls.curriculum && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Curriculum</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.curriculum}</p>
                        </div>
                      </div>
                    )}

                    {cls.room_number && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <Building2 size={16} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Room</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.room_number}</p>
                        </div>
                      </div>
                    )}

                    {cls.age_criteria && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-highlight/10 flex items-center justify-center shrink-0">
                          <Clock size={16} className="text-highlight" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Age Criteria</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.age_criteria}</p>
                        </div>
                      </div>
                    )}

                    {cls.student_teacher_ratio && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Users size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Student-Teacher Ratio</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.student_teacher_ratio}</p>
                        </div>
                      </div>
                    )}

                    {cls.subjects && cls.subjects.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                          <GraduationCap size={16} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Subjects</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Card */}
                <div className="bg-primary rounded-3xl p-6 text-white shadow-xl">
                  <h3 className="font-heading text-lg font-bold mb-3">
                    Interested in This Class?
                  </h3>
                  <p className="font-body text-sm text-blue-100 leading-relaxed mb-5">
                    Start the admission process for your child today and join the EduNova learning community.
                  </p>
                  <Link
                    to="/admissions"
                    className="inline-flex items-center justify-center gap-2 bg-white text-primary font-subheading font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors w-full"
                  >
                    Apply for Admission <ArrowRight size={16} />
                  </Link>
                </div>

                {/* Back Link */}
                <Link
                  to="/academics/classes"
                  className="flex items-center gap-2 font-subheading font-bold text-accent hover:text-primary transition-colors text-sm"
                >
                  <ArrowRight size={16} className="rotate-180" />
                  Back to All Classes
                </Link>
              </aside>
            </FadeIn>
          </div>
        </div>
      </section>
    </main>
  )
}

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  GraduationCap,
  ArrowRight,
  ChevronRight,
  Home,
  BookOpen,
  Layers,
  Target,
  Lightbulb,
  ClipboardCheck,
  School,
  Code,
  Tag,
  ListChecks,
} from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

const TABS = [
  { key: 'overview', label: 'Overview', icon: GraduationCap },
  { key: 'activities', label: 'Activities & Projects', icon: Lightbulb },
  { key: 'assessment', label: 'Assessment', icon: ClipboardCheck },
  { key: 'classes', label: 'Classes', icon: School },
]

export default function SubjectDetail() {
  const { id } = useParams()
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setActiveTab('overview')
    client.get(`/api/website/subjects/${id}/`)
      .then(({ data }) => { if (!cancelled) setSubject(data) })
      .catch((err) => { if (!cancelled) setError(err?.response?.status === 404 ? 'Subject not found.' : 'Failed to load subject details.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-text-secondary">Loading subject details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} className="text-red-400" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">{error}</h2>
          <Link to="/academics/subjects" className="btn-primary inline-flex items-center gap-2">
            Browse All Subjects <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  if (!subject) return null

  const classesCount = subject.classes?.length || 0

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
            <Link to="/academics/subjects" className="hover:text-primary transition-colors">Subjects</Link>
            <ChevronRight size={12} />
            <span className="text-text-primary font-semibold">{subject.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        {subject.cover_image_url ? (
          <img
            src={subject.cover_image_url}
            alt={subject.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src="/images/student.jpeg"
            alt={subject.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-24">
          <FadeIn>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {subject.subject_code && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white text-xs font-subheading font-bold px-3 py-1 rounded-full">
                  <Code size={12} /> {subject.subject_code}
                </span>
              )}
              {subject.type && (
                <span className="inline-flex items-center gap-1.5 bg-highlight/20 backdrop-blur text-highlight text-xs font-subheading font-bold px-3 py-1 rounded-full capitalize">
                  <Tag size={12} /> {subject.type}
                </span>
              )}
            </div>

            <h1 className="font-heading text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              {subject.name}
            </h1>

            {subject.description && (
              <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-6">
                {subject.description}
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
                      About This Subject
                    </h3>
                    <p className="font-body text-text-secondary leading-relaxed">
                      {subject.description || 'No description available for this subject.'}
                    </p>
                  </div>

                  {subject.learning_outcomes && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3 flex items-center gap-2">
                        <Target size={18} className="text-secondary" />
                        Learning Outcomes
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {subject.learning_outcomes}
                      </p>
                    </div>
                  )}

                  {subject.teaching_methodology && (
                    <div>
                      <h4 className="font-subheading font-bold text-primary text-lg mb-3 flex items-center gap-2">
                        <Lightbulb size={18} className="text-secondary" />
                        Teaching Methodology
                      </h4>
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {subject.teaching_methodology}
                      </p>
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Activities & Projects */}
            {activeTab === 'activities' && (
              <FadeIn>
                <div className="space-y-8">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                      <ListChecks size={20} className="text-secondary" />
                      Activities
                    </h3>
                    {subject.activities ? (
                      <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                        <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                          {subject.activities}
                        </p>
                      </div>
                    ) : (
                      <p className="font-body text-text-secondary text-center py-10">
                        No activities information available for this subject.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-subheading font-bold text-primary text-lg mb-4 flex items-center gap-2">
                      <Lightbulb size={18} className="text-secondary" />
                      Projects
                    </h4>
                    {subject.projects ? (
                      <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                        <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                          {subject.projects}
                        </p>
                      </div>
                    ) : (
                      <p className="font-body text-text-secondary text-center py-10">
                        No project information available for this subject.
                      </p>
                    )}
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Tab: Assessment */}
            {activeTab === 'assessment' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                    <ClipboardCheck size={20} className="text-secondary" />
                    Assessment
                  </h3>
                  {subject.assessment ? (
                    <div className="bg-bg-light rounded-2xl p-6 border border-gray-100">
                      <p className="font-body text-text-secondary leading-relaxed whitespace-pre-line">
                        {subject.assessment}
                      </p>
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No assessment information available for this subject.
                    </p>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Tab: Classes */}
            {activeTab === 'classes' && (
              <FadeIn>
                <div>
                  <h3 className="font-heading text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                    <School size={20} className="text-secondary" />
                    Classes Offering This Subject
                  </h3>

                  {subject.classes && subject.classes.length > 0 ? (
                    <div className="space-y-3">
                      {subject.classes.map((cls, index) => (
                        <Link
                          key={cls.class_id || index}
                          to={`/academics/classes/${cls.class_id}`}
                          className="flex items-center gap-4 bg-bg-light rounded-2xl p-4 border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <School size={18} className="text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-subheading font-bold text-primary text-sm">
                              {cls.name}
                            </h4>
                            {cls.section && (
                              <p className="font-body text-xs text-text-secondary">
                                Section: {cls.section}
                              </p>
                            )}
                          </div>

                          <ChevronRight size={18} className="text-accent shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-text-secondary text-center py-10">
                      No class information available for this subject.
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
                    Subject Details
                  </h3>
                  <div className="space-y-4">
                    {subject.subject_code && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Code size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Subject Code</p>
                          <p className="font-subheading font-bold text-text-primary text-sm">{subject.subject_code}</p>
                        </div>
                      </div>
                    )}

                    {subject.type && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                          <Tag size={16} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Type</p>
                          <p className="font-subheading font-bold text-text-primary text-sm capitalize">{subject.type}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Layers size={16} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Classes Offered</p>
                        <p className="font-subheading font-bold text-text-primary text-sm">
                          {classesCount} class{classesCount !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Card */}
                <div className="bg-primary rounded-3xl p-6 text-white shadow-xl">
                  <h3 className="font-heading text-lg font-bold mb-3">
                    Interested in This Subject?
                  </h3>
                  <p className="font-body text-sm text-blue-100 leading-relaxed mb-5">
                    Start the admission process for your child and explore our academic programs.
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
                  to="/academics/subjects"
                  className="flex items-center gap-2 font-subheading font-bold text-accent hover:text-primary transition-colors text-sm"
                >
                  <ArrowRight size={16} className="rotate-180" />
                  Back to All Subjects
                </Link>
              </aside>
            </FadeIn>
          </div>
        </div>
      </section>
    </main>
  )
}

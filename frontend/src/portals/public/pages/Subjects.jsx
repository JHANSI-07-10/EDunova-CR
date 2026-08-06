import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Search, ArrowRight, GraduationCap, Beaker, Palette, Dumbbell } from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

const TYPE_COLORS = {
  Theory: 'bg-blue-100 text-blue-700',
  Practical: 'bg-emerald-100 text-emerald-700',
  Language: 'bg-purple-100 text-purple-700',
  Elective: 'bg-amber-100 text-amber-700',
}

const TYPE_ICONS = {
  Theory: BookOpen,
  Practical: Beaker,
  Language: GraduationCap,
  Elective: Palette,
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const filterType = searchParams.get('type') || ''
  const [search, setSearch] = useState('')

  useEffect(() => {
    const cancel = new AbortController()
    setLoading(true)
    client.get('/api/website/subjects/', { signal: cancel.signal })
      .then(({ data }) => setSubjects(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== 'CanceledError') setError('Failed to load subjects.') })
      .finally(() => setLoading(false))
    return () => cancel.abort()
  }, [])

  const types = [...new Set(subjects.map(s => s.type).filter(Boolean))]
  const filtered = subjects.filter(s => {
    if (filterType && s.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return (s.name || '').toLowerCase().includes(q) ||
        (s.subject_code || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img src="/images/student.jpeg" alt="Subjects" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/30" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <BookOpen size={16} /> Our Subjects
            </p>
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Explore Our Academic Subjects
            </h1>
            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              From core academics to creative arts and STEM innovation, EduNova offers
              a comprehensive range of subjects designed to develop well-rounded learners.
            </p>
            <div className="flex items-center gap-4 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search subjects..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 text-slate-800 font-body text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Type Filter Tabs */}
      <section className="bg-bg-light border-b border-gray-100">
        <div className="section py-4">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/academics/subjects"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                !filterType ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
              }`}
            >
              All ({subjects.length})
            </Link>
            {types.map(t => (
              <Link
                key={t}
                to={`/academics/subjects?type=${t}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  filterType === t ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
                }`}
              >
                {t} ({subjects.filter(s => s.type === t).length})
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="section">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 font-body">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-body">No subjects found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((subject, idx) => {
              const Icon = TYPE_ICONS[subject.type] || BookOpen
              return (
                <FadeIn key={subject.id} delay={idx * 40}>
                  <Link
                    to={`/academics/subjects/${subject.id}`}
                    className="group block bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <Icon size={27} className="text-primary group-hover:text-white transition-colors" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[subject.type] || 'bg-slate-100 text-slate-600'}`}>
                        {subject.type}
                      </span>
                    </div>
                    <h3 className="font-subheading font-bold text-primary text-lg mb-2">
                      {subject.name}
                    </h3>
                    {subject.subject_code && (
                      <p className="text-xs font-mono text-slate-400 mb-2">{subject.subject_code}</p>
                    )}
                    <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-3">
                      {subject.description || 'Comprehensive subject covering core concepts and practical applications.'}
                    </p>
                    {subject.classes && subject.classes.length > 0 && (
                      <p className="text-xs text-slate-400 mb-3">
                        Offered in {subject.classes.length} class{subject.classes.length !== 1 ? 'es' : ''}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                      View Details <ArrowRight size={14} />
                    </span>
                  </Link>
                </FadeIn>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary text-white">
        <div className="section text-center max-w-4xl">
          <FadeIn>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Ready to Explore Our Curriculum?
            </h2>
            <p className="font-body text-blue-100 leading-relaxed mb-8">
              Discover how our subjects are designed to build strong academic foundations
              while developing critical thinking, creativity, and real-world skills.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admissions" className="btn-primary">
                Apply for Admission
              </Link>
              <Link to="/academics/classes" className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors">
                View All Classes
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}

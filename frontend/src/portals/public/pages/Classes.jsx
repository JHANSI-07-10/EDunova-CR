import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  GraduationCap,
  School,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Filter,
  Users,
} from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

export default function Classes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelsLoading, setLevelsLoading] = useState(true)

  const selectedLevel = searchParams.get('level') || ''

  useEffect(() => {
    let cancelled = false
    client.get('/api/website/levels/')
      .then(({ data }) => { if (!cancelled) setLevels(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLevelsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = selectedLevel
      ? `/api/website/classes/?level=${selectedLevel}`
      : '/api/website/classes/'
    client.get(url)
      .then(({ data }) => { if (!cancelled) setClasses(data) })
      .catch(() => { if (!cancelled) setClasses([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedLevel])

  const handleLevelChange = (levelId) => {
    if (levelId) {
      setSearchParams({ level: levelId })
    } else {
      setSearchParams({})
    }
  }

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img
          src="/images/Campus.jpeg"
          alt="EduNova Classes"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <School size={16} /> Our Classes
            </p>

            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Explore Our Academic Classes
            </h1>

            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              Discover classes designed for every stage of learning, from
              foundational programs to senior secondary academics.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Stats + Filter Bar */}
      <section className="bg-bg-light border-b border-gray-100">
        <div className="section py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Stats */}
            <FadeIn>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <School size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-numbers text-2xl font-extrabold text-primary leading-none">
                      {loading ? '—' : classes.length}
                    </p>
                    <p className="font-body text-xs text-text-secondary">
                      Total Classes
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Level Filter */}
            <FadeIn delay={50}>
              <div className="flex items-center gap-3">
                <Filter size={18} className="text-text-secondary shrink-0" />
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-body outline-none focus:border-primary transition-colors min-w-[200px]"
                >
                  <option value="">All Academic Levels</option>
                  {!levelsLoading && levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      <section className="section">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body text-text-secondary">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <FadeIn>
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <School size={32} className="text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-text-primary mb-3">
                No Classes Found
              </h3>
              <p className="font-body text-text-secondary leading-relaxed mb-6">
                {selectedLevel
                  ? 'No classes are available for the selected academic level. Try selecting a different level.'
                  : 'No classes are available at the moment. Please check back later.'}
              </p>
              {selectedLevel && (
                <button
                  onClick={() => handleLevelChange('')}
                  className="btn-outline"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </FadeIn>
        ) : (
          <>
            <FadeIn>
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold text-text-primary">
                  {selectedLevel
                    ? `${levels.find((l) => String(l.id) === String(selectedLevel))?.name || 'Selected Level'} Classes`
                    : 'All Classes'}
                </h2>
                <p className="font-body text-text-secondary text-sm mt-1">
                  Showing {classes.length} class{classes.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls, index) => (
                <FadeIn key={cls.id} delay={index * 40}>
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
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-3">
                          {cls.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        {cls.subjects && cls.subjects.length > 0 && (
                          <span className="font-body text-xs text-text-secondary flex items-center gap-1.5">
                            <BookOpen size={14} className="text-secondary" />
                            {cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 font-subheading font-bold text-sm text-accent ml-auto">
                          View Details <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary text-white">
        <div className="section text-center max-w-4xl">
          <FadeIn>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Ready to Join EduNova?
            </h2>

            <p className="font-body text-blue-100 leading-relaxed mb-8">
              Explore our classes, find the right academic level for your child,
              and start the admission process today.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admissions" className="btn-primary">
                Apply for Admission
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
    </main>
  )
}

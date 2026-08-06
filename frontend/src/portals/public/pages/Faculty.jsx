import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Users,
  Search,
  X,
  Mail,
  ArrowRight,
  Award,
  Briefcase,
  BookOpen,
  Star,
  ChevronRight,
} from 'lucide-react'
import client from '../../../api/client'
import FadeIn from '../../../components/FadeIn'

export default function Faculty() {
  const [faculty, setFaculty] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/api/website/faculty/').catch(() => ({ data: [] })),
      client.get('/api/website/stats/').catch(() => ({ data: null })),
    ]).then(([facultyRes, statsRes]) => {
      setFaculty(facultyRes.data)
      setStats(statsRes.data)
      setLoading(false)
    })
  }, [])

  const designations = [
    'All',
    ...Array.from(new Set(faculty.map((f) => f.designation).filter(Boolean))),
  ]

  const filtered = faculty.filter((f) => {
    const fullName = `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      fullName.includes(searchQuery.toLowerCase()) ||
      (f.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      activeFilter === 'All' || f.designation === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img
          src="/images/student.jpeg"
          alt="EduNova Faculty"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <GraduationCap size={16} /> Our Faculty
            </p>
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Our Faculty
            </h1>
            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              Meet the dedicated educators who inspire, mentor, and guide our
              students toward academic excellence and holistic growth every day.
            </p>
            <Link to="/contact" className="inline-flex items-center gap-2 btn-primary">
              Contact Academic Office <ArrowRight size={18} />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="bg-bg-light">
          <div className="section py-10">
            <FadeIn>
              <div className="grid sm:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center shadow-sm">
                  <p className="font-heading text-3xl font-extrabold text-primary">
                    {stats.faculty || 0}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">Faculty Members</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center shadow-sm">
                  <p className="font-heading text-3xl font-extrabold text-secondary">
                    {stats.classes || 0}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">Classes</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center shadow-sm">
                  <p className="font-heading text-3xl font-extrabold text-highlight">
                    {stats.subjects || 0}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">Subjects</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center shadow-sm">
                  <p className="font-heading text-3xl font-extrabold text-primary">
                    {stats.students || 0}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">Students</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Search & Filter */}
      <section className="section py-10">
        <FadeIn>
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative mb-6">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Search by name or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-bg-light text-text-primary font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {designations.map((desig) => (
                <button
                  key={desig}
                  onClick={() => setActiveFilter(desig)}
                  className={`px-4 py-2 rounded-full text-sm font-subheading font-semibold transition-all ${
                    activeFilter === desig
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-bg-light text-text-secondary border border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  {desig}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Faculty Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-bg-light rounded-3xl overflow-hidden border border-gray-100 animate-pulse"
              >
                <div className="h-72 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-heading text-xl text-text-secondary">
              No faculty members found
            </p>
            <p className="font-body text-sm text-text-secondary mt-2">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((member, index) => (
              <FadeIn key={member.id} delay={index * 50}>
                <button
                  onClick={() => setSelectedMember(member)}
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full text-left h-full"
                >
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={member.photo_url || '/images/EduNova.jpeg'}
                      alt={`${member.first_name} ${member.last_name}`}
                      onError={(e) => {
                        e.target.src = '/images/EduNova.jpeg'
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-subheading font-bold text-white text-lg">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="font-body text-sm text-white/85">
                        {member.designation}
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    {member.qualification_detail && (
                      <p className="font-body text-sm text-text-secondary mb-2 flex items-center gap-2">
                        <BookOpen size={14} className="text-primary shrink-0" />
                        {member.qualification_detail}
                      </p>
                    )}
                    {member.experience_years && (
                      <p className="font-body text-sm text-text-secondary mb-3 flex items-center gap-2">
                        <Briefcase size={14} className="text-primary shrink-0" />
                        {member.experience_years} years experience
                      </p>
                    )}
                    {member.specializations && (
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(member.specializations)
                          ? member.specializations
                          : member.specializations.split(',').map((s) => s.trim())
                        ).slice(0, 3).map((spec, i) => (
                          <span
                            key={i}
                            className="bg-primary/10 text-primary text-xs font-subheading font-semibold px-2.5 py-1 rounded-full"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-4 text-primary font-subheading font-bold text-sm">
                      View Profile <ChevronRight size={16} />
                    </div>
                  </div>
                </button>
              </FadeIn>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary text-white">
        <div className="section text-center max-w-4xl">
          <FadeIn>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Award size={32} className="text-highlight" />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Learn from Dedicated Teachers and Mentors
            </h2>
            <p className="font-body text-blue-100 leading-relaxed mb-8">
              EduNova's faculty are committed to academic excellence, digital
              learning, student growth, creativity, and future-ready education.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admissions" className="btn-primary">
                Apply Now
              </Link>
              <Link
                to="/academics"
                className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors"
              >
                View Academics
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedMember.photo_url || '/images/EduNova.jpeg'}
                alt={`${selectedMember.first_name} ${selectedMember.last_name}`}
                onError={(e) => {
                  e.target.src = '/images/EduNova.jpeg'
                }}
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <h2 className="font-heading text-2xl font-bold text-white">
                  {selectedMember.first_name} {selectedMember.last_name}
                </h2>
                <p className="font-body text-white/85">{selectedMember.designation}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {selectedMember.email && (
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-primary" />
                  </div>
                  <span className="font-body">{selectedMember.email}</span>
                </div>
              )}

              {selectedMember.qualification_detail && (
                <div>
                  <h3 className="font-subheading font-bold text-primary text-sm uppercase mb-2">
                    Qualification
                  </h3>
                  <p className="font-body text-text-secondary text-sm leading-relaxed">
                    {selectedMember.qualification_detail}
                  </p>
                </div>
              )}

              {selectedMember.experience_years && (
                <div>
                  <h3 className="font-subheading font-bold text-primary text-sm uppercase mb-2">
                    Experience
                  </h3>
                  <p className="font-body text-text-secondary text-sm leading-relaxed">
                    {selectedMember.experience_years} years
                  </p>
                </div>
              )}

              {selectedMember.specializations && (
                <div>
                  <h3 className="font-subheading font-bold text-primary text-sm uppercase mb-2">
                    Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(selectedMember.specializations)
                      ? selectedMember.specializations
                      : selectedMember.specializations.split(',').map((s) => s.trim())
                    ).map((spec, i) => (
                      <span
                        key={i}
                        className="bg-primary/10 text-primary text-xs font-subheading font-semibold px-3 py-1.5 rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.achievements && (
                <div>
                  <h3 className="font-subheading font-bold text-primary text-sm uppercase mb-2">
                    Achievements
                  </h3>
                  <p className="font-body text-text-secondary text-sm leading-relaxed">
                    {selectedMember.achievements}
                  </p>
                </div>
              )}

              {selectedMember.bio && (
                <div>
                  <h3 className="font-subheading font-bold text-primary text-sm uppercase mb-2">
                    About
                  </h3>
                  <p className="font-body text-text-secondary text-sm leading-relaxed">
                    {selectedMember.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

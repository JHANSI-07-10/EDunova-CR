import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Clock, Users, ArrowRight, Sparkles, X, CheckCircle2 } from 'lucide-react'
import { cmsApi } from '../../../api/cmsApi'
import { useFetch } from '../../../components/useFetch'
import FadeIn from '../../../components/FadeIn'
import { getMediaUrl } from '../../../utils/media'

const fetchEvents = cmsApi.getEvents

function eventStatus(dateStr) {
  if (!dateStr) return { label: 'Upcoming', tone: 'bg-secondary/10 text-secondary' }
  const d = new Date(dateStr)
  if (isNaN(d)) return { label: 'Upcoming', tone: 'bg-secondary/10 text-secondary' }
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (d.getTime() === startOfToday.getTime()) return { label: 'Today', tone: 'bg-accent/15 text-accent' }
  if (d < startOfToday) return { label: 'Completed', tone: 'bg-slate-100 text-slate-500' }
  return { label: 'Upcoming', tone: 'bg-secondary/10 text-secondary' }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Upcoming'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fallbackEvents = [
  {
    id: '1',
    title: 'STEM Innovation Fair',
    description: 'Students present robotics, science, technology, and innovation projects.',
    event_date: '2026-07-12',
    venue: 'Innovation Center',
    cover_image: '/images/student.jpeg',
  },
  {
    id: '2',
    title: 'Annual Sports Day',
    description: 'A celebration of fitness, discipline, teamwork, sportsmanship, and student achievement.',
    event_date: '2026-08-05',
    venue: 'EduNova Sports Ground',
    cover_image: '/images/Campus.jpeg',
  },
  {
    id: '3',
    title: 'Parent Orientation Program',
    description: 'Orientation for parents about digital learning, LMS, assessments, and communication systems.',
    event_date: '2026-08-20',
    venue: 'Main Auditorium',
    cover_image: '/images/building.jpeg',
  },
]

export default function Events() {
  const { data, loading } = useFetch(fetchEvents, [])
  const events = data && data.length > 0 ? data : fallbackEvents
  const [selectedEvent, setSelectedEvent] = useState(null)

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden text-white">
        <img
          src="/images/exterior.jpeg"
          alt="EduNova Events"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <CalendarDays size={16} /> Events
            </p>

            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Campus Events that Inspire Learning and Leadership
            </h1>

            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              EduNova hosts academic programs, STEM fairs, sports events,
              cultural activities, orientations, workshops, and student
              development events.
            </p>

            <Link to="/gallery" className="inline-flex items-center gap-2 btn-primary">
              View Gallery <ArrowRight size={18} />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="section">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-accent uppercase text-sm mb-3 bg-accent/10 px-4 py-2 rounded-full">
              <Sparkles size={15} /> Upcoming & Recent Events
            </p>

            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Events that Shape Student Experience
            </h2>

            <p className="font-body text-text-secondary leading-relaxed">
              Events at EduNova support academics, creativity, leadership,
              innovation, sportsmanship, and parent engagement.
            </p>
          </div>
        </FadeIn>

        {loading ? (
          <p className="text-center text-text-secondary">Loading events…</p>
        ) : (
          <>
            {/* Upcoming events first, past ones below with a Completed tag */}
            {(() => {
              const sorted = [...(events || [])].sort(
                (a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date)
              )
              const upcoming = sorted.filter(
                (e) => eventStatus(e.event_date || e.date).label !== 'Completed'
              )
              const past = sorted.filter(
                (e) => eventStatus(e.event_date || e.date).label === 'Completed'
              )
              const renderCards = (list) => (
                <div className="grid md:grid-cols-3 gap-6">
                  {list.map((event, index) => {
                    const status = eventStatus(event.event_date || event.date)
                    return (
                      <FadeIn key={event.id || event.title} delay={index * 60}>
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full w-full text-left cursor-pointer"
                        >
                          <div className="relative h-64 overflow-hidden">
                            <img
                              src={getMediaUrl(event.cover_image || event.image) || '/images/Campus.jpeg'}
                              alt={event.title}
                              onError={(e) => { e.target.src = '/images/Campus.jpeg' }}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />

                            <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur ${status.tone}`}>
                              {status.label}
                            </span>

                            <div className="absolute bottom-4 left-4 right-4">
                              <p className="font-heading font-bold text-white text-xl drop-shadow">
                                {event.title}
                              </p>
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <CalendarDays size={16} className="text-accent" />
                                {formatDate(event.event_date || event.date)}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <MapPin size={16} className="text-accent" />
                                {event.venue || 'EduNova Campus'}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Clock size={16} className="text-accent" />
                                School Event
                              </div>
                            </div>

                            <p className="font-body text-sm text-text-secondary leading-relaxed line-clamp-3">
                              {event.description}
                            </p>

                            <span className="inline-flex items-center gap-1.5 mt-4 font-subheading font-bold text-accent text-sm group-hover:gap-2.5 transition-all">
                              {status.label === 'Completed' ? 'View Recap' : 'View Details'} <ArrowRight size={16} />
                            </span>
                          </div>
                        </button>
                      </FadeIn>
                    )
                  })}
                </div>
              )
              return (
                <>
                  {upcoming.length > 0 && (
                    <>
                      {upcoming.length > 3 && (
                        <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-4">Upcoming</p>
                      )}
                      {renderCards(upcoming)}
                    </>
                  )}
                  {past.length > 0 && (
                    <div className="mt-12">
                      <p className="font-subheading font-semibold text-slate-500 uppercase text-sm mb-4">Past Events</p>
                      {renderCards(past)}
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}
      </section>

      <section className="bg-bg-light">
        <div className="section grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/images/classroom.jpeg"
                alt="EduNova student events"
                onError={(e) => { e.target.src = '/images/Campus.jpeg' }}
                className="w-full h-[420px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-transparent" />
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div>
              <p className="font-subheading font-semibold text-accent uppercase text-sm mb-3">
                Event Culture
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-5">
                More Than Academics
              </h2>
              <p className="font-body text-text-secondary leading-relaxed mb-6">
                Events help students develop communication, leadership,
                creativity, teamwork, confidence, and real-world exposure.
              </p>

              <div className="space-y-4">
                {[
                  'Academic and STEM events',
                  'Sports and cultural programs',
                  'Parent orientation and workshops',
                  'Student leadership activities',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Users size={17} className="text-secondary" />
                    </div>
                    <p className="font-body text-text-primary">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={getMediaUrl(selectedEvent.cover_image || selectedEvent.image) || '/images/Campus.jpeg'}
                alt={selectedEvent.title}
                onError={(e) => { e.target.src = '/images/Campus.jpeg' }}
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <h2 className="font-heading text-2xl font-bold text-white">{selectedEvent.title}</h2>
                <p className="font-body text-white/85">{formatDate(selectedEvent.event_date || selectedEvent.date)} · {selectedEvent.venue || 'EduNova Campus'}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${eventStatus(selectedEvent.event_date || selectedEvent.date).tone}`}>
                  {eventStatus(selectedEvent.event_date || selectedEvent.date).label}
                </span>
                {selectedEvent.venue && (
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                    <MapPin size={12} className="inline mr-1" />{selectedEvent.venue}
                  </span>
                )}
              </div>

              <p className="font-body text-text-secondary leading-relaxed">
                {selectedEvent.description}
              </p>

              {(() => {
                const d = (selectedEvent.event_date || selectedEvent.date || '').replace(/-/g, '')
                return (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${d}/${d}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 btn-primary"
                    >
                      <CalendarDays size={16} /> Add to Calendar
                    </a>
                    <Link to="/contact" className="inline-flex items-center gap-2 btn-outline">
                      <CheckCircle2 size={16} /> Register Interest
                    </Link>
                  </div>
                )
              })()}
              </div>
            </div>
          </div>
      )}
    </main>
  )
}
import { Link } from 'react-router-dom'
import { cmsApi } from '../../../api/cmsApi'
import { useFetch } from '../../../components/useFetch'
import FadeIn from '../../../components/FadeIn'

export default function EventsPreview() {
  const { data: events, loading } = useFetch(cmsApi.getEvents, [])
  const upcoming = (events || []).slice(0, 3)

  return (
    <section className="section">
      <div className="flex items-center justify-between mb-6">
        <FadeIn><h2 className="font-heading text-3xl font-bold">Upcoming Events</h2></FadeIn>
        <Link to="/events" className="font-subheading font-semibold text-accent text-sm">View All →</Link>
      </div>
      {loading ? (
        <p className="text-text-secondary">Loading events…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-text-secondary">No events scheduled right now — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {upcoming.map((e, i) => (
            <FadeIn key={e.id} delay={i * 50} className="h-full">
              <div className="card h-full overflow-hidden hover:shadow-md transition-shadow">
                {e.cover_image && (
                  <div className="-mx-6 -mt-6 mb-4 h-36 overflow-hidden">
                    <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="font-subheading text-sm text-secondary font-semibold">{e.event_date}</p>
                <h3 className="font-heading font-bold mt-1 text-primary">{e.title}</h3>
                <p className="text-sm text-text-secondary mt-2 line-clamp-2">{e.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  )
}

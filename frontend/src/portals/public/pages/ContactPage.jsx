import { useState, useEffect } from 'react'
import { 
  MapPin, Phone, Mail, Globe, Clock, AlertTriangle, PhoneCall, Calendar, Navigation, 
  Map, Search, Compass, ChevronDown, ChevronUp, Check, Layers, ZoomIn, ZoomOut, Maximize2, Sparkles, Building
} from 'lucide-react'
import CampusVisitModal from './CampusVisitModal'
import { isValidEmail, isValidPhone, isNonEmptyString } from '../../../utils/validation'

export default function ContactPage() {
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCampus, setSelectedCampus] = useState(null)
  
  // Location Finder states
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [detectedLocation, setDetectedLocation] = useState(null) // { lat, lng }
  const [nearestCampusInfo, setNearestCampusInfo] = useState(null)
  const [geolocating, setGeolocating] = useState(false)
  
  // Map View settings
  const [zoomLevel, setZoomLevel] = useState(10)
  const [mapMode, setMapMode] = useState('Standard') // Standard | Satellite | Terrain
  const [fullScreen, setFullScreen] = useState(false)

  // Expandable campus details (by campus ID)
  const [expandedCampusId, setExpandedCampusId] = useState(null)
  const [expandedSection, setExpandedSection] = useState('Overview') // Overview | Programs | Facilities | VirtualTour

  // Visit Modal state
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false)
  const [bookingCampusId, setBookingCampusId] = useState('')

  // Contact Form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [formStatus, setFormStatus] = useState('idle') // idle | sending | sent | error
  const [validationErrors, setValidationErrors] = useState({})

  // Default Head Office details
  const headOffice = {
    name: "EduNova Global Academy Private Limited",
    brand: "EduNova Academy",
    address: "EduNova Education Campus, Sector 21, Dwarka",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    postalCode: "110075",
    phone: "+91-11-4567890",
    email: "info@edunovaacademy.edu.in",
    website: "www.edunovaacademy.edu.in",
    workingHours: "9:00 AM - 5:00 PM (Monday - Saturday)",
    emergencyContact: "+91-99999-99999",
    latitude: 28.5921,
    longitude: 77.0460
  }

  // Load campuses
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
        const res = await fetch(`${BASE_URL}/api/campuses/`)
        const data = await res.json()
        setCampuses(data)
        if (data.length > 0) {
          // Exclude Head Office from default branch list selected status if needed
          setSelectedCampus(data[0])
        }
      } catch (err) {
        console.error('Error fetching campuses:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCampuses()
  }, [])

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setDetectedLocation({ lat: latitude, lng: longitude })
        try {
          const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
          const res = await fetch(`${BASE_URL}/api/campuses/nearest/?lat=${latitude}&lng=${longitude}`)
          if (res.ok) {
            const data = await res.json()
            setNearestCampusInfo(data)
            // Auto-select the nearest campus on the UI
            const match = campuses.find(c => c.id === data.campus_id)
            if (match) setSelectedCampus(match)
          }
        } catch (err) {
          console.error('Error getting nearest campus:', err)
        } finally {
          setGeolocating(false)
        }
      },
      (error) => {
        console.warn('Geolocation permission denied or error:', error)
        setGeolocating(false)
        alert('Could not determine your location. Please select manually.')
      }
    )
  }

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    
    // Validations
    const errors = {}
    if (!isNonEmptyString(contactForm.name)) {
      errors.name = "Full name is required."
    }
    if (!isValidEmail(contactForm.email)) {
      errors.email = "Please enter a valid email address."
    }
    if (contactForm.phone && !isValidPhone(contactForm.phone)) {
      errors.phone = "Please enter a valid phone number (7-15 digits, digits and + only)."
    }
    if (!isNonEmptyString(contactForm.message)) {
      errors.message = "Message details cannot be empty."
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    setFormStatus('sending')
    try {
      const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
      const res = await fetch(`${BASE_URL}/api/cms/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      if (res.ok) {
        setFormStatus('sent')
        setContactForm({ name: '', email: '', phone: '', message: '' })
      } else {
        setFormStatus('error')
      }
    } catch {
      setFormStatus('error')
    }
  }

  const openBooking = (campusId) => {
    setBookingCampusId(campusId)
    setIsVisitModalOpen(true)
  }

  // Filter campuses based on manual inputs
  const filteredCampuses = campuses.filter(c => {
    if (selectedState && c.state !== selectedState) return false
    if (selectedCity && c.city !== selectedCity) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.city.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Synchronize selection with filters
  useEffect(() => {
    if (campuses.length > 0) {
      if (filteredCampuses.length > 0) {
        if (!selectedCampus || !filteredCampuses.some(c => c.id === selectedCampus.id)) {
          setSelectedCampus(filteredCampuses[0])
        }
      } else {
        setSelectedCampus(null)
      }
    }
  }, [selectedState, selectedCity, searchQuery, campuses])

  // Unique States & Cities in loaded campuses
  const statesList = [...new Set(campuses.map(c => c.state))]
  const citiesList = selectedState ? [...new Set(campuses.filter(c => c.state === selectedState).map(c => c.city))] : [...new Set(campuses.map(c => c.city))]

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 pb-20">
      
      {/* 1. Header & Hero */}
      <section className="bg-gradient-to-r from-academic-blue to-slate-900 py-20 px-4 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(212,175,55,0.1),transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-academic-gold/25 border border-academic-gold/45 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-academic-gold">
            <Sparkles size={14} className="animate-spin-slow" /> Connect With EduNova
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight">Institutional Contacts & Campus Locations</h1>
          <p className="font-body text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Locate our premium branch campuses, coordinate your visits, apply for admissions, or consult with our administrative offices.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Head Office & Contact Form */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Head Office Details */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-academic-gold/10 px-4 py-1.5 rounded-bl-2xl text-xs font-semibold text-academic-gold border-l border-b border-slate-100 font-sub">
              Headquarters
            </div>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Building className="text-academic-blue" size={22} /> {headOffice.brand}
            </h2>
            
            <div className="space-y-4 text-sm font-body text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="text-slate-400 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-slate-800">{headOffice.name}</p>
                  <p>{headOffice.address}, {headOffice.city}, {headOffice.state} - {headOffice.postalCode}, {headOffice.country}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-slate-400 flex-shrink-0" size={18} />
                <p>Phone: <span className="text-slate-800 font-medium">{headOffice.phone}</span></p>
              </div>

              <div className="flex items-center gap-3">
                <PhoneCall className="text-academic-gold flex-shrink-0" size={18} />
                <p>Emergency: <span className="text-red-600 font-semibold">{headOffice.emergencyContact}</span></p>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-slate-400 flex-shrink-0" size={18} />
                <p>Email: <a href={`mailto:${headOffice.email}`} className="text-academic-blue hover:underline">{headOffice.email}</a></p>
              </div>

              <div className="flex items-center gap-3">
                <Globe className="text-slate-400 flex-shrink-0" size={18} />
                <p>Web: <a href={`https://${headOffice.website}`} target="_blank" rel="noreferrer" className="text-academic-blue hover:underline">{headOffice.website}</a></p>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-slate-400 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-slate-800">Office Hours</p>
                  <p>{headOffice.workingHours}</p>
                </div>
              </div>
            </div>

            {/* HO Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-50">
              <a href={`tel:${headOffice.phone}`} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-3 px-2 rounded-xl transition-all">
                <PhoneCall size={14} /> Call Now
              </a>
              <a href={`mailto:${headOffice.email}`} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-3 px-2 rounded-xl transition-all">
                <Mail size={14} /> Email Us
              </a>
              <button 
                onClick={() => openBooking('')}
                className="col-span-2 flex items-center justify-center gap-2 bg-academic-blue hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all"
              >
                <Calendar size={14} /> Schedule Campus Visit
              </button>
            </div>
          </div>

          {/* Quick Connect Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-heading text-lg font-bold text-slate-900 mb-4">Send a Message</h3>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <input 
                  required 
                  placeholder="Full Name" 
                  value={contactForm.name} 
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/15 ${
                    validationErrors.name ? "border-red-500" : "border-slate-100"
                  }`} 
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input 
                    required 
                    type="email" 
                    placeholder="Email" 
                    value={contactForm.email} 
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/15 ${
                      validationErrors.email ? "border-red-500" : "border-slate-100"
                    }`} 
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <input 
                    placeholder="Phone" 
                    value={contactForm.phone} 
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/15 ${
                      validationErrors.phone ? "border-red-500" : "border-slate-100"
                    }`} 
                  />
                  {validationErrors.phone && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              </div>
              <div>
                <textarea 
                  required 
                  placeholder="Your message details..." 
                  rows={4} 
                  value={contactForm.message} 
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/15 ${
                    validationErrors.message ? "border-red-500" : "border-slate-100"
                  }`} 
                />
                {validationErrors.message && (
                  <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.message}</p>
                )}
              </div>
              <button 
                type="submit" 
                disabled={formStatus === 'sending'} 
                className="btn-primary w-full py-3 rounded-xl font-semibold transition-all shadow-sm"
              >
                {formStatus === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
              {formStatus === 'sent' && <p className="text-green-600 text-xs text-center font-semibold">Message sent! We will follow up shortly.</p>}
              {formStatus === 'error' && <p className="text-red-600 text-xs text-center font-semibold">Error submitting message. Please check connection.</p>}
            </form>
          </div>

          {/* Key School Statistics (Requirements Document) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-academic-gold" size={20} /> EduNova Scale & Strength
            </h3>
            <p className="text-xs text-slate-500 font-sub">Stats directly from institutional registry</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="font-numbers text-2xl font-extrabold text-academic-blue">6,500+</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Students</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="font-numbers text-2xl font-extrabold text-academic-gold">150+</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">School Buses</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="font-numbers text-2xl font-extrabold text-academic-green">350+</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Teachers</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="font-numbers text-2xl font-extrabold text-red-500">100%</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Digital Campus</p>
              </div>
            </div>
          </div>

          {/* Departmental Directory */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <Mail className="text-academic-blue" size={20} /> Departmental Helplines
            </h3>
            <p className="text-xs text-slate-500 font-sub text-left">Connect directly with regional coordinators and support desks</p>
            <div className="space-y-3 text-xs font-body text-slate-600">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">Admissions Helpline</span>
                <a href="mailto:admissions@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium">admissions@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">Academic Affairs</span>
                <a href="mailto:academics@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium">academics@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">Student & Parent Support</span>
                <a href="mailto:support@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium font-medium">support@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">Transport Registry</span>
                <a href="mailto:transport@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium">transport@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">Hostel Desk</span>
                <a href="mailto:hostel@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium">hostel@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="font-semibold text-slate-800">IT Department Helpdesk</span>
                <a href="mailto:it@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium font-medium">it@edunovaacademy.edu.in</a>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="font-semibold text-slate-800">Finance & Accounts Cell</span>
                <a href="mailto:accounts@edunovaacademy.edu.in" className="text-academic-blue hover:underline font-medium font-medium">accounts@edunovaacademy.edu.in</a>
              </div>
            </div>
          </div>

        </div>

        {/* MIDDLE & RIGHT COLUMNS: Map & Location Finder & Branch Lists */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Location Finder Module */}
          <div className="bg-gradient-to-br from-academic-blue to-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="font-heading text-lg font-bold flex items-center gap-2 mb-2">
              <Compass className="text-academic-gold" size={20} /> Intelligent Campus Locator
            </h3>
            <p className="text-xs text-slate-300 font-body mb-5">
              Let us identify your closest EduNova global academy. Grant geolocation permission or filter manually.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-300 mb-1">State</label>
                <select 
                  value={selectedState} 
                  onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(''); }}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="" className="text-slate-900">All States</option>
                  {statesList.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-300 mb-1">City</label>
                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="" className="text-slate-900">All Cities</option>
                  {citiesList.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-300 mb-1">Select Branch</label>
                <select 
                  value={selectedCampus ? selectedCampus.id : ''} 
                  onChange={(e) => {
                    const match = campuses.find(c => String(c.id) === String(e.target.value))
                    if (match) {
                      setSelectedCampus(match)
                      setSelectedState(match.state)
                      setSelectedCity(match.city)
                    } else {
                      setSelectedCampus(null)
                    }
                  }}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="" className="text-slate-900">Choose a Branch...</option>
                  {filteredCampuses.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-300 mb-1">Search</label>
                <div className="relative">
                  <input 
                    placeholder="Search campus..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-slate-400"
                  />
                  <Search size={14} className="absolute left-2.5 top-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <button 
                onClick={handleDetectLocation}
                disabled={geolocating}
                className="flex items-center gap-2 bg-academic-gold hover:bg-yellow-500 text-bg-dark font-bold text-xs px-4 py-3 rounded-xl shadow-sm transition-all"
              >
                <Navigation size={14} className={geolocating ? "animate-spin" : ""} />
                {geolocating ? 'Detecting Location...' : 'Find Nearest Campus'}
              </button>

              {nearestCampusInfo && (
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs space-y-1 animate-fade-in">
                  <p className="font-semibold text-academic-gold">
                    📍 You are closest to our {nearestCampusInfo.nearest_campus}!
                  </p>
                  <p className="text-slate-300 font-body">
                    Distance: <span className="font-semibold text-white">{nearestCampusInfo.distance_km} km away</span> · Est. Travel Time: <span className="font-semibold text-white">{nearestCampusInfo.estimated_travel_time_mins} mins</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Campus Map View */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Interactive Campuses Map</h3>
                <p className="text-xs text-slate-500 font-sub">Explore campus markers and layouts visually</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMapMode(m => m === 'Standard' ? 'Satellite' : m === 'Satellite' ? 'Terrain' : 'Standard')}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 text-xs px-3 py-2 rounded-xl transition-all"
                >
                  <Layers size={12} /> {mapMode} View
                </button>
                <button 
                  onClick={() => setFullScreen(!fullScreen)}
                  className="bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 p-2 rounded-xl transition-all"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Map Canvas Visualizer */}
            <div className={`relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner transition-all duration-300 ${fullScreen ? 'h-[500px]' : 'h-[360px]'}`}>
              {/* Zoom indicators */}
              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
                <button onClick={() => setZoomLevel(z => Math.min(z + 1, 15))} className="w-9 h-9 bg-white hover:bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shadow-md font-bold transition-all"><ZoomIn size={16} /></button>
                <button onClick={() => setZoomLevel(z => Math.max(z - 1, 5))} className="w-9 h-9 bg-white hover:bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shadow-md font-bold transition-all"><ZoomOut size={16} /></button>
              </div>

              {/* Satellite / Terrain Overlay Simulator */}
              <div className={`absolute inset-0 opacity-20 pointer-events-none transition-opacity ${mapMode === 'Satellite' ? 'bg-emerald-950/40 mix-blend-overlay' : mapMode === 'Terrain' ? 'bg-amber-950/20' : ''}`} />

              {/* North India Map Sketch Graphic (Delhi NCR, Jaipur, Lucknow region) */}
              <svg className="w-full h-full opacity-60 pointer-events-none text-slate-800" viewBox="0 0 800 600" fill="none">
                {/* Major Expressways / Highways */}
                <path d="M 400,300 L 450,220" stroke="#ffd700" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                <path d="M 400,300 L 530,340" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                <path d="M 400,300 L 250,420" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                <path d="M 400,300 L 520,180" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                
                {/* River Yamuna simulation */}
                <path d="M 380,50 Q 420,200 400,300 T 480,450 T 600,550" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
                <path d="M 380,50 Q 420,200 400,300 T 480,450 T 600,550" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

                {/* Animated Route Line from Head Office (Dwarka) to Selected Branch */}
                {selectedCampus && selectedCampus.id !== 1 && (() => {
                  let targetLeft = 400;
                  let targetTop = 300;
                  if (selectedCampus.name.includes("Noida")) { targetLeft = 430; targetTop = 295; }
                  else if (selectedCampus.name.includes("Gurugram")) { targetLeft = 370; targetTop = 320; }
                  else if (selectedCampus.name.includes("Faridabad")) { targetLeft = 415; targetTop = 330; }
                  else if (selectedCampus.name.includes("Jaipur")) { targetLeft = 240; targetTop = 410; }
                  else if (selectedCampus.name.includes("Lucknow")) { targetLeft = 550; targetTop = 360; }

                  if (targetLeft === 400 && targetTop === 300) return null;

                  return (
                    <>
                      <defs>
                        <linearGradient id="routeGrad" x1="400" y1="300" x2={targetLeft} y2={targetTop} gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FBBF24" />
                          <stop offset="100%" stopColor="#F97316" />
                        </linearGradient>
                      </defs>
                      {/* Outer shadow glow path */}
                      <line 
                        x1="400" 
                        y1="300" 
                        x2={targetLeft} 
                        y2={targetTop} 
                        stroke="url(#routeGrad)" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        opacity="0.4"
                        className="blur-sm"
                      />
                      {/* Inner dashed moving path */}
                      <line 
                        x1="400" 
                        y1="300" 
                        x2={targetLeft} 
                        y2={targetTop} 
                        stroke="url(#routeGrad)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeDasharray="6,6"
                        className="animate-dash"
                      />
                      <style>{`
                        @keyframes dash {
                          to {
                            stroke-dashoffset: -20;
                          }
                        }
                        .animate-dash {
                          animation: dash 1s linear infinite;
                          pointer-events: none;
                        }
                      `}</style>
                    </>
                  )
                })()}
              </svg>

              {/* Delhi Area boundaries indicator */}
              <div className="absolute top-[280px] left-[380px] w-24 h-24 border border-dashed border-white/10 rounded-full flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Delhi NCR</span>
              </div>

              {/* Branch Campus Markers */}
              {filteredCampuses.map(c => {
                // Map lat/long coordinates onto our custom vector grid relative position
                // Noida is slightly east of Dwarka (400px, 300px)
                // Gurugram is slightly southwest
                // Faridabad is southeast
                // Jaipur is far southwest (longer distance)
                // Lucknow is far east
                let top = 300
                let left = 400
                if (c.name.includes("Noida")) { left = 430; top = 295; }
                else if (c.name.includes("Gurugram")) { left = 370; top = 320; }
                else if (c.name.includes("Faridabad")) { left = 415; top = 330; }
                else if (c.name.includes("Jaipur")) { left = 240; top = 410; }
                else if (c.name.includes("Lucknow")) { left = 550; top = 360; }
                else if (c.name.includes("Head Office") || c.name.includes("Dwarka")) { left = 400; top = 300; }

                const isCurrentlySelected = selectedCampus && selectedCampus.id === c.id
                const isHQ = c.name.includes("Head Office") || c.name.includes("Dwarka")

                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedCampus(c)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-10 flex flex-col items-center"
                    style={{ top: `${top}px`, left: `${left}px` }}
                  >
                    <div className={`rounded-full border-2 border-white shadow-lg transition-all duration-200 group-hover:scale-125
                      ${isCurrentlySelected ? 'bg-red-500 w-4 h-4 ring-4 ring-red-500/20' : isHQ ? 'bg-academic-gold w-4 h-4 animate-pulse' : 'bg-academic-blue w-3.5 h-3.5'}`} 
                    />
                    <span className={`text-[9px] px-2 py-0.5 rounded-md mt-1 shadow-md font-medium whitespace-nowrap transition-colors
                      ${isCurrentlySelected ? 'bg-red-500 text-white' : isHQ ? 'bg-slate-900 border border-slate-800 text-academic-gold font-semibold' : 'bg-slate-800 border border-slate-700 text-slate-200 group-hover:bg-slate-700'}`}>
                      {isHQ ? `⭐ ${c.name}` : c.name}
                    </span>
                  </button>
                )
              })}

              {/* Clicked Info Window Popup Simulation */}
              {selectedCampus && (
                <div className="absolute top-4 left-4 max-w-xs bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 text-white shadow-2xl animate-slide-in">
                  <h4 className="font-heading text-sm font-bold text-academic-gold flex items-center gap-1.5">
                    📍 {selectedCampus.name}
                  </h4>
                  <p className="text-[11px] text-slate-300 font-body mt-1 leading-relaxed">{selectedCampus.address}</p>
                  
                  <div className="mt-3 text-[10px] space-y-1.5 text-slate-400 font-sub border-t border-white/5 pt-2.5">
                    <p>Phone: <span className="text-white">{selectedCampus.phone}</span></p>
                    <p>Hours: <span className="text-white">{selectedCampus.office_hours}</span></p>
                    {selectedCampus.programs && (
                      <p className="truncate">Programs: <span className="text-white">{Array.isArray(selectedCampus.programs) ? selectedCampus.programs.join(', ') : selectedCampus.programs}</span></p>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => openBooking(selectedCampus.id === 'HO' ? '' : selectedCampus.id)} 
                      className="flex-1 bg-academic-blue hover:bg-slate-800 text-[10px] font-bold py-2 rounded-lg text-center transition-colors"
                    >
                      Visit Campus
                    </button>
                    <a 
                      href={`https://maps.google.com/?q=${selectedCampus.latitude},${selectedCampus.longitude}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg text-xs transition-colors"
                      title="Google Maps Directions"
                    >
                      <Navigation size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Branch Campus Listing Grid */}
          <div className="space-y-6">
            <h3 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
              Our Branch Campuses <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">{filteredCampuses.length}</span>
            </h3>

            {loading ? (
              <div className="text-center py-10 text-slate-400 font-sub">Loading campus locations...</div>
            ) : filteredCampuses.length === 0 ? (
              <div className="text-center bg-white border border-slate-100 rounded-3xl py-12 text-slate-400 font-sub">No campuses matching filter criteria.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCampuses.map(c => {
                  const isExpanded = expandedCampusId === c.id

                  // Static local fallback images if imageUrl isn't set
                  let fallbackImage = '/noida_campus.png'
                  if (c.name.includes("Gurugram")) fallbackImage = '/gurugram_campus.png'
                  if (c.name.includes("Jaipur")) fallbackImage = '/jaipur_campus.png'
                  if (c.name.includes("Lucknow")) fallbackImage = '/exterior.jpeg'
                  if (c.name.includes("Faridabad")) fallbackImage = '/building.jpeg'
                  if (c.name.includes("Head Office") || c.name.includes("Dwarka")) fallbackImage = '/Campus.jpeg'

                  return (
                    <div key={c.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
                      
                      {/* Image Header */}
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        <img 
                          src={c.image_url || fallbackImage} 
                          alt={c.name} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute top-3 right-3 bg-academic-blue/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {c.city}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h4 className="font-heading text-lg font-bold text-slate-900">{c.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 font-body">{c.address}, {c.city}, {c.state} - {c.postal_code}</p>
                          
                          {/* Student / Faculty quick counters */}
                          <div className="flex gap-4 mt-3 text-[10px] text-slate-500 font-medium">
                            <span>Students: <strong className="text-slate-800">{c.student_count}</strong></span>
                            <span>Faculty: <strong className="text-slate-800">{c.faculty_count}</strong></span>
                          </div>
                        </div>

                        {/* Facilities & Programs Tags */}
                        <div className="space-y-2">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Programs Offered</span>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(c.programs) ? c.programs : []).slice(0, 3).map(p => (
                                <span key={p} className="bg-slate-50 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-slate-100">{p}</span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Core Facilities</span>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(c.facilities) ? c.facilities : []).slice(0, 3).map(f => (
                                <span key={f} className="bg-academic-gold/10 text-academic-blue text-[9px] font-bold px-2 py-0.5 rounded-full">{f}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-50 flex gap-2">
                          <button 
                            onClick={() => openBooking(c.id)}
                            className="flex-1 bg-academic-blue hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                          >
                            Book Visit
                          </button>
                          <a 
                            href={`https://maps.google.com/?q=${c.latitude},${c.longitude}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center transition-all"
                            title="View directions on Google Maps"
                          >
                            <Navigation size={14} />
                          </a>
                          <button 
                            onClick={() => {
                              setExpandedCampusId(isExpanded ? null : c.id)
                              setExpandedSection('Overview')
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center transition-all"
                            title="Expand details"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Tabs Layout Section */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-slide-in">
                          {/* Inner Tabs header */}
                          <div className="flex border-b border-slate-200 text-xs">
                            {['Overview', 'Programs', 'Facilities', 'Admissions Office'].map(tab => (
                              <button
                                key={tab}
                                onClick={() => setExpandedSection(tab)}
                                className={`pb-2 px-3 font-semibold transition-all -mb-px
                                  ${expandedSection === tab ? 'border-b-2 border-academic-blue text-academic-blue' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* Inner Tab contents */}
                          <div className="text-xs font-body text-slate-600 leading-relaxed">
                            {expandedSection === 'Overview' && (
                              <div className="space-y-2">
                                <p><strong>Campus Administration Phone:</strong> {c.phone}</p>
                                <p><strong>Campus Inquiry Email:</strong> {c.email}</p>
                                <p><strong>Office Timings:</strong> {c.office_hours}</p>
                                <p>This location represents a fully integrated, state-of-the-art branch campus featuring standard class configurations, direct administration desks, and interactive facilities connected in real-time to the main academic registry.</p>
                              </div>
                            )}

                            {expandedSection === 'Programs' && (
                              <div className="space-y-3">
                                <p className="font-semibold text-slate-800">Complete Academic Pipeline:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                  {(Array.isArray(c.programs) ? c.programs : []).map(p => (
                                    <li key={p}>{p} Curriculum & Practical allocations</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {expandedSection === 'Facilities' && (
                              <div className="space-y-3">
                                <p className="font-semibold text-slate-800">Campus Facilities & Inventory Catalog:</p>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  {(Array.isArray(c.facilities) ? c.facilities : []).map(f => (
                                    <span key={f} className="flex items-center gap-1.5 text-slate-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-academic-gold" /> {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {expandedSection === 'Admissions Office' && (
                              <div className="space-y-3">
                                <p>For applications to this campus, consult our regional coordinator:</p>
                                <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
                                  <p><strong>Regional Desk:</strong> +91-{c.phone.slice(-10)}</p>
                                  <p><strong>Apply Now:</strong> <a href="/admissions" className="text-academic-blue font-bold hover:underline">Start Admission Form →</a></p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Booking Dialog Modal Portal */}
      <CampusVisitModal 
        isOpen={isVisitModalOpen} 
        onClose={() => setIsVisitModalOpen(false)}
        campuses={campuses}
        initialCampusId={bookingCampusId}
      />

    </div>
  )
}

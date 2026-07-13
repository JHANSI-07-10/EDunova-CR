import { useState, useEffect } from 'react'
import { Calendar, Clock, X, CheckCircle, Mail, Phone, User, FileText } from 'lucide-react'

export default function CampusVisitModal({ isOpen, onClose, campuses, initialCampusId }) {
  const [form, setForm] = useState({
    campus_id: initialCampusId || '',
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visit_date: '',
    visit_time: '',
    purpose: ''
  })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        campus_id: initialCampusId || ''
      }))
    }
  }, [isOpen, initialCampusId])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.campus_id) {
      setErrorMessage('Please select a campus.')
      return
    }
    setStatus('sending')
    try {
      const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
      const response = await fetch(`${BASE_URL}/api/campuses/visit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await response.json()
      if (response.ok) {
        setStatus('sent')
        setForm({
          campus_id: '',
          visitor_name: '',
          visitor_email: '',
          visitor_phone: '',
          visit_date: '',
          visit_time: '',
          purpose: ''
        })
      } else {
        setErrorMessage(data.detail || 'Failed to submit booking.')
        setStatus('error')
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300">
        
        {/* Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-academic-blue to-accent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
          <div>
            <h3 className="font-heading text-xl font-bold text-gray-900">Schedule Campus Visit</h3>
            <p className="text-xs text-gray-500 font-sub">Experience EduNova academy in person</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
              <CheckCircle size={36} />
            </div>
            <h4 className="font-heading text-lg font-bold text-gray-900">Visit Scheduled Successfully!</h4>
            <p className="text-sm text-gray-600 font-body max-w-sm mx-auto">
              We have received your campus visit request. Our admissions team will email you shortly to confirm your scheduled slot.
            </p>
            <button onClick={onClose} className="btn-primary w-full max-w-xs mt-4">
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {status === 'error' && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-100">
                {errorMessage}
              </div>
            )}

            {/* Campus Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Target Campus</label>
              <select
                required
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
              >
                <option value="">Select a Campus...</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                ))}
              </select>
            </div>

            {/* Visitor Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Your Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <User size={16} />
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    value={form.visitor_name}
                    onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Phone size={16} />
                  </span>
                  <input
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.visitor_phone}
                    onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={form.visitor_email}
                  onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                />
              </div>
            </div>

            {/* Visit Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Preferred Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Calendar size={16} />
                  </span>
                  <input
                    required
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.visit_date}
                    onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Preferred Time</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Clock size={16} />
                  </span>
                  <select
                    required
                    value={form.visit_time}
                    onChange={(e) => setForm({ ...form, visit_time: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                  >
                    <option value="">Select time...</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-sub uppercase tracking-wider">Purpose of Visit</label>
              <div className="relative">
                <span className="absolute top-3 left-0 pl-3.5 text-gray-400">
                  <FileText size={16} />
                </span>
                <textarea
                  placeholder="e.g. Admission inquiry for Grade 8, campus walkthrough..."
                  rows={2}
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-academic-blue/20 focus:border-academic-blue transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-primary w-full py-3.5 rounded-xl font-semibold shadow-md shadow-academic-blue/10 active:scale-95 transition-transform duration-100 mt-2"
            >
              {status === 'sending' ? 'Scheduling...' : 'Schedule Visit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

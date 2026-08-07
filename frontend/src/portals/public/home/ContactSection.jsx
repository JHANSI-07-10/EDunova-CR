import { useState } from 'react'
import { cmsApi } from '../../../api/cmsApi'
import FadeIn from '../../../components/FadeIn'
import { isValidEmail, isValidPhone, isNonEmptyString, isTextOnly } from '../../../utils/validation'

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [formErrors, setFormErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!isNonEmptyString(form.name) || !isTextOnly(form.name)) {
      errs.name = 'Please enter a valid name (letters only).'
    }
    if (!isValidEmail(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (form.phone && !isValidPhone(form.phone)) {
      errs.phone = 'Please enter a valid phone number (7–15 digits, +/space/dash allowed).'
    }
    if (!isNonEmptyString(form.message)) {
      errs.message = 'Please enter a message.'
    }
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }
    setFormErrors({})
    setStatus('sending')
    try {
      await cmsApi.submitContact(form)
      setStatus('sent')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="bg-white">
      <div className="section max-w-2xl mx-auto">
        <FadeIn>
        <h2 className="font-heading text-3xl font-bold text-center mb-8">Get in Touch</h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <input
              required placeholder="Your name (*)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 font-body ${formErrors.name ? 'border-red-400' : 'border-gray-200'}`}
            />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <input
              required type="email" placeholder="Email address (*)" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 font-body ${formErrors.email ? 'border-red-400' : 'border-gray-200'}`}
            />
            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
          </div>
          <div>
            <input
              placeholder="Phone (optional)" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 font-body ${formErrors.phone ? 'border-red-400' : 'border-gray-200'}`}
            />
            {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
          </div>
          <div>
            <textarea
              required placeholder="Your message (*)" rows={4} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 font-body ${formErrors.message ? 'border-red-400' : 'border-gray-200'}`}
            />
            {formErrors.message && <p className="text-xs text-red-500 mt-1">{formErrors.message}</p>}
          </div>
          <button type="submit" disabled={status === 'sending'} className="btn-primary w-full">
            {status === 'sending' ? 'Sending…' : 'Send Message'}
          </button>
          {status === 'sent' && <p className="text-success text-sm text-center">Message sent — we'll be in touch soon.</p>}
          {status === 'error' && <p className="text-error text-sm text-center">Something went wrong. Please try again.</p>}
        </form>
        </FadeIn>
      </div>
    </section>
  )
}

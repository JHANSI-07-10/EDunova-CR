import { useState } from 'react'
import { Card } from '../components/Common'
import api from '../lib/api'

export default function NewsAndEvents() {
  const [formData, setFormData] = useState({
    type: 'news',
    title: '',
    description: '',
    date: '',
  })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const data = new FormData()
      data.append('type', formData.type)
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('date', formData.date)
      if (file) {
        data.append('cover_image', file)
      }
      
      await api.post('/admin-portal/public-content/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setMessage('Content published successfully!')
      setFormData({ type: 'news', title: '', description: '', date: '' })
      setFile(null)
    } catch (err) {
      console.error(err)
      setMessage('Failed to publish content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-ink-primary">News & Events (Public Portal)</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          {message && (
            <div className={`p-3 rounded-xl text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Content Type</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
            >
              <option value="news">Latest News</option>
              <option value="event">Upcoming Event</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
              placeholder="Enter title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Date</label>
            <input
              required
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Description / Content</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none resize-none"
              placeholder="Enter description..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Cover Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-ink-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-academic-blue/10 file:text-academic-blue hover:file:bg-academic-blue/20 cursor-pointer"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-academic-blue text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-academic-blue/90 disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish to Website'}
          </button>
        </form>
      </Card>
    </div>
  )
}

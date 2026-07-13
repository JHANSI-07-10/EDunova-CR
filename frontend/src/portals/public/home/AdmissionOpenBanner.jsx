import { Link } from 'react-router-dom'
import { cmsApi } from '../../../api/cmsApi'
import { useFetch } from '../../../components/useFetch'

export default function AdmissionOpenBanner() {
  const { data: settings } = useFetch(cmsApi.getSettings, null)

  const open = settings?.admissions_open ?? true
  const academicYear = settings?.admissions_academic_year || 'upcoming'

  if (!open) {
    return (
      <div className="bg-slate-100 text-text-secondary border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-subheading font-semibold text-sm">
            🔒 Admissions are currently closed for the academic year. Please contact school administration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-highlight text-text-primary">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-subheading font-semibold text-sm">
          🎓 Admissions open for the {academicYear} academic year — limited seats across all programs.
        </p>
        <Link to="/admissions" className="font-subheading font-bold text-sm underline underline-offset-2">
          Apply Now →
        </Link>
      </div>
    </div>
  )
}

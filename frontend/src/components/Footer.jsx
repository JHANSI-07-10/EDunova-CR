import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      ['About', '/about'], ['Academics', '/academics'], ['Admissions', '/admissions'],
      ['Departments', '/departments'], ['Faculty', '/faculty'],
    ],
  },
  {
    heading: 'Campus',
    links: [
      ['Infrastructure', '/infrastructure'], ['Facilities', '/facilities'],
      ['Library', '/library'], ['Transport', '/transport'], ['Hostel', '/hostel'], ['Sports', '/sports'],
    ],
  },
  {
    heading: 'Community',
    links: [
      ['Gallery', '/gallery'], ['News', '/news'], ['Events', '/events'],
      ['Achievements', '/achievements'], ['Student Life', '/student-life'],
    ],
  },
  {
    heading: 'Support',
    links: [
      ['Careers', '/careers'], ['Downloads', '/downloads'], ['Contact', '/contact'],
      ['FAQ', '/faq'], ['Privacy Policy', '/privacy-policy'], ['Terms & Conditions', '/terms'],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-bg-dark text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/images/logo-icon.svg" alt="EduNova Global Academy logo" className="h-10 w-10 rounded-xl" />
            <span className="font-heading font-bold text-xl text-white">EduNova Global Academy</span>
          </div>
          <p className="font-subheading text-sm text-gray-400 mb-1">Inspiring Minds. Building Futures.</p>
          <p className="text-sm text-gray-400">www.edunovaacademy.edu.in</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h3 className="font-subheading font-bold text-white mb-3 text-sm uppercase tracking-wide">{col.heading}</h3>
            <ul className="space-y-2">
              {col.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-400 hover:text-orange-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} EduNova Global Academy Private Limited. All rights reserved.
      </div>
    </footer>
  )
}

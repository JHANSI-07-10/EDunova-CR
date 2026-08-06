import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { admissionsApi } from '../../../api/admissionsApi'
import AdmissionProcessSteps from '../home/AdmissionProcessSteps'
import ScholarshipsBanner from '../home/ScholarshipsBanner'
import FadeIn from '../../../components/FadeIn'
import { isValidEmail, isValidPhone, isNonEmptyString, isTextOnly, isExact10Digits, isGmail, isNumberOnly, isExact12Digits, isExact6Digits, isValidPercentage } from '../../../utils/validation'

const EMPTY_FORM = {
  applicant_name: '',
  date_of_birth: '',
  gender: '',
  target_class: '',
  blood_group: '',
  aadhaar_number: '',
  nationality: 'Indian',
  religion: '',
  category: 'General',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  address: '',
  source_of_enquiry: 'Website',
  preferred_branch: '',
  curriculum: 'CBSE',
  scholarship_applied: false,
  father_name: '',
  father_occupation: '',
  father_company: '',
  father_income: '',
  father_phone: '',
  father_email: '',
  mother_name: '',
  mother_occupation: '',
  mother_company: '',
  mother_phone: '',
  mother_email: '',
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
  guardian_address: '',
  permanent_address: '',
  communication_address: '',
  pincode: '',
  state: '',
  city: '',
  prev_school_name: '',
  board: '',
  prev_school_grade: '',
  percentage: '',
  reason_for_leaving: '',
  allergies: '',
  medical_details: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
}

const CLASSES = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12',
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'Cambridge', 'IB', 'Other']

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS']

const REQUIRED_DOCS = [
  'Birth Certificate',
  'Aadhaar Card',
  'Passport Size Photo (Optional)',
  'Parent/Guardian ID Proof (Optional)',
  'Address Proof (Optional)',
  'Previous Marks Memo (Optional)',
  'Transfer Certificate (Optional)',
]

const STEPS = [
  { num: 1, label: 'Eligibility' },
  { num: 2, label: 'Student Details' },
  { num: 3, label: 'Parent Details' },
  { num: 4, label: 'Address & Academics' },
  { num: 5, label: 'Documents' },
  { num: 6, label: 'Review' },
  { num: 7, label: 'Confirmation' },
]

const ADMISSION_FEATURES = [
  { title: 'Online Registration', desc: 'Submit the admission enquiry form digitally from anywhere.', icon: FileText },
  { title: 'Admin Review', desc: 'Admissions team reviews every application carefully.', icon: ShieldCheck },
  { title: 'Confirmation', desc: 'Receive registration number and application status updates.', icon: Mail },
  { title: 'Student Onboarding', desc: 'Selected applicants move to student profile and class allocation.', icon: Users },
]

function FormInput({ label, required, error, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        {...props}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-academic-blue'
        }`}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function FormSelect({ label, required, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        {...props}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-academic-blue'
        }`}
      >
        {children}
      </select>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function FormTextarea({ label, required, error, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        {...props}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-academic-blue'
        }`}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function Admissions() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedFiles, setSelectedFiles] = useState({})
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityReason, setEligibilityReason] = useState('')

  const update = (field) => (e) => {
    if (field === 'date_of_birth' && eligibilityChecked && isEligible) return
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    
    let updates = { [field]: value }
    
    if (field === 'address') updates.permanent_address = value
    if (field === 'permanent_address') updates.address = value
    if (field === 'pincode') updates.pin_code = value
    if (field === 'pin_code') updates.pincode = value

    if (['father_name', 'mother_name', 'guardian_name'].includes(field)) {
      updates.parent_name = value || form.father_name || form.mother_name || form.guardian_name || ''
    }
    if (['father_phone', 'mother_phone', 'guardian_phone'].includes(field)) {
      updates.parent_phone = value || form.father_phone || form.mother_phone || form.guardian_phone || ''
    }
    if (['father_email', 'mother_email'].includes(field)) {
      updates.parent_email = value || form.father_email || form.mother_email || ''
    }

    setForm(prev => ({ ...prev, ...updates }))
    if (field === 'date_of_birth' || field === 'target_class') {
      setEligibilityChecked(false)
      setIsEligible(false)
    }
  }

  const handleFileChange = (docType) => (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles({ ...selectedFiles, [docType]: e.target.files[0] })
    }
  }

  const checkEligibility = (e) => {
    e.preventDefault()
    if (!form.target_class || !form.date_of_birth) {
      setErrorMsg('Please select a target class and enter a date of birth.')
      return
    }
    const birthYear = new Date(form.date_of_birth).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    if (isNaN(age) || age < 1) {
      setIsEligible(false)
      setEligibilityReason('Please enter a valid date of birth.')
    } else if (age < 3) {
      setIsEligible(false)
      setEligibilityReason(`Applicants must be at least 3 years old. (Current age: ${age})`)
    } else {
      setIsEligible(true)
      setEligibilityReason(`Eligible! Age: ${age} years meets requirements for ${form.target_class}.`)
    }
    setEligibilityChecked(true)
  }

  const validateStep = (s) => {
    const errs = {}
    if (s === 2) {
      if (!isNonEmptyString(form.applicant_name) || !isTextOnly(form.applicant_name)) errs.applicant_name = 'Valid text required'
      if (!form.gender) errs.gender = 'Required'
      if (!form.date_of_birth) errs.date_of_birth = 'Required'
      if (form.aadhaar_number && !isExact12Digits(form.aadhaar_number)) errs.aadhaar_number = 'Valid 12-digit number required'
      if (form.nationality && !isTextOnly(form.nationality)) errs.nationality = 'Valid text required'
      if (form.religion && !isTextOnly(form.religion)) errs.religion = 'Valid text required'
    }
    if (s === 3) {
      if (!isNonEmptyString(form.father_name) || !isTextOnly(form.father_name)) errs.father_name = 'Valid text required'
      if (form.father_occupation && !isTextOnly(form.father_occupation)) errs.father_occupation = 'Valid text required'
      if (form.father_company && !isTextOnly(form.father_company)) errs.father_company = 'Valid text required'
      if (form.father_income && !isNumberOnly(form.father_income)) errs.father_income = 'Valid number required'
      if (!isExact10Digits(form.father_phone)) errs.father_phone = 'Valid 10-digit phone required'
      if (!form.father_email) {
        errs.father_email = 'Required'
      } else if (!isGmail(form.father_email)) {
        errs.father_email = 'Valid gmail required'
      }
      
      if (!isNonEmptyString(form.mother_name) || !isTextOnly(form.mother_name)) errs.mother_name = 'Valid text required'
      if (form.mother_occupation && !isTextOnly(form.mother_occupation)) errs.mother_occupation = 'Valid text required'
      if (form.mother_company && !isTextOnly(form.mother_company)) errs.mother_company = 'Valid text required'
      if (form.mother_phone && !isExact10Digits(form.mother_phone)) errs.mother_phone = 'Valid 10-digit phone required'
      if (form.mother_email && !isGmail(form.mother_email)) errs.mother_email = 'Valid gmail required'
      
      if (form.guardian_name && !isTextOnly(form.guardian_name)) errs.guardian_name = 'Valid text required'
      if (form.guardian_relationship && !isTextOnly(form.guardian_relationship)) errs.guardian_relationship = 'Valid text required'
      if (form.guardian_phone && !isExact10Digits(form.guardian_phone)) errs.guardian_phone = 'Valid 10-digit phone required'
    }
    if (s === 4) {
      if (!isNonEmptyString(form.address)) errs.address = 'Required'
      if (form.pincode && !isExact6Digits(form.pincode)) errs.pincode = 'Valid 6-digit pincode required'
      if (form.state && !isTextOnly(form.state)) errs.state = 'Valid text required'
      if (form.city && !isTextOnly(form.city)) errs.city = 'Valid text required'
      if (form.percentage && !isValidPercentage(form.percentage)) errs.percentage = 'Valid percentage required'
      if (form.emergency_contact_name && !isTextOnly(form.emergency_contact_name)) errs.emergency_contact_name = 'Valid text required'
      if (form.emergency_contact_phone && !isExact10Digits(form.emergency_contact_phone)) errs.emergency_contact_phone = 'Valid 10-digit phone required'
      if (form.emergency_contact_relation && !isTextOnly(form.emergency_contact_relation)) errs.emergency_contact_relation = 'Valid text required'
      if (form.preferred_branch && !isTextOnly(form.preferred_branch)) errs.preferred_branch = 'Valid text required'
    }
    if (s === 5) {
      let requiredDocs = ['birth_certificate', 'aadhaar_card']
      requiredDocs.forEach(doc => {
        if (!selectedFiles[doc]) {
          errs[`doc_${doc}`] = 'Required'
        }
      })
    }
    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          formData.append(key, val)
        }
      })
      Object.entries(selectedFiles).forEach(([docType, file]) => {
        formData.append(`doc_${docType}`, file)
      })
      const data = await admissionsApi.submit(formData)
      setResult(data)
      setStatus('success')
      setStep(7)
    } catch (err) {
      setStatus('error')
      const apiErrors = err?.response?.data
      if (typeof apiErrors === 'string') {
        setErrorMsg(apiErrors.includes('<html') || apiErrors.trim().startsWith('<') ? 'Server Error (500): Please try again later or check server logs.' : apiErrors)
      } else {
        setErrorMsg(
          apiErrors
            ? Object.entries(apiErrors)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join(' / ')
            : 'Something went wrong. Please try again.'
        )
      }
    }
  }

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img src="/images/Campus.jpeg" alt="EduNova admissions" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <Sparkles size={15} /> Admissions Open
            </p>
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Begin Your Child's Learning Journey
            </h1>
            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              Complete the online registration form with all required details, upload documents,
              and allow our admissions team to review your application.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#admission-steps" className="inline-flex items-center gap-2 btn-primary">
                Apply Now <ArrowRight size={18} />
              </a>
              <Link to="/contact" className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors">
                Contact Admissions
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="admission-steps" className="bg-bg-light py-12">
        <div className="section grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <FadeIn>
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
                {/* Progress Indicators */}
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4 overflow-x-auto gap-1">
                  {STEPS.map((s) => (
                    <div key={s.num} className="flex items-center gap-1 shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step >= s.num ? 'bg-academic-blue text-white shadow-md' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {s.num}
                      </div>
                      <span className={`text-[10px] font-medium hidden sm:inline ${
                        step === s.num ? 'text-academic-blue font-semibold' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 1: ELIGIBILITY CHECK */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 1 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Check Eligibility</h2>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h3 className="font-subheading font-bold text-primary text-md flex items-center gap-2">
                        <GraduationCap className="text-secondary" size={20} /> Eligibility Checker
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-ink-secondary">Select target class <span className="text-red-400">*</span></label>
                          <select value={form.target_class} onChange={update('target_class')} disabled={eligibilityChecked && isEligible}
                            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-60 disabled:bg-gray-100">
                            <option value="">Select target class</option>
                            {CLASSES.map((item) => (<option key={item} value={item}>{item}</option>))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-ink-secondary">Applicant date of birth <span className="text-red-400">*</span></label>
                          <input type="date" max={new Date().toISOString().split('T')[0]} value={form.date_of_birth} disabled={eligibilityChecked && isEligible}
                            onChange={update('date_of_birth')}
                            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-gray-100" />
                        </div>
                      </div>
                      <button onClick={checkEligibility}
                        className="bg-academic-blue text-white rounded-xl py-2 px-6 font-medium text-sm hover:bg-academic-blue/90">
                        Check Eligibility
                      </button>
                      {eligibilityChecked && (
                        <div className={`p-4 rounded-xl border text-sm transition-all ${
                          isEligible ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                          <p className="font-semibold mb-1">{isEligible ? 'Eligible to Apply' : 'Requirements Not Met'}</p>
                          <p className="text-xs opacity-90 leading-relaxed">{eligibilityReason}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button disabled={!isEligible} onClick={() => setStep(2)}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        Fill Application Form <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: STUDENT DETAILS */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 2 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Student Details</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormInput label="Full Name" required error={validationErrors.applicant_name}
                        placeholder="Applicant full name" value={form.applicant_name} onChange={update('applicant_name')} className="sm:col-span-2" />
                      <FormSelect label="Gender" required error={validationErrors.gender} value={form.gender} onChange={update('gender')}>
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </FormSelect>
                      <FormInput label="Date of Birth" required type="date" max={new Date().toISOString().split('T')[0]} disabled
                        value={form.date_of_birth} onChange={update('date_of_birth')} />
                      <FormSelect label="Blood Group" value={form.blood_group} onChange={update('blood_group')}>
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map((bg) => (<option key={bg} value={bg}>{bg}</option>))}
                      </FormSelect>
                      <FormInput label="Aadhaar Number" error={validationErrors.aadhaar_number} placeholder="XXXX-XXXX-XXXX" value={form.aadhaar_number} onChange={update('aadhaar_number')} />
                      <FormInput label="Nationality" error={validationErrors.nationality} value={form.nationality} onChange={update('nationality')} />
                      <FormInput label="Religion" error={validationErrors.religion} value={form.religion} onChange={update('religion')} />
                      <FormSelect label="Category" value={form.category} onChange={update('category')}>
                        {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </FormSelect>
                      <FormSelect label="Curriculum" value={form.curriculum} onChange={update('curriculum')}>
                        <option value="CBSE">CBSE</option>
                        <option value="Cambridge">Cambridge</option>
                        <option value="IB">IB</option>
                        <option value="State_Board">State Board</option>
                      </FormSelect>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => setStep(1)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button onClick={() => { if (validateStep(2)) setStep(3) }} className="btn-primary flex items-center gap-2">
                        Parent Details <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PARENT / GUARDIAN DETAILS */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 3 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Parent / Guardian Details</h2>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-subheading font-bold text-primary text-sm">Father Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput label="Father Name" required error={validationErrors.father_name}
                          placeholder="Father's full name" value={form.father_name} onChange={update('father_name')} className="sm:col-span-2" />
                        <FormInput label="Occupation" error={validationErrors.father_occupation} value={form.father_occupation} onChange={update('father_occupation')} />
                        <FormInput label="Company" error={validationErrors.father_company} value={form.father_company} onChange={update('father_company')} />
                        <FormInput label="Annual Income" error={validationErrors.father_income} type="number" value={form.father_income} onChange={update('father_income')} />
                        <FormInput label="Phone" required error={validationErrors.father_phone}
                          placeholder="Father's phone" value={form.father_phone} onChange={update('father_phone')} />
                        <FormInput label="Email" required type="email" error={validationErrors.father_email} value={form.father_email} onChange={update('father_email')} />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Mother Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput label="Mother Name" required error={validationErrors.mother_name}
                          placeholder="Mother's full name" value={form.mother_name} onChange={update('mother_name')} className="sm:col-span-2" />
                        <FormInput label="Occupation" error={validationErrors.mother_occupation} value={form.mother_occupation} onChange={update('mother_occupation')} />
                        <FormInput label="Company" error={validationErrors.mother_company} value={form.mother_company} onChange={update('mother_company')} />
                        <FormInput label="Phone" error={validationErrors.mother_phone} value={form.mother_phone} onChange={update('mother_phone')} />
                        <FormInput label="Email" type="email" error={validationErrors.mother_email} value={form.mother_email} onChange={update('mother_email')} />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Guardian (if applicable)</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput label="Guardian Name" error={validationErrors.guardian_name} value={form.guardian_name} onChange={update('guardian_name')} />
                        <FormInput label="Relationship" error={validationErrors.guardian_relationship} placeholder="e.g. Uncle, Aunt" value={form.guardian_relationship} onChange={update('guardian_relationship')} />
                        <FormInput label="Phone" error={validationErrors.guardian_phone} value={form.guardian_phone} onChange={update('guardian_phone')} />
                        <FormTextarea label="Address" rows={2} value={form.guardian_address} onChange={update('guardian_address')} />
                      </div>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => setStep(2)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button onClick={() => { if (validateStep(3)) setStep(4) }} className="btn-primary flex items-center gap-2">
                        Address & Academics <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: ADDRESS, ACADEMICS, MEDICAL, EMERGENCY */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 4 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Address, Academics & Medical</h2>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-subheading font-bold text-primary text-sm">Address Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormTextarea label="Address" required error={validationErrors.address}
                          rows={2} value={form.address} onChange={update('address')} className="sm:col-span-2" />
                        <FormInput label="Pin Code" error={validationErrors.pincode} value={form.pincode} onChange={update('pincode')} />
                        <FormInput label="State" error={validationErrors.state} value={form.state} onChange={update('state')} />
                        <FormInput label="City/District" error={validationErrors.city} value={form.city} onChange={update('city')} />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Academic Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput label="Previous School" error={validationErrors.prev_school_name} value={form.prev_school_name} onChange={update('prev_school_name')} className="sm:col-span-2" />
                        <FormSelect label="Board" value={form.board} onChange={update('board')}>
                          <option value="">Select board</option>
                          {BOARDS.map((b) => (<option key={b} value={b}>{b}</option>))}
                        </FormSelect>
                        <FormSelect label="Previous Class" value={form.prev_school_grade} onChange={update('prev_school_grade')}>
                          <option value="">Select class</option>
                          {CLASSES.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </FormSelect>
                        <FormInput label="Percentage / Grade" type="number" min="0" max="100"
                          error={validationErrors.percentage} value={form.percentage} onChange={update('percentage')} />
                        <FormInput label="Reason for Leaving" error={validationErrors.reason_for_leaving} value={form.reason_for_leaving} onChange={update('reason_for_leaving')} />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Medical Information</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormTextarea label="Allergies" rows={2} placeholder="List any known allergies" value={form.allergies} onChange={update('allergies')} className="sm:col-span-2" />
                        <FormTextarea label="Medical Conditions" rows={2} placeholder="Any ongoing medical conditions" value={form.medical_details} onChange={update('medical_details')} className="sm:col-span-2" />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Emergency Contact</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput label="Contact Name" error={validationErrors.emergency_contact_name} value={form.emergency_contact_name} onChange={update('emergency_contact_name')} />
                        <FormInput label="Contact Phone" error={validationErrors.emergency_contact_phone} value={form.emergency_contact_phone} onChange={update('emergency_contact_phone')} />
                        <FormInput label="Relationship" error={validationErrors.emergency_contact_relation} value={form.emergency_contact_relation} onChange={update('emergency_contact_relation')} />
                      </div>

                      <hr className="border-gray-100" />
                      <h3 className="font-subheading font-bold text-primary text-sm">Enquiry Source</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormSelect label="How did you hear about us?" value={form.source_of_enquiry} onChange={update('source_of_enquiry')}>
                          <option value="Website">Website</option>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="Referral">Referral</option>
                          <option value="Social_Media">Social Media</option>
                          <option value="Advertisement">Advertisement</option>
                        </FormSelect>
                        <FormInput label="Preferred Branch" error={validationErrors.preferred_branch} value={form.preferred_branch} onChange={update('preferred_branch')} />
                      </div>

                      <label className="flex items-center gap-3 text-sm text-text-primary bg-bg-light rounded-xl p-4 border border-gray-100 cursor-pointer">
                        <input type="checkbox" checked={form.scholarship_applied} onChange={update('scholarship_applied')} className="w-4 h-4" />
                        I would like to apply for a scholarship
                      </label>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => setStep(3)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button onClick={() => { if (validateStep(4)) setStep(5) }} className="btn-primary flex items-center gap-2">
                        Upload Documents <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: DOCUMENT UPLOAD */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 5 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Upload Documents</h2>
                      <p className="text-sm text-text-secondary">Upload digital copies of required documents (PDF/JPG/PNG, max 5MB each).</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { id: 'birth_certificate', label: 'Birth Certificate', required: true },
                        { id: 'aadhaar_card', label: 'Aadhaar Card', required: true },
                        { id: 'passport_photo', label: 'Passport Photo', required: false },
                        { id: 'parent_id', label: 'Parent ID Proof', required: false },
                        { id: 'address_proof', label: 'Address Proof', required: false },
                        { id: 'previous_marks', label: 'Previous Marks Memo', required: false },
                        { id: 'transfer_certificate', label: 'Transfer Certificate', required: false }
                      ].map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <FileText size={18} className="text-academic-blue shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700">
                              {doc.label} {doc.required && <span className="text-red-400">*</span>}
                            </p>
                            {selectedFiles[doc.id] ? (
                              <p className="text-[11px] text-emerald-600 truncate">{selectedFiles[doc.id].name}</p>
                            ) : (
                              <p className="text-[11px] text-slate-400">Not uploaded {validationErrors[`doc_${doc.id}`] && <span className="text-red-500 font-bold ml-2">Required</span>}</p>
                            )}
                          </div>
                          <label className="shrink-0 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer hover:bg-slate-50">
                            {selectedFiles[doc.id] ? 'Change' : 'Choose'}
                            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange(doc.id)} className="hidden" />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => setStep(4)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button onClick={() => { if (validateStep(5)) setStep(6) }} className="btn-primary flex items-center gap-2">
                        Review Application <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW */}
                {step === 6 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">Step 6 of 6</p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">Review Your Application</h2>
                    </div>
                    <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-ink-secondary">Applicant Name</p><p className="font-semibold">{form.applicant_name}</p></div>
                        <div><p className="text-xs text-ink-secondary">Target Class</p><p className="font-semibold">{form.target_class}</p></div>
                        <div><p className="text-xs text-ink-secondary">Gender</p><p className="font-semibold">{form.gender}</p></div>
                        <div><p className="text-xs text-ink-secondary">Date of Birth</p><p className="font-semibold">{form.date_of_birth}</p></div>
                        <div><p className="text-xs text-ink-secondary">Blood Group</p><p className="font-semibold">{form.blood_group || 'N/A'}</p></div>
                        <div><p className="text-xs text-ink-secondary">Curriculum</p><p className="font-semibold">{form.curriculum}</p></div>
                        <div className="col-span-2"><p className="text-xs text-ink-secondary">Father Name</p><p className="font-semibold">{form.father_name || form.parent_name}</p></div>
                        <div className="col-span-2"><p className="text-xs text-ink-secondary">Mother Name</p><p className="font-semibold">{form.mother_name}</p></div>
                        <div><p className="text-xs text-ink-secondary">Parent Phone</p><p className="font-semibold">{form.parent_phone}</p></div>
                        <div><p className="text-xs text-ink-secondary">Parent Email</p><p className="font-semibold">{form.parent_email}</p></div>
                        <div className="col-span-2"><p className="text-xs text-ink-secondary">Address</p><p className="font-semibold leading-relaxed">{form.address || form.permanent_address}</p></div>
                        <div><p className="text-xs text-ink-secondary">Previous School</p><p className="font-semibold">{form.previous_school || 'N/A'}</p></div>
                        <div><p className="text-xs text-ink-secondary">Board</p><p className="font-semibold">{form.board || 'N/A'}</p></div>
                        <div className="col-span-2"><p className="text-xs text-ink-secondary">Uploaded Documents</p>
                          <p className="font-semibold text-emerald-700">{Object.keys(selectedFiles).filter(k => selectedFiles[k]).length} files</p>
                        </div>
                      </div>
                    </div>
                    {errorMsg && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-4">{errorMsg}</div>
                    )}
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button onClick={() => setStep(5)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button disabled={status === 'submitting'} onClick={handleSubmit}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50">
                        {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 7: SUCCESS */}
                {step === 7 && result && (
                  <div className="rounded-3xl border border-secondary bg-secondary/5 p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <CheckCircle2 size={30} className="text-secondary" />
                    </div>
                    <h2 className="font-heading text-2xl font-bold text-secondary">Application Submitted Successfully</h2>
                    <div>
                      <p className="text-text-primary text-sm mb-1">Your Registration Number is:</p>
                      <p className="font-numbers text-3xl font-bold text-primary">{result.registration_number}</p>
                    </div>
                    <div className="text-sm text-text-secondary leading-relaxed space-y-2">
                      <p>A confirmation email has been sent to <strong>{result.father_email || result.mother_email}</strong>.</p>
                      <p>Your application is now <strong>{result.status}</strong>. The admissions team will review it shortly.</p>
                    </div>
                    <button className="btn-outline mt-6" onClick={() => { setStep(1); setResult(null); setStatus('idle'); setForm(EMPTY_FORM); setSelectedFiles({}) }}>
                      Submit Another Application
                    </button>
                  </div>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Right Sidebar */}
          <FadeIn delay={100}>
            <aside className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Phone size={24} className="text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold text-primary mb-3">Admissions Helpdesk</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
                  Need help? Contact our admissions team for guidance.
                </p>
                <Link to="/contact" className="font-subheading font-bold text-accent">Contact Admissions →</Link>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <GraduationCap size={24} className="text-accent" />
                </div>
                <h3 className="font-heading text-xl font-bold text-primary mb-4">Required Documents</h3>
                <div className="space-y-3">
                  {REQUIRED_DOCS.map((doc) => (
                    <div key={doc} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-secondary shrink-0 mt-0.5" />
                      <p className="font-body text-sm text-text-secondary">{doc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-primary rounded-3xl p-6 text-white shadow-xl">
                <h3 className="font-heading text-xl font-bold mb-3">Track After Submission</h3>
                <p className="font-body text-sm text-blue-100 leading-relaxed">
                  Save your registration number to track your application status.
                </p>
              </div>
            </aside>
          </FadeIn>
        </div>
      </section>
      <AdmissionProcessSteps />
      <ScholarshipsBanner />
    </main>
  )
}

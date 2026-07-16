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
} from 'lucide-react'
import { admissionsApi } from '../../../api/admissionsApi'
import AdmissionProcessSteps from '../home/AdmissionProcessSteps'
import ScholarshipsBanner from '../home/ScholarshipsBanner'
import FadeIn from '../../../components/FadeIn'
import { isValidEmail, isValidPhone, isNonEmptyString } from '../../../utils/validation'

const EMPTY_FORM = {
  applicant_name: '',
  date_of_birth: '',
  gender: '',
  target_class: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  address: '',
  scholarship_applied: false,
}

const CLASSES = [
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
]

const REQUIRED_DOCS = [
  'Student birth certificate or valid ID proof',
  'Previous academic records, if applicable',
  'Parent / Guardian contact details',
  'Address and emergency contact information',
]

const ADMISSION_FEATURES = [
  {
    title: 'Online Registration',
    desc: 'Submit the admission enquiry form digitally from anywhere.',
    icon: FileText,
  },
  {
    title: 'Admin Review',
    desc: 'Admissions team reviews every application carefully.',
    icon: ShieldCheck,
  },
  {
    title: 'Confirmation',
    desc: 'Receive registration number and application status updates.',
    icon: Mail,
  },
  {
    title: 'Student Onboarding',
    desc: 'Selected applicants move to student profile and class allocation.',
    icon: Users,
  },
]

export default function Admissions() {
  const [step, setStep] = useState(1) // Steps: 1 = Process/Eligibility, 2 = Form Details, 3 = Upload, 4 = Review, 5 = Success
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  // Eligibility state
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [isEligible, setIsEligible] = useState(false)
  const [eligibilityReason, setEligibilityReason] = useState('')

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: value })
    if (field === 'date_of_birth' || field === 'target_class') {
      setEligibilityChecked(false)
      setIsEligible(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
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
      setEligibilityReason(`Applicants must be at least 3 years old to enroll. (Current age: ${age})`)
    } else {
      setIsEligible(true)
      setEligibilityReason(`Eligible to apply! Applicant age is ${age} years, which meets the enrollment requirements for ${form.target_class}.`)
    }
    setEligibilityChecked(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const formData = new FormData()
    Object.entries(form).forEach(([key, val]) => {
      formData.append(key, val)
    })
    if (selectedFile) {
      formData.append('id_proof_document', selectedFile)
    }

    try {
      const data = await admissionsApi.submit(formData)
      setResult(data)
      setStatus('success')
      setStep(5)
      setForm(EMPTY_FORM)
      setSelectedFile(null)
      setEligibilityChecked(false)
    } catch (err) {
      setStatus('error')
      const apiErrors = err?.response?.data
      setErrorMsg(
        apiErrors
          ? Object.entries(apiErrors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join(' / ')
          : 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img
          src="/Campus.jpeg"
          alt="EduNova admissions"
          className="absolute inset-0 w-full h-full object-cover animate-pulse"
          style={{ animationDuration: '6s' }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 section py-28">
          <FadeIn>
            <p className="inline-flex items-center gap-2 font-subheading font-semibold text-highlight uppercase text-sm mb-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
              <Sparkles size={15} /> Admissions Open
            </p>

            <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl mb-6">
              Begin Your Child’s Learning Journey at EduNova
            </h1>

            <p className="font-body text-white/90 max-w-2xl text-lg leading-relaxed mb-8">
              Complete the online registration form, receive your registration
              number, and allow our admissions team to review your application
              for the upcoming academic year.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#admission-steps" className="inline-flex items-center gap-2 btn-primary">
                Apply Now <ArrowRight size={18} />
              </a>

              <Link
                to="/contact"
                className="border-2 border-white text-white font-subheading font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors"
              >
                Contact Admissions
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Main Flow Section */}
      <section id="admission-steps" className="bg-bg-light py-12">
        <div className="section grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <FadeIn>
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100">
                
                {/* Progress Indicators */}
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4 overflow-x-auto">
                  {[
                    { num: 1, label: 'Eligibility' },
                    { num: 2, label: 'Form Details' },
                    { num: 3, label: 'Documents' },
                    { num: 4, label: 'Review' },
                    { num: 5, label: 'Confirmation' },
                  ].map((s) => (
                    <div key={s.num} className="flex items-center gap-2 shrink-0 pr-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          step >= s.num
                            ? 'bg-academic-blue text-white shadow-md'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {s.num}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          step === s.num ? 'text-academic-blue font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 1: READ PROCESS & CHECK ELIGIBILITY */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">
                        Step 1 of 4
                      </p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">
                        Read Process & Check Eligibility
                      </h2>
                      <p className="font-body text-sm text-text-secondary leading-relaxed">
                        To maintain high academic standards, we evaluate students based on age and academic background. Please use the checker below to verify eligibility.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h3 className="font-subheading font-bold text-primary text-md flex items-center gap-2">
                        <GraduationCap className="text-secondary" size={20} /> Eligibility Checker
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-ink-secondary">Select target class</label>
                          <select
                            value={form.target_class}
                            onChange={update('target_class')}
                            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none"
                          >
                            <option value="">Select target class</option>
                            {CLASSES.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-ink-secondary">Applicant date of birth</label>
                          <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={form.date_of_birth}
                            onChange={update('date_of_birth')}
                            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={checkEligibility}
                        className="bg-academic-blue text-white rounded-xl py-2 px-6 font-medium text-sm hover:bg-academic-blue/90"
                      >
                        Check Eligibility
                      </button>

                      {eligibilityChecked && (
                        <div
                          className={`p-4 rounded-xl border text-sm transition-all ${
                            isEligible
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          <p className="font-semibold mb-1">{isEligible ? '✅ Eligible to Apply' : '❌ Requirements Not Met'}</p>
                          <p className="text-xs opacity-90 leading-relaxed">{eligibilityReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        disabled={!isEligible}
                        onClick={() => setStep(2)}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Fill Application Form <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: FILL ADMISSION FORM */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">
                        Step 2 of 4
                      </p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">
                        Enter Student & Parent Details
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-subheading font-bold text-primary text-sm mb-3">Student Details</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <input
                              required
                              placeholder="Applicant full name (*)"
                              value={form.applicant_name}
                              onChange={update('applicant_name')}
                              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm ${
                                validationErrors.applicant_name ? "border-red-500" : "border-gray-200"
                              }`}
                            />
                            {validationErrors.applicant_name && (
                              <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.applicant_name}</p>
                            )}
                          </div>

                          <div>
                            <select
                              required
                              value={form.gender}
                              onChange={update('gender')}
                              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm ${
                                validationErrors.gender ? "border-red-500" : "border-gray-200"
                              }`}
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                            {validationErrors.gender && (
                              <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.gender}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <hr className="border-gray-100" />

                      <div>
                        <h3 className="font-subheading font-bold text-primary text-sm mb-3">Parent Details</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <input
                              required
                              placeholder="Parent / Guardian name (*)"
                              value={form.parent_name}
                              onChange={update('parent_name')}
                              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm ${
                                validationErrors.parent_name ? "border-red-500" : "border-gray-200"
                              }`}
                            />
                            {validationErrors.parent_name && (
                              <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.parent_name}</p>
                            )}
                          </div>

                          <div>
                            <input
                              required
                              placeholder="Parent phone number (*)"
                              value={form.parent_phone}
                              onChange={update('parent_phone')}
                              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm ${
                                validationErrors.parent_phone ? "border-red-500" : "border-gray-200"
                              }`}
                            />
                            {validationErrors.parent_phone && (
                              <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.parent_phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <input
                          required
                          type="email"
                          placeholder="Parent email address (*)"
                          value={form.parent_email}
                          onChange={update('parent_email')}
                          className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm ${
                            validationErrors.parent_email ? "border-red-500" : "border-gray-200"
                          }`}
                        />
                        {validationErrors.parent_email && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.parent_email}</p>
                        )}
                      </div>

                      <div>
                        <textarea
                          required
                          placeholder="Full home address (*)"
                          rows={3}
                          value={form.address}
                          onChange={update('address')}
                          className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm resize-none ${
                            validationErrors.address ? "border-red-500" : "border-gray-200"
                          }`}
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 text-[11px] font-semibold mt-1">{validationErrors.address}</p>
                        )}
                      </div>

                      <label className="flex items-center gap-3 text-sm text-text-primary bg-bg-light rounded-xl p-4 border border-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.scholarship_applied}
                          onChange={update('scholarship_applied')}
                          className="w-4 h-4"
                        />
                        I would like to apply for a scholarship
                      </label>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setStep(1)}
                        className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          const errs = {};
                          if (!isNonEmptyString(form.applicant_name)) {
                            errs.applicant_name = "Applicant name is required.";
                          }
                          if (!form.gender) {
                            errs.gender = "Please select applicant gender.";
                          }
                          if (!isNonEmptyString(form.parent_name)) {
                            errs.parent_name = "Parent/Guardian name is required.";
                          }
                          if (!isValidPhone(form.parent_phone)) {
                            errs.parent_phone = "Please enter a valid parent phone number.";
                          }
                          if (!isValidEmail(form.parent_email)) {
                            errs.parent_email = "Please enter a valid parent email address.";
                          }
                          if (!isNonEmptyString(form.address)) {
                            errs.address = "Address is required.";
                          }

                          if (Object.keys(errs).length > 0) {
                            setValidationErrors(errs);
                            return;
                          }
                          setValidationErrors({});
                          setStep(3);
                        }}
                        className="btn-primary flex items-center gap-2"
                      >
                        Upload Documents <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: UPLOAD DOCUMENTS */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">
                        Step 3 of 4
                      </p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">
                        Upload Required Documents
                      </h2>
                      <p className="font-body text-sm text-text-secondary leading-relaxed">
                        Please upload a digital copy of the applicant's **Birth Certificate** or **ID Proof** for verification.
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-academic-blue/10 flex items-center justify-center mb-3">
                        <FileText className="text-academic-blue" size={24} />
                      </div>
                      <p className="font-semibold text-sm mb-1 text-ink-primary">Select ID proof document</p>
                      <p className="text-xs text-ink-secondary mb-4">PDF, JPG, or PNG (Max 5MB)</p>
                      
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                        id="document-upload-input"
                      />
                      <label
                        htmlFor="document-upload-input"
                        className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Choose File
                      </label>

                      {selectedFile && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>Selected file: <strong>{selectedFile.name}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setStep(2)}
                        className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        disabled={!selectedFile}
                        onClick={() => setStep(4)}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Review Application <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW APPLICATION */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-subheading font-semibold text-secondary uppercase text-sm mb-1">
                        Step 4 of 4
                      </p>
                      <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">
                        Review Your Details
                      </h2>
                      <p className="font-body text-sm text-text-secondary leading-relaxed">
                        Please review the details below before submitting your application.
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-ink-secondary">Applicant Name</p>
                          <p className="font-semibold text-ink-primary">{form.applicant_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Target Program / Class</p>
                          <p className="font-semibold text-ink-primary">{form.target_class}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Gender</p>
                          <p className="font-semibold text-ink-primary">{form.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Date of Birth</p>
                          <p className="font-semibold text-ink-primary">{form.date_of_birth}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Parent Name</p>
                          <p className="font-semibold text-ink-primary">{form.parent_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Parent Phone</p>
                          <p className="font-semibold text-ink-primary">{form.parent_phone}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-ink-secondary">Parent Email</p>
                          <p className="font-semibold text-ink-primary">{form.parent_email}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-ink-secondary">Home Address</p>
                          <p className="font-semibold text-ink-primary leading-relaxed">{form.address}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Scholarship Application</p>
                          <p className="font-semibold text-ink-primary">{form.scholarship_applied ? 'Yes, applied' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Uploaded Document</p>
                          <p className="font-semibold text-emerald-700">{selectedFile?.name}</p>
                        </div>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-4">
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setStep(3)}
                        className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        disabled={status === 'submitting'}
                        onClick={handleSubmit}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                      >
                        {status === 'submitting' ? 'Submitting Application…' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: SUCCESS SCREEN */}
                {step === 5 && result && (
                  <div className="rounded-3xl border border-secondary bg-secondary/5 p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <CheckCircle2 size={30} className="text-secondary" />
                    </div>

                    <h2 className="font-heading text-2xl font-bold text-secondary">
                      Application Submitted Successfully
                    </h2>

                    <div>
                      <p className="text-text-primary text-sm mb-1">
                        Your Registration Number is:
                      </p>
                      <p className="font-numbers text-3xl font-bold text-primary">
                        {result.registration_number}
                      </p>
                    </div>

                    <div className="text-sm text-text-secondary leading-relaxed space-y-2">
                      <p>
                        📧 A **confirmation email** with your registration details has been sent to your registered parent address at **{result.parent_email}**.
                      </p>
                      <p>
                        🏫 Your application status is currently set to **Pending**. It has been securely sent to the Admin Portal, and our admissions team will review your credentials and document attachments shortly.
                      </p>
                    </div>

                    <button
                      className="btn-outline mt-6"
                      onClick={() => {
                        setStep(1)
                        setResult(null)
                        setStatus('idle')
                      }}
                    >
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

                <h3 className="font-heading text-xl font-bold text-primary mb-3">
                  Admissions Helpdesk
                </h3>

                <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
                  Need help before submitting your application? Contact our
                  admissions team for guidance.
                </p>

                <Link to="/contact" className="font-subheading font-bold text-accent">
                  Contact Admissions →
                </Link>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <GraduationCap size={24} className="text-accent" />
                </div>

                <h3 className="font-heading text-xl font-bold text-primary mb-4">
                  Required Information
                </h3>

                <div className="space-y-3">
                  {REQUIRED_DOCS.map((doc) => (
                    <div key={doc} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-secondary shrink-0 mt-0.5" />
                      <p className="font-body text-sm text-text-secondary">
                        {doc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary rounded-3xl p-6 text-white shadow-xl">
                <h3 className="font-heading text-xl font-bold mb-3">
                  Track After Submission
                </h3>

                <p className="font-body text-sm text-blue-100 leading-relaxed">
                  Save your registration number after submitting the form. It can
                  be used by the admissions team to review and update your
                  application status.
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
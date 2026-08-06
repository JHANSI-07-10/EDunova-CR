import client from './client'

export const admissionsApi = {
  // Phase 1: Submit enquiry
  submit: (payload) => client.post('/admissions/enquiries/', payload).then(r => r.data),
  
  // Phase 3: Check status
  checkStatus: (registrationNumber) =>
    client.get(`/admissions/enquiries/${registrationNumber}/`).then(r => r.data),

  // Phase 4: Application form details
  submitApplication: (regNo, payload) =>
    client.post(`/admin-portal/admissions/${regNo}/application/`, payload).then(r => r.data),

  // Phase 5: Document upload
  uploadDocument: (regNo, payload) =>
    client.post(`/admin-portal/admissions/${regNo}/documents/`, payload).then(r => r.data),

  getDocuments: (regNo) =>
    client.get(`/admin-portal/admissions/${regNo}/documents/`).then(r => r.data),

  // Phase 6: Eligibility check
  checkEligibility: (regNo) =>
    client.post(`/admin-portal/admissions/${regNo}/eligibility/`).then(r => r.data),

  // Phase 8: Interview
  getInterviews: (regNo) =>
    client.get(`/admin-portal/admissions/${regNo}/interview/`).then(r => r.data),

  // Phase 9: Seat allocation
  getSeatStatus: (regNo) =>
    client.get(`/admin-portal/admissions/${regNo}/seat/`).then(r => r.data),

  // Phase 11: Fee details
  getFeeDetails: (regNo) =>
    client.get(`/admin-portal/admissions/${regNo}/fee/`).then(r => r.data),

  // Phase 16: Notifications
  getNotifications: (regNo) =>
    client.get(`/admin-portal/admissions/${regNo}/notifications/`).then(r => r.data),
}

export default admissionsApi

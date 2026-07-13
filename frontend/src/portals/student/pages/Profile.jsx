import { useEffect, useState } from "react";
import { Card, Loader, Toast, Badge } from "../components/Common";
import IdCard from "../components/IdCard";
import api from "../lib/api";
import { isValidPhone, isNonEmptyString } from "../../../utils/validation";
import { Edit2, ShieldAlert, X, Check, UploadCloud, Loader2 } from "lucide-react";

const FIELDS = [
  ["Full name", "name"],
  ["Email", "email"],
  ["Phone", "phone_number"],
  ["Admission number", "admission_number"],
  ["Class", "class_name"],
  ["Date of birth", "date_of_birth"],
  ["Gender", "gender"],
  ["Blood group", "blood_group"],
  ["Status", "status"],
];

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");
  
  // Edit Form Fields
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  
  // Pending changes state (loaded from local storage)
  const [pendingChanges, setPendingChanges] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  function load() {
    api.get("/student/profile/").then(({ data }) => {
      setProfile(data);
      setPhone(data.phone_number || "");
      setAddress(data.address || "123 Academic Block, EduNova Campus");
    });

    const saved = localStorage.getItem("edunova_profile_change_request");
    if (saved) {
      try {
        setPendingChanges(JSON.parse(saved));
      } catch (e) {
        setPendingChanges(null);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validations
    const errors = {};
    if (!isValidPhone(phone)) {
      errors.phone = "Please enter a valid phone number (7-15 digits, digits and + only).";
    }
    if (!isNonEmptyString(address)) {
      errors.address = "Address details cannot be empty.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmitting(true);

    try {
      let uploadedAvatarUrl = avatarPreview || profile.avatar_url;
      
      // Handle file upload if avatar is updated
      if (avatar) {
        const fd = new FormData();
        fd.append("file", avatar);
        fd.append("bucket", "studentavatars");
        const uploadResp = await api.post("/upload/", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedAvatarUrl = uploadResp.data.url;
      }

      // Submit Admin Approval ticket via messages endpoint
      const msgText = `[Profile Update Request] Phone: ${phone} | Address: ${address} | Profile Picture: ${uploadedAvatarUrl}`;
      await api.post("/teacher/messages/", {
        receiver: 1, // Admin User
        message_text: msgText
      });

      const requestObj = {
        phone_number: phone,
        address: address,
        avatar_url: uploadedAvatarUrl,
        submittedAt: new Date().toLocaleDateString(),
        status: "Pending Admin Approval"
      };

      localStorage.setItem("edunova_profile_change_request", JSON.stringify(requestObj));
      setPendingChanges(requestObj);

      setToast("Profile change request submitted for Admin review!");
      setShowEdit(false);
      setAvatar(null);
    } catch (err) {
      setToast("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) return <Loader rows={4} />;

  return (
    <div className="space-y-6">
      
      {/* Pending change request review banner */}
      {pendingChanges && (
        <Card className="bg-amber-50/40 border border-amber-200 p-4 flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="flex-1 text-xs">
            <p className="font-bold text-amber-800">Profile Update Under Review</p>
            <p className="text-amber-700 mt-0.5 leading-relaxed">
              You submitted a request to update your personal details on <strong>{pendingChanges.submittedAt}</strong>. 
              The modifications are currently being reviewed by the administration.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-slate-500 font-medium">
              <span>New Phone: <strong className="text-slate-800">{pendingChanges.phone_number}</strong></span>
              <span>New Address: <strong className="text-slate-800">{pendingChanges.address}</strong></span>
            </div>
          </div>
          <Badge tone="gold">Pending Approval</Badge>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Profile Card column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <IdCard profile={profile} />
          
          <button
            onClick={() => {
              setShowEdit(true);
              setValidationErrors({});
            }}
            className="w-full flex items-center justify-center gap-2 bg-academic-blue text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-academic-blue/90 shadow-sm transition-colors"
          >
            <Edit2 size={14} /> Edit Profile Details
          </button>
        </div>

        {/* Profile Details column */}
        <Card className="lg:col-span-2">
          <p className="font-heading font-semibold text-lg mb-4 text-ink-primary">Personal Details</p>
          <dl className="grid sm:grid-cols-2 gap-5 border-b border-slate-100 pb-5">
            {FIELDS.map(([label, key]) => (
              <div key={key}>
                <dt className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</dt>
                <dd className="text-sm font-medium mt-1 text-ink-primary">{profile[key] ?? "—"}</dd>
              </div>
            ))}
          </dl>
          
          <div className="pt-4 space-y-1">
            <dt className="text-xs text-slate-400 font-bold uppercase tracking-wider">Residential Address</dt>
            <dd className="text-sm font-medium text-ink-primary leading-relaxed">
              {profile.address || "123 Academic Block, EduNova Campus, New Delhi, India"}
            </dd>
          </div>
        </Card>
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card w-full max-w-md p-6 shadow-raised animate-[fadeIn_.2s_ease]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <p className="font-heading font-bold text-sm text-ink-primary">Edit Profile Information</p>
              <button onClick={() => setShowEdit(false)} className="text-ink-secondary hover:text-ink-primary"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Profile pic upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-academic-blue/20 shrink-0 bg-slate-200">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Pic</div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-600 block">Profile Picture (Avatar):</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-academic-blue font-bold hover:underline">
                    <UploadCloud size={14} /> Upload image file
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Phone Number:</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none ${
                    validationErrors.phone ? "border-danger" : "border-slate-200"
                  }`}
                  placeholder="+919000000001"
                />
                {validationErrors.phone && (
                  <p className="text-[10px] text-danger font-semibold">{validationErrors.phone}</p>
                )}
              </div>

              {/* Address Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Residential Address:</label>
                <textarea
                  rows={3}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus-ring outline-none resize-none ${
                    validationErrors.address ? "border-danger" : "border-slate-200"
                  }`}
                  placeholder="Enter full residential address..."
                />
                {validationErrors.address && (
                  <p className="text-[10px] text-danger font-semibold">{validationErrors.address}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-3 py-1.5 border border-slate-200 text-ink-secondary text-xs rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-60 text-white text-xs rounded-xl font-bold flex items-center gap-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Check size={12} /> Submit Request
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

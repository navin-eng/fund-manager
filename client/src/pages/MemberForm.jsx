import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Users,
  Save,
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldAlert,
  Camera,
  X,
} from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { authFetch, readJsonResponse } from '../api';
import DateInput from '../components/DateInput';

export default function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const fileInputRef = useRef(null);
  const { getTodayDateInputValue, toDateInputValue, t } = useLocale();

  const [formData, setFormData] = useState(() => ({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    joinedDate: getTodayDateInputValue(),
  }));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchMember();
    }
  }, [id]);

  const fetchMember = async () => {
    try {
      setFetching(true);
      const response = await authFetch(`/api/members/${id}`);
      const data = await readJsonResponse(response, {});
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        emergencyContact: data.emergency_contact || '',
        joinedDate: toDateInputValue(data.joined_date),
      });
      if (data.photo_url) {
        setExistingPhotoUrl(data.photo_url);
      }
    } catch (error) {
      console.error('Failed to fetch member:', error);
      setSubmitError('Failed to load member data.');
    } finally {
      setFetching(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.joinedDate) {
      newErrors.joinedDate = 'Joined date is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5 MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setSubmitError('');

      const url = isEditing ? `/api/members/${id}` : '/api/members';
      const method = isEditing ? 'PUT' : 'POST';

      // Use FormData to support file upload
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('phone', formData.phone);
      fd.append('address', formData.address);
      fd.append('emergency_contact', formData.emergencyContact);
      fd.append('joined_date', formData.joinedDate);

      if (photoFile) {
        fd.append('photo', photoFile);
      } else if (existingPhotoUrl) {
        fd.append('photo_url', existingPhotoUrl);
      }

      const response = await authFetch(url, {
        method,
        body: fd,
        // Do NOT set Content-Type header — browser sets it with boundary for multipart
      });

      if (!response.ok) {
        const errData = await readJsonResponse(response, {});
        throw new Error(errData.error || errData.message || 'Failed to save member');
      }

      const result = await readJsonResponse(response, {});

      if (isEditing) {
        alert('Member updated successfully!');
      } else {
        const msg = result.username
          ? `Member created successfully!\n\nLogin credentials:\nUsername: ${result.username}\nA temporary password has been generated.${result.email_sent ? '\nCredentials sent to their email.' : '\nNote: Email not configured - please share credentials manually.'}`
          : 'Member created successfully!';
        alert(msg);
      }
      navigate('/members');
    } catch (error) {
      console.error('Failed to save member:', error);
      setSubmitError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayPhoto = photoPreview || existingPhotoUrl;

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-500 text-sm">Loading member data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/members"
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEditing ? t('page.editMember') : t('members.addNewMember')}
            </h1>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="p-6 space-y-5">
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Camera className="w-4 h-4 text-slate-400" />
                {t('members.memberPhoto')}
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                  {displayPhoto ? (
                    <>
                      <img
                        src={displayPhoto}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    {displayPhoto ? t('members.changePhoto') : t('members.uploadPhoto')}
                  </button>
                  <p className="text-xs text-slate-400 mt-1">{t('members.photoRequirements')}</p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <User className="w-4 h-4 text-slate-400" />
                {t('members.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                {t('members.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                {t('members.phone')} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {t('members.address')}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                {t('members.emergencyContact')}
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Name and phone number"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Joined Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                {t('members.joinDate')} <span className="text-red-500">*</span>
              </label>
              <DateInput
                name="joinedDate"
                value={formData.joinedDate}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, joinedDate: val }));
                  if (errors.joinedDate) setErrors((prev) => ({ ...prev, joinedDate: '' }));
                }}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.joinedDate
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                }`}
              />
              {errors.joinedDate && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.joinedDate}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <Link
              to="/members"
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading
                ? t('common.saving')
                : isEditing
                ? t('members.updateMember')
                : t('members.createMember')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

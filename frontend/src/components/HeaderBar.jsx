import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useTranslation } from '../context/LanguageContext';
import { FiUser, FiStar, FiClock, FiFileText, FiCalendar, FiDollarSign, FiInfo, FiSettings, FiCloud, FiLogOut, FiCopy, FiShare2, FiCheck, FiGlobe, FiBell } from 'react-icons/fi';
import { useNotifications } from '../hooks/useNotifications';
import GlobalSearch from './GlobalSearch';

export default function HeaderBar({ title = '', clinic: clinicProp, onAddPatient, onSwitchView }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const api = useApiClient();
  const { addToast } = useToast();
  const { language, changeLanguage, t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [viewMode, setViewMode] = useState('default');
  const [inviteCode] = useState('ABCD1234'); // removed unused setter
  const [inviteLink] = useState('https://clinicpro.com/invite/ABCD1234'); // removed unused setter
  const [storageSize, setStorageSize] = useState(0); // in MB
  const [copied, setCopied] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [currentClinic, setCurrentClinic] = useState(clinicProp || 'Loading...');
  const [clinics, setClinics] = useState([]);
  const [showClinicSwitcher, setShowClinicSwitcher] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchStorageSize = useCallback(async () => {
    try {
      const _res = await api.get('/api/patients?limit=1');
      // Mock calculation - in real app, calculate from actual data
      setStorageSize(125.5); // MB
    } catch (_err) {
      console.error('Failed to fetch storage size:', _err);
      setStorageSize(0);
    }
  }, [api]);

  useEffect(() => {
    if (showDropdown) {
      fetchStorageSize();
    }
  }, [showDropdown, fetchStorageSize]);

  const fetchClinics = useCallback(async () => {
    try {
      const res = await api.get('/api/clinics');
      const clinicsList = res.data.clinics || [];
      setClinics(clinicsList);

      const currentClinicId = user?.clinic_id;

      if (currentClinicId) {
        const clinic = clinicsList.find(c => c.id === currentClinicId);
        if (clinic) {
          setCurrentClinic(clinic.name);
        }
      } else if (clinicsList.length > 0) {
        setCurrentClinic(clinicsList[0].name);
      }
    } catch (_err) {
      console.error('Failed to fetch clinics:', _err);
    }
  }, [api, user?.clinic_id]);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const handleCopyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      addToast('Invite code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy invite link', 'error');
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      addToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy invite link', 'error');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join Clinic PRO',
      text: `Use my invite code: ${inviteCode}`,
      url: inviteLink
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        addToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyInviteCode();
        }
      }
    } else {
      handleCopyInviteCode();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const displayName = user?.name || 'Dr. Jane Doe';
  const ekaCredits = user?.eka_credits || 120;
  const isVerified = true;

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">{currentClinic}</p>
            {clinics.length > 1 && (
              <button
                onClick={() => setShowClinicSwitcher(!showClinicSwitcher)}
                className="text-xs text-blue-600 hover:text-blue-800"
                title={t('switch')}
              >
                {t('switch')}
              </button>
            )}
          </div>
          <h1 className="text-xl lg:text-2xl font-semibold">{title}</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <button 
            onClick={() => {
              if (onAddPatient) {
                onAddPatient();
              } else if (location.pathname === '/patients') {
                const form = document.getElementById('add-patient-form');
                if (form) {
                  form.scrollIntoView({ behavior: 'smooth' });
                }
              } else {
                navigate('/patients');
                setTimeout(() => {
                  const form = document.getElementById('add-patient-form');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }
            }}
            className="px-4 py-2 text-sm bg-primary text-white rounded w-full sm:w-auto hover:bg-primary/90"
          >
            {t('add_new_patient')}
          </button>
          <button 
            onClick={() => {
              if (onSwitchView) {
                onSwitchView();
              } else {
                setViewMode(viewMode === 'default' ? 'new' : 'default');
                if (location.pathname === '/patients') {
                  const form = document.getElementById('add-patient-form');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }
            }}
            className="px-3 py-2 text-sm border rounded w-full sm:w-auto hover:bg-slate-50"
          >
            {viewMode === 'default' ? 'Switch to new view' : 'Switch to default view'}
          </button>
          {/* Notification Bell */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="relative px-3 py-2 bg-white rounded shadow hover:bg-slate-50 transition"
              title="Notifications"
            >
              <FiBell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('notifications')}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {t('mark_all_as_read')}
                    </button>
                  )}
                </div>
                <div className="py-2">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                          setShowNotificationDropdown(false);
                          if (notif.type === 'appointment') {
                            navigate('/queue');
                          }
                        }}
                        className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                          !notif.is_read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                            !notif.is_read ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notif.title || 'Notification'}</p>
                            <p className="text-xs text-gray-600 mt-1">{notif.message || ''}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t text-center">
                    <button
                      onClick={() => {
                        navigate('/whats-new');
                        setShowNotificationDropdown(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {t('view_all')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded shadow w-full sm:w-auto hover:bg-slate-50"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 relative">
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <FiCheck className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-slate-500">
                  {isVerified ? 'Verified' : 'Pending'} • {ekaCredits} credits
                </p>
              </div>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50">
                {/* Profile Header - Large Profile Picture */}
                <div className="px-4 py-4 border-b bg-gradient-to-br from-blue-50 to-slate-50">
                  <div className="flex flex-col items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {displayName.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                        STAFF
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <p className="font-semibold text-lg">{displayName}</p>
                        {isVerified && (
                          <span className="text-green-600 text-lg" title="Verified">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">Endocrinologist</p>
                      <p className="text-xs text-slate-500 mt-1">{ekaCredits} Credits</p>
                    </div>
                  </div>
                  
                  {/* Invite Code and Link */}
                  <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Invite Code:</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          value={inviteCode}
                          className="flex-1 px-2 py-1 text-xs border rounded bg-slate-50 font-mono"
                        />
                        <button
                          onClick={handleCopyInviteCode}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                          title="Copy Invite Code"
                        >
                          {copied ? <FiCheck className="w-3 h-3 text-green-600" /> : <FiCopy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Invite Link:</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="flex-1 px-2 py-1 text-xs border rounded bg-slate-50 font-mono truncate"
                        />
                        <button
                          onClick={handleCopyInviteLink}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                          title="Copy Invite Link"
                        >
                          {copied ? <FiCheck className="w-3 h-3 text-green-600" /> : <FiCopy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCopyInviteCode}
                        className="flex-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded transition text-center"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex-1 px-2 py-1.5 text-xs bg-primary text-white hover:bg-primary/90 rounded transition text-center"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1 max-h-[400px] overflow-y-auto">
                  <a 
                    href="/profile" 
                    onClick={(e) => { e.preventDefault(); navigate('/profile'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiUser className="w-4 h-4 text-slate-600" />
                    <span>My Profile</span>
                  </a>
                  <a 
                    href="/genie" 
                    onClick={(e) => { e.preventDefault(); addToast('My Genie - Coming soon', 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiStar className="w-4 h-4 text-slate-600" />
                    <span>My Genie</span>
                  </a>
                  <a 
                    href="/referrals" 
                    onClick={(e) => { e.preventDefault(); addToast('My Patient Referrals - Coming soon', 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiClock className="w-4 h-4 text-slate-600" />
                    <span>My Patient Referrals</span>
                  </a>
                  <a 
                    href="/rx-template" 
                    onClick={(e) => { e.preventDefault(); navigate('/rx-template'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiFileText className="w-4 h-4 text-slate-600" />
                    <span>My RX Template</span>
                  </a>
                  <a 
                    href="/availability" 
                    onClick={(e) => { e.preventDefault(); addToast('My Availability - Coming soon', 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiCalendar className="w-4 h-4 text-slate-600" />
                    <span>My Availability</span>
                  </a>
                  <a
                    href="/credits"
                    onClick={(e) => { e.preventDefault(); addToast(`You have ${ekaCredits} Credits`, 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiDollarSign className="w-4 h-4 text-slate-600" />
                    <span>My Credits</span>
                    {ekaCredits > 0 && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {ekaCredits}
                      </span>
                    )}
                  </a>
                  <a 
                    href="/training" 
                    onClick={(e) => { e.preventDefault(); addToast('Request Training - Coming soon', 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiInfo className="w-4 h-4 text-slate-600" />
                    <span>Request Training</span>
                  </a>
                  <a 
                    href="/settings" 
                    onClick={(e) => { e.preventDefault(); addToast('Settings & Preferences - Coming soon', 'info'); setShowDropdown(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    <FiSettings className="w-4 h-4 text-slate-600" />
                    <span>Settings & Preferences</span>
                  </a>
                  <div className="px-4 py-2 text-sm border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <FiGlobe className="w-4 h-4 text-slate-600" />
                      <div className="flex-1">
                        <span className="text-slate-700">{t('language')}:</span>
                        <select
                          value={language}
                          onChange={(e) => changeLanguage(e.target.value)}
                          className="ml-2 px-2 py-1 text-xs border rounded bg-white"
                        >
                          <option value="en">English</option>
                          <option value="hi">हिंदी (Hindi)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 text-sm border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <FiCloud className="w-4 h-4 text-slate-600" />
                      <div className="flex-1">
                        <span className="text-slate-700">Storage:</span>
                        <span className="ml-2 text-slate-600">{storageSize.toFixed(1)} MB of patient data stored</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <a href="/privacy" className="hover:underline">Privacy Policy</a>
                    <a href="/terms" className="hover:underline">Terms & Conditions</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          placeholder={t('search') + ' (Ctrl + K)'}
          className="flex-1 px-3 py-2 border rounded"
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              setShowGlobalSearch(true);
            }
          }}
        />
        <button 
          onClick={() => setShowGlobalSearch(true)}
          className="px-3 py-2 text-sm border rounded w-full sm:w-auto hover:bg-slate-50"
        >
          {t('search')}
        </button>
        <button 
          onClick={() => {
            alert('Filters functionality - can be extended to show filter options');
          }}
          className="px-3 py-2 text-sm border rounded w-full sm:w-auto hover:bg-slate-50"
        >
          {t('filters')}
        </button>
      </div>

      {/* Clinic Switcher */}
      {showClinicSwitcher && clinics.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{t('switch_clinic') || 'Switch Clinic'}</h2>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {clinics.map((clinic) => (
                <button
                  key={clinic.id}
                  onClick={async () => {
                    try {
                      await api.post('/api/clinics/switch', { clinic_id: clinic.id });
                      setCurrentClinic(clinic.name);
                      setShowClinicSwitcher(false);
                      addToast('Clinic switched successfully', 'success');
                      window.location.reload();
                    } catch (err) {
                      addToast(err.response?.data?.error || 'Failed to switch clinic', 'error');
                    }
                  }}
                  className={`w-full text-left p-4 border rounded-lg hover:bg-gray-50 ${
                    user?.clinic_id === clinic.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="font-semibold">{clinic.name}</div>
                  <div className="text-sm text-gray-600">
                    {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                  </div>
                  {user?.clinic_id === clinic.id && (
                    <div className="text-xs text-blue-600 mt-1">Current</div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setShowClinicSwitcher(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    <GlobalSearch open={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
    </header>
  );
}
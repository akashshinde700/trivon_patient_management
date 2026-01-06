import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import HeaderBar from '../components/HeaderBar';

export default function UserProfile() {
  const { user, setToken, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [inviteCode] = useState('ABCD1234');
  const [credits, setCredits] = useState(120);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  useEffect(() => {
    // Fetch user profile data if available
    const fetchProfile = async () => {
      try {
        // If user data exists, use it; otherwise fetch from API
        if (user) {
          setProfile({
            name: user.name || 'Dr. Jane Doe',
            email: user.email || '',
            role: user.role || 'doctor',
            phone: user.phone || '',
            verified: true,
            credits: user.credits || 120
          });
          setCredits(user.credits || 120);
        }

        // Load saved profile picture from localStorage
        const savedProfilePicture = localStorage.getItem('profilePicture');
        if (savedProfilePicture) {
          setProfilePicturePreview(savedProfilePicture);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, [user]);

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert('Invite code copied to clipboard!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Clinic PRO',
        text: `Use my invite code: ${inviteCode}`,
      });
    } else {
      handleCopyInviteCode();
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    navigate('/');
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) {
      alert('Please select a profile picture first');
      return;
    }

    try {
      // Save to localStorage for persistence
      if (profilePicturePreview) {
        localStorage.setItem('profilePicture', profilePicturePreview);
      }

      // In a real application, you would upload to your API here
      // const formData = new FormData();
      // formData.append('profile_picture', profilePicture);
      // await api.post('/api/users/profile-picture', formData);

      alert('Profile picture uploaded successfully!');
      // Clear the file input
      setProfilePicture(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    }
  };

  const menuItems = [
    { label: 'My Profile', path: '/profile', icon: '👤' },
    { label: 'My Genie', path: '/genie', icon: '🤖' },
    { label: 'My Patient Referrals', path: '/referrals', icon: '👥' },
    { label: 'My RX Template', path: '/rx-template', icon: '📋' },
    { label: 'My Availability', path: '/availability', icon: '📅' },
    { label: 'My Credits', path: '/credits', icon: '💰' },
    { label: 'Request Training', path: '/training', icon: '🎓' },
    { label: 'Settings & Preferences', path: '/settings', icon: '⚙️' },
    { label: 'Storage Usage', path: '/storage', icon: '💾' },
  ];

  const displayName = profile?.name || user?.name || 'Dr. Jane Doe';
  const displayRole = profile?.role || user?.role || 'doctor';
  const isVerified = profile?.verified !== false;
  const displayCredits = profile?.credits || credits;

  return (
    <div className="space-y-6">
      <HeaderBar title="User Profile Menu" />

      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                {profilePicturePreview ? (
                  <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0)
                )}
              </div>
              <label
                htmlFor="profile-picture-input"
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors shadow-md"
                title="Change profile picture"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
              <input
                id="profile-picture-input"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {displayRole.toUpperCase()}
                </span>
                {isVerified && (
                  <span className="text-green-600 text-sm">✓ Verified</span>
                )}
              </div>
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-slate-500">{user?.email || 'doctor@example.com'}</p>
              <p className="text-sm text-slate-600 mt-1">
                {displayCredits} Credits
              </p>
              {profilePicture && (
                <button
                  onClick={handleProfilePictureUpload}
                  className="mt-2 px-4 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Save Profile Picture
                </button>
              )}
            </div>
          </div>

          {/* Invite Code Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Invite Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteCode}
                  className="flex-1 px-3 py-2 border rounded bg-white font-mono text-sm"
                />
                <button
                  onClick={handleCopyInviteCode}
                  className="px-4 py-2 text-sm border rounded hover:bg-slate-100"
                >
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                >
                  Share
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Share your invite code to earn more Credits
            </p>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 rounded transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                <svg
                  className="w-4 h-4 ml-auto text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>

          {/* Log Out Button */}
          <div className="pt-2 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <span className="text-lg">🚪</span>
              <span>Log Out</span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="pt-4 border-t">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-500">
              <Link to="/privacy" className="hover:text-slate-700 hover:underline">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-slate-700 hover:underline">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-6 bg-white border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Full Name</label>
              <p className="text-sm font-medium">{displayName}</p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Email</label>
              <p className="text-sm">{user?.email || 'doctor@example.com'}</p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Phone</label>
              <p className="text-sm">{user?.phone || profile?.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Role</label>
              <p className="text-sm capitalize">{displayRole}</p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Credits</label>
              <p className="text-sm font-medium text-primary">{displayCredits} credits</p>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Status</label>
              <p className="text-sm">
                <span className="inline-flex items-center gap-1">
                  {isVerified ? (
                    <>
                      <span className="text-green-600">✓</span> Verified
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-600">⏳</span> Pending
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

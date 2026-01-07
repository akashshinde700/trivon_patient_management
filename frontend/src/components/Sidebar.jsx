import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  FiHome,
  FiUsers,
  FiClipboard,
  FiDollarSign,
  FiBarChart2,
  FiActivity,
  FiBook,
  FiSettings,
  FiBell,
  FiUser,
  FiGrid,
  FiMessageSquare,
  FiX,
  FiCalendar,
  FiShield,
  FiCloud,
  FiFileText,
  FiLayout,
  FiClock,
  FiDownload,
  FiHeart,
  FiPlusSquare,
  FiPackage,
  FiCheckCircle
} from 'react-icons/fi';

const navItems = [
  { label: 'Queue', icon: <FiHome />, to: '/queue' },
  { label: 'Patients', icon: <FiUsers />, to: '/patients' },
  { label: 'Appointments', icon: <FiCalendar />, to: '/appointments' },
  { label: 'Billing', icon: <FiDollarSign />, to: '/billing' },
  { label: 'Clinical', icon: <FiClipboard />, to: '/clinical' },
  { label: 'Lab Management', icon: <FiActivity />, to: '/lab-management' },
  { label: 'Medical Certificates', icon: <FiFileText />, to: '/medical-certificates' },
  { label: 'Insurance', icon: <FiShield />, to: '/insurance-management' },
  { label: 'Analytics', icon: <FiBarChart2 />, to: '/analytics' },
  { label: 'ABHA', icon: <FiActivity />, to: '/abha', badge: 'New' },
  { label: 'IPD Dashboard', icon: <FiGrid />, to: '/ipd-dashboard' },
  { label: 'Admissions', icon: <FiHeart />, to: '/admissions' },
  { label: 'Room Management', icon: <FiLayout />, to: '/room-management' },
  { label: 'Daily Services', icon: <FiPlusSquare />, to: '/daily-services' },
  { label: 'Medicine Entry', icon: <FiPackage />, to: '/medicine-entry' },
  { label: 'Discharge Workflow', icon: <FiCheckCircle />, to: '/discharge-workflow' },
  { label: 'Doctor Settings', icon: <FiClock />, to: '/doctor-settings', doctorOnly: true },
  { label: 'Clinic Management', icon: <FiLayout />, to: '/clinics', adminOnly: true },
  { label: 'Doctor Management', icon: <FiUsers />, to: '/doctor-management', adminOnly: true },
  { label: 'Staff Management', icon: <FiUser />, to: '/staff-management', adminOnly: true },
  { label: 'User Management', icon: <FiUser />, to: '/user-management', adminOnly: true },
  { label: 'Clinic Export', icon: <FiDownload />, to: '/clinic-export', adminOnly: true },
  { label: 'Doctor Export', icon: <FiDownload />, to: '/doctor-export', adminOnly: true },
  { label: 'Settings', icon: <FiSettings />, to: '/settings' }
];

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const userRole = user?.role || 'staff';

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    if (item.doctorOnly && userRole !== 'doctor') {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-dark text-white flex flex-col h-full">
      {/* Mobile close button */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-blue-900">
        <div className="font-semibold">Clinic PRO</div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-blue-800/50"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block p-4 border-b border-blue-900">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Clinic PRO</div>
          <span className="text-xs bg-primary px-2 py-1 rounded">PRO</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose} // Close sidebar on mobile when navigating
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                isActive ? 'bg-primary text-white' : 'hover:bg-blue-800/50'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 flex items-center justify-center border-t border-blue-900">
        <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors">
          <FiMessageSquare />
        </button>
      </div>
    </aside>
  );
}


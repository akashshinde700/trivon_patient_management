import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  FiHome,
  FiUsers,
  FiClipboard,
  FiDollarSign,
  FiBarChart2,
  FiActivity,
  FiSettings,
  FiUser,
  FiX,
  FiCalendar,
  FiLayout,
  FiClock,
  FiDownload,
  FiChevronDown,
  FiChevronRight,
  FiMessageSquare,
  FiBriefcase
} from 'react-icons/fi';

const menuSections = [
  {
    title: 'Daily Operations',
    icon: <FiHome />,
    items: [
      { label: 'Queue', icon: <FiHome />, to: '/queue' },
      { label: 'Patients', icon: <FiUsers />, to: '/patients' },
      { label: 'Appointments', icon: <FiCalendar />, to: '/appointments' }
    ]
  },
  {
    title: 'Clinical',
    icon: <FiClipboard />,
    items: [
      { label: 'Clinical Dashboard', icon: <FiClipboard />, to: '/clinical' },
      { label: 'Prescriptions', icon: <FiClipboard />, to: '/orders' },
      { label: 'Lab Tests', icon: <FiActivity />, to: '/lab-investigations' }
    ]
  },
  {
    title: 'IPD Management',
    icon: <FiBriefcase />,
    items: [
      { label: 'Admissions', icon: <FiBriefcase />, to: '/admissions' },
      { label: 'IPD Dashboard', icon: <FiActivity />, to: '/ipd-dashboard' },
      { label: 'Room Management', icon: <FiLayout />, to: '/room-management' }
    ]
  },
  {
    title: 'Finance',
    icon: <FiDollarSign />,
    items: [
      { label: 'Billing', icon: <FiDollarSign />, to: '/billing' },
      { label: 'Payments', icon: <FiDollarSign />, to: '/payments' },
      { label: 'Receipts', icon: <FiDollarSign />, to: '/receipts' }
    ]
  },
  {
    title: 'Reports & Analytics',
    icon: <FiBarChart2 />,
    items: [
      { label: 'Analytics', icon: <FiBarChart2 />, to: '/analytics', requireRole: ['admin', 'doctor'] },
      { label: 'ABHA', icon: <FiActivity />, to: '/abha', badge: 'New' }
    ]
  },
  {
    title: 'Management',
    icon: <FiLayout />,
    adminOnly: true,
    items: [
      { label: 'Clinic Management', icon: <FiLayout />, to: '/clinics', adminOnly: true },
      { label: 'Doctor Management', icon: <FiUsers />, to: '/doctor-management', adminOnly: true },
      { label: 'Staff Management', icon: <FiUser />, to: '/staff-management', adminOnly: true },
      { label: 'User Management', icon: <FiUser />, to: '/user-management', adminOnly: true }
    ]
  },
  {
    title: 'Data Export',
    icon: <FiDownload />,
    adminOnly: true,
    items: [
      { label: 'Clinic Export', icon: <FiDownload />, to: '/clinic-export', adminOnly: true },
      { label: 'Doctor Export', icon: <FiDownload />, to: '/doctor-export', adminOnly: true },
      { label: 'Database Backup', icon: <FiDownload />, to: '/backup', adminOnly: true }
    ]
  },
  {
    title: 'Settings',
    icon: <FiSettings />,
    items: [
      { label: 'General Settings', icon: <FiSettings />, to: '/settings' },
      { label: 'Doctor Settings', icon: <FiClock />, to: '/doctor-settings', doctorOnly: true },
      { label: 'Profile', icon: <FiUser />, to: '/profile' }
    ]
  }
];

export default function SidebarNew({ onClose }) {
  const { user } = useAuth();
  const userRole = user?.role || 'staff';
  const [expandedSections, setExpandedSections] = useState(['Daily Operations']);

  const toggleSection = (sectionTitle) => {
    setExpandedSections(prev =>
      prev.includes(sectionTitle)
        ? prev.filter(title => title !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const hasAccessToItem = (item) => {
    if (item.adminOnly && userRole !== 'admin') return false;
    if (item.doctorOnly && userRole !== 'doctor') return false;
    if (item.requireRole && !item.requireRole.includes(userRole)) return false;
    return true;
  };

  const hasAccessToSection = (section) => {
    if (section.adminOnly && userRole !== 'admin') return false;
    return section.items.some(item => hasAccessToItem(item));
  };

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
          <div className="font-semibold text-lg">Clinic PRO</div>
          <span className="text-xs bg-primary px-2 py-1 rounded">PRO</span>
        </div>
        {user && (
          <div className="mt-2 text-xs text-gray-300">
            <div className="font-medium">{user.name}</div>
            <div className="text-gray-400 capitalize">{user.role}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuSections.map((section) => {
          if (!hasAccessToSection(section)) return null;

          const isExpanded = expandedSections.includes(section.title);
          const visibleItems = section.items.filter(hasAccessToItem);

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-blue-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{section.icon}</span>
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    {section.title}
                  </span>
                </div>
                {isExpanded ? (
                  <FiChevronDown size={14} className="text-gray-400" />
                ) : (
                  <FiChevronRight size={14} className="text-gray-400" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-2 mt-1 space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                          isActive ? 'bg-primary text-white' : 'hover:bg-blue-800/50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] bg-green-500 px-2 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between border-t border-blue-900">
        <div className="flex-1">
          <button className="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>
        <button className="ml-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors">
          <FiMessageSquare />
        </button>
      </div>
    </aside>
  );
}

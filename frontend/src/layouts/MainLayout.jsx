import { useState } from 'react';
import SidebarNew from '../components/SidebarNew';
import DoctorSelector from '../components/DoctorSelector';
import ClinicSelector from '../components/ClinicSelector';
import { FiMenu } from 'react-icons/fi';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-dark text-white transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarNew onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <FiMenu size={20} />
          </button>
          <h1 className="text-lg font-semibold">Clinic PRO</h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Clinic Selector for Admin */}
        <ClinicSelector />

        {/* Doctor Selector for Admin */}
        <DoctorSelector onDoctorSelect={handleDoctorSelect} />

        <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}


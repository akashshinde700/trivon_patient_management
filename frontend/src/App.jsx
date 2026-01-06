import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import RequireRole from './components/RequireRole';

// Lazy load all pages
const Queue = lazy(() => import('./pages/Queue'));
const Patients = lazy(() => import('./pages/Patients'));
const PrescriptionPad = lazy(() => import('./pages/PrescriptionPad'));
const Payments = lazy(() => import('./pages/Payments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Abha = lazy(() => import('./pages/Abha'));
const WhatsNew = lazy(() => import('./pages/WhatsNew'));
const LabInvestigations = lazy(() => import('./pages/LabInvestigations'));
const PatientOverview = lazy(() => import('./pages/PatientOverview'));
const RxTemplateConfig = lazy(() => import('./pages/RxTemplateConfig'));
const PadConfiguration = lazy(() => import('./pages/PadConfiguration'));
const PrescriptionPreview = lazy(() => import('./pages/PrescriptionPreview'));
const Receipts = lazy(() => import('./pages/Receipts'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const AppointmentIntents = lazy(() => import('./pages/AppointmentIntents'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const ClinicManagement = lazy(() => import('./pages/ClinicManagement'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const DoctorExport = lazy(() => import('./pages/DoctorExport'));
const FamilyHistory = lazy(() => import('./pages/FamilyHistory'));
const LabTemplates = lazy(() => import('./pages/LabTemplates'));
const Insurance = lazy(() => import('./pages/Insurance'));
const MedicalCertificates = lazy(() => import('./pages/MedicalCertificates'));
const ReceiptTemplates = lazy(() => import('./pages/ReceiptTemplates'));
const SymptomsTemplates = lazy(() => import('./pages/SymptomsTemplates'));
const DoctorSettings = lazy(() => import('./pages/DoctorSettings'));
const DoctorManagement = lazy(() => import('./pages/DoctorManagement'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const ClinicExport = lazy(() => import('./pages/ClinicExport'));

// New grouped pages
const Appointments = lazy(() => import('./pages/Appointments'));
const Billing = lazy(() => import('./pages/Billing'));
const Clinical = lazy(() => import('./pages/Clinical'));
const Settings = lazy(() => import('./pages/Settings'));
const LabManagement = lazy(() => import('./pages/LabManagement'));
const InsuranceManagement = lazy(() => import('./pages/InsuranceManagement'));

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={token ? <Navigate to="/queue" replace /> : <Login />} />

      {/* Protected routes */}
      {token ? (
        <>
          <Route path="/queue" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Queue />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/patients" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Patients />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/orders" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PrescriptionPad />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/orders/:patientId" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PrescriptionPad />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/payments" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Payments />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/receipts" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Receipts />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/prescription-preview" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PrescriptionPreview />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/prescription-preview/:patientId" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PrescriptionPreview />
              </Suspense>
            </MainLayout>
          } />
          <Route
            path="/analytics"
            element={
              <MainLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                  <RequireRole allowed={['admin', 'doctor']}>
                    <Analytics />
                  </RequireRole>
                </Suspense>
              </MainLayout>
            }
          />
          <Route path="/abha" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Abha />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/whats-new" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <WhatsNew />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/lab-investigations" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <LabInvestigations />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/patient-overview" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PatientOverview />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/patient-overview/:id" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <PatientOverview />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/rx-template" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <RxTemplateConfig />
              </Suspense>
            </MainLayout>
          } />
          <Route
            path="/pad-configuration"
            element={
              <MainLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                  <RequireRole allowed={['admin', 'doctor']}>
                    <PadConfiguration />
                  </RequireRole>
                </Suspense>
              </MainLayout>
            }
          />
          <Route path="/profile" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <UserProfile />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/appointment-intents" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <AppointmentIntents />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/audit-logs" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <AuditLogs />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/clinics" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <ClinicManagement />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/doctor-management" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <RequireRole allowed={['admin']}>
                  <DoctorManagement />
                </RequireRole>
              </Suspense>
            </MainLayout>
          } />
          <Route path="/user-management" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <UserManagement />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/backup" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <BackupRestore />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/doctor-export" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <DoctorExport />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/family-history/:patientId" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <FamilyHistory />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/lab-templates" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <LabTemplates />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/insurance/:patientId" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Insurance />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/medical-certificates" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <MedicalCertificates />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/receipt-templates" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <ReceiptTemplates />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/symptoms-templates" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <SymptomsTemplates />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/doctor-settings" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <RequireRole allowedRoles={['doctor']}>
                  <DoctorSettings />
                </RequireRole>
              </Suspense>
            </MainLayout>
          } />
          <Route path="/staff-management" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <RequireRole allowed={['admin']}>
                  <StaffManagement />
                </RequireRole>
              </Suspense>
            </MainLayout>
          } />
          <Route path="/clinic-export" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <RequireRole allowed={['admin']}>
                  <ClinicExport />
                </RequireRole>
              </Suspense>
            </MainLayout>
          } />
          {/* New grouped pages */}
          <Route path="/appointments" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Appointments />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/billing" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Billing />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/clinical" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Clinical />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/lab-management" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <LabManagement />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/insurance-management" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <InsuranceManagement />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/settings" element={
            <MainLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">Loading...</div></div>}>
                <Settings />
              </Suspense>
            </MainLayout>
          } />
          <Route path="/" element={<Navigate to="/queue" replace />} />
          <Route path="*" element={<Navigate to="/queue" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;

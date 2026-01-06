import { useEffect, useState, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { getSelectedDoctorId, isAdmin } from '../utils/doctorUtils';
import ConfigurePatientModal from '../components/ConfigurePatientModal';

const tabs = [
  'All Patients',
  'Patients with ABHA',
  'Patients with linked records'
];

export default function Patients() {
  const api = useApiClient();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [activeTab, setActiveTab] = useState(0);

  const [form, setForm] = useState({
    mobile: '',
    salutation: 'Mr.',
    name: '',
    email: '',
    dob: '',
    gender: 'Female',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact: '',
    emergency_phone: '',
    medical_conditions: '',
    allergies: '',
    current_medications: '',
    uhid: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [filterGender, setFilterGender] = useState('');
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [medicalHistoryConfig, setMedicalHistoryConfig] = useState({
    alcohol: false,
    tobacco: false,
    allergies: false,
    asthma: false,
    cancer: false,
    diabetes: false,
    hypertension: false
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [tabCounts, setTabCounts] = useState({ 0: 0, 1: 0, 2: 0 });

  const [patientConfig, setPatientConfig] = useState({
    patientFields: {
      'Mail ID': true,
      'Blood Group': true,
      'Referred By': false,
      "Referred Doctor's Number": false,
      'Marital Status': false,
      'Name of Informant': false,
      'Channel': false,
      "Patient's Occupation": false,
      'Tag': false,
      'Patient Address': true,
      'City': true,
      'Pincode': true
    },
    historyFields: {
      'Alcohol': false,
      'Tobacco': false,
      'Allergies': false,
      'Asthma': false,
      'Cancer': false,
      'Diabetes': false,
      'Hypertension': false
    }
  });

  const [showConfigure, setShowConfigure] = useState(false);

  // Helper function to fetch patients - memoized with useCallback
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search,
        page,
        limit,
        gender: filterGender || undefined,
        blood_group: filterBloodGroup || undefined,
        city: filterCity || undefined,
        state: filterState || undefined,
        tab: activeTab
      };

      // If admin user and has selected a doctor, filter by that doctor's patients
      if (isAdmin(user)) {
        const selectedDoctorId = getSelectedDoctorId();
        if (selectedDoctorId) {
          params.doctor_id = selectedDoctorId;
        }
      }

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const res = await api.get('/api/patients', { params });
      setPatients(res.data.patients || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
      if (res.data.tabCounts) {
        setTabCounts(res.data.tabCounts);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Unable to load patients');
    } finally {
      setLoading(false);
    }
  }, [api, search, page, limit, filterGender, filterBloodGroup, filterCity, filterState, activeTab, user]);

  // Fetch patients when any relevant dependency changes
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Scroll to add-patient form if URL has #add-patient hash
  useEffect(() => {
    if (window.location.hash === '#add-patient') {
      setTimeout(() => {
        const addPatientForm = document.getElementById('add-patient-form');
        if (addPatientForm) {
          addPatientForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 300);
    }
  }, []);

  // Full-screen error view for initial load failure
  if (error && patients.length === 0) {
    return (
      <div className="p-8 text-center text-red-600 text-lg">
        <p>Error: {error}</p>
        <button
          onClick={() => {
            setError('');
            fetchPatients();
          }}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  const nextPage = () => {
    if (page < pagination.pages) setPage(page + 1);
  };

  const generateUHID = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uhid = `P${timestamp}${random}`;
    setForm({ ...form, uhid });
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/patients', {
        patient_id: form.uhid,
        name: `${form.salutation} ${form.name}`.trim(),
        email: form.email,
        phone: form.mobile,
        dob: form.dob,
        gender: form.gender,
        blood_group: form.blood_group,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        emergency_contact: form.emergency_contact,
        emergency_phone: form.emergency_phone,
        medical_conditions: form.medical_conditions,
        allergies: form.allergies,
        current_medications: form.current_medications
      });

      setForm({
        mobile: '',
        salutation: 'Mr.',
        name: '',
        email: '',
        dob: '',
        gender: 'Female',
        blood_group: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        emergency_contact: '',
        emergency_phone: '',
        medical_conditions: '',
        allergies: '',
        current_medications: '',
        uhid: ''
      });

      setPage(1);
      await fetchPatients();
      addToast('Patient added successfully!', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Unable to add patient';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeProfiles = async () => {
    if (selectedPatients.length < 2) {
      addToast('Please select at least 2 patients to merge', 'warning');
      return;
    }

    const primaryPatientId = selectedPatients[0];
    const patientsToMerge = selectedPatients.slice(1);

    try {
      await api.post('/api/patients/merge', {
        primaryPatientId,
        patientIdsToMerge: patientsToMerge
      });

      addToast('Patients merged successfully', 'success');
      setShowMergeModal(false);
      setSelectedPatients([]);
      fetchPatients();
    } catch (error) {
      console.error('Error merging patients:', error);
      addToast('Failed to merge patients', 'error');
    }
  };

  const handleProfilePictureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const handlePatientSelect = (patientId) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  return (
    <div className="space-y-4">
      <HeaderBar title="Patients" />

      {/* Rest of your JSX remains exactly the same */}
      {/* (All tabs, search, filters, table, form, modals – unchanged) */}

      <div className="bg-white rounded shadow-sm border p-4 space-y-3">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(i);
                setPage(1);
              }}
              className={`px-3 py-2 text-sm rounded border transition flex items-center gap-2 ${
                activeTab === i ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <span>{tab}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === i ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tabCounts[i] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Search patients by name, UHID, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button
              className="px-3 py-2 text-sm border rounded"
              onClick={() => { setPage(1); fetchPatients(); }}
            >
              Search
            </button>
            <button
              onClick={() => {
                if (selectedPatients.length < 2) {
                  addToast('Please select at least 2 patients to merge', 'warning');
                } else {
                  setShowMergeModal(true);
                }
              }}
              className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
            >
              Merge Profiles
            </button>
            <button
              className="px-3 py-2 text-sm border rounded"
              onClick={() => setShowConfigure(true)}
            >
              Configure fields
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select className="px-3 py-2 border rounded" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <select className="px-3 py-2 border rounded" value={filterBloodGroup} onChange={(e) => setFilterBloodGroup(e.target.value)}>
                <option value="">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <input className="px-3 py-2 border rounded" placeholder="Filter by City" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} />
              <input className="px-3 py-2 border rounded" placeholder="Filter by State" value={filterState} onChange={(e) => setFilterState(e.target.value)} />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="px-4 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={() => {
                  setFilterGender('');
                  setFilterBloodGroup('');
                  setFilterCity('');
                  setFilterState('');
                  setPage(1);
                  fetchPatients();
                }}
              >
                Clear Filters
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                onClick={() => { setPage(1); fetchPatients(); }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block border rounded overflow-x-auto">
          <div className="grid grid-cols-10 min-w-[900px] bg-slate-50 text-xs font-semibold text-slate-600 px-3 py-2">
            <span><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedPatients(patients.map(p => p.id)) : setSelectedPatients([])} /></span>
            <span>Sr. No.</span>
            <span className="col-span-2">Patient Details</span>
            <span>UHID</span>
            <span>Contact</span>
            <span>Follow Up</span>
            <span>ABHA Status</span>
            <span>Start Visit</span>
            <span>Actions</span>
          </div>

          {loading && <div className="p-4 text-sm text-slate-500">Loading...</div>}
          {error && <div className="p-4 text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="divide-y">
              {patients.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No patients found.</div>
              ) : (
                patients.map((p, idx) => (
                  <div key={p.id || idx} className="grid grid-cols-10 min-w-[900px] items-center px-3 py-2 text-sm">
                    <span><input type="checkbox" checked={selectedPatients.includes(p.id)} onChange={() => handlePatientSelect(p.id)} /></span>
                    <span>{(page - 1) * limit + idx + 1}</span>
                    <div className="col-span-2">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.gender} • {p.dob || ''} • {p.patient_id}</p>
                    </div>
                    <span>{p.patient_id}</span>
                    <span>{p.phone || '-'}</span>
                    <span>{p.follow_up || '-'}</span>
                    <span>
                      {p.abha_id ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs">✓ ABHA Linked</span>
                      ) : (
                        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded hover:bg-pink-200">
                          ✗ No ABHA
                        </button>
                      )}
                    </span>
                    <span>
                      <a href={`/orders/${p.id}`} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        Start Visit
                      </a>
                    </span>
                    <div className="flex gap-2">
                      <a href={`/patient-overview/${p.id}`} className="px-2 py-1 text-xs border rounded text-primary hover:bg-primary hover:text-white transition">
                        Overview
                      </a>
                      <div className="relative">
                        <button onClick={() => setDropdownOpen(dropdownOpen === p.id ? null : p.id)} className="px-2 py-1 text-xs border rounded hover:bg-slate-100">
                          ⋮
                        </button>
                        {dropdownOpen === p.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-10">
                            <button
                              onClick={async () => {
                                // Close dropdown immediately
                                setDropdownOpen(null);

                                if (window.confirm(`Delete patient ${p.name}?\n\nWarning: This will also delete all related appointments, bills, and medical records.`)) {
                                  try {
                                    const response = await api.delete(`/api/patients/${p.id}`);
                                    console.log('Delete response:', response.data);
                                    addToast(response.data.message || 'Patient deleted successfully', 'success');

                                    // Immediately remove from local state for instant UI update
                                    setPatients(prevPatients => prevPatients.filter(patient => patient.id !== p.id));

                                    // Refresh from server to ensure consistency and update counts
                                    await fetchPatients();
                                  } catch (error) {
                                    console.error('Delete patient error:', error);
                                    console.error('Error response:', error.response);
                                    const errorMsg = error.response?.data?.error || 'Failed to delete patient';
                                    addToast(errorMsg, 'error');
                                    // If deletion failed, refresh to get current state
                                    await fetchPatients();
                                  }
                                }
                              }}
                              className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              Delete Patient
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-600">
          <button className="px-3 py-2 border rounded disabled:opacity-50 w-full sm:w-auto" onClick={prevPage} disabled={page === 1}>Prev</button>
          <span className="text-center">
            Page {pagination.page || page} of {pagination.pages || 1} • Total {pagination.total || patients.length}
          </span>
          <button className="px-3 py-2 border rounded disabled:opacity-50 w-full sm:w-auto" onClick={nextPage} disabled={page >= (pagination.pages || 1)}>Next</button>
        </div>
      </div>

      {/* Add Patient Form */}
      <form id="add-patient-form" className="bg-white rounded shadow-sm border p-4 space-y-4" onSubmit={handleAddPatient}>
        <h2 className="text-lg font-semibold">Add New Patient</h2>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input className="px-3 py-2 border rounded" placeholder="Mobile Number *" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
            <div className="flex gap-2">
              <select className="px-3 py-2 border rounded w-20" value={form.salutation} onChange={(e) => setForm({ ...form, salutation: e.target.value })}>
                <option>Mr.</option>
                <option>Ms.</option>
                <option>Mrs.</option>
                <option>Dr.</option>
              </select>
              <input className="flex-1 px-3 py-2 border rounded" placeholder="Patient Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <input className="px-3 py-2 border rounded" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="px-3 py-2 border rounded" placeholder="Date of Birth" type="date" value={form.dob ? new Date(form.dob).toISOString().split('T')[0] : ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            <select className="px-3 py-2 border rounded" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
            {patientConfig.patientFields['Blood Group'] && (
              <select className="px-3 py-2 border rounded" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                <option value="">Blood Group</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
                <option>O+</option>
                <option>O-</option>
              </select>
            )}
          </div>

          {/* Profile Picture & UHID */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 border flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="mt-2 text-xs" />
            </div>
            <div className="flex-1">
              <button type="button" onClick={generateUHID} className="px-3 py-2 text-sm border rounded hover:bg-slate-50">
                Generate UHID
              </button>
              {form.uhid && <p className="text-xs text-slate-500 mt-1">Generated UHID: {form.uhid}</p>}
            </div>
          </div>
        </div>

        {/* Address */}
        {patientConfig.patientFields['Patient Address'] && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Address Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input className="px-3 py-2 border rounded sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input className="px-3 py-2 border rounded" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input className="px-3 py-2 border rounded" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              <input className="px-3 py-2 border rounded" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>
        )}

        {/* Medical Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Medical Information</h3>
          <div className="grid grid-cols-1 gap-3">
            <textarea className="px-3 py-2 border rounded" placeholder="Medical Conditions" rows="2" value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} />
            {patientConfig.historyFields['Allergies'] && (
              <textarea className="px-3 py-2 border rounded" placeholder="Allergies" rows="2" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(patientConfig.historyFields).map(field =>
              patientConfig.historyFields[field] && (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={medicalHistoryConfig[field.toLowerCase()]}
                    onChange={(e) => setMedicalHistoryConfig({
                      ...medicalHistoryConfig,
                      [field.toLowerCase()]: e.target.checked
                    })}
                  />
                  {field}
                </label>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded disabled:opacity-50 w-full sm:w-auto hover:bg-primary/90 transition" disabled={loading}>
            {loading ? 'Saving...' : 'Add Patient'}
          </button>
          <button type="button" onClick={() => setForm({ mobile: '', salutation: 'Mr.', name: '', email: '', dob: '', gender: 'Female', blood_group: '', address: '', city: '', state: '', pincode: '', emergency_contact: '', emergency_phone: '', medical_conditions: '', allergies: '', current_medications: '', uhid: '' })} className="px-3 py-2 text-sm border rounded w-full sm:w-auto hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </form>

      {/* Configure Modal */}
      <ConfigurePatientModal open={showConfigure} onClose={() => setShowConfigure(false)} onSave={(config) => { setPatientConfig(config); addToast('Patient form configuration saved', 'success'); }} />

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Merge Patient Profiles</h3>
            <p className="text-sm text-slate-600 mb-4">You have selected {selectedPatients.length} patient(s) to merge.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowMergeModal(false)} className="flex-1 px-4 py-2 text-sm border rounded hover:bg-slate-50">Cancel</button>
              <button onClick={handleMergeProfiles} className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90">Merge Profiles</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
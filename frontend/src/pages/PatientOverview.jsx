import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { openWhatsApp } from '../utils/whatsapp';
import AbhaIntegration from '../components/AbhaIntegration';

export default function PatientOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApiClient();
  const { addToast } = useToast();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [labs, setLabs] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [labSearch, setLabSearch] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('P'); // P: Past Visits, H: History, V: Vitals, R: Records
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [includeOtherProfiles, setIncludeOtherProfiles] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [surgicalHistory, setSurgicalHistory] = useState([]);
  const [showAddSurgeryModal, setShowAddSurgeryModal] = useState(false);
  const [newSurgery, setNewSurgery] = useState({ procedure: '', date: '', notes: '' });
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    age: '',
    useAgeInput: false,
    gender: '',
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
    patient_id: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showUploadRecordModal, setShowUploadRecordModal] = useState(false);
  const [showManualRecordModal, setShowManualRecordModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'OTHERS',
    description: '',
    file: null
  });
  const [manualRecordForm, setManualRecordForm] = useState({
    name: '',
    category: 'OTHERS',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchPatientData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/patients/${id}`);
      setPatient(res.data);

      // Fetch data based on includeOtherProfiles setting
      const params = includeOtherProfiles ? '?includeOtherProfiles=true' : '';

      const [rec, lab, vit, time, presc] = await Promise.all([
        api.get(`/api/patient-data/records/${id}${params}`),
        api.get(`/api/patient-data/labs/${id}${params}`),
        api.get(`/api/patient-data/vitals/${id}${params}`),
        api.get(`/api/patient-data/timeline/${id}${params}`),
        api.get(`/api/prescriptions/${id}`).catch(() => ({ data: { prescriptions: [] } }))
      ]);

      setRecords(rec.data.records || []);
      setLabs(lab.data.labs || []);
      setVitals(vit.data.vitals || []);
      setTimeline(time.data.timeline || []);
      setPrescriptions(presc.data.prescriptions || []);
      setLastUpdated(new Date());
    } catch (err) {
      // If patient not found (404), redirect back to patients list
      if (err.response?.status === 404) {
        addToast('Patient not found or has been deleted', 'error');
        navigate('/patients');
        return;
      }
      setError(err.response?.data?.error || 'Unable to load patient');
    } finally {
      setLoading(false);
    }
  }, [id, api, includeOtherProfiles, addToast, navigate]);

  const handleRefresh = () => {
    fetchPatientData();
    addToast('Data refreshed', 'success');
  };

  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(labSearch.toLowerCase())
  );

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'PRESCRIPTION': 'bg-blue-100 text-blue-800',
      'REPORT': 'bg-green-100 text-green-800',
      'XRAY': 'bg-purple-100 text-purple-800',
      'MRI': 'bg-indigo-100 text-indigo-800',
      'BLOOD_TEST': 'bg-red-100 text-red-800',
      'OTHERS': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['OTHERS'];
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getVitalsDisplay = () => {
    const vitalsMap = {};
    vitals.forEach(v => {
      vitalsMap[v.label] = v;
    });

    const allVitals = [
      { key: 'Temperature', label: 'Temperature', unit: '°F', color: 'text-red-600' },
      { key: 'Height', label: 'Height', unit: 'cm', color: 'text-blue-600' },
      { key: 'Weight', label: 'Weight', unit: 'kg', color: 'text-green-600' },
      { key: 'BMI', label: 'BMI', unit: '', color: 'text-purple-600' },
      { key: 'Pulse Rate', label: 'Pulse Rate', unit: 'bpm', color: 'text-orange-600' },
      { key: 'HOMA-IR', label: 'HOMA-IR', unit: '', color: 'text-indigo-600' },
      { key: 'Waist Hip Ratio', label: 'Waist Hip Ratio', unit: '', color: 'text-pink-600' }
    ];

    return allVitals.map(vital => ({
      ...vital,
      value: vitalsMap[vital.key]?.value || 'N/A',
      date: vitalsMap[vital.key]?.date || null
    }));
  };

  const handleAddSurgery = async () => {
    if (!newSurgery.procedure || !newSurgery.date) {
      addToast('Please fill procedure name and date', 'error');
      return;
    }

    try {
      // In a real app, this would save to backend
      // For now, we'll add to local state
      setSurgicalHistory([...surgicalHistory, { ...newSurgery, id: Date.now() }]);
      setNewSurgery({ procedure: '', date: '', notes: '' });
      setShowAddSurgeryModal(false);
      addToast('Surgical procedure added', 'success');
    } catch (err) {
      addToast('Failed to add surgery', 'error');
    }
  };

  const handleUploadRecord = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      addToast('Please select a file to upload', 'error');
      return;
    }

    if (!uploadForm.name.trim()) {
      addToast('Please enter a record name', 'error');
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name);
      formData.append('category', uploadForm.category);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      await api.post(`/api/patient-data/records/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      addToast('Record uploaded successfully', 'success');
      setShowUploadRecordModal(false);
      setUploadForm({ name: '', category: 'OTHERS', description: '', file: null });
      fetchPatientData();
    } catch (error) {
      console.error('Upload error:', error);
      addToast(error.response?.data?.error || 'Failed to upload record', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleManualRecord = async (e) => {
    e.preventDefault();

    if (!manualRecordForm.name.trim()) {
      addToast('Please enter a record name', 'error');
      return;
    }

    setUploadLoading(true);
    try {
      await api.post(`/api/patient-data/records/${id}`, {
        name: manualRecordForm.name,
        category: manualRecordForm.category,
        description: manualRecordForm.description,
        date: manualRecordForm.date
      });

      addToast('Record created successfully', 'success');
      setShowManualRecordModal(false);
      setManualRecordForm({ name: '', category: 'OTHERS', description: '', date: new Date().toISOString().split('T')[0] });
      fetchPatientData();
    } catch (error) {
      console.error('Manual record error:', error);
      addToast(error.response?.data?.error || 'Failed to create record', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const calculateDobFromAge = (age) => {
    if (!age || isNaN(age)) return '';
    const today = new Date();
    const birthYear = today.getFullYear() - parseInt(age);
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
    return birthDate.toISOString().split('T')[0];
  };

  const calculateAgeFromDob = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  useEffect(() => {
    if (!id) return;
    fetchPatientData();
  }, [id, fetchPatientData]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Patient Overview</h1>
      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {patient && (
        <div className="bg-white border rounded shadow-sm p-6">
          {/* Patient Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {patient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    UHID: {patient.patient_id}
                  </span>
                  {patient.abha_id && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                      ABHA: {patient.abha_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const age = patient.dob ? calculateAgeFromDob(patient.dob) : '';
                  setEditForm({
                    name: patient.name || '',
                    phone: patient.phone || '',
                    email: patient.email || '',
                    dob: patient.dob || '',
                    age: age,
                    useAgeInput: false,
                    gender: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '',
                    blood_group: patient.blood_group || '',
                    address: patient.address || '',
                    city: patient.city || '',
                    state: patient.state || '',
                    pincode: patient.pincode || '',
                    emergency_contact: patient.emergency_contact || '',
                    emergency_phone: patient.emergency_phone || '',
                    medical_conditions: patient.medical_conditions || '',
                    allergies: patient.allergies || '',
                    current_medications: patient.current_medications || '',
                    patient_id: patient.patient_id || ''
                  });
                  setShowEditPatientModal(true);
                }}
                className="px-4 py-2 border rounded hover:bg-slate-50 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Patient
              </button>
              <button
                onClick={() => {
                  if (patient?.phone) {
                    openWhatsApp(patient.phone, `Hello ${patient.name},\n\nHow can I help you today?`);
                  } else {
                    addToast('Patient phone number not available', 'error');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"
                title="Chat on WhatsApp"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={() => navigate(`/orders/${id}`, { state: { returnTo: `/patient-overview/${id}` } })}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 text-sm"
              >
                New Prescription
              </button>
              <button
                onClick={() => navigate(`/family-history/${id}`, { state: { returnTo: `/patient-overview/${id}` } })}
                className="px-4 py-2 border rounded hover:bg-slate-50 text-sm"
              >
                Family History
              </button>
            </div>
          </div>

          {/* Patient Demographics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-slate-50 rounded">
              <div className="text-xs text-slate-500 mb-1">Age</div>
              <div className="font-semibold text-slate-800">
                {calculateAge(patient.dob)} years
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <div className="text-xs text-slate-500 mb-1">Gender</div>
              <div className="font-semibold text-slate-800 capitalize">
                {patient.gender || 'N/A'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <div className="text-xs text-slate-500 mb-1">Date of Birth</div>
              <div className="font-semibold text-slate-800">
                {patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN') : 'N/A'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <div className="text-xs text-slate-500 mb-1">Blood Group</div>
              <div className="font-semibold text-slate-800">
                {patient.blood_group || 'N/A'}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <div className="text-sm font-medium">{patient.phone || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <div className="text-sm font-medium">{patient.email || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="text-xs text-slate-500">Address</div>
                <div className="text-sm font-medium truncate">{patient.address || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Medical Alerts */}
          {(patient.allergies || patient.chronic_conditions) && (
            <div className="flex flex-wrap gap-2">
              {patient.allergies && (
                <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Allergies: {patient.allergies}
                </div>
              )}
              {patient.chronic_conditions && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Chronic: {patient.chronic_conditions}
                </div>
              )}
            </div>
          )}

          {/* ABHA Integration */}
          <div className="mt-4">
            <AbhaIntegration patientId={id} onAbhaLinked={fetchPatientData} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Medical Records</h3>
                <span className="text-xs text-slate-500">
                  Last updated at {lastUpdated.toLocaleTimeString()}
                </span>
                <button
                  onClick={handleRefresh}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                  onClick={() => setShowManualRecordModal(true)}
                >
                  + Add Record
                </button>
                <button
                  className="px-3 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                  onClick={() => setShowUploadRecordModal(true)}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Include other profiles checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeOtherProfiles"
                checked={includeOtherProfiles}
                onChange={(e) => setIncludeOtherProfiles(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="includeOtherProfiles" className="text-sm text-slate-600">
                +{records.length} records from other profiles
              </label>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {records.map((r, idx) => (
                <div key={`${r.name}-${idx}`} className="p-3 border rounded bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{r.name}</p>
                      <p className="text-xs text-slate-600">{r.date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryBadgeColor(r.category)}`}>
                      {r.category}
                    </span>
                  </div>

                  {/* Document preview placeholder */}
                  <div className="w-full h-20 bg-slate-200 rounded flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div className="flex gap-1">
                    <button className="text-xs text-primary hover:underline">View</button>
                    <button className="text-xs text-slate-600 hover:underline">Download</button>
                    <button 
                      className="text-xs text-red-600 hover:text-red-800 ml-2"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this record?')) {
                          api.delete(`/api/patient-data/records/${r.id}`)
                            .then(() => {
                              setRecords(prev => prev.filter(record => record.id !== r.id));
                              addToast('Record deleted', 'success');
                            })
                            .catch(() => addToast('Delete failed', 'error'));
                        }
                      }}
                    >
                      <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Lab Results</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                  className="px-3 py-2 text-sm border rounded"
                />
                <button className="px-3 py-2 text-sm border rounded hover:bg-slate-50 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  See Historical Data
                </button>
              </div>
            </div>
            <div className="border rounded divide-y">
              <div className="grid grid-cols-3 bg-slate-50 text-xs font-semibold text-slate-600 px-3 py-2">
                <span>TEST NAME</span>
                <span>READINGS</span>
                <span>DATE</span>
              </div>
              {filteredLabs.map((l, idx) => (
                <div key={`${l.name}-${idx}`} className="grid grid-cols-3 px-3 py-2 text-sm hover:bg-slate-50">
                  <span>{l.name}</span>
                  <span>{l.reading}</span>
                  <span>{l.date}</span>
                </div>
              ))}
              {filteredLabs.length === 0 && (
                <div className="px-3 py-4 text-center text-slate-500 text-sm">
                  No lab results found
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">Vitals</h3>
            <div className="grid grid-cols-2 gap-4">
              {getVitalsDisplay().map((vital, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{vital.label}</span>
                  <span className={`font-semibold ${vital.color}`}>
                    {vital.value} {vital.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">Timeline</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {timeline.slice(0, showAllHistory ? timeline.length : 3).map((t, idx) => (
                <div key={`${t.date}-${idx}`} className="p-3 border rounded bg-slate-50 text-sm relative">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold">{t.date}</p>
                    <button
                      className="text-slate-500 hover:text-slate-700 p-1"
                      onClick={() => {
                        const textToCopy = `${t.date}\nSymptoms: ${t.symptoms.join(', ')}\nDiagnosis: ${t.diagnosis}\nMedications: ${t.meds.join(', ')}`;
                        navigator.clipboard.writeText(textToCopy);
                        addToast('Copied to clipboard', 'success');
                      }}
                      title="Copy visit details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p>Sx: {t.symptoms.join(', ')}</p>
                  <p>Dx: {t.diagnosis}</p>
                  <p>Mx: {t.meds.join(', ')}</p>
                </div>
              ))}
              {labs.slice(0, showAllHistory ? labs.length : 3).map((lab, idx) => (
                <div key={`lab-${lab.name}-${idx}`} className="p-3 border rounded bg-blue-50 text-sm relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <p className="font-semibold text-blue-900">{lab.date}</p>
                    </div>
                  </div>
                  <p className="text-blue-800 font-medium">{lab.name}</p>
                  <p className="text-blue-700">Result: <span className="font-semibold">{lab.reading} {lab.unit || ''}</span></p>
                </div>
              ))}
            </div>
            {(timeline.length > 3 || labs.length > 3) && (
              <button
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-sm text-primary hover:underline"
              >
                {showAllHistory ? 'Show less' : 'Show more'}
              </button>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border rounded shadow-sm p-4">
            <h3 className="font-semibold mb-3">History & Private Notes</h3>

            <div className="flex border-b mb-4">
              {[
                { key: 'P', label: 'Past Visits' },
                { key: 'H', label: 'History' },
                { key: 'V', label: 'Vitals' },
                { key: 'R', label: 'Records' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {activeTab === 'P' && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recent Visits & Prescriptions</h4>
                  {prescriptions.length === 0 && (
                    <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
                      No previous visits found
                    </div>
                  )}
                  {prescriptions.slice(0, showAllHistory ? prescriptions.length : 5).map((presc, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-3 bg-slate-50 hover:bg-slate-100 border rounded mb-2 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedVisit(presc);
                        setShowPrescriptionModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">
                          {new Date(presc.created_at).toLocaleDateString('en-IN')}
                        </span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      {presc.symptoms && presc.symptoms.length > 0 && (
                        <div className="text-slate-600 mb-1">
                          <span className="font-medium">Sx:</span> {presc.symptoms.slice(0, 2).join(', ')}
                          {presc.symptoms.length > 2 && '...'}
                        </div>
                      )}
                      {presc.diagnoses && presc.diagnoses.length > 0 && (
                        <div className="text-slate-600 mb-1">
                          <span className="font-medium">Dx:</span> {presc.diagnoses.slice(0, 2).join(', ')}
                          {presc.diagnoses.length > 2 && '...'}
                        </div>
                      )}
                      {presc.medications && presc.medications.length > 0 && (
                        <div className="text-slate-600">
                          <span className="font-medium">Rx:</span> {presc.medications.length} medication(s)
                        </div>
                      )}
                    </div>
                  ))}
                  {prescriptions.length > 5 && (
                    <button
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="text-xs text-primary hover:underline mt-2 w-full text-center"
                    >
                      {showAllHistory ? 'Show less' : `Show all ${prescriptions.length} visits`}
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'H' && (
                <div className="space-y-4">
                  {/* Allergies & Conditions */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-slate-800">Allergies & Conditions</h4>
                    <div className="space-y-1">
                      {patient?.allergies ? (
                        <div className="text-xs p-2 bg-red-50 text-red-800 rounded flex items-start gap-2">
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Allergies: {patient.allergies}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">No known allergies</div>
                      )}
                      {patient?.chronic_conditions && (
                        <div className="text-xs p-2 bg-orange-50 text-orange-800 rounded flex items-start gap-2">
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Chronic: {patient.chronic_conditions}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Past Surgical Procedures */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-800">Past Surgical Procedures</h4>
                      <button
                        onClick={() => setShowAddSurgeryModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Surgery
                      </button>
                    </div>
                    {surgicalHistory.length === 0 ? (
                      <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
                        No surgical history recorded
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {surgicalHistory.map((surgery, idx) => (
                          <div key={surgery.id || idx} className="text-xs p-2 bg-purple-50 border border-purple-200 rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-purple-900">{surgery.procedure}</div>
                                <div className="text-purple-700 mt-1">
                                  {new Date(surgery.date).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                {surgery.notes && (
                                  <div className="text-purple-600 mt-1 italic">{surgery.notes}</div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSurgicalHistory(surgicalHistory.filter((_, i) => i !== idx));
                                  addToast('Surgery removed', 'success');
                                }}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Family History Link */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-800">Family History</h4>
                      <button
                        onClick={() => navigate(`/family-history/${id}`, { state: { returnTo: `/patient-overview/${id}` } })}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Manage →
                      </button>
                    </div>
                  </div>

                  {/* Insurance Link */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-slate-800">Insurance</h4>
                      <button
                        onClick={() => navigate(`/insurance/${id}`, { state: { returnTo: `/patient-overview/${id}` } })}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Manage →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'V' && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Latest Vitals</h4>
                  {getVitalsDisplay().slice(0, 4).map((vital, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex justify-between">
                      <span>{vital.label}:</span>
                      <span className={vital.color}>{vital.value} {vital.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'R' && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recent Records</h4>
                  {records.length === 0 ? (
                    <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
                      No records found
                    </div>
                  ) : (
                    records.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="text-xs p-2 bg-slate-50 hover:bg-slate-100 border rounded mb-2 transition-colors">
                        <div className="font-medium text-slate-800 mb-1">{record.name}</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded ${getCategoryBadgeColor(record.category)}`}>
                            {record.category}
                          </span>
                          <span className="text-slate-500">{record.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Prescription Details Modal */}
      {showPrescriptionModal && selectedVisit && (
        <Modal
          isOpen={showPrescriptionModal}
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedVisit(null);
          }}
          title={`Prescription - ${new Date(selectedVisit.created_at).toLocaleDateString('en-IN')}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Visit Info */}
            <div className="bg-slate-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Doctor:</span>
                  <span className="ml-2 font-medium">{selectedVisit.doctor_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(selectedVisit.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Vitals */}
            {selectedVisit.vitals && Object.keys(selectedVisit.vitals).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Vitals</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {selectedVisit.vitals.temp && (
                    <div className="p-2 bg-red-50 rounded">
                      <div className="text-xs text-slate-600">Temperature</div>
                      <div className="font-semibold text-red-700">{selectedVisit.vitals.temp}°F</div>
                    </div>
                  )}
                  {selectedVisit.vitals.blood_pressure && (
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-xs text-slate-600">BP</div>
                      <div className="font-semibold text-blue-700">{selectedVisit.vitals.blood_pressure}</div>
                    </div>
                  )}
                  {selectedVisit.vitals.pulse && (
                    <div className="p-2 bg-orange-50 rounded">
                      <div className="text-xs text-slate-600">Pulse</div>
                      <div className="font-semibold text-orange-700">{selectedVisit.vitals.pulse} bpm</div>
                    </div>
                  )}
                  {selectedVisit.vitals.weight && (
                    <div className="p-2 bg-green-50 rounded">
                      <div className="text-xs text-slate-600">Weight</div>
                      <div className="font-semibold text-green-700">{selectedVisit.vitals.weight} kg</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {selectedVisit.symptoms && selectedVisit.symptoms.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Symptoms (Sx)</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedVisit.symptoms.map((symptom, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnoses */}
            {selectedVisit.diagnoses && selectedVisit.diagnoses.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Diagnosis (Dx)</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedVisit.diagnoses.map((diagnosis, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {diagnosis}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {selectedVisit.medications && selectedVisit.medications.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Medications (Rx)</h4>
                <div className="border rounded divide-y">
                  {selectedVisit.medications.map((med, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-50">
                      <div className="font-medium text-sm mb-1">{med.name || med.brand}</div>
                      {med.composition && (
                        <div className="text-xs text-slate-600 mb-1">{med.composition}</div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {med.frequency && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {med.frequency}
                          </span>
                        )}
                        {med.timing && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            {med.timing}
                          </span>
                        )}
                        {med.duration && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                            {med.duration}
                          </span>
                        )}
                      </div>
                      {med.instructions && (
                        <div className="text-xs text-slate-600 mt-1 italic">{med.instructions}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advice */}
            {selectedVisit.advice && (
              <div>
                <h4 className="font-semibold mb-2">Advice</h4>
                <div className="p-3 bg-blue-50 rounded text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedVisit.advice}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {selectedVisit.follow_up_date && (
              <div>
                <h4 className="font-semibold mb-2">Follow-up</h4>
                <div className="p-3 bg-green-50 rounded text-sm">
                  <span className="font-medium text-green-800">
                    {new Date(selectedVisit.follow_up_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setSelectedVisit(null);
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigate(`/prescription-preview/${id}`, {
                    state: { prescription: selectedVisit }
                  });
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                View Full Prescription
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Surgery Modal */}
      {showAddSurgeryModal && (
        <Modal
          isOpen={showAddSurgeryModal}
          onClose={() => {
            setShowAddSurgeryModal(false);
            setNewSurgery({ procedure: '', date: '', notes: '' });
          }}
          title="Add Surgical Procedure"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Procedure Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Appendectomy, Cesarean Section"
                value={newSurgery.procedure}
                onChange={(e) => setNewSurgery({ ...newSurgery, procedure: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Surgery *
              </label>
              <input
                type="date"
                value={newSurgery.date}
                onChange={(e) => setNewSurgery({ ...newSurgery, date: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Hospital, surgeon name, complications, recovery notes..."
                value={newSurgery.notes}
                onChange={(e) => setNewSurgery({ ...newSurgery, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddSurgeryModal(false);
                  setNewSurgery({ procedure: '', date: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSurgery}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Add Surgery
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Record Modal */}
      {showUploadRecordModal && (
        <Modal
          isOpen={showUploadRecordModal}
          onClose={() => {
            setShowUploadRecordModal(false);
            setUploadForm({ name: '', category: 'OTHERS', description: '', file: null });
          }}
          title="Upload Medical Record"
        >
          <form onSubmit={handleUploadRecord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Record Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Blood Test Report, X-Ray, MRI Scan"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PRESCRIPTION">Prescription</option>
                <option value="REPORT">Report</option>
                <option value="XRAY">X-Ray</option>
                <option value="MRI">MRI</option>
                <option value="BLOOD_TEST">Blood Test</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                File *
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Allowed: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (Max 10MB)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Add any additional notes or description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowUploadRecordModal(false);
                  setUploadForm({ name: '', category: 'OTHERS', description: '', file: null });
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
                disabled={uploadLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={uploadLoading}
              >
                {uploadLoading ? 'Uploading...' : 'Upload Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Record Modal */}
      {showManualRecordModal && (
        <Modal
          isOpen={showManualRecordModal}
          onClose={() => {
            setShowManualRecordModal(false);
            setManualRecordForm({ name: '', category: 'OTHERS', description: '', date: new Date().toISOString().split('T')[0] });
          }}
          title="Add Medical Record"
        >
          <form onSubmit={handleManualRecord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Record Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Consultation Notes, Diagnosis, Treatment Plan"
                value={manualRecordForm.name}
                onChange={(e) => setManualRecordForm({ ...manualRecordForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={manualRecordForm.category}
                onChange={(e) => setManualRecordForm({ ...manualRecordForm, category: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PRESCRIPTION">Prescription</option>
                <option value="REPORT">Report</option>
                <option value="XRAY">X-Ray</option>
                <option value="MRI">MRI</option>
                <option value="BLOOD_TEST">Blood Test</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={manualRecordForm.date}
                onChange={(e) => setManualRecordForm({ ...manualRecordForm, date: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description *
              </label>
              <textarea
                placeholder="Enter record details, findings, or notes"
                value={manualRecordForm.description}
                onChange={(e) => setManualRecordForm({ ...manualRecordForm, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowManualRecordModal(false);
                  setManualRecordForm({ name: '', category: 'OTHERS', description: '', date: new Date().toISOString().split('T')[0] });
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
                disabled={uploadLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={uploadLoading}
              >
                {uploadLoading ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Patient Modal */}
      {showEditPatientModal && (
        <Modal
          isOpen={showEditPatientModal}
          onClose={() => setShowEditPatientModal(false)}
          title="Edit Patient Information"
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editForm.useAgeInput ? 'Age (Years)' : 'Date of Birth'}
                </label>
                <div className="flex gap-2">
                  {editForm.useAgeInput ? (
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={editForm.age}
                      onChange={(e) => {
                        const age = e.target.value;
                        const calculatedDob = calculateDobFromAge(age);
                        setEditForm({ ...editForm, age, dob: calculatedDob });
                      }}
                      placeholder="Enter age"
                      className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <input
                      type="date"
                      value={editForm.dob ? new Date(editForm.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dob = e.target.value;
                        const calculatedAge = calculateAgeFromDob(dob);
                        setEditForm({ ...editForm, dob, age: calculatedAge });
                      }}
                      className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, useAgeInput: !editForm.useAgeInput })}
                    className="px-3 py-2 border rounded hover:bg-slate-50 text-sm whitespace-nowrap"
                    title={editForm.useAgeInput ? 'Switch to Date of Birth' : 'Switch to Age'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
                {editForm.dob && (
                  <div className="mt-1 text-xs text-slate-500">
                    {editForm.useAgeInput ? `DOB: ${new Date(editForm.dob).toLocaleDateString('en-IN')}` : `Age: ${calculateAge(editForm.dob)} years`}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                <select
                  value={editForm.blood_group}
                  onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={editForm.pincode}
                  onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={editForm.emergency_contact}
                  onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  value={editForm.emergency_phone}
                  onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Medical Conditions</label>
                <textarea
                  value={editForm.medical_conditions}
                  onChange={(e) => setEditForm({ ...editForm, medical_conditions: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                <textarea
                  value={editForm.allergies}
                  onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                <textarea
                  value={editForm.current_medications}
                  onChange={(e) => setEditForm({ ...editForm, current_medications: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">UHID (Optional)</label>
                <input
                  type="text"
                  value={editForm.patient_id}
                  onChange={(e) => setEditForm({ ...editForm, patient_id: e.target.value })}
                  placeholder="Leave blank if not yet created"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setShowEditPatientModal(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setEditLoading(true);
                  try {
                    await api.put(`/api/patients/${id}`, {
                      name: editForm.name,
                      phone: editForm.phone,
                      email: editForm.email,
                      dob: editForm.dob,
                      gender: editForm.gender === 'Male' ? 'M' : editForm.gender === 'Female' ? 'F' : editForm.gender || null,
                      blood_group: editForm.blood_group,
                      address: editForm.address,
                      city: editForm.city,
                      state: editForm.state,
                      pincode: editForm.pincode,
                      emergency_contact: editForm.emergency_contact,
                      emergency_phone: editForm.emergency_phone,
                      medical_conditions: editForm.medical_conditions,
                      allergies: editForm.allergies,
                      current_medications: editForm.current_medications,
                      patient_id: editForm.patient_id || null
                    });
                    addToast('Patient information updated successfully', 'success');
                    setShowEditPatientModal(false);
                    fetchPatientData();
                  } catch (error) {
                    addToast(error.response?.data?.error || 'Failed to update patient', 'error');
                  } finally {
                    setEditLoading(false);
                  }
                }}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


import { useState, useEffect, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import Modal from '../components/Modal';
import { useApiClient } from '../api/client';

export default function MedicalCertificates() {
  const api = useApiClient();
  const [certificates, setCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState(null);

  // Patient search states
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [filters, setFilters] = useState({
    patient_id: '',
    certificate_type: '',
    from_date: '',
    to_date: ''
  });

  const [certificateForm, setCertificateForm] = useState({
    patient_id: '',
    doctor_name: '',
    doctor_registration_no: '',
    doctor_qualification: '',
    certificate_type: 'sick_leave',
    certificate_title: '',
    diagnosis: '',
    certificate_content: '',
    issued_date: new Date().toISOString().split('T')[0],
    valid_from: '',
    valid_until: '',
    notes: '',
    header_image: '',
    footer_image: ''
  });

  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    certificate_type: 'sick_leave',
    template_content: '',
    header_image: '',
    footer_image: '',
    is_default: false
  });

  const certificateTypes = [
    { value: 'sick_leave', label: 'Sick Leave' },
    { value: 'fitness', label: 'Fitness Certificate' },
    { value: 'discharge', label: 'Discharge Summary' },
    { value: 'pre_op_fitness', label: 'Pre-Operative Fitness' },
    { value: '2d_echo', label: '2D Echo Report' },
    { value: 'travel', label: 'Travel Fitness' },
    { value: 'disability', label: 'Disability Certificate' },
    { value: 'medical_report', label: 'Medical Report' },
    { value: 'other', label: 'Other' }
  ];

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.patient_id) params.append('patient_id', filters.patient_id);
      if (filters.certificate_type) params.append('certificate_type', filters.certificate_type);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const res = await api.get(`/api/medical-certificates?${params.toString()}`);
      setCertificates(res.data.certificates || []);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/api/medical-certificates/templates/list');
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, [api]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/api/patients');
      setPatients(res.data.patients || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  }, [api]);

  // Search patients function
  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      setShowPatientSearch(false);
      return;
    }

    try {
      const res = await api.get(`/api/patients?search=${query}`);
      setPatientResults(res.data.patients || []);
      setShowPatientSearch(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.name} (${patient.patient_id})`);
    setShowPatientSearch(false);
    setPatientResults([]);

    // Auto-fill patient data in certificate form
    setCertificateForm(prev => ({
      ...prev,
      patient_id: patient.id
    }));

    // Open create modal
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchCertificates();
    fetchTemplates();
    fetchPatients();
  }, [fetchCertificates, fetchTemplates, fetchPatients]);

  const resetCertificateForm = () => {
    setCertificateForm({
      patient_id: '',
      doctor_name: '',
      doctor_registration_no: '',
      doctor_qualification: '',
      certificate_type: 'sick_leave',
      certificate_title: '',
      diagnosis: '',
      certificate_content: '',
      issued_date: new Date().toISOString().split('T')[0],
      valid_from: '',
      valid_until: '',
      notes: '',
      header_image: '',
      footer_image: ''
    });
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const handleCreateCertificate = async () => {
    if (!certificateForm.patient_id || !certificateForm.doctor_name || !certificateForm.certificate_title || !certificateForm.certificate_content) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/api/medical-certificates', certificateForm);
      setShowCreateModal(false);
      fetchCertificates();
      resetCertificateForm();
      alert('Medical certificate created successfully!');
    } catch (error) {
      console.error('Failed to create certificate:', error);
      alert('Failed to create certificate');
    }
  };

  const handleDeleteCertificate = async (id) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return;
    }

    try {
      await api.delete(`/api/medical-certificates/${id}`);
      fetchCertificates();
      alert('Certificate deleted successfully!');
    } catch (error) {
      console.error('Failed to delete certificate:', error);
      alert('Failed to delete certificate');
    }
  };

  const handleViewCertificate = async (cert) => {
    try {
      const res = await api.get(`/api/medical-certificates/${cert.id}`);
      setViewingCertificate(res.data.certificate);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch certificate details:', error);
      alert('Failed to load certificate');
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleLoadTemplate = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setCertificateForm({
        ...certificateForm,
        certificate_type: template.certificate_type,
        certificate_content: template.template_content
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.template_name || !templateForm.template_content) {
      alert('Please fill in template name and content');
      return;
    }

    try {
      await api.post('/api/medical-certificates/templates', templateForm);
      setShowTemplateModal(false);
      fetchTemplates();
      setTemplateForm({
        template_name: '',
        certificate_type: 'sick_leave',
        template_content: '',
        header_image: '',
        footer_image: '',
        is_default: false
      });
      alert('Template created successfully!');
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    }
  };

  return (
    <div className="space-y-6">
      <HeaderBar title="Medical Certificates" />

      {/* Patient Search Section */}
      <div className="bg-white border rounded shadow-sm p-4">
        <h3 className="text-md font-semibold mb-3">Search & Select Patient</h3>
        <div className="relative">
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Search patient by name, ID, phone..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              searchPatients(e.target.value);
            }}
            onFocus={() => {
              if (patientSearch.length >= 2) {
                setShowPatientSearch(true);
              }
            }}
          />

          {/* Patient Search Dropdown */}
          {showPatientSearch && patientResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {patientResults.map((patient) => (
                <div
                  key={patient.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="font-medium text-slate-900">{patient.name}</div>
                  <div className="text-sm text-slate-600">
                    ID: {patient.patient_id} | {patient.age}y, {patient.gender}
                    {patient.phone && ` | ${patient.phone}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showPatientSearch && patientResults.length === 0 && patientSearch.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
              <div className="px-4 py-3 text-slate-500 text-sm">
                No patients found matching "{patientSearch}"
              </div>
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-blue-900">Selected Patient: </span>
                <span className="text-blue-700">{selectedPatient.name} ({selectedPatient.patient_id})</span>
                <span className="text-blue-600 text-sm ml-2">
                  {selectedPatient.age}y, {selectedPatient.gender}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientSearch('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white border rounded shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Patient</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={filters.patient_id}
              onChange={(e) => setFilters({ ...filters, patient_id: e.target.value })}
            >
              <option value="">All Patients</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patient_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Certificate Type</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={filters.certificate_type}
              onChange={(e) => setFilters({ ...filters, certificate_type: e.target.value })}
            >
              <option value="">All Types</option>
              {certificateTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Create Certificate
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Manage Templates
            </button>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      <div className="bg-white border rounded shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Medical Certificates</h2>

        <div className="border rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">DATE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">PATIENT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">DOCTOR</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">TYPE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">TITLE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No certificates found. Create your first certificate to get started.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(cert.issued_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {cert.patient_name}
                      <div className="text-xs text-slate-500">{cert.patient_identifier}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{cert.doctor_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {certificateTypes.find(t => t.value === cert.certificate_type)?.label || cert.certificate_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{cert.certificate_title}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewCertificate(cert)}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Certificate Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCertificateForm();
        }}
        title="Create Medical Certificate"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Patient *</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={certificateForm.patient_id}
                onChange={(e) => setCertificateForm({ ...certificateForm, patient_id: e.target.value })}
              >
                <option value="">Select Patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patient_id}) - {p.age}y, {p.gender}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Certificate Type *</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={certificateForm.certificate_type}
                onChange={(e) => setCertificateForm({ ...certificateForm, certificate_type: e.target.value })}
              >
                {certificateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Load from Template (Optional)</label>
            <select
              className="w-full px-3 py-2 border rounded"
              onChange={(e) => handleLoadTemplate(e.target.value)}
              defaultValue=""
            >
              <option value="">Select a template...</option>
              {templates
                .filter(t => t.certificate_type === certificateForm.certificate_type)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.template_name} {t.is_default ? '(Default)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Doctor Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="Dr. Name"
                value={certificateForm.doctor_name}
                onChange={(e) => setCertificateForm({ ...certificateForm, doctor_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Registration No.</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="e.g., MCI-12345"
                value={certificateForm.doctor_registration_no}
                onChange={(e) => setCertificateForm({ ...certificateForm, doctor_registration_no: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Doctor Qualification</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., MBBS, MD (Medicine)"
              value={certificateForm.doctor_qualification}
              onChange={(e) => setCertificateForm({ ...certificateForm, doctor_qualification: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Certificate Title *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., Medical Leave Certificate"
              value={certificateForm.certificate_title}
              onChange={(e) => setCertificateForm({ ...certificateForm, certificate_title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Diagnosis</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., Acute Viral Fever"
              value={certificateForm.diagnosis}
              onChange={(e) => setCertificateForm({ ...certificateForm, diagnosis: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Certificate Content *</label>
            <textarea
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              rows="8"
              placeholder="Enter certificate content. You can use placeholders like [PATIENT_NAME], [AGE], [DIAGNOSIS], etc."
              value={certificateForm.certificate_content}
              onChange={(e) => setCertificateForm({ ...certificateForm, certificate_content: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Available placeholders: [PATIENT_NAME], [AGE], [GENDER], [DIAGNOSIS], [DATE], [DURATION], [PURPOSE]
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Issued Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded"
                value={certificateForm.issued_date}
                onChange={(e) => setCertificateForm({ ...certificateForm, issued_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valid From</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded"
                value={certificateForm.valid_from}
                onChange={(e) => setCertificateForm({ ...certificateForm, valid_from: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valid Until</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded"
                value={certificateForm.valid_until}
                onChange={(e) => setCertificateForm({ ...certificateForm, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (Internal)</label>
            <textarea
              className="w-full px-3 py-2 border rounded text-sm"
              rows="2"
              placeholder="Internal notes (not displayed on certificate)"
              value={certificateForm.notes}
              onChange={(e) => setCertificateForm({ ...certificateForm, notes: e.target.value })}
            />
          </div>

          {/* Header Image Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Header Image (Optional)</label>
            <div className="space-y-3">
              {/* Upload File */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full px-3 py-2 border rounded text-sm"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCertificateForm({ ...certificateForm, header_image: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              {/* OR Divider */}
              <div className="flex items-center">
                <div className="flex-1 border-t border-slate-300"></div>
                <span className="px-3 text-xs text-slate-500">OR</span>
                <div className="flex-1 border-t border-slate-300"></div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Image URL</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://example.com/header.png"
                  value={certificateForm.header_image && !certificateForm.header_image.startsWith('data:') ? certificateForm.header_image : ''}
                  onChange={(e) => setCertificateForm({ ...certificateForm, header_image: e.target.value })}
                />
              </div>

              {/* Preview */}
              {certificateForm.header_image && (
                <div className="mt-2">
                  <p className="text-xs text-slate-600 mb-1">Preview:</p>
                  <img
                    src={certificateForm.header_image}
                    alt="Header preview"
                    className="max-h-32 border rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      alert('Failed to load header image. Please check the URL or upload a valid image.');
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline mt-1"
                    onClick={() => setCertificateForm({ ...certificateForm, header_image: '' })}
                  >
                    Remove Header Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Image Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Footer Image (Optional)</label>
            <div className="space-y-3">
              {/* Upload File */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full px-3 py-2 border rounded text-sm"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCertificateForm({ ...certificateForm, footer_image: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              {/* OR Divider */}
              <div className="flex items-center">
                <div className="flex-1 border-t border-slate-300"></div>
                <span className="px-3 text-xs text-slate-500">OR</span>
                <div className="flex-1 border-t border-slate-300"></div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Image URL</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://example.com/footer.png"
                  value={certificateForm.footer_image && !certificateForm.footer_image.startsWith('data:') ? certificateForm.footer_image : ''}
                  onChange={(e) => setCertificateForm({ ...certificateForm, footer_image: e.target.value })}
                />
              </div>

              {/* Preview */}
              {certificateForm.footer_image && (
                <div className="mt-2">
                  <p className="text-xs text-slate-600 mb-1">Preview:</p>
                  <img
                    src={certificateForm.footer_image}
                    alt="Footer preview"
                    className="max-h-32 border rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      alert('Failed to load footer image. Please check the URL or upload a valid image.');
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline mt-1"
                    onClick={() => setCertificateForm({ ...certificateForm, footer_image: '' })}
                  >
                    Remove Footer Image
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetCertificateForm();
              }}
              className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCertificate}
              className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Create Certificate
            </button>
          </div>
        </div>
      </Modal>

      {/* View Certificate Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingCertificate(null);
        }}
        title="Medical Certificate"
        size="xl"
      >
        {viewingCertificate && (
          <div className="space-y-6">
            <div className="border-2 rounded p-8 bg-white print:border-0" id="certificate-print">
              {/* Header Image */}
              {viewingCertificate.header_image && (
                <div className="text-center mb-6">
                  <img
                    src={viewingCertificate.header_image}
                    alt="Header"
                    className="max-h-40 mx-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6 border-b-2 pb-4">
                {viewingCertificate.clinic_name && (
                  <>
                    <h2 className="text-2xl font-bold text-slate-800">{viewingCertificate.clinic_name}</h2>
                    {viewingCertificate.clinic_address && (
                      <p className="text-sm text-slate-600">{viewingCertificate.clinic_address}</p>
                    )}
                    {viewingCertificate.clinic_phone && (
                      <p className="text-sm text-slate-600">Phone: {viewingCertificate.clinic_phone}</p>
                    )}
                  </>
                )}
                <h3 className="text-xl font-bold text-slate-800 mt-4">{viewingCertificate.certificate_title}</h3>
              </div>

              {/* Doctor Info */}
              <div className="mb-6">
                <p className="text-sm"><strong>Doctor:</strong> {viewingCertificate.doctor_name}</p>
                {viewingCertificate.doctor_registration_no && (
                  <p className="text-sm"><strong>Registration No:</strong> {viewingCertificate.doctor_registration_no}</p>
                )}
                {viewingCertificate.doctor_qualification && (
                  <p className="text-sm"><strong>Qualification:</strong> {viewingCertificate.doctor_qualification}</p>
                )}
              </div>

              {/* Certificate Content */}
              <div className="mb-6">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {viewingCertificate.certificate_content
                    .replace(/\[PATIENT_NAME\]/g, viewingCertificate.patient_name || '')
                    .replace(/\[AGE\]/g, viewingCertificate.age || '')
                    .replace(/\[GENDER\]/g, viewingCertificate.gender || '')
                    .replace(/\[DIAGNOSIS\]/g, viewingCertificate.diagnosis || '')
                    .replace(/\[DATE\]/g, new Date(viewingCertificate.issued_date).toLocaleDateString())
                  }
                </div>
              </div>

              {/* Validity */}
              {(viewingCertificate.valid_from || viewingCertificate.valid_until) && (
                <div className="mb-6">
                  <p className="text-sm">
                    <strong>Validity:</strong>{' '}
                    {viewingCertificate.valid_from && `From ${new Date(viewingCertificate.valid_from).toLocaleDateString()}`}
                    {viewingCertificate.valid_from && viewingCertificate.valid_until && ' '}
                    {viewingCertificate.valid_until && `To ${new Date(viewingCertificate.valid_until).toLocaleDateString()}`}
                  </p>
                </div>
              )}

              {/* Signature */}
              <div className="mt-12 text-right">
                <div className="inline-block">
                  <div className="border-t border-slate-400 pt-2 min-w-[200px]">
                    <p className="text-sm font-semibold">{viewingCertificate.doctor_name}</p>
                    {viewingCertificate.doctor_qualification && (
                      <p className="text-xs text-slate-600">{viewingCertificate.doctor_qualification}</p>
                    )}
                    {viewingCertificate.doctor_registration_no && (
                      <p className="text-xs text-slate-600">{viewingCertificate.doctor_registration_no}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center text-xs text-slate-500">
                <p>Date: {new Date(viewingCertificate.issued_date).toLocaleDateString()}</p>
              </div>

              {/* Footer Image */}
              {viewingCertificate.footer_image && (
                <div className="text-center mt-6">
                  <img
                    src={viewingCertificate.footer_image}
                    alt="Footer"
                    className="max-h-40 mx-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 print:hidden">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCertificate(null);
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handlePrintCertificate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Print Certificate
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Management Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Manage Certificate Templates"
        size="lg"
      >
        <div className="space-y-6">
          {/* Create New Template Form */}
          <div className="border rounded p-4 bg-slate-50">
            <h4 className="font-semibold mb-3">Create New Template</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Standard Sick Leave"
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Certificate Type</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={templateForm.certificate_type}
                  onChange={(e) => setTemplateForm({ ...templateForm, certificate_type: e.target.value })}
                >
                  {certificateTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Template Content</label>
                <textarea
                  className="w-full px-3 py-2 border rounded font-mono text-sm"
                  rows="6"
                  placeholder="Use placeholders like [PATIENT_NAME], [AGE], [DIAGNOSIS]"
                  value={templateForm.template_content}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_content: e.target.value })}
                />
              </div>

              {/* Header Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Header Image (Optional)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border rounded text-sm"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setTemplateForm({ ...templateForm, header_image: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-slate-300"></div>
                    <span className="px-2 text-xs text-slate-500">OR</span>
                    <div className="flex-1 border-t border-slate-300"></div>
                  </div>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="https://example.com/header.png"
                    value={templateForm.header_image && !templateForm.header_image.startsWith('data:') ? templateForm.header_image : ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, header_image: e.target.value })}
                  />
                  {templateForm.header_image && (
                    <div className="mt-2">
                      <img
                        src={templateForm.header_image}
                        alt="Header preview"
                        className="max-h-24 border rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline mt-1"
                        onClick={() => setTemplateForm({ ...templateForm, header_image: '' })}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Footer Image (Optional)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border rounded text-sm"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setTemplateForm({ ...templateForm, footer_image: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-slate-300"></div>
                    <span className="px-2 text-xs text-slate-500">OR</span>
                    <div className="flex-1 border-t border-slate-300"></div>
                  </div>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="https://example.com/footer.png"
                    value={templateForm.footer_image && !templateForm.footer_image.startsWith('data:') ? templateForm.footer_image : ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, footer_image: e.target.value })}
                  />
                  {templateForm.footer_image && (
                    <div className="mt-2">
                      <img
                        src={templateForm.footer_image}
                        alt="Footer preview"
                        className="max-h-24 border rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline mt-1"
                        onClick={() => setTemplateForm({ ...templateForm, footer_image: '' })}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="template_is_default"
                  className="mr-2"
                  checked={templateForm.is_default}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                />
                <label htmlFor="template_is_default" className="text-sm">
                  Set as default template for this type
                </label>
              </div>

              <button
                onClick={handleCreateTemplate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Template
              </button>
            </div>
          </div>

          {/* Existing Templates List */}
          <div>
            <h4 className="font-semibold mb-3">Existing Templates</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map(template => (
                <div key={template.id} className="border rounded p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{template.template_name}</p>
                      <p className="text-xs text-slate-500">
                        {certificateTypes.find(t => t.value === template.certificate_type)?.label}
                        {template.is_default && (
                          <span className="ml-2 inline-flex px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {template.template_content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowTemplateModal(false)}
              className="px-4 py-2 border rounded hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

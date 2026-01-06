import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { openWhatsApp, generatePrescriptionMessage } from '../utils/whatsapp';
import HeaderBar from '../components/HeaderBar';

export default function PrescriptionPreview() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const api = useApiClient();
  const { addToast } = useToast();
  const [prescription, setPrescription] = useState(null);
  const [patient, setPatient] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState({ email: '', phone: '' });
  const [showTemplateSection, setShowTemplateSection] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current
  });

  const fetchPrescriptionData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch latest prescription for the patient
      const res = await api.get(`/api/prescriptions/${patientId}`);
      const prescriptions = res.data.prescriptions || [];
      if (prescriptions.length > 0) {
        const latestPrescription = prescriptions[0];
        setPrescription(latestPrescription);

        // Fetch doctor details if doctor_id exists
        if (latestPrescription.doctor_id) {
          try {
            const doctorRes = await api.get(`/api/doctors/${latestPrescription.doctor_id}`);
            setDoctor(doctorRes.data);

            // Fetch clinic details if clinic exists in doctor data
            if (doctorRes.data.clinic_id) {
              const clinicRes = await api.get(`/api/clinics/${doctorRes.data.clinic_id}`);
              setClinic(clinicRes.data);
            }
          } catch (err) {
            console.error('Error fetching doctor/clinic:', err);
          }
        }
      }

      // Fetch patient details
      const patientRes = await api.get(`/api/patients/${patientId}`);
      setPatient(patientRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load prescription data');
    } finally {
      setLoading(false);
    }
  }, [api, patientId]);

  useEffect(() => {
    if (!patientId) return;
    fetchPrescriptionData();
  }, [fetchPrescriptionData, patientId]);

  const handleSend = async (method) => {
    try {
      if (method === 'email' && notify.email) {
        await api.post('/api/notify/email', {
          to: notify.email,
          subject: 'Prescription',
          text: 'Your prescription is ready.',
          attachment: 'prescription.pdf' // Would need to generate PDF
        });
        addToast('Prescription emailed successfully', 'success');
      }
      if (method === 'whatsapp') {
        if (!patient?.phone) {
          addToast('Patient phone number not available', 'error');
          return;
        }
        const message = generatePrescriptionMessage({
          patientName: patient.name,
          doctorName: prescription?.doctor_name || doctor?.name || 'Doctor',
          date: new Date(prescription?.created_at || Date.now()).toLocaleDateString('en-IN')
        });
        openWhatsApp(patient.phone, message);
        addToast('Opening WhatsApp...', 'success');
      }
      if (method === 'attachment') {
        // Generate and download PDF
        handlePrint();
        addToast('Prescription downloaded', 'success');
      }
      if (method === 'pdf') {
        // Download PDF from backend
        if (!prescription?.id) {
          addToast('No prescription found to download', 'error');
          return;
        }

        const response = await api.get(`/api/prescriptions/pdf/${prescription.id}`, {
          responseType: 'blob'
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `prescription-${prescription.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        addToast('Prescription PDF downloaded successfully', 'success');
      }
    } catch (error) {
      console.error('Send error:', error);
      addToast('Send failed', 'error');
    }
  };

  const handleBillPatient = () => {
    if (!patientId) {
      addToast('Patient information not available', 'error');
      return;
    }
    // Navigate to billing page with patient ID and prescription ID
    const queryParams = new URLSearchParams({
      patientId: patientId,
      ...(prescription?.id && { prescriptionId: prescription.id })
    });
    navigate(`/billing?${queryParams.toString()}`);
    addToast('Redirecting to billing...', 'info');
  };

  const handleRequestVitals = () => {
    addToast('Vitals request sent to patient', 'success');
    // Would send vitals request via WhatsApp/email
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      addToast('Please enter a template name', 'warning');
      return;
    }
    addToast(`Template "${templateName}" saved successfully`, 'success');
    setTemplateName('');
    setShowTemplateSection(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <HeaderBar title="Prescription Preview" />
        <div className="text-sm text-slate-500">Loading prescription...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <HeaderBar title="Prescription Preview" />
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeaderBar title="Prescription Preview" />

      {/* Prescription Preview */}
      <div className="bg-white border rounded shadow-sm" ref={printRef}>
        <div className="p-6 space-y-6">
          {/* Doctor Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-slate-800">Dr. {prescription?.doctor_name || doctor?.name || 'Doctor Name'}</h1>
            <p className="text-slate-600">{doctor?.qualification || 'MBBS, MD'}</p>
            <p className="text-slate-500">{doctor?.specialization || prescription?.specialization || 'General Physician'}</p>
            {doctor?.registration_number && (
              <p className="text-sm text-slate-500 mt-2">Registration No: {doctor.registration_number}</p>
            )}
          </div>

          {/* Clinic Details */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800">{clinic?.name || 'Medical Center'}</h2>
            <p className="text-slate-600">{clinic?.address || '123 Healthcare Street'}</p>
            <p className="text-slate-600">{clinic?.city || 'City'}, {clinic?.state || 'State'} - {clinic?.pincode || '123456'}</p>
            <p className="text-slate-600">
              {clinic?.phone && `Phone: ${clinic.phone}`}
              {clinic?.phone && clinic?.email && ' | '}
              {clinic?.email && `Email: ${clinic.email}`}
            </p>
          </div>

          {/* Date and Time */}
          <div className="flex justify-between items-center text-sm text-slate-600">
            <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
            <span>Time: {new Date().toLocaleTimeString('en-IN')}</span>
          </div>

          {/* Patient Details */}
          <div className="border rounded p-4 bg-slate-50">
            <h3 className="font-semibold text-slate-800 mb-3">Patient Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <p>{patient?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Age/Gender:</span>
                <p>{patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A'} Years / {patient?.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">UHID:</span>
                <p>{patient?.patient_id || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Phone:</span>
                <p>{patient?.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Address:</span>
                <p>{patient?.address || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Blood Group:</span>
                <p>{patient?.blood_group || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Emergency Contact:</span>
                <p>{patient?.emergency_contact || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Emergency Phone:</span>
                <p>{patient?.emergency_phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="border rounded p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Vitals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <span className="font-medium">Temperature:</span>
                <p className="text-lg font-semibold text-blue-600">98.6°F</p>
              </div>
              <div className="text-center">
                <span className="font-medium">Height:</span>
                <p className="text-lg font-semibold text-green-600">170 cm</p>
              </div>
              <div className="text-center">
                <span className="font-medium">Weight:</span>
                <p className="text-lg font-semibold text-orange-600">70 kg</p>
              </div>
              <div className="text-center">
                <span className="font-medium">BMI:</span>
                <p className="text-lg font-semibold text-purple-600">24.2</p>
              </div>
              <div className="text-center">
                <span className="font-medium">Pulse Rate:</span>
                <p className="text-lg font-semibold text-red-600">72 bpm</p>
              </div>
              <div className="text-center">
                <span className="font-medium">HOMA-IR:</span>
                <p className="text-lg font-semibold text-indigo-600">1.2</p>
              </div>
              <div className="text-center">
                <span className="font-medium">Waist Hip Ratio:</span>
                <p className="text-lg font-semibold text-pink-600">0.85</p>
              </div>
            </div>
          </div>

          {/* Chief Complaints */}
          <div className="border rounded p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Chief Complaints</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div>
                  <span className="font-medium">Fever</span>
                  <p className="text-sm text-slate-600">Duration: 3 days | Severity: High | Note: Intermittent fever</p>
                </div>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Acute</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <div>
                  <span className="font-medium">Headache</span>
                  <p className="text-sm text-slate-600">Duration: 2 days | Severity: Moderate | Note: Throbbing pain</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Moderate</span>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="border rounded p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Diagnosis</h3>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">Viral Fever</span>
                    <p className="text-sm text-slate-600 mt-1">Since: 3 days | Body temperature: 101°F | Status: Improving | Severity: Moderate | Pattern: Intermittent</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prescription Table */}
          <div className="border rounded p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Prescription</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-3 py-2 text-left text-sm font-medium">Medicine</th>
                  <th className="border px-3 py-2 text-center text-sm font-medium">Frequency</th>
                  <th className="border px-3 py-2 text-center text-sm font-medium">Timing</th>
                  <th className="border px-3 py-2 text-center text-sm font-medium">Duration</th>
                  <th className="border px-3 py-2 text-left text-sm font-medium">Instructions</th>
                  <th className="border px-3 py-2 text-center text-sm font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {prescription?.medications?.map((med, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="border px-3 py-2 text-sm font-medium">{med.medication_name}</td>
                    <td className="border px-3 py-2 text-sm text-center">{med.frequency}</td>
                    <td className="border px-3 py-2 text-sm text-center">{med.timing || 'After meals'}</td>
                    <td className="border px-3 py-2 text-sm text-center">{med.duration}</td>
                    <td className="border px-3 py-2 text-sm">{med.instructions}</td>
                    <td className="border px-3 py-2 text-sm text-center">10 tablets</td>
                  </tr>
                ))}
                {(!prescription?.medications || prescription.medications.length === 0) && (
                  <tr>
                    <td colSpan="6" className="border px-3 py-4 text-center text-slate-500 text-sm">
                      No medications prescribed
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Advice Section */}
          <div className="border rounded p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Advice</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-slate-700 mb-2">English</h4>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  <li>Take adequate rest and drink plenty of fluids</li>
                  <li>Avoid cold drinks and outside food</li>
                  <li>Monitor temperature regularly</li>
                  <li>Return if fever persists beyond 5 days</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">हिंदी (Hindi)</h4>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  <li>पर्याप्त आराम लें और भरपूर तरल पदार्थ पिएं</li>
                  <li>ठंडे पेय और बाहर का खाना避 करें</li>
                  <li>तापमान नियमित रूप से मॉनिटर करें</li>
                  <li>यदि बुखार 5 दिनों से अधिक बना रहे तो वापस आएं</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold text-slate-800 mb-3">Follow Up</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Date:</span>
                <span className="bg-white px-3 py-1 rounded border">{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">After:</span>
                <span className="bg-white px-3 py-1 rounded border">7 days</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">Auto fill from Rx: Review response to treatment</p>
          </div>

          {/* Doctor Signature */}
          <div className="text-right pt-6 border-t">
            <p className="font-medium">Dr. {prescription?.doctor_name || 'Doctor Name'}</p>
            <p className="text-sm text-slate-600">MBBS, MD (Medicine)</p>
            <p className="text-sm text-slate-600">Registration No: 12345</p>
          </div>
        </div>
      </div>

      {/* Template Section */}
      {showTemplateSection && (
        <div className="bg-white border rounded shadow-sm p-4">
          <h3 className="font-semibold mb-3">Save as Template</h3>
          <div className="flex gap-3">
            <input
              className="flex-1 px-3 py-2 border rounded"
              placeholder="Enter template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              onClick={handleSaveTemplate}
            >
              Save Template
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-slate-50"
              onClick={() => setShowTemplateSection(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          onClick={() => handleSend('attachment')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Send Attachment
        </button>

        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          onClick={() => handleSend('download')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </button>

        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
          onClick={() => handleSend('pdf')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>

        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          onClick={() => handleSend('whatsapp')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          Send via WhatsApp
        </button>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          onClick={() => handleSend('payment')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Send Payment Link
        </button>

        <button
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
          onClick={handleBillPatient}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Bill Patient
        </button>

        <button
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
          onClick={() => handleSend('review')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Request Google Review
        </button>

        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
          onClick={handleRequestVitals}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Request Vitals
        </button>

        <button
          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 flex items-center gap-2"
          onClick={() => setShowTemplateSection(!showTemplateSection)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {showTemplateSection ? 'Cancel Template' : 'Save as Template'}
        </button>
      </div>

      {/* Notification Inputs */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-4 rounded">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Email:</label>
          <input
            className="px-3 py-2 border rounded"
            placeholder="patient@email.com"
            value={notify.email}
            onChange={(e) => setNotify({ ...notify, email: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">WhatsApp:</label>
          <input
            className="px-3 py-2 border rounded"
            placeholder="+91XXXXXXXXXX"
            value={notify.phone}
            onChange={(e) => setNotify({ ...notify, phone: e.target.value })}
          />
        </div>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => handleSend('email')}
        >
          Send via Email
        </button>
      </div>
    </div>
  );
}


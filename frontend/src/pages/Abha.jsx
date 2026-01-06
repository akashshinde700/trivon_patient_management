import { useState } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function Abha() {
  const api = useApiClient();
  const { addToast } = useToast();
  const [aadhaar, setAadhaar] = useState('');
  const [patientId, setPatientId] = useState('');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [status, setStatus] = useState(null);
  const [slider, setSlider] = useState(500);

  const enroll = async () => {
    try {
      await api.post('/api/abha/enroll', { aadhaar });
      addToast('Enrollment initiated (stub)', 'success');
    } catch {
      addToast('Enrollment failed', 'error');
    }
  };

  const link = async () => {
    if (!patientId || !abhaNumber) {
      addToast('Please enter Patient ID and ABHA Number', 'error');
      return;
    }

    try {
      // Update patient with ABHA details
      const res = await api.put(`/api/patients/${patientId}`, {
        abha_number: abhaNumber,
        abha_address: abhaAddress || null
      });

      setStatus({ linked: true, patientId, abhaNumber });
      addToast('ABHA linked successfully!', 'success');

      // Clear fields
      setAbhaNumber('');
      setAbhaAddress('');
      setPatientId('');
    } catch (error) {
      console.error('Link error:', error);
      addToast(error.response?.data?.error || 'Link failed', 'error');
    }
  };

  const unlink = async () => {
    try {
      const res = await api.post('/api/abha/unlink', { patientId });
      setStatus(res.data);
      addToast('ABHA unlinked (stub)', 'success');
    } catch {
      addToast('Unlink failed', 'error');
    }
  };

  const check = async () => {
    try {
      const res = await api.get(`/api/abha/status/${patientId}`);
      setStatus(res.data);
    } catch {
      setStatus(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">ABHA Dashboard</p>
          <h1 className="text-2xl font-semibold">ABHA Incentives</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 text-sm border rounded">Schedule a call</button>
          <button className="px-3 py-2 text-sm bg-primary text-white rounded">Get started</button>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm p-4 space-y-3">
        <h3 className="font-semibold">Register for DHIS incentives</h3>
        <p className="text-sm text-slate-600">“Register for DHIS to earn monthly upto ₹13000”.</p>
        <input
          type="range"
          min={20}
          max={5000}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-slate-500">Value: {slider}</div>
      </div>

      <div className="bg-white border rounded shadow-sm p-4 space-y-3">
        <h3 className="font-semibold">ABHA Registration & Login</h3>
        <p className="text-sm text-slate-600">Register or login to ABHA using official ABDM portal</p>

        <div className="flex flex-col gap-3">
          <a
            href="https://abha.abdm.gov.in/abha/v3/register/aadhaar"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 text-center flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Register New ABHA with Aadhaar
          </a>

          <a
            href="https://abha.abdm.gov.in/abha/v3/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 text-center flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login to Existing ABHA
          </a>
        </div>

        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <p className="font-medium mb-1">After creating/logging in ABHA:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Note your ABHA Number and ABHA Address</li>
            <li>Enter the Patient ID below to link ABHA with patient</li>
            <li>Use "Link ABHA" button to save the information</li>
          </ol>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm p-4 space-y-3">
        <h3 className="font-semibold">Link ABHA with Patient</h3>
        <p className="text-sm text-slate-600">
          After registering/logging in to ABHA portal, enter the details below to link with patient
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient ID *
            </label>
            <input
              className="px-3 py-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Patient ID (e.g., P123456789)"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              You can find Patient ID in the Patients page
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ABHA Number * (14 digits)
            </label>
            <input
              type="text"
              className="px-3 py-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter 14-digit ABHA Number"
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              maxLength={14}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: 12345678901234
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ABHA Address (Optional)
            </label>
            <input
              type="text"
              className="px-3 py-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter ABHA Address (e.g., yourname@abdm)"
              value={abhaAddress}
              onChange={(e) => setAbhaAddress(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: yourname@abdm or yourname@sbx
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            onClick={link}
            disabled={!patientId || !abhaNumber}
          >
            Link ABHA to Patient
          </button>
          <button
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            onClick={check}
            disabled={!patientId}
          >
            Check Status
          </button>
        </div>

        {status && (
          <div className={`p-3 rounded ${status.linked ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
            <p className="text-sm font-medium">
              {status.linked ? '✓ ABHA Linked Successfully' : 'Not Linked'}
            </p>
            {status.abhaNumber && (
              <p className="text-xs mt-1">ABHA Number: {status.abhaNumber}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils/errorHandler';

export default function DischargeWorkflow() {
  const api = useApiClient();
  const { addToast } = useToast();

  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState('');
  const [admissionDetails, setAdmissionDetails] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [dischargeSummary, setDischargeSummary] = useState({
    discharge_date: new Date().toISOString().split('T')[0],
    discharge_time: new Date().toTimeString().slice(0, 5),
    discharge_summary: '',
    follow_up_instructions: '',
    follow_up_date: ''
  });

  const steps = [
    { number: 1, name: 'Select Patient', icon: '👤' },
    { number: 2, name: 'Review Bill', icon: '💰' },
    { number: 3, name: 'Discharge Summary', icon: '📄' },
    { number: 4, name: 'Complete Discharge', icon: '✅' }
  ];

  // Fetch active admissions on mount
  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const response = await api.get('/api/admissions');
        const activeAdmissions = response.data.filter(
          adm => adm.status === 'Active' || adm.status === 'admitted'
        );
        setAdmissions(activeAdmissions);
      } catch (error) {
        handleApiError(error, addToast);
      }
    };
    fetchAdmissions();
  }, [api, addToast]);

  const handleAdmissionSelect = async (admissionId) => {
    if (!admissionId) {
      setSelectedAdmission('');
      setAdmissionDetails(null);
      setBillDetails(null);
      setCurrentStep(1);
      return;
    }

    setSelectedAdmission(admissionId);
    setLoading(true);

    try {
      // Fetch admission details
      const admResponse = await api.get(`/api/admissions/${admissionId}`);
      setAdmissionDetails(admResponse.data);

      // Calculate bill
      const billResponse = await api.post(
        `/api/admissions/${admissionId}/calculate-bill`
      );
      setBillDetails(billResponse.data);

      setCurrentStep(2);
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) {
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/api/admissions/${selectedAdmission}/discharge`, dischargeSummary);
      addToast('Patient discharged successfully', 'success');

      // Reset form
      setSelectedAdmission('');
      setAdmissionDetails(null);
      setBillDetails(null);
      setCurrentStep(1);
      setDischargeSummary({
        discharge_date: new Date().toISOString().split('T')[0],
        discharge_time: new Date().toTimeString().slice(0, 5),
        discharge_summary: '',
        follow_up_instructions: '',
        follow_up_date: ''
      });

      // Refresh admissions list
      const response = await api.get('/api/admissions');
      const activeAdmissions = response.data.filter(
        adm => adm.status === 'Active' || adm.status === 'admitted'
      );
      setAdmissions(activeAdmissions);
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const printBill = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Discharge Workflow</h1>
        <p className="text-gray-600">Guided discharge process with bill review</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.icon}
                </div>
                <div className="mt-2 text-xs font-medium text-center">
                  {step.name}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Patient */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 1: Select Patient</h2>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Admission to Discharge
          </label>
          <select
            value={selectedAdmission}
            onChange={(e) => handleAdmissionSelect(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Admission --</option>
            {admissions.map((admission) => (
              <option key={admission.id} value={admission.id}>
                {admission.patient_name} - {admission.room_number} (Adm #{admission.id}) - Admitted:{' '}
                {new Date(admission.admission_date).toLocaleDateString()}
              </option>
            ))}
          </select>

          {loading && (
            <p className="text-gray-500 text-center mt-4">Loading admission details...</p>
          )}
        </div>
      )}

      {/* Step 2: Review Bill */}
      {currentStep === 2 && admissionDetails && billDetails && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: Review Bill</h2>

          {/* Admission Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium mb-2">Admission Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Patient:</span> {admissionDetails.patient_name}
              </div>
              <div>
                <span className="font-medium">Room:</span> {admissionDetails.room_number}
              </div>
              <div>
                <span className="font-medium">Admitted:</span>{' '}
                {new Date(admissionDetails.admission_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Doctor:</span> {admissionDetails.doctor_name}
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Bill Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Room Charges</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ₹{parseFloat(billDetails.room_charges || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Services</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ₹{parseFloat(billDetails.service_charges || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Medicines & Consumables</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ₹{parseFloat(billDetails.medicine_charges || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Total Amount</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      ₹{parseFloat(billDetails.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Advance Paid</td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right">
                      - ₹{parseFloat(billDetails.advance_paid || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      Balance {billDetails.balance_amount >= 0 ? 'Due' : 'Refund'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-900 text-right">
                      ₹{Math.abs(parseFloat(billDetails.balance_amount || 0)).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
            <div className="space-x-3">
              <button
                onClick={printBill}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Print Bill
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Proceed to Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Discharge Summary */}
      {currentStep === 3 && admissionDetails && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 3: Discharge Summary</h2>

          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium mb-2">Patient: {admissionDetails.patient_name}</h3>
            <p className="text-sm text-gray-600">
              Room {admissionDetails.room_number} | Admitted:{' '}
              {new Date(admissionDetails.admission_date).toLocaleDateString()}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentStep(4);
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Date *
                </label>
                <input
                  type="date"
                  value={dischargeSummary.discharge_date}
                  onChange={(e) =>
                    setDischargeSummary({
                      ...dischargeSummary,
                      discharge_date: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Time *
                </label>
                <input
                  type="time"
                  value={dischargeSummary.discharge_time}
                  onChange={(e) =>
                    setDischargeSummary({
                      ...dischargeSummary,
                      discharge_time: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discharge Summary *
              </label>
              <textarea
                value={dischargeSummary.discharge_summary}
                onChange={(e) =>
                  setDischargeSummary({
                    ...dischargeSummary,
                    discharge_summary: e.target.value
                  })
                }
                required
                rows={6}
                placeholder="Brief summary of treatment, diagnosis, and patient condition at discharge..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Instructions
              </label>
              <textarea
                value={dischargeSummary.follow_up_instructions}
                onChange={(e) =>
                  setDischargeSummary({
                    ...dischargeSummary,
                    follow_up_instructions: e.target.value
                  })
                }
                rows={4}
                placeholder="Post-discharge care instructions, medications, diet, activity restrictions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Appointment Date
              </label>
              <input
                type="date"
                value={dischargeSummary.follow_up_date}
                onChange={(e) =>
                  setDischargeSummary({
                    ...dischargeSummary,
                    follow_up_date: e.target.value
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Review & Confirm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && admissionDetails && billDetails && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 4: Confirm Discharge</h2>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Please review all details before confirming discharge. This action cannot be undone.
            </p>
          </div>

          {/* Final Summary */}
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Patient Information</h3>
              <p className="text-sm">
                <strong>Name:</strong> {admissionDetails.patient_name}
              </p>
              <p className="text-sm">
                <strong>Admission ID:</strong> #{selectedAdmission}
              </p>
              <p className="text-sm">
                <strong>Room:</strong> {admissionDetails.room_number}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Financial Summary</h3>
              <p className="text-sm">
                <strong>Total Bill:</strong> ₹{parseFloat(billDetails.total_amount || 0).toFixed(2)}
              </p>
              <p className="text-sm">
                <strong>Balance {billDetails.balance_amount >= 0 ? 'Due' : 'Refund'}:</strong>{' '}
                ₹{Math.abs(parseFloat(billDetails.balance_amount || 0)).toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Discharge Details</h3>
              <p className="text-sm">
                <strong>Discharge Date/Time:</strong> {dischargeSummary.discharge_date} at{' '}
                {dischargeSummary.discharge_time}
              </p>
              {dischargeSummary.follow_up_date && (
                <p className="text-sm">
                  <strong>Follow-up:</strong>{' '}
                  {new Date(dischargeSummary.follow_up_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              disabled={loading}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
            >
              Back
            </button>
            <button
              onClick={handleDischarge}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Discharge'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

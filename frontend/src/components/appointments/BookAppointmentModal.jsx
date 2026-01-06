import { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiCalendar, FiClock, FiCheck } from 'react-icons/fi';
import Modal from '../Modal';
import { useApiClient } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function BookAppointmentModal({ isOpen, onClose, patientId: initialPatientId, onSuccess }) {
  const api = useApiClient();
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: patient, 2: date/doctor/time
  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [arrivalType, setArrivalType] = useState('online');

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If patient ID is provided, fetch patient details
  useEffect(() => {
    if (initialPatientId) {
      fetchPatientDetails(initialPatientId);
      setStep(2); // Skip patient selection
    }
  }, [initialPatientId]);

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchPatientDetails = async (id) => {
    try {
      const res = await api.get(`/api/patients/${id}`);
      setPatientName(res.data.patient.name);
      setPatientPhone(res.data.patient.phone || res.data.patient.contact || '');
      setPatientId(id);
    } catch (error) {
      console.error('Error fetching patient:', error);
    }
  };

  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatients([]);
      return;
    }

    try {
      const res = await api.get(`/api/patients?search=${query}&limit=10`);
      setPatients(res.data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const selectPatient = (patient) => {
    setPatientId(patient.id);
    setPatientName(patient.name);
    setPatientPhone(patient.phone || patient.contact || '');
    setPatientSearch('');
    setPatients([]);
    setStep(2);
  };

  const fetchDoctors = async () => {
    try {
      // If logged-in user is a doctor, fetch doctors from same clinic
      if (user && user.role === 'doctor') {
        console.log('Fetching doctor data for logged-in doctor, user ID:', user.id);
        const res = await api.get(`/api/doctors/by-user/${user.id}`);
        console.log('Doctor data received:', res.data);

        if (res.data && res.data.clinic_id) {
          // Fetch all doctors from the same clinic
          console.log('Fetching doctors from clinic ID:', res.data.clinic_id);
          const clinicDoctorsRes = await api.get(`/api/doctors?clinic_id=${res.data.clinic_id}`);
          console.log('Clinic doctors:', clinicDoctorsRes.data);

          const doctorsList = clinicDoctorsRes.data.doctors || clinicDoctorsRes.data || [];
          setDoctors(doctorsList.map(doc => ({
            id: doc.id,
            username: doc.name || doc.username,
            name: doc.name || doc.username
          })));
        } else {
          console.error('No doctor data or clinic_id found');
          setDoctors([]);
        }
      } else {
        // For admin/staff, fetch all doctors
        const res = await api.get('/api/doctors');
        const doctorsList = res.data.doctors || res.data || [];
        setDoctors(doctorsList.map(doc => ({
          id: doc.id,
          username: doc.name || doc.username,
          name: doc.name || doc.username
        })));
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      console.error('Error response:', error.response);
      setDoctors([]);
    }
  };

  const handleBook = async () => {
    console.log('Booking appointment with:', { patientId, doctorId, selectedDate, selectedTime });

    if (!patientId || !doctorId || !selectedDate || !selectedTime) {
      const missingFields = [];
      if (!patientId) missingFields.push('Patient');
      if (!doctorId) missingFields.push('Doctor');
      if (!selectedDate) missingFields.push('Date');
      if (!selectedTime) missingFields.push('Time');
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const appointmentData = {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        slot_time: selectedTime,
        arrival_type: arrivalType,
        reason_for_visit: reason,
        status: 'scheduled'
      };

      console.log('Sending appointment data:', appointmentData);

      await api.post('/api/appointments', appointmentData);

      // Send WhatsApp notification
      sendWhatsAppNotification();

      if (onSuccess) onSuccess();
      alert('Appointment booked successfully! WhatsApp notification sent to patient.');
      resetAndClose();
    } catch (error) {
      console.error('Error booking appointment:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(initialPatientId ? 2 : 1);
    setPatientId(initialPatientId || '');
    setPatientName('');
    setPatientPhone('');
    setDoctorId('');
    setDoctorName('');
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
    setArrivalType('online');
    setPatientSearch('');
    setPatients([]);
    setError('');
    onClose();
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatIndianDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  };

  const sendWhatsAppNotification = () => {
    if (!patientPhone) {
      console.log('No patient phone number available for WhatsApp notification');
      return;
    }

    const formattedDate = formatIndianDate(selectedDate);
    const formattedTime = formatTime(selectedTime);
    const doctorDisplayName = doctorName || 'Doctor';

    const message = `Hello ${patientName},

Your appointment has been successfully booked!

📅 *Date:* ${formattedDate}
⏰ *Time:* ${formattedTime}
👨‍⚕️ *Doctor:* Dr. ${doctorDisplayName}
${reason ? `📝 *Reason:* ${reason}` : ''}

Please arrive 10 minutes early.

Thank you!`;

    // Clean phone number
    let cleanPhone = patientPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Book Appointment" size="lg">
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 pb-4 border-b">
          <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
              {step > 1 ? <FiCheck /> : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Patient</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Appointment Details</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Patient Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search Patient</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border rounded"
                  placeholder="Search by name, phone, or patient ID..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    searchPatients(e.target.value);
                  }}
                />
              </div>
              {patients.length > 0 && (
                <div className="mt-2 max-h-64 overflow-y-auto border rounded divide-y">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">
                          ID: {patient.patient_id} • {patient.phone}
                        </p>
                      </div>
                      <FiUser className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={resetAndClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Appointment Details */}
        {step === 2 && (
          <div className="space-y-4">
            {patientName && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                <FiUser className="text-blue-600" />
                <span className="text-sm text-blue-800">
                  <strong>Patient:</strong> {patientName}
                </span>
              </div>
            )}

            {/* Show doctor selection dropdown for all users */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Doctor *</label>
              <select
                value={doctorId}
                onChange={(e) => {
                  const selectedDoc = doctors.find(d => d.id === parseInt(e.target.value));
                  setDoctorId(e.target.value);
                  setDoctorName(selectedDoc ? selectedDoc.username : '');
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Select Doctor --</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Date *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Time *</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason for Visit</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                rows="2"
                placeholder="Brief reason for appointment..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Arrival Type</label>
              <select
                value={arrivalType}
                onChange={(e) => setArrivalType(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="online">Online Booking</option>
                <option value="walkin">Walk-in</option>
                <option value="phone">Phone Booking</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={!doctorId || !selectedDate || !selectedTime || loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}

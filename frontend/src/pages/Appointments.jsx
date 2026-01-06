import { useState, useEffect } from 'react';
import HeaderBar from '../components/HeaderBar';
import BookAppointmentModal from '../components/appointments/BookAppointmentModal';
import EditAppointmentModal from '../components/appointments/EditAppointmentModal';
import { useApiClient } from '../api/client';
import { FiPlus, FiCalendar, FiUser, FiClock, FiRepeat, FiSend, FiEdit2 } from 'react-icons/fi';

export default function Appointments() {
  const api = useApiClient();
  const [appointments, setAppointments] = useState([]);
  const [followUpPatients, setFollowUpPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'followup'

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetch upcoming appointments (next 30 days)
      const res = await api.get(`/api/appointments?limit=500&status=scheduled`);
      const allAppointments = res.data.appointments || [];

      // Filter for upcoming appointments and sort by date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = allAppointments
        .filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate >= today;
        })
        .sort((a, b) => {
          const dateCompare = new Date(a.appointment_date) - new Date(b.appointment_date);
          if (dateCompare !== 0) return dateCompare;
          return (a.appointment_time || '').localeCompare(b.appointment_time || '');
        });

      setAppointments(upcoming);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, [activeTab]);

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const fetchFollowUpPatients = async () => {
    setLoading(true);
    try {
      console.log('Fetching follow-ups from /api/appointments/followups');
      const res = await api.get('/api/appointments/followups');
      console.log('Follow-ups response:', res.data);
      const followUps = res.data.followups || [];
      console.log('Follow-ups count:', followUps.length);
      setFollowUpPatients(followUps);
    } catch (error) {
      console.error('Failed to fetch follow-up patients:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'followup') {
      fetchFollowUpPatients();
    }
  }, [activeTab]);

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  const sendWhatsAppAppointment = (appointment) => {
    const phone = appointment.patient_phone || appointment.contact;
    if (!phone) {
      alert('Patient phone number not available');
      return;
    }

    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const time = formatTime(appointment.appointment_time || appointment.slot_time);

    const message = `Hello ${appointment.patient_name},

This is a reminder about your appointment scheduled for:

📅 Date: ${formattedDate}
⏰ Time: ${time}
👨‍⚕️ Doctor: Dr. ${appointment.doctor_name}

Please arrive 10 minutes early. If you need to reschedule, please contact us.

Thank you!
Om Clinic And Diagnostic Center`;

    // Clean phone number
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  const sendWhatsAppFollowUp = (patient) => {
    const phone = patient.contact || patient.phone || patient.patient_phone;
    if (!phone) {
      alert('Patient phone number not available');
      return;
    }

    const followUpDate = new Date(patient.followup_date);
    const formattedFollowUpDate = followUpDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const message = `Hello ${patient.patient_name},

This is a reminder about your follow-up appointment scheduled for ${formattedFollowUpDate} with Dr. ${patient.doctor_name}.

Please confirm your availability or let us know if you need to reschedule.

Thank you!`;

    // Clean phone number
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <HeaderBar title="Appointments" />

      <div className="bg-white border rounded shadow-sm p-6">
        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition ${
                activeTab === 'appointments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FiCalendar />
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('followup')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition ${
                activeTab === 'followup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FiRepeat />
              Follow-up ({followUpPatients.length})
            </button>
          </div>
        </div>

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
              <button
                onClick={() => setShowBookModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                <FiPlus />
                Book Appointment
              </button>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-slate-500">
                Loading appointments...
              </div>
            ) : appointments.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                No upcoming appointments. Click "Book Appointment" to add one.
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Group appointments by date
                  const groupedByDate = appointments.reduce((groups, appointment) => {
                    const date = appointment.appointment_date;
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(appointment);
                    return groups;
                  }, {});

                  return Object.entries(groupedByDate).map(([date, dateAppointments]) => {
                    const dateObj = new Date(date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    let dateLabel;
                    if (dateObj.toDateString() === today.toDateString()) {
                      dateLabel = 'Today';
                    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
                      dateLabel = 'Tomorrow';
                    } else {
                      dateLabel = dateObj.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                    }

                    return (
                      <div key={date} className="border rounded-lg overflow-hidden">
                        <div className="bg-primary/10 px-4 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="text-primary" />
                            <h3 className="font-semibold text-primary">{dateLabel}</h3>
                            <span className="ml-auto text-sm text-slate-600">
                              {dateAppointments.length} appointment{dateAppointments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {dateAppointments.map((appointment) => (
                            <div key={appointment.id} className="px-4 py-4 hover:bg-slate-50 transition">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 grid grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">PATIENT</div>
                                    <div className="flex items-center gap-2">
                                      <FiUser className="text-slate-400" size={14} />
                                      <span className="font-medium text-sm">{appointment.patient_name}</span>
                                    </div>
                                    {appointment.patient_phone && (
                                      <div className="text-xs text-slate-500 mt-1 font-mono">
                                        {appointment.patient_phone}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">DOCTOR</div>
                                    <div className="text-sm">Dr. {appointment.doctor_name}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">TIME</div>
                                    <div className="flex items-center gap-2">
                                      <FiClock className="text-slate-400" size={14} />
                                      <span className="text-sm font-medium">
                                        {formatTime(appointment.slot_time || appointment.appointment_time)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">STATUS</div>
                                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                      appointment.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                      'bg-orange-100 text-orange-700'
                                    }`}>
                                      {appointment.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditAppointment(appointment)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                                    title="Edit Appointment"
                                  >
                                    <FiEdit2 size={12} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => sendWhatsAppAppointment(appointment)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                                    title="Send WhatsApp Reminder"
                                  >
                                    <FiSend size={12} />
                                    WhatsApp
                                  </button>
                                </div>
                              </div>
                              {appointment.reason_for_visit && (
                                <div className="mt-2 text-xs text-slate-600">
                                  Reason: {appointment.reason_for_visit}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </>
        )}


        {/* Follow-up Tab */}
        {activeTab === 'followup' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Patients Needing Follow-up</h2>
              <p className="text-sm text-slate-600">
                Patients with scheduled follow-up appointments from prescriptions
              </p>
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">PATIENT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">LAST VISIT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">FOLLOW-UP DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">DAYS UNTIL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">DOCTOR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">REASON</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">CONTACT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                        Loading follow-up patients...
                      </td>
                    </tr>
                  ) : followUpPatients.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                        No patients need follow-up at this time.
                      </td>
                    </tr>
                  ) : (
                    followUpPatients.map((patient) => {
                      const originalAppointmentDate = new Date(patient.original_appointment_date);
                      const followUpDate = new Date(patient.followup_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      followUpDate.setHours(0, 0, 0, 0);

                      const daysUntil = Math.floor((followUpDate - today) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntil < 0;
                      const isDueToday = daysUntil === 0;
                      const isUrgent = daysUntil > 0 && daysUntil <= 3;

                      return (
                        <tr key={patient.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <FiUser className="text-slate-400" />
                              <span className="font-medium">{patient.patient_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {originalAppointmentDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {followUpDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              isOverdue ? 'bg-red-100 text-red-800' :
                              isDueToday ? 'bg-orange-100 text-orange-800' :
                              isUrgent ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {isOverdue ? `${Math.abs(daysUntil)} days overdue` :
                               isDueToday ? 'Due today' :
                               `${daysUntil} days`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">Dr. {patient.doctor_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {patient.reason || patient.reason_for_visit || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-xs">
                            {patient.contact || patient.phone || patient.patient_phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => sendWhatsAppFollowUp(patient)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                            >
                              <FiSend className="w-3 h-3" />
                              Send WhatsApp
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={fetchAppointments}
      />

      <EditAppointmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onSuccess={fetchAppointments}
      />
    </div>
  );
}

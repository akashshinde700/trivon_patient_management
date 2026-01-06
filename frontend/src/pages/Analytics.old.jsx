import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Overview data
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState('month');

  // Visit analytics
  const [visitAnalytics, setVisitAnalytics] = useState(null);
  const [visitGroupBy, setVisitGroupBy] = useState('day');
  const [visitDateRange, setVisitDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Medication analytics
  const [medicationAnalytics, setMedicationAnalytics] = useState(null);
  const [medDateRange, setMedDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Symptoms analytics
  const [symptomsAnalytics, setSymptomsAnalytics] = useState(null);

  // Payment analytics
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [paymentDateRange, setPaymentDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Demographics
  const [demographics, setDemographics] = useState(null);
  // Selected status appointments (click-to-expand)
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const fetchSelectedAppointments = async (status) => {
    try {
      setSelectedLoading(true);
      const res = await api.get('/api/appointments', { params: { status, limit: 100 } });
      setSelectedAppointments(res.data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments for status', status, error);
      setSelectedAppointments([]);
    } finally {
      setSelectedLoading(false);
    }
  };

  // Fetch overview data
  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/dashboard/overview', {
        params: { period }
      });
      setOverview(res.data);
    } catch (error) {
      console.error('Error fetching overview:', error);
      alert('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch visit analytics
  const fetchVisitAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/visits', {
        params: {
          start_date: visitDateRange.start_date,
          end_date: visitDateRange.end_date,
          group_by: visitGroupBy
        }
      });
      setVisitAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching visit analytics:', error);
      alert('Failed to load visit analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch medication analytics
  const fetchMedicationAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/medications', {
        params: {
          start_date: medDateRange.start_date,
          end_date: medDateRange.end_date
        }
      });
      setMedicationAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching medication analytics:', error);
      alert('Failed to load medication analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch symptoms analytics
  const fetchSymptomsAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/symptoms', {
        params: {
          start_date: medDateRange.start_date,
          end_date: medDateRange.end_date
        }
      });
      setSymptomsAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching symptoms analytics:', error);
      alert('Failed to load symptoms analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment analytics
  const fetchPaymentAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/payments', {
        params: {
          start_date: paymentDateRange.start_date,
          end_date: paymentDateRange.end_date
        }
      });
      setPaymentAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      alert('Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch demographics
  const fetchDemographics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/demographics');
      setDemographics(res.data);
    } catch (error) {
      console.error('Error fetching demographics:', error);
      alert('Failed to load demographics');
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        fetchOverview();
        break;
      case 'visits':
        fetchVisitAnalytics();
        break;
      case 'medications':
        fetchMedicationAnalytics();
        fetchSymptomsAnalytics();
        break;
      case 'payments':
        fetchPaymentAnalytics();
        break;
      case 'demographics':
        fetchDemographics();
        break;
      default:
        break;
    }
  }, [activeTab]);

  // Render overview tab
  const renderOverview = () => (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <label className="font-medium">Period:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">Last Year</option>
        </select>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Key Metrics */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">Total Appointments</h3>
            <p className="text-3xl font-bold text-blue-600">{overview.total_appointments || 0}</p>
          </div>

          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-green-600">{overview.total_patients || 0}</p>
          </div>

          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">New Patients</h3>
            <p className="text-3xl font-bold text-purple-600">{overview.new_patients || 0}</p>
          </div>

          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-yellow-600">₹{overview.total_revenue || 0}</p>
          </div>

          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">Avg Waiting Time</h3>
            <p className="text-3xl font-bold text-red-600">{overview.avg_waiting_time || 0} min</p>
          </div>

          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-2">Avg Visit Duration</h3>
            <p className="text-3xl font-bold text-indigo-600">{overview.avg_visit_duration || 0} min</p>
          </div>

          {/* Appointment Status Breakdown */}
          <div className="p-4 border rounded bg-white shadow col-span-full">
            <h3 className="text-lg font-semibold mb-3">Appointment Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{overview.scheduled_appointments || 0}</p>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const next = selectedStatus === 'completed' ? null : 'completed';
                  setSelectedStatus(next);
                  if (next) fetchSelectedAppointments(next);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { const next = selectedStatus === 'completed' ? null : 'completed'; setSelectedStatus(next); if (next) fetchSelectedAppointments(next); } }}
                className="cursor-pointer"
              >
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{overview.completed_appointments || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{overview.cancelled_appointments || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">No-Show</p>
                <p className="text-2xl font-bold text-orange-600">{overview.noshow_appointments || 0}</p>
              </div>
            </div>
          </div>

          {/* Selected appointments list (when a status card is clicked) */}
          {selectedStatus && (
            <div className="col-span-full mt-4 p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-3">{selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Appointments</h3>
              {selectedLoading ? (
                <p>Loading...</p>
              ) : selectedAppointments.length === 0 ? (
                <p className="text-sm text-slate-500">No appointments found for this status.</p>
              ) : (
                <div className="space-y-2">
                  {selectedAppointments.map((apt) => (
                    <div key={apt.id} className="p-2 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium">{apt.patient_name || apt.uhid || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{apt.appointment_date} • {apt.appointment_time} • {apt.doctor_name || ''}</div>
                      </div>
                      <div className="text-sm text-slate-600">{apt.payment_status || 'pending'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Arrival Type Breakdown */}
          <div className="p-4 border rounded bg-white shadow col-span-full">
            <h3 className="text-lg font-semibold mb-3">Arrival Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold">{overview.online_arrivals || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Walk-in</p>
                <p className="text-2xl font-bold">{overview.walkin_arrivals || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Referral</p>
                <p className="text-2xl font-bold">{overview.referral_arrivals || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emergency</p>
                <p className="text-2xl font-bold text-red-600">{overview.emergency_arrivals || 0}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );

  // Render visit analytics tab
  const renderVisitAnalytics = () => (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm mb-1">Start Date:</label>
          <input
            type="date"
            value={visitDateRange.start_date}
            onChange={(e) => setVisitDateRange({ ...visitDateRange, start_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date:</label>
          <input
            type="date"
            value={visitDateRange.end_date}
            onChange={(e) => setVisitDateRange({ ...visitDateRange, end_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Group By:</label>
          <select
            value={visitGroupBy}
            onChange={(e) => setVisitGroupBy(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <button
          onClick={fetchVisitAnalytics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-5"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : visitAnalytics ? (
        <div>
          <div className="mb-6 p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Visit Trends</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Period</th>
                    <th className="px-4 py-2 text-right">Total Visits</th>
                    <th className="px-4 py-2 text-right">Completed</th>
                    <th className="px-4 py-2 text-right">Cancelled</th>
                    <th className="px-4 py-2 text-right">No-Show</th>
                    <th className="px-4 py-2 text-right">Avg Duration (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {visitAnalytics.trends && visitAnalytics.trends.map((trend, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{trend.period}</td>
                      <td className="px-4 py-2 text-right">{trend.total_visits}</td>
                      <td className="px-4 py-2 text-right text-green-600">{trend.completed}</td>
                      <td className="px-4 py-2 text-right text-red-600">{trend.cancelled}</td>
                      <td className="px-4 py-2 text-right text-orange-600">{trend.no_show}</td>
                      <td className="px-4 py-2 text-right">{trend.avg_duration || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-3">Peak Hours</h3>
              <div className="space-y-2">
                {visitAnalytics.peak_hours && visitAnalytics.peak_hours.map((hour, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{hour.hour}:00</span>
                    <span className="font-bold text-blue-600">{hour.visit_count} visits</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-3">Top Doctors by Visits</h3>
              <div className="space-y-2">
                {visitAnalytics.top_doctors && visitAnalytics.top_doctors.map((doc, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{doc.doctor_name}</span>
                    <span className="font-bold text-green-600">{doc.visit_count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );

  // Render medications tab
  const renderMedications = () => (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm mb-1">Start Date:</label>
          <input
            type="date"
            value={medDateRange.start_date}
            onChange={(e) => setMedDateRange({ ...medDateRange, start_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date:</label>
          <input
            type="date"
            value={medDateRange.end_date}
            onChange={(e) => setMedDateRange({ ...medDateRange, end_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={() => {
            fetchMedicationAnalytics();
            fetchSymptomsAnalytics();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-5"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Medications */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Top Prescribed Medications</h3>
            {medicationAnalytics && medicationAnalytics.top_medications ? (
              <div className="space-y-3">
                {medicationAnalytics.top_medications.map((med, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{med.medication_name}</p>
                      <p className="text-sm text-gray-600">{med.common_dosages}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{med.prescription_count}</p>
                      <p className="text-xs text-gray-500">prescriptions</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No medication data</p>
            )}
          </div>

          {/* Medication Categories */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Medication Categories</h3>
            {medicationAnalytics && medicationAnalytics.categories ? (
              <div className="space-y-3">
                {medicationAnalytics.categories.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">{cat.category_name || 'Uncategorized'}</span>
                    <span className="font-bold text-green-600">{cat.usage_count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No category data</p>
            )}
          </div>

          {/* Top Symptoms */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Common Symptoms</h3>
            {symptomsAnalytics && symptomsAnalytics.top_symptoms ? (
              <div className="space-y-3">
                {symptomsAnalytics.top_symptoms.map((symptom, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">{symptom.symptom}</span>
                    <span className="font-bold text-red-600">{symptom.frequency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No symptom data</p>
            )}
          </div>

          {/* Top Diagnoses */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Common Diagnoses</h3>
            {symptomsAnalytics && symptomsAnalytics.top_diagnoses ? (
              <div className="space-y-3">
                {symptomsAnalytics.top_diagnoses.map((diagnosis, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">{diagnosis.diagnosis}</span>
                    <span className="font-bold text-purple-600">{diagnosis.frequency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No diagnosis data</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render payments tab
  const renderPayments = () => (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm mb-1">Start Date:</label>
          <input
            type="date"
            value={paymentDateRange.start_date}
            onChange={(e) => setPaymentDateRange({ ...paymentDateRange, start_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date:</label>
          <input
            type="date"
            value={paymentDateRange.end_date}
            onChange={(e) => setPaymentDateRange({ ...paymentDateRange, end_date: e.target.value })}
            className="px-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={fetchPaymentAnalytics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-5"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : paymentAnalytics ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-green-600">₹{paymentAnalytics.total_revenue || 0}</p>
            </div>

            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-2">Total Bills</h3>
              <p className="text-3xl font-bold text-blue-600">{paymentAnalytics.total_bills || 0}</p>
            </div>

            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-2">Avg Bill Amount</h3>
              <p className="text-3xl font-bold text-purple-600">₹{paymentAnalytics.avg_bill_amount || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
              {paymentAnalytics.payment_methods && paymentAnalytics.payment_methods.map((method, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                  <span className="font-medium capitalize">{method.payment_method}</span>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₹{method.total_amount}</p>
                    <p className="text-sm text-gray-600">{method.count} bills</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Patients by Revenue */}
            <div className="p-4 border rounded bg-white shadow">
              <h3 className="text-lg font-semibold mb-3">Top Patients by Revenue</h3>
              {paymentAnalytics.top_patients && paymentAnalytics.top_patients.map((patient, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                  <span className="font-medium">{patient.patient_name}</span>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">₹{patient.total_spent}</p>
                    <p className="text-sm text-gray-600">{patient.visit_count} visits</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Revenue Trend */}
            <div className="p-4 border rounded bg-white shadow col-span-full">
              <h3 className="text-lg font-semibold mb-3">Revenue Trend</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Period</th>
                      <th className="px-4 py-2 text-right">Bills</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">Paid Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAnalytics.daily_revenue && paymentAnalytics.daily_revenue.map((day, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{day.period}</td>
                        <td className="px-4 py-2 text-right">{day.bill_count}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600">₹{day.revenue}</td>
                        <td className="px-4 py-2 text-right text-blue-600">₹{day.paid_revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );

  // Render demographics tab
  const renderDemographics = () => (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : demographics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Age Distribution */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Age Distribution</h3>
            {demographics.age_distribution && demographics.age_distribution.map((age, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="font-medium">{age.age_group}</span>
                <span className="font-bold text-blue-600">{age.patient_count}</span>
              </div>
            ))}
          </div>

          {/* Gender Distribution */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Gender Distribution</h3>
            {demographics.gender_distribution && demographics.gender_distribution.map((gender, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="font-medium capitalize">{gender.gender}</span>
                <div className="text-right">
                  <p className="font-bold text-purple-600">{gender.patient_count}</p>
                  <p className="text-sm text-gray-600">{gender.percentage}%</p>
                </div>
              </div>
            ))}
          </div>

          {/* Blood Group Distribution */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Blood Group Distribution</h3>
            {demographics.blood_group_distribution && demographics.blood_group_distribution.map((bg, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="font-medium">{bg.blood_group}</span>
                <span className="font-bold text-red-600">{bg.patient_count}</span>
              </div>
            ))}
          </div>

          {/* Patient Source */}
          <div className="p-4 border rounded bg-white shadow">
            <h3 className="text-lg font-semibold mb-3">Patient Source</h3>
            {demographics.patient_source && demographics.patient_source.map((source, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="font-medium capitalize">{source.source || 'Direct'}</span>
                <span className="font-bold text-green-600">{source.patient_count}</span>
              </div>
            ))}
          </div>

          {/* Location Distribution */}
          <div className="p-4 border rounded bg-white shadow col-span-full lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3">Top Cities</h3>
            <div className="grid grid-cols-2 gap-4">
              {demographics.location_distribution && demographics.location_distribution.map((loc, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{loc.city}</span>
                  <span className="font-bold text-indigo-600">{loc.patient_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'visits'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Visit Analytics
        </button>
        <button
          onClick={() => setActiveTab('medications')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'medications'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Medications & Symptoms
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'payments'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Payment Reports
        </button>
        <button
          onClick={() => setActiveTab('demographics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'demographics'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Demographics
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'visits' && renderVisitAnalytics()}
        {activeTab === 'medications' && renderMedications()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'demographics' && renderDemographics()}
      </div>
    </div>
  );
}

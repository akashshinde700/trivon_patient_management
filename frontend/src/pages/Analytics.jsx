import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

// Utility function to format UTC date to IST
const formatToIST = (dateString) => {
  if (!dateString) return dateString;

  // Check if it's an ISO timestamp with Z (UTC)
  if (dateString.includes('T') && dateString.includes('Z')) {
    const date = new Date(dateString);
    // Convert to IST (UTC+5:30)
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toISOString().split('T')[0]; // Return just the date part YYYY-MM-DD
  }

  return dateString; // Return as-is if not a UTC timestamp
};

// Custom tooltip formatter for IST dates
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedLabel = formatToIST(label);
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-700 mb-2">{formattedLabel}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/dashboard/overview', {
        params: { period }
      });
      setOverview(res.data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  const fetchDemographics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/enhanced-analytics/demographics');
      setDemographics(res.data);
    } catch (error) {
      console.error('Error fetching demographics:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const renderOverview = () => {
    const statusData = overview ? [
      { name: 'Scheduled', value: overview.scheduled_appointments || 0, color: '#3B82F6' },
      { name: 'Completed', value: overview.completed_appointments || 0, color: '#10B981' },
      { name: 'Cancelled', value: overview.cancelled_appointments || 0, color: '#EF4444' },
      { name: 'No-Show', value: overview.noshow_appointments || 0, color: '#F59E0B' }
    ] : [];

    const arrivalData = overview ? [
      { name: 'Online', count: overview.online_arrivals || 0 },
      { name: 'Walk-in', count: overview.walkin_arrivals || 0 },
      { name: 'Referral', count: overview.referral_arrivals || 0 },
      { name: 'Emergency', count: overview.emergency_arrivals || 0 }
    ] : [];

    return (
      <div>
        <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg shadow">
          <label className="font-semibold text-gray-700">Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={fetchOverview}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <div className="text-lg font-medium text-gray-700">Loading analytics...</div>
            </div>
          </div>
        ) : overview ? (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="p-6 border rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Total Appointments</h3>
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-4xl font-bold text-blue-600">{overview.total_appointments || 0}</p>
              </div>

              <div className="p-6 border rounded-xl bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Total Patients</h3>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-4xl font-bold text-green-600">{overview.total_patients || 0}</p>
              </div>

              <div className="p-6 border rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">New Patients</h3>
                  <span className="text-2xl">✨</span>
                </div>
                <p className="text-4xl font-bold text-purple-600">{overview.new_patients || 0}</p>
              </div>

              <div className="p-6 border rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Total Revenue</h3>
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-3xl font-bold text-yellow-600 break-words">₹{overview.total_revenue || 0}</p>
              </div>

              <div className="p-6 border rounded-xl bg-gradient-to-br from-red-50 to-red-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Avg Wait Time</h3>
                  <span className="text-2xl">⏱️</span>
                </div>
                <p className="text-4xl font-bold text-red-600">{overview.avg_waiting_time || 0}<span className="text-xl ml-1">min</span></p>
              </div>

              <div className="p-6 border rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Avg Visit Time</h3>
                  <span className="text-2xl">🕐</span>
                </div>
                <p className="text-4xl font-bold text-indigo-600">{overview.avg_visit_duration || 0}<span className="text-xl ml-1">min</span></p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointment Status Pie Chart */}
              <div className="p-6 border rounded-xl bg-white shadow-xl hover:shadow-2xl transition-shadow">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <span>📊</span> Appointment Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => percent > 0.02 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={95}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">{overview.scheduled_appointments || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => {
                      const next = selectedStatus === 'completed' ? null : 'completed';
                      setSelectedStatus(next);
                      if (next) fetchSelectedAppointments(next);
                    }}
                  >
                    <p className="text-xs font-medium text-gray-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{overview.completed_appointments || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{overview.cancelled_appointments || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">No-Show</p>
                    <p className="text-2xl font-bold text-orange-600">{overview.noshow_appointments || 0}</p>
                  </div>
                </div>
              </div>

              {/* Arrival Type Bar Chart */}
              <div className="p-6 border rounded-xl bg-white shadow-xl hover:shadow-2xl transition-shadow">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <span>🚪</span> Patient Arrival Type
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={arrivalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                    <Legend />
                    <Bar dataKey="count" fill="#3B82F6" radius={[10, 10, 0, 0]} name="Patient Count">
                      {arrivalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600">Online</p>
                    <p className="text-lg font-bold text-blue-600">{overview.online_arrivals || 0}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600">Walk-in</p>
                    <p className="text-lg font-bold text-green-600">{overview.walkin_arrivals || 0}</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600">Referral</p>
                    <p className="text-lg font-bold text-yellow-600">{overview.referral_arrivals || 0}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600">Emergency</p>
                    <p className="text-lg font-bold text-red-600">{overview.emergency_arrivals || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedStatus && (
              <div className="p-6 border rounded-xl bg-white shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800">{selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Appointments</h3>
                {selectedLoading ? (
                  <p className="text-center py-8">Loading...</p>
                ) : selectedAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No appointments found for this status.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedAppointments.map((apt) => (
                      <div key={apt.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-800">{apt.patient_name || apt.uhid || 'Unknown'}</div>
                          <div className="text-sm text-slate-500">{apt.appointment_date} • {apt.appointment_time} • {apt.doctor_name || ''}</div>
                        </div>
                        <div className="text-sm font-medium text-slate-600 bg-gray-100 px-3 py-1 rounded">{apt.payment_status || 'pending'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">No data available</p>
        )}
      </div>
    );
  };

  const renderVisitAnalytics = () => (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">Start Date:</label>
          <input
            type="date"
            value={visitDateRange.start_date}
            onChange={(e) => setVisitDateRange({ ...visitDateRange, start_date: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">End Date:</label>
          <input
            type="date"
            value={visitDateRange.end_date}
            onChange={(e) => setVisitDateRange({ ...visitDateRange, end_date: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">Group By:</label>
          <select
            value={visitGroupBy}
            onChange={(e) => setVisitGroupBy(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <button
          onClick={fetchVisitAnalytics}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md mt-5"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <div className="text-lg font-medium text-gray-700">Loading visit analytics...</div>
          </div>
        </div>
      ) : visitAnalytics ? (
        <div className="space-y-6">
          {/* Visit Trends Area Chart */}
          <div className="p-6 border rounded-xl bg-white shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>📈</span> Visit Trends Over Time <span className="text-sm text-gray-500 ml-2">(IST)</span>
            </h3>
            <ResponsiveContainer width="100%" height={450}>
              <AreaChart data={visitAnalytics.trends || []}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tickFormatter={formatToIST} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="total_visits" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Visits" />
                <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                <Area type="monotone" dataKey="cancelled" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCancelled)" name="Cancelled" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours & Top Doctors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Bar Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>⏰</span> Peak Hours
              </h3>
              {!visitAnalytics.peak_hours || visitAnalytics.peak_hours.length === 0 ? (
                <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No peak hour data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={visitAnalytics.peak_hours || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Visits', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="visit_count" fill="#8B5CF6" radius={[10, 10, 0, 0]} name="Visit Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Doctors Bar Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>👨‍⚕️</span> Top Doctors by Visits
              </h3>
              {!visitAnalytics.top_doctors || visitAnalytics.top_doctors.length === 0 ? (
                <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No doctor visit data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={visitAnalytics.top_doctors || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="doctor_name" type="category" width={140} />
                    <Tooltip />
                    <Bar dataKey="visit_count" fill="#10B981" radius={[0, 10, 10, 0]} name="Visits">
                      {(visitAnalytics.top_doctors || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Visit Details Table */}
          <div className="p-6 border rounded-xl bg-white shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>📋</span> Detailed Visit Statistics
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Period</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Visits</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Completed</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Cancelled</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">No-Show</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {visitAnalytics.trends && visitAnalytics.trends.map((trend, idx) => (
                    <tr key={idx} className="border-t hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{trend.period}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{trend.total_visits}</td>
                      <td className="px-4 py-3 text-right text-green-600">{trend.completed}</td>
                      <td className="px-4 py-3 text-right text-red-600">{trend.cancelled}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{trend.no_show}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{trend.avg_duration || 'N/A'} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">No data available</p>
      )}
    </div>
  );

  const renderMedications = () => (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">Start Date:</label>
          <input
            type="date"
            value={medDateRange.start_date}
            onChange={(e) => setMedDateRange({ ...medDateRange, start_date: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">End Date:</label>
          <input
            type="date"
            value={medDateRange.end_date}
            onChange={(e) => setMedDateRange({ ...medDateRange, end_date: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => {
            fetchMedicationAnalytics();
            fetchSymptomsAnalytics();
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md mt-5"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <div className="text-lg font-medium text-gray-700">Loading medication analytics...</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Medications Bar Chart */}
          <div className="p-6 border rounded-xl bg-white shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>💊</span> Top Prescribed Medications
            </h3>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={(medicationAnalytics?.top_medications || []).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="medication_name" type="category" width={180} />
                <Tooltip />
                <Legend />
                <Bar dataKey="prescription_count" fill="#3B82F6" radius={[0, 10, 10, 0]} name="Prescriptions">
                  {(medicationAnalytics?.top_medications || []).slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Medication Categories & Symptoms/Diagnoses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medication Categories Pie Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>📂</span> Medication Categories
              </h3>
              {!medicationAnalytics?.categories || medicationAnalytics.categories.length === 0 ? (
                <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No medication category data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={(medicationAnalytics?.categories || []).slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category_name, percent }) => `${category_name || 'Other'}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="usage_count"
                    >
                      {(medicationAnalytics?.categories || []).slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Symptoms Bar Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>🤒</span> Common Symptoms
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={(symptomsAnalytics?.top_symptoms || []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="symptom" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#EF4444" radius={[10, 10, 0, 0]} name="Frequency">
                    {(symptomsAnalytics?.top_symptoms || []).slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Diagnoses */}
          <div className="p-6 border rounded-xl bg-white shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>🩺</span> Common Diagnoses
            </h3>
            {!symptomsAnalytics?.top_diagnoses || symptomsAnalytics.top_diagnoses.length === 0 ? (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No diagnosis data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(symptomsAnalytics?.top_diagnoses || []).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="diagnosis" type="category" width={200} />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#8B5CF6" radius={[0, 10, 10, 0]} name="Frequency">
                    {(symptomsAnalytics?.top_diagnoses || []).slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPayments = () => {
    const paymentMethodsData = paymentAnalytics?.payment_methods?.map(method => ({
      name: method.payment_method,
      value: parseFloat(method.total_amount || 0)
    })) || [];

    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow">
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-700">Start Date:</label>
            <input
              type="date"
              value={paymentDateRange.start_date}
              onChange={(e) => setPaymentDateRange({ ...paymentDateRange, start_date: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-700">End Date:</label>
            <input
              type="date"
              value={paymentDateRange.end_date}
              onChange={(e) => setPaymentDateRange({ ...paymentDateRange, end_date: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchPaymentAnalytics}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md mt-5"
          >
            Apply Filters
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <div className="text-lg font-medium text-gray-700">Loading payment analytics...</div>
            </div>
          </div>
        ) : paymentAnalytics ? (
          <div className="space-y-6">
            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 border rounded-xl bg-gradient-to-br from-green-50 to-green-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">Total Revenue</h3>
                  <span className="text-3xl">💵</span>
                </div>
                <p className="text-5xl font-bold text-green-600">₹{paymentAnalytics.total_revenue || 0}</p>
              </div>

              <div className="p-8 border rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">Total Bills</h3>
                  <span className="text-3xl">🧾</span>
                </div>
                <p className="text-5xl font-bold text-blue-600">{paymentAnalytics.total_bills || 0}</p>
              </div>

              <div className="p-8 border rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">Avg Bill Amount</h3>
                  <span className="text-3xl">📊</span>
                </div>
                <p className="text-5xl font-bold text-purple-600">₹{paymentAnalytics.avg_bill_amount || 0}</p>
              </div>
            </div>

            {/* Revenue Trend Line Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>📈</span> Revenue Trend Over Time <span className="text-sm text-gray-500 ml-2">(IST)</span>
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={paymentAnalytics.daily_revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tickFormatter={formatToIST} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} formatter={(value) => `₹${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={{ r: 6, fill: '#10B981' }} name="Total Revenue" />
                  <Line type="monotone" dataKey="paid_revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 6, fill: '#3B82F6' }} name="Paid Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Methods & Top Patients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods Pie Chart */}
              <div className="p-6 border rounded-xl bg-white shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <span>💳</span> Payment Methods Distribution
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {paymentAnalytics.payment_methods && paymentAnalytics.payment_methods.map((method, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="font-medium capitalize">{method.payment_method}</span>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{method.total_amount}</p>
                        <p className="text-sm text-gray-600">{method.count} bills</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Patients by Revenue Bar Chart */}
              <div className="p-6 border rounded-xl bg-white shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <span>🏆</span> Top Patients by Revenue
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={(paymentAnalytics.top_patients || []).slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="patient_name" type="category" width={130} />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Bar dataKey="total_spent" fill="#F59E0B" radius={[0, 10, 10, 0]} name="Total Spent">
                      {(paymentAnalytics.top_patients || []).slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">No data available</p>
        )}
      </div>
    );
  };

  const renderDemographics = () => (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <div className="text-lg font-medium text-gray-700">Loading demographics...</div>
          </div>
        </div>
      ) : demographics ? (
        <div className="space-y-6">
          {/* Age & Gender Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution Bar Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>👶👨👴</span> Age Distribution
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={demographics.age_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age_group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="patient_count" fill="#3B82F6" radius={[10, 10, 0, 0]} name="Patients">
                    {(demographics.age_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gender Distribution Pie Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>👥</span> Gender Distribution
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={demographics.gender_distribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ gender, percentage }) => `${gender}: ${percentage}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="patient_count"
                  >
                    {(demographics.gender_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Blood Group & Patient Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blood Group Distribution */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>🩸</span> Blood Group Distribution
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={demographics.blood_group_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="blood_group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="patient_count" fill="#EF4444" radius={[10, 10, 0, 0]} name="Patients">
                    {(demographics.blood_group_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Patient Source Pie Chart */}
            <div className="p-6 border rounded-xl bg-white shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span>🚪</span> Patient Source
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={demographics.patient_source || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ source, patient_count }) => `${source || 'Direct'}: ${patient_count}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="patient_count"
                  >
                    {(demographics.patient_source || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Location Distribution */}
          <div className="p-6 border rounded-xl bg-white shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>🌍</span> Top Cities
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={(demographics.location_distribution || []).slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="patient_count" fill="#14B8A6" radius={[0, 10, 10, 0]} name="Patients">
                  {(demographics.location_distribution || []).slice(0, 15).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">No data available</p>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-800 mb-3 flex items-center gap-3">
          <span>📊</span> Analytics Dashboard
        </h1>
        <p className="text-lg text-gray-600">Comprehensive insights into your clinic's performance with interactive charts and graphs</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3 mb-8 bg-white border rounded-xl p-3 shadow-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all ${
            activeTab === 'visits'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
          }`}
        >
          📈 Visit Analytics
        </button>
        <button
          onClick={() => setActiveTab('medications')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all ${
            activeTab === 'medications'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
          }`}
        >
          💊 Medications & Symptoms
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
          }`}
        >
          💰 Payment Reports
        </button>
        <button
          onClick={() => setActiveTab('demographics')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all ${
            activeTab === 'demographics'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
          }`}
        >
          👥 Demographics
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

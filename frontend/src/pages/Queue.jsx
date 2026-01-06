import React, { useEffect, useState, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { openWhatsApp } from '../utils/whatsapp';
import { getSelectedDoctorId, isAdmin } from '../utils/doctorUtils';

const summaryCards = [
  { key: 'today', label: 'Today (24h)', count: 0 },
  { key: 'followups', label: 'Follow ups', count: 0 },
  { key: 'completed', label: 'Completed', count: 0 },
  { key: 'upcoming', label: 'Upcoming', count: 0 },
  { key: 'others', label: 'Others', count: 0 }
];

export default function Queue() {
  const api = useApiClient();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(summaryCards);
  const [filters, setFilters] = useState({
    dateRange: '',
    visitType: '',
    tags: '',
    paymentStatus: '',
    status: '',
    isFollowUp: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('default');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [openMenuId, setOpenMenuId] = useState(null);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async (extraParams = {}) => {
    setLoading(true);
    setError('');
    try {
      // Build query params
      const params = {
        _t: Date.now() // Cache buster
      };

      // If admin user and has selected a doctor, filter by that doctor's appointments
      if (isAdmin(user)) {
        const selectedDoctorId = getSelectedDoctorId();
        if (selectedDoctorId) {
          params.doctor_id = selectedDoctorId;
        }
      }

      const res = await api.get('/api/appointments', { 
        params: { ...params, ...extraParams },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const appointmentsData = res.data.appointments || [];
      
      setAppointments(appointmentsData);
      calculateStats(appointmentsData);
    } catch (err) {
      console.error('Fetch appointments error:', err);
      setError(err.response?.data?.error || 'Unable to load appointments');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Calculate statistics
  const calculateStats = useCallback((appointmentsData) => {
    const today = new Date().toISOString().split('T')[0];
    const newStats = summaryCards.map(card => ({ ...card, count: 0 }));

    appointmentsData.forEach(apt => {
      const aptDate = apt.appointment_date;
      const status = apt.status;

      // Today's appointments
      if (aptDate === today) {
        newStats[0].count++;
      }

      // Follow-ups
      if (apt.is_follow_up || apt.reason_for_visit?.toLowerCase().includes('follow')) {
        newStats[1].count++;
      }

      // Completed
      if (status === 'completed') {
        newStats[2].count++;
      }

      // Upcoming (future dates)
      if (aptDate > today && status !== 'completed' && status !== 'cancelled') {
        newStats[3].count++;
      }

      // Others (past dates, not completed)
      if (aptDate < today && status !== 'completed') {
        newStats[4].count++;
      }
    });

    setStats(newStats);
  }, []);

  // Update appointment status
  const updateAppointmentStatus = useCallback(async (appointmentId, newStatus, apt) => {
    try {
      await api.patch(`/api/appointments/${appointmentId}/status`, { status: newStatus });

      setAppointments(prev => {
        const updated = prev.map(a =>
          a.id === appointmentId ? { ...a, status: newStatus } : a
        );
        calculateStats(updated);
        return updated;
      });

      addToast(`Appointment status updated to ${newStatus}`, 'success');

      // Auto-navigate to create receipt when appointment is completed
      if (newStatus === 'completed' && apt) {
        setTimeout(() => {
          navigate(`/billing/new?patient=${apt.patient_db_id}&appointment=${apt.id}`);
        }, 1000); // Wait 1 second to show the success message
      }
    } catch (err) {
      console.error('Update status error:', err);
      addToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  }, [api, addToast, calculateStats, navigate]);

  // Update payment status
  const updatePaymentStatus = useCallback(async (appointmentId, newPaymentStatus) => {
    try {
      // Prefer updating the bill directly if we have a bill_id for the appointment
      const apt = appointments.find(a => a.id === appointmentId) || {};
      if (apt.bill_id) {
        await api.patch(`/api/bills/${apt.bill_id}/status`, { payment_status: newPaymentStatus });
      } else {
        // Fallback to appointment endpoint which will try to find latest bill
        await api.patch(`/api/appointments/${appointmentId}/payment`, { payment_status: newPaymentStatus });
      }

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId ? { ...apt, payment_status: newPaymentStatus } : apt
        )
      );

      addToast(`Payment status updated to ${newPaymentStatus}`, 'success');
    } catch (err) {
      console.error('Update payment status error:', err);
      addToast(err.response?.data?.error || 'Failed to update payment status', 'error');
    }
  }, [api, addToast]);

  // Navigate to patient overview - FIXED to use patient_db_id
  const handleVisitPatient = useCallback((apt) => {
    // Priority: patient_db_id > patient_table_id > fallback to patient_id
    const patientDbId = apt.patient_db_id || apt.patient_table_id;
    const uhid = apt.uhid || apt.patient_id;
    
    console.log('🔍 Navigation debug:', {
      appointment_id: apt.id,
      patient_db_id: apt.patient_db_id,
      patient_table_id: apt.patient_table_id,
      patient_id: apt.patient_id,
      uhid: apt.uhid,
      using_id: patientDbId
    });
    
    if (!patientDbId) {
      addToast('Patient ID not found in appointment data', 'error');
      console.error('❌ Missing patient_db_id in appointment:', apt);
      return;
    }
    
    // Store appointment context for prescription and other pages
    const appointmentContext = {
      appointmentId: apt.id,
      patientId: patientDbId,
      patientName: apt.patient_name,
      uhid: uhid,
      visitReason: apt.reason_for_visit,
      appointmentDate: apt.appointment_date,
      appointmentTime: apt.appointment_time,
      doctorId: apt.doctor_id,
      doctorName: apt.doctor_name,
      clinicId: apt.clinic_id,
      clinicName: apt.clinic_name,
      status: apt.status
    };
    
    sessionStorage.setItem('currentAppointment', JSON.stringify(appointmentContext));
    sessionStorage.setItem('selectedPatientId', patientDbId.toString());
    
    // Navigate to patient overview
    navigate(`/patient-overview/${patientDbId}`);
  }, [navigate, addToast]);

  // Helper function to format date in Indian format
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

  // Helper function to format time in 12-hour format
  const formatIndianTime = (timeString) => {
    if (!timeString) return 'TBD';

    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Handle WhatsApp click
  const handleWhatsApp = useCallback((apt) => {
    const phone = apt.contact || apt.phone || apt.patient_phone;

    if (!phone) {
      addToast('Patient phone number not available', 'error');
      return;
    }

    const formattedDate = formatIndianDate(apt.appointment_date);
    const formattedTime = formatIndianTime(apt.appointment_time);

    const message = `Hello ${apt.patient_name},

Your appointment is confirmed.

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
${apt.doctor_name ? `👨‍⚕️ Doctor: ${apt.doctor_name}` : ''}
${apt.clinic_name ? `🏥 Clinic: ${apt.clinic_name}` : ''}

Thank you!`;

    openWhatsApp(phone, message);
  }, [addToast]);

  // Apply filters and search
  const applyFilters = useCallback(() => {
    let filtered = [...appointments];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(apt =>
        apt.patient_name?.toLowerCase().includes(searchLower) ||
        apt.patient_id?.toLowerCase().includes(searchLower) ||
        apt.uhid?.toLowerCase().includes(searchLower) ||
        apt.contact?.includes(search) ||
        apt.phone?.includes(search) ||
        apt.reason_for_visit?.toLowerCase().includes(searchLower) ||
        apt.doctor_name?.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (filters.dateRange) {
      if (filters.dateRange.includes(' to ')) {
        const [startDate, endDate] = filters.dateRange.split(' to ');
        if (startDate && endDate) {
          filtered = filtered.filter(apt => {
            const aptDate = apt.appointment_date;
            const aptDateStr = (aptDate instanceof Date ? aptDate.toISOString() : aptDate).split('T')[0].split(' ')[0];
            return aptDateStr >= startDate && aptDateStr <= endDate;
          });
        }
      } else {
        filtered = filtered.filter(apt => apt.appointment_date === filters.dateRange);
      }
    }

    // Visit type filter
    if (filters.visitType) {
      filtered = filtered.filter(apt =>
        apt.reason_for_visit?.toLowerCase().includes(filters.visitType.toLowerCase())
      );
    }

    // Tags filter
    if (filters.tags) {
      filtered = filtered.filter(apt =>
        apt.tags?.toLowerCase().includes(filters.tags.toLowerCase())
      );
    }

    // Payment status filter
    if (filters.paymentStatus) {
      filtered = filtered.filter(apt => apt.payment_status === filters.paymentStatus);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }

    // Follow-up filter
    if (filters.isFollowUp) {
      filtered = filtered.filter(apt => apt.is_follow_up || apt.reason_for_visit?.toLowerCase().includes('follow'));
    }

    // Sort by date (newest first) and time
    filtered.sort((a, b) => {
      const dateCompare = new Date(b.appointment_date) - new Date(a.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, sort by time
      if (a.appointment_time && b.appointment_time) {
        return a.appointment_time.localeCompare(b.appointment_time);
      }
      return 0;
    });

    // Pagination
    const total = filtered.length;
    const pages = Math.ceil(total / limit) || 1;
    setPagination({ total, pages });

    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    setFilteredAppointments(paginatedData);
  }, [appointments, search, filters, page, limit]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      dateRange: '',
      visitType: '',
      tags: '',
      paymentStatus: '',
      status: ''
    });
    setSearch('');
    setPage(1);
  }, []);

  // Quick date filter handler
  const handleQuickDateFilter = useCallback((value) => {
    const today = new Date();
    let dateFilter = '';

    switch (value) {
      case 'today':
        dateFilter = today.toISOString().split('T')[0];
        break;
      case 'upcoming':
        // Next 7 days (excluding today)
        {
          const upcomingStart = new Date(today);
          upcomingStart.setDate(upcomingStart.getDate() + 1);
          const upcomingEnd = new Date(today);
          upcomingEnd.setDate(upcomingEnd.getDate() + 7);
          dateFilter = `${upcomingStart.toISOString().split('T')[0]} to ${upcomingEnd.toISOString().split('T')[0]}`;
        }
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateFilter = yesterday.toISOString().split('T')[0];
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = tomorrow.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = `${weekAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = `${monthAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
        break;
      default:
        dateFilter = '';
    }

    setFilters(prev => ({ ...prev, dateRange: dateFilter, status: '' }));
    setPage(1);

    // If the filter is a date range from -> to, also request matching appointments from server
    if (dateFilter.includes(' to ')) {
      const [start, end] = dateFilter.split(' to ');
      fetchAppointments({ start_date: start, end_date: end });
    } else if (dateFilter) {
      // single-date filter
      fetchAppointments({ date: dateFilter });
    } else {
      // no filter => default fetch
      fetchAppointments();
    }
  }, []);

  // Get status badge styling
  const getStatusBadgeClass = useCallback((status) => {
    const classes = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // Get payment status badge styling
  const getPaymentBadgeClass = useCallback((status) => {
    const classes = {
      'completed': 'bg-green-100 text-green-800',
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-purple-100 text-purple-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Format time for display
  const formatTime = useCallback((timeString) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }, []);

  // Effects
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  return (
    <div className="space-y-4">
      <HeaderBar title="Queue" />

      {/* Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((card) => (
          <div 
            key={card.key} 
            className={`p-3 bg-white rounded shadow-sm border relative group cursor-pointer hover:shadow-md transition ${
              filters.status === card.key ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => {
              if (card.key === 'today') {
                handleQuickDateFilter('today');
              } else if (card.key === 'completed') {
                setFilters(prev => ({ ...prev, status: 'completed', isFollowUp: false }));
              } else if (card.key === 'upcoming') {
                handleQuickDateFilter('upcoming');
              } else if (card.key === 'followups') {
                // Set follow-up filter
                setFilters(prev => ({ ...prev, isFollowUp: true, status: '' }));
                setPage(1);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{card.label}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchAppointments();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded"
                title="Refresh"
              >
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-2xl font-semibold mt-1">{card.count}</p>
          </div>
        ))}
      </section>

      {/* Main Content */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Queue Table */}
        <div className="lg:col-span-3 bg-white rounded shadow-sm border p-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Active Queue</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 text-sm border rounded hover:bg-slate-50 flex items-center gap-1 ${
                  showFilters ? 'bg-slate-100' : ''
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {Object.values(filters).some(f => f) && (
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
              
              <button
                onClick={fetchAppointments}
                disabled={loading}
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <button
                onClick={() => {
                  const newMode = viewMode === 'default' ? 'compact' : 'default';
                  setViewMode(newMode);
                  addToast(`Switched to ${newMode} view`, 'info');
                }}
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
              >
                {viewMode === 'default' ? '📱 Compact' : '📋 Table'}
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={filters.dateRange.includes(' to ') ? '' : filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Quick Filter</label>
                  <select
                    value=""
                    onChange={(e) => handleQuickDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Visit Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Follow-up"
                    value={filters.visitType}
                    onChange={(e) => setFilters(prev => ({ ...prev, visitType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Payment</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">All Payments</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tags</label>
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={filters.tags}
                    onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-white transition"
                >
                  Clear All Filters
                </button>
                {filters.dateRange && (
                  <span className="text-xs text-slate-500">
                    Showing: {filters.dateRange}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by patient name, UHID, phone, doctor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Default Table View */}
          {viewMode === 'default' && (
            <div>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 min-w-[1100px] bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-3">
                    <span className="col-span-2">PATIENT</span>
                    <span className="col-span-2">VISIT REASON</span>
                    <span>UHID</span>
                    <span>CONTACT</span>
                    <span>DATE</span>
                    <span>TIME</span>
                    <span>PAYMENT</span>
                    <span>STATUS</span>
                    <span className="col-span-2 text-center">ACTIONS</span>
                  </div>
                  
                  {/* Loading State */}
                  {loading && (
                    <div className="p-8 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-sm text-slate-500">Loading appointments...</p>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {error && !loading && (
                    <div className="p-6 text-center bg-red-50">
                      <svg className="w-12 h-12 text-red-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                      <button 
                        onClick={fetchAppointments}
                        className="mt-3 text-sm text-red-600 underline hover:no-underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  
                  {/* Table Body */}
                  {!loading && !error && (
                    <div className="divide-y">
                      {filteredAppointments.length === 0 ? (
                        <div className="p-8 text-center">
                          <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-slate-500 font-medium">No appointments found</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {search || Object.values(filters).some(f => f) 
                              ? 'Try adjusting your search or filters' 
                              : 'No appointments scheduled yet'}
                          </p>
                        </div>
                      ) : (
                        filteredAppointments.map((apt) => (
                          <div 
                            key={apt.id} 
                            className={`grid grid-cols-12 min-w-[1100px] items-center px-4 py-3 text-sm hover:bg-slate-50 transition ${
                              apt.status === 'completed' ? 'bg-green-50/50' : ''
                            } ${apt.status === 'cancelled' ? 'bg-red-50/50 opacity-75' : ''}`}
                          >
                            {/* Patient Info */}
                            <div className="col-span-2 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                {apt.patient_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{apt.patient_name || 'Unknown'}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {apt.status === 'completed' && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded">
                                      ✓
                                    </span>
                                  )}
                                  {apt.is_follow_up && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded">
                                      Follow-up
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Visit Reason */}
                            <span className="col-span-2 truncate pr-2" title={apt.reason_for_visit}>
                              {apt.reason_for_visit || '-'}
                            </span>
                            
                            {/* UHID */}
                            <span className="text-xs font-mono text-slate-600 truncate pr-4" title={apt.uhid || apt.patient_id || '-'}>
                              {apt.uhid || apt.patient_id || '-'}
                            </span>

                            {/* Contact */}
                            <span className="text-xs truncate pr-4" title={apt.contact || apt.phone || '-'}>
                              {apt.contact || apt.phone || '-'}
                            </span>
                            
                            {/* Date */}
                            <span className="text-xs">
                              {formatDate(apt.appointment_date)}
                            </span>
                            
                            {/* Time */}
                            <span className="text-xs">
                              {formatTime(apt.appointment_time)}
                            </span>
                            
                            {/* Payment Status Dropdown */}
                            <div>
                              <select
                                className={`px-2 py-1 text-xs border rounded cursor-pointer ${getPaymentBadgeClass(apt.payment_status)}`}
                                value={apt.payment_status || 'pending'}
                                onChange={(e) => updatePaymentStatus(apt.id, e.target.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="partial">Partial</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                            
                            {/* Status Dropdown */}
                            <div>
                              <select
                                className={`px-2 py-1 text-xs border rounded cursor-pointer ${getStatusBadgeClass(apt.status)}`}
                                value={apt.status || 'scheduled'}
                                onChange={(e) => updateAppointmentStatus(apt.id, e.target.value, apt)}
                              >
                                <option value="scheduled">Scheduled</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="no-show">No Show</option>
                              </select>
                            </div>
                            
                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-center gap-2">
                              {/* WhatsApp Button */}
                              <button
                                onClick={() => handleWhatsApp(apt)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Send WhatsApp message"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </button>
                              
                              {/* Visit Button */}
                              <button
                                onClick={() => handleVisitPatient(apt)}
                                className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                              >
                                Visit
                              </button>
                              
                              {/* More Options */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === apt.id ? null : apt.id);
                                  }}
                                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                                {openMenuId === apt.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50"
                                  >
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        navigate(`/patient-overview/${apt.patient_db_id}`);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 rounded-t-lg transition-colors border-b border-slate-100"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="font-medium">View Patient</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        // Store appointment context for prescription page
                                        sessionStorage.setItem('currentAppointment', JSON.stringify({
                                          appointmentId: apt.id,
                                          patientId: apt.patient_db_id,
                                          patientName: apt.patient_name
                                        }));
                                        navigate(`/orders/${apt.patient_db_id}`);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 hover:text-green-700 flex items-center gap-3 transition-colors border-b border-slate-100"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="font-medium">New Prescription</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        navigate(`/receipts?patient=${apt.patient_db_id}&appointment=${apt.id}&quick=true&amount=0`);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 hover:text-purple-700 flex items-center gap-3 rounded-b-lg transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      <span className="font-medium">Create Bill</span>
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
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t">
                  <div className="text-sm text-slate-600">
                    Showing{' '}
                    <span className="font-semibold">{Math.min((page - 1) * limit + 1, pagination.total)}</span>
                    {' '}to{' '}
                    <span className="font-semibold">{Math.min(page * limit, pagination.total)}</span>
                    {' '}of{' '}
                    <span className="font-semibold">{pagination.total}</span> appointments
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="First page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 text-sm rounded ${
                              page === pageNum 
                                ? 'bg-primary text-white' 
                                : 'border hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <span className="sm:hidden text-sm">
                      {page} / {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={page >= pagination.pages}
                      className="px-3 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    
                    <button
                      onClick={() => setPage(pagination.pages)}
                      disabled={page >= pagination.pages}
                      className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Last page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact Card View */}
          {viewMode === 'compact' && (
            <div className="space-y-3">
              {loading && (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-slate-500 mt-3">Loading...</p>
                </div>
              )}
              
              {error && !loading && (
                <div className="p-6 text-center bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                  <button onClick={fetchAppointments} className="mt-2 text-sm underline">Retry</button>
                </div>
              )}
              
              {!loading && !error && (
                <>
                  {filteredAppointments.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-lg">
                      <p className="text-slate-500">No appointments found</p>
                    </div>
                  ) : (
                    filteredAppointments.map((apt) => (
                      <div 
                        key={apt.id} 
                        className={`border rounded-lg p-4 hover:shadow-md transition ${
                          apt.status === 'completed' ? 'bg-green-50 border-green-200' : 
                          apt.status === 'cancelled' ? 'bg-red-50 border-red-200 opacity-75' : 
                          'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Patient Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
                                {apt.patient_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-base">{apt.patient_name}</p>
                                  {apt.status === 'completed' && (
                                    <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">
                                      ✓ Completed
                                    </span>
                                  )}
                                  {apt.is_follow_up && (
                                    <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                                      Follow-up
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500">
                                  {apt.uhid || apt.patient_id} • {formatDate(apt.appointment_date)} {formatTime(apt.appointment_time)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-slate-500 text-xs block">Visit Reason</span>
                                <p className="font-medium truncate">{apt.reason_for_visit || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs block">Contact</span>
                                <p className="font-medium">{apt.contact || apt.phone || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs block">Doctor</span>
                                <p className="font-medium truncate">{apt.doctor_name || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs block">Payment</span>
                                <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${getPaymentBadgeClass(apt.payment_status)}`}>
                                  {apt.payment_status || 'pending'}
                                  {apt.amount > 0 && ` • ₹${apt.amount}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <select
                              className={`px-3 py-1.5 text-xs border rounded ${getStatusBadgeClass(apt.status)}`}
                              value={apt.status || 'scheduled'}
                              onChange={(e) => updateAppointmentStatus(apt.id, e.target.value, apt)}
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="no-show">No Show</option>
                            </select>
                            
                            <button
                              onClick={() => handleVisitPatient(apt)}
                              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                            >
                              Start Visit
                            </button>
                            
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleWhatsApp(apt)}
                                className="flex-1 px-3 py-1.5 text-xs border border-green-500 text-green-600 rounded hover:bg-green-50 transition"
                              >
                                WhatsApp
                              </button>
                              <button
                                onClick={() => {
                                  sessionStorage.setItem('currentAppointment', JSON.stringify({
                                    appointmentId: apt.id,
                                    patientId: apt.patient_db_id,
                                    patientName: apt.patient_name
                                  }));
                                  navigate(`/orders/${apt.patient_db_id}`);
                                }}
                                className="flex-1 px-3 py-1.5 text-xs border rounded hover:bg-slate-50 transition"
                              >
                                Rx
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Compact Pagination */}
                  {pagination.total > 0 && (
                    <div className="flex items-center justify-between gap-3 pt-4 border-t">
                      <span className="text-sm text-slate-600">
                        Page {page} of {pagination.pages} ({pagination.total} total)
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                          disabled={page >= pagination.pages}
                          className="px-3 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="bg-white rounded shadow-sm border p-4 space-y-4 h-fit">
          {/* Doctor Info */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl">
              👨‍⚕️
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full mb-1">
                🟢 Online
              </span>
              <p className="font-semibold">Dr. {user?.name || 'Doctor'}</p>
              <p className="text-sm text-slate-500">{user?.role === 'doctor' ? (user?.specialization || 'General Physician') : user?.role}</p>
            </div>
          </div>
          
          <hr />
          
          {/* Quick Stats */}
          <div>
            <p className="text-sm font-medium mb-3">Today's Summary</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{stats[0].count}</p>
                <p className="text-xs text-slate-500">Today</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{stats[2].count}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">{stats[1].count}</p>
                <p className="text-xs text-slate-500">Follow-ups</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">{stats[3].count}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
            </div>
          </div>
          
          <hr />
          
          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Actions</p>

            <button
              onClick={() => navigate('/appointments')}
              className="w-full px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Appointment
            </button>

            <button
              onClick={() => {
                navigate('/patients');
                // Small delay to ensure page loads, then scroll to form
                setTimeout(() => {
                  const form = document.getElementById('add-patient-form');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    const firstInput = form.querySelector('input');
                    if (firstInput) firstInput.focus();
                  }
                }, 100);
              }}
              className="w-full px-4 py-2.5 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Register Patient
            </button>
            
            <button 
              onClick={() => navigate('/patients')}
              className="w-full px-4 py-2.5 text-sm border rounded-lg hover:bg-slate-50 transition"
            >
              View All Patients →
            </button>
          </div>
          
          <hr />
          
          {/* Invite Section */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-2">Invite patients to book online</p>
            <div className="flex items-center gap-2 bg-white border rounded px-3 py-2">
              <span className="text-sm font-mono flex-1 truncate">ABCD1234</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('ABCD1234');
                  addToast('Invite code copied!', 'success');
                }}
                className="text-xs text-primary hover:underline"
              >
                Copy
              </button>
            </div>
            <button className="w-full mt-2 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share via WhatsApp
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
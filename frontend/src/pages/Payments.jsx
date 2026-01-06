import { useEffect, useState, useCallback, Fragment } from 'react';
import HeaderBar from '../components/HeaderBar';
import Modal from '../components/Modal';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiSend, FiPrinter, FiTrash2, FiEye, FiDownload } from 'react-icons/fi';
import { openWhatsApp } from '../utils/whatsapp';

const paymentMethods = ['Cash', 'GPay', 'Debit Card', 'Credit Card', 'UPI', 'Bank Transfer'];
const serviceOptions = [
  { name: 'Consultation', price: 500 },
  { name: 'Follow-up', price: 300 },
  { name: 'Lab Test', price: 200 },
  { name: 'X-Ray', price: 800 },
  { name: 'ECG', price: 400 }
];

export default function Payments() {
  const api = useApiClient();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    unbilled_visits: 0,
    pending_payment: 0,
    paid: { count: 0, total: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    paymode: '',
    service: '',
    dateRange: 'today' // 'today', 'last7days', 'custom'
  });
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [showUnbilledModal, setShowUnbilledModal] = useState(false);
  const [unbilledVisits, setUnbilledVisits] = useState([]);
  const [creatingBillFor, setCreatingBillFor] = useState(null);
  const [billAmount, setBillAmount] = useState('500');
  const [billPaymentMethod, setBillPaymentMethod] = useState('cash');
  const [billPaymentStatus, setBillPaymentStatus] = useState('completed');
  const [billService, setBillService] = useState('Consultation');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.paymode) params.append('payment_method', filters.paymode.toLowerCase().replace(' ', '_'));
      if (filters.service) params.append('service', filters.service);
      
      // Date range
      if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('start_date', today);
        params.append('end_date', today);
      } else if (filters.dateRange === 'last7days') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        params.append('start_date', start.toISOString().split('T')[0]);
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (filters.dateRange === 'custom' && customDateRange.start && customDateRange.end) {
        params.append('start_date', customDateRange.start);
        params.append('end_date', customDateRange.end);
      }

      const res = await api.get(`/api/bills?${params}`);
      setPayments(res.data.bills || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      addToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, search, filters, customDateRange, addToast]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('start_date', today);
        params.append('end_date', today);
      } else if (filters.dateRange === 'last7days') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        params.append('start_date', start.toISOString().split('T')[0]);
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (filters.dateRange === 'custom' && customDateRange.start && customDateRange.end) {
        params.append('start_date', customDateRange.start);
        params.append('end_date', customDateRange.end);
      }

      const res = await api.get(`/api/bills/summary?${params}`);
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, [api, filters, customDateRange]);

  useEffect(() => {
    fetchPayments();
    fetchSummary();
  }, [fetchPayments, fetchSummary]);

  const handleUpdatePayment = async (paymentId, field, value) => {
    try {
      if (field === 'payment_status' || field === 'payment_method') {
        await api.patch(`/api/bills/${paymentId}/status`, {
          payment_status: field === 'payment_status' ? value : undefined,
          payment_method: field === 'payment_method' ? value : undefined
        });
        addToast('Payment updated', 'success');
        fetchPayments();
        fetchSummary();
      }
    } catch {
      addToast('Failed to update payment', 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      await api.delete(`/api/bills/${paymentId}`);
      addToast('Payment deleted', 'success');
      fetchPayments();
      fetchSummary();
    } catch {
      addToast('Failed to delete payment', 'error');
    }
  };

  const handleDownloadReport = () => {
    addToast('Download report functionality - to be implemented', 'info');
    // Would generate and download CSV/PDF report
  };

  const handleEditReceipt = (payment) => {
    // Navigate to receipts page to edit/recreate the receipt
    navigate(`/receipts?edit=true&billId=${payment.id}`);
  };

  const handlePrintReceipt = async (payment) => {
    try {
      // Fetch the receipt PDF and print it
      const response = await api.get(`/api/bills/${payment.id}/pdf`, {
        responseType: 'blob'
      });

      // Create a blob URL and open in new window for printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Failed to print receipt:', error);
      addToast('Failed to print receipt', 'error');
    }
  };

  const handleViewReceipt = async (payment) => {
    try {
      // Fetch full bill details with template
      const response = await api.get(`/api/bills/${payment.id}`);
      console.log('View receipt response:', response.data);
      // Response is wrapped in { success: true, bill: {...} }
      const billData = response.data.bill || response.data;
      setViewingReceipt(billData);
    } catch (error) {
      console.error('Failed to fetch receipt:', error);
      addToast('Failed to view receipt', 'error');
    }
  };

  const handleSendReceipt = async (payment) => {
    if (!payment.patient_phone) {
      addToast('Patient phone number not available', 'error');
      return;
    }

    try {
      // Ask backend to prepare WhatsApp message (includes pdf_url when available)
      const res = await api.get(`/api/bills/${payment.id}/whatsapp`);

      if (res.data && res.data.success) {
        const { patient_phone, whatsapp_message, pdf_url } = res.data;
        const phone = (patient_phone || payment.patient_phone || '').replace(/\D/g, '');

        if (!phone) {
          addToast('Patient phone number not available', 'error');
          return;
        }

        // Prefer server-formatted message; if missing, craft a simple message with pdf link
        const message = whatsapp_message || `Hello ${payment.patient_name || ''}, here is your receipt. ${pdf_url || ''}`;
        openWhatsApp(phone, message);
        addToast('Opening WhatsApp...', 'success');
      } else {
        addToast('Failed to prepare WhatsApp message', 'error');
      }
    } catch (error) {
      console.error('Failed to send receipt:', error);
      addToast('Failed to send receipt', 'error');
    }
  };

  const handleQuickReceipt = (payment) => {
    // Navigate to receipts page with payment data for quick receipt
    navigate(`/receipts?quick=true&patient=${payment.patient_id}&amount=${payment.amount}`);
  };

  const handleFullReceipt = (payment) => {
    // Navigate to receipts page with payment data for full receipt
    navigate(`/receipts?full=true&patient=${payment.patient_id}&amount=${payment.amount}`);
  };

  const fetchUnbilledVisits = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('start_date', today);
        params.append('end_date', today);
      } else if (filters.dateRange === 'last7days') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        params.append('start_date', start.toISOString().split('T')[0]);
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (filters.dateRange === 'custom' && customDateRange.start && customDateRange.end) {
        params.append('start_date', customDateRange.start);
        params.append('end_date', customDateRange.end);
      }

      const res = await api.get(`/api/bills/unbilled-visits?${params}`);
      setUnbilledVisits(res.data.unbilled_visits || []);
      setShowUnbilledModal(true);
    } catch (error) {
      console.error('Failed to fetch unbilled visits:', error);
      addToast('Failed to load unbilled visits', 'error');
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCreateBillClick = (visit) => {
    setCreatingBillFor(visit);
    setBillAmount('500');
    setBillPaymentMethod('cash');
    setBillPaymentStatus('completed');
    setBillService('Consultation');
  };

  const handleCreateBill = async () => {
    if (!creatingBillFor) return;

    try {
      const billData = {
        patient_id: creatingBillFor.patient_id,
        appointment_id: creatingBillFor.appointment_id,
        total_amount: parseFloat(billAmount),
        payment_method: billPaymentMethod,
        payment_status: billPaymentStatus,
        service_name: billService,
        bill_date: new Date().toISOString().split('T')[0]
      };

      await api.post('/api/bills', billData);

      addToast('Bill created successfully', 'success');

      // Remove from unbilled visits list
      setUnbilledVisits(prev => prev.filter(v => v.appointment_id !== creatingBillFor.appointment_id));

      // Reset form
      setCreatingBillFor(null);

      // Refresh summary
      fetchSummary();
      fetchPayments();
    } catch (error) {
      console.error('Failed to create bill:', error);
      addToast(error.response?.data?.error || 'Failed to create bill', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <HeaderBar title="Payments" />

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded shadow-sm border">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-semibold">{summary.total}</p>
        </div>
        <div
          className="p-4 bg-white rounded shadow-sm border cursor-pointer hover:bg-blue-50 transition"
          onClick={fetchUnbilledVisits}
          title="Click to view unbilled visits"
        >
          <p className="text-xs text-slate-500 mb-1">Unbilled Visits</p>
          <p className="text-2xl font-semibold text-blue-600">{summary.unbilled_visits}</p>
          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
        </div>
        <div className="p-4 bg-white rounded shadow-sm border">
          <p className="text-xs text-slate-500 mb-1">Pending Payment</p>
          <p className="text-2xl font-semibold text-orange-600">₹{summary.pending_payment.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-white rounded shadow-sm border">
          <p className="text-xs text-slate-500 mb-1">Paid</p>
          <p className="text-2xl font-semibold text-green-600">
            {summary.paid.count} ({summary.paid.total.toFixed(2)})
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-white rounded shadow-sm border p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by Phone / Name / UHID"
            className="flex-1 px-3 py-2 border rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchPayments();
              }
            }}
          />
          <select
            className="px-3 py-2 border rounded"
            value={filters.paymode}
            onChange={(e) => setFilters({ ...filters, paymode: e.target.value })}
          >
            <option value="">All Paymodes</option>
            {paymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded"
            value={filters.service}
            onChange={(e) => setFilters({ ...filters, service: e.target.value })}
          >
            <option value="">All Services</option>
            {serviceOptions.map(service => (
              <option key={service.name} value={service.name}>{service.name}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          >
            <FiDownload className="inline mr-2" />
            Download Report
          </button>
        </div>

        {/* Custom Date Range */}
        {filters.dateRange === 'custom' && (
          <div className="flex gap-4">
            <input
              type="date"
              className="px-3 py-2 border rounded"
              placeholder="Start Date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
            />
            <input
              type="date"
              className="px-3 py-2 border rounded"
              placeholder="End Date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
            />
          </div>
        )}
      </section>

      {/* Payments Table */}
      <section className="bg-white rounded shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">S.NO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">PATIENT DETAILS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">CONTACT NUMBER</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">SERVICE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">AMOUNT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">PAYMODE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment, index) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{payment.patient_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{payment.patient_id || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.patient_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={payment.service || 'Consultation'}
                        onChange={() => {
                          // Update service - would need backend support
                          addToast('Service update - to be implemented', 'info');
                        }}
                      >
                        {serviceOptions.map(service => (
                          <option key={service.name} value={service.name}>
                            {service.name} (₹{service.price})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border rounded text-sm"
                        value={payment.total_amount || 0}
                        onChange={() => {
                          // Update amount - would need backend support
                          addToast('Amount update - to be implemented', 'info');
                        }}
                        onBlur={() => {
                          // Save updated amount if changed (implementation pending)
                          addToast('Amount update - to be implemented', 'info');
                        }}
                      />
                      <span className="ml-1 text-xs text-slate-500">Rs.</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={payment.payment_method || 'cash'}
                        onChange={(e) => handleUpdatePayment(payment.id, 'payment_method', e.target.value)}
                      >
                        {paymentMethods.map(method => (
                          <option key={method} value={method.toLowerCase().replace(' ', '_')}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditReceipt(payment)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Receipt"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSendReceipt(payment)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Send to WhatsApp"
                        >
                          <FiSend size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(payment)}
                          className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                          title="Print Receipt"
                        >
                          <FiPrinter size={16} />
                        </button>
                        <button
                          onClick={() => handleViewReceipt(payment)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="View Receipt"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <Modal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          title="Edit Payment"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded"
                value={editingPayment.total_amount || 0}
                onChange={(e) => setEditingPayment({ ...editingPayment, total_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={editingPayment.payment_method || 'cash'}
                onChange={(e) => setEditingPayment({ ...editingPayment, payment_method: e.target.value })}
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method.toLowerCase().replace(' ', '_')}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Payment Status</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={editingPayment.payment_status || 'pending'}
                onChange={(e) => setEditingPayment({ ...editingPayment, payment_status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setEditingPayment(null)}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleUpdatePayment(editingPayment.id, 'payment_status', editingPayment.payment_status);
                  await handleUpdatePayment(editingPayment.id, 'payment_method', editingPayment.payment_method);
                  setEditingPayment(null);
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Unbilled Visits Modal */}
      {showUnbilledModal && (
        <Modal
          isOpen={showUnbilledModal}
          onClose={() => setShowUnbilledModal(false)}
          title={`Unbilled Visits (${unbilledVisits.length})`}
        >
          <div className="space-y-4">
            {unbilledVisits.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No unbilled visits found for the selected date range
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">PATIENT</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">CONTACT</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">DATE</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">TIME</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">DOCTOR</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">REASON</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">STATUS</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {unbilledVisits.map((visit) => (
                      <Fragment key={visit.appointment_id}>
                        <tr className="hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <div>
                              <div className="font-medium">{visit.patient_name}</div>
                              <div className="text-xs text-slate-500">{visit.patient_uhid}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">{visit.patient_phone || '-'}</td>
                          <td className="px-3 py-3">
                            {new Date(visit.appointment_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-3 py-3">
                            {formatTime(visit.appointment_time || visit.slot_time)}
                          </td>
                          <td className="px-3 py-3">Dr. {visit.doctor_name || 'N/A'}</td>
                          <td className="px-3 py-3 max-w-[150px] truncate" title={visit.reason_for_visit}>
                            {visit.reason_for_visit || '-'}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${
                              visit.appointment_status === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {visit.appointment_status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleCreateBillClick(visit)}
                              className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                            >
                              {creatingBillFor?.appointment_id === visit.appointment_id ? 'Cancel' : 'Create Bill'}
                            </button>
                          </td>
                        </tr>

                        {/* Inline Bill Creation Form */}
                        {creatingBillFor?.appointment_id === visit.appointment_id && (
                          <tr className="bg-blue-50">
                            <td colSpan="8" className="px-3 py-4">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-slate-700">Create Bill for {visit.patient_name}</h4>
                                <div className="grid grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
                                    <select
                                      value={billService}
                                      onChange={(e) => {
                                        setBillService(e.target.value);
                                        const service = serviceOptions.find(s => s.name === e.target.value);
                                        if (service) setBillAmount(service.price.toString());
                                      }}
                                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-primary/20"
                                    >
                                      {serviceOptions.map(service => (
                                        <option key={service.name} value={service.name}>
                                          {service.name} (₹{service.price})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={billAmount}
                                      onChange={(e) => setBillAmount(e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-primary/20"
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
                                    <select
                                      value={billPaymentMethod}
                                      onChange={(e) => setBillPaymentMethod(e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-primary/20"
                                    >
                                      {paymentMethods.map(method => (
                                        <option key={method} value={method.toLowerCase().replace(' ', '_')}>
                                          {method}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Status</label>
                                    <select
                                      value={billPaymentStatus}
                                      onChange={(e) => setBillPaymentStatus(e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-primary/20"
                                    >
                                      <option value="completed">Paid</option>
                                      <option value="pending">Unpaid</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setCreatingBillFor(null)}
                                    className="px-4 py-1.5 text-sm border rounded hover:bg-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleCreateBill}
                                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Save Bill
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowUnbilledModal(false)}
                className="px-4 py-2 border rounded hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Receipt Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Receipt Preview"
        >
          <div id="receipt-view-area" className="space-y-6">
            {/* Clinic Header */}
            <div className="text-center border-b pb-4">
              {viewingReceipt.clinic_logo && (
                <img
                  src={viewingReceipt.clinic_logo}
                  alt="Clinic Logo"
                  className="h-16 mx-auto mb-2"
                />
              )}
              <h2 className="text-xl font-bold">{viewingReceipt.clinic_name || 'Clinic'}</h2>
              <p className="text-sm text-slate-600">
                {viewingReceipt.clinic_address && `${viewingReceipt.clinic_address}, `}
                {viewingReceipt.clinic_city && `${viewingReceipt.clinic_city}, `}
                {viewingReceipt.clinic_state && `${viewingReceipt.clinic_state} `}
                {viewingReceipt.clinic_pincode}
              </p>
              <p className="text-sm text-slate-600">
                {viewingReceipt.clinic_phone && `Phone: ${viewingReceipt.clinic_phone}`}
                {viewingReceipt.clinic_email && ` | Email: ${viewingReceipt.clinic_email}`}
              </p>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Receipt No:</p>
                <p className="font-medium">#{viewingReceipt.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Date:</p>
                <p className="font-medium">
                  {new Date(viewingReceipt.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Patient Name:</p>
                <p className="font-medium">{viewingReceipt.patient_name}</p>
              </div>
              <div>
                <p className="text-slate-500">UHID:</p>
                <p className="font-medium">{viewingReceipt.patient_uhid}</p>
              </div>
              {viewingReceipt.patient_phone && (
                <div>
                  <p className="text-slate-500">Phone:</p>
                  <p className="font-medium">{viewingReceipt.patient_phone}</p>
                </div>
              )}
              {viewingReceipt.doctor_name && (
                <div>
                  <p className="text-slate-500">Doctor:</p>
                  <p className="font-medium">{viewingReceipt.doctor_name}</p>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span>{viewingReceipt.service_name || 'Consultation'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>₹{viewingReceipt.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>₹{viewingReceipt.discount_amount || 0}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₹{viewingReceipt.total_amount - (viewingReceipt.discount_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="capitalize">{viewingReceipt.payment_method?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`capitalize px-2 py-1 rounded text-xs ${
                    viewingReceipt.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {viewingReceipt.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            {(viewingReceipt.template_footer || viewingReceipt.notes) && (
              <div className="border-t pt-4 text-sm text-slate-600">
                {viewingReceipt.template_footer && (
                  <div dangerouslySetInnerHTML={{ __html: viewingReceipt.template_footer }} />
                )}
                {viewingReceipt.notes && (
                  <p className="mt-2">Notes: {viewingReceipt.notes}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => handlePrintReceipt(viewingReceipt)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 flex items-center justify-center gap-2"
              >
                <FiPrinter /> Print
              </button>
              <button
                onClick={() => handleSendReceipt(viewingReceipt)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FiSend /> Send
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="flex-1 px-4 py-2 border rounded hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


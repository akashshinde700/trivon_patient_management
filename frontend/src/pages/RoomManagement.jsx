import { useEffect, useState, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';

const statusColors = {
  available: 'bg-green-100 text-green-800 border-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reserved: 'bg-blue-100 text-blue-800 border-blue-200'
};

const statusIcons = {
  available: '✓',
  occupied: '●',
  maintenance: '⚠',
  reserved: '◐'
};

export default function RoomManagement() {
  const api = useApiClient();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    reserved: 0
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterFloor, setFilterFloor] = useState('');

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Form
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type_id: '',
    floor: '',
    building: '',
    bed_count: 1
  });

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: filterStatus,
        room_type_id: filterRoomType,
        floor: filterFloor
      };

      const response = await api.get('/rooms', { params });
      setRooms(response.data.rooms);
      setSummary(response.data.summary);
    } catch (error) {
      addToast('Failed to load rooms', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, filterRoomType, filterFloor, addToast]);

  // Fetch room types
  const fetchRoomTypes = useCallback(async () => {
    try {
      const response = await api.get('/rooms/types/all');
      setRoomTypes(response.data.room_types);
    } catch (error) {
      // Silently fail - room types are optional for display
    }
  }, [api]);

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, [fetchRooms, fetchRoomTypes]);

  // Add new room
  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rooms', roomForm);
      addToast('Room added successfully', 'success');
      setShowAddRoomModal(false);
      setRoomForm({
        room_number: '',
        room_type_id: '',
        floor: '',
        building: '',
        bed_count: 1
      });
      fetchRooms();
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to add room', 'error');
    }
  };

  // View room details
  const handleViewRoom = async (roomId) => {
    try {
      const response = await api.get(`/rooms/${roomId}`);
      setSelectedRoom(response.data);
      setShowRoomDetailsModal(true);
    } catch (error) {
      addToast('Failed to load room details', 'error');
    }
  };

  // Change room status
  const handleChangeStatus = async (roomId, newStatus) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
      addToast(`Room status updated to ${newStatus}`, 'success');
      fetchRooms();
      if (showRoomDetailsModal) {
        setShowRoomDetailsModal(false);
      }
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  // Group rooms by floor
  const roomsByFloor = rooms.reduce((acc, room) => {
    const floor = room.floor || 'Ground';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  const floors = Object.keys(roomsByFloor).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar title="Room Management" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Rooms</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-sm text-green-600">Available</div>
            <div className="text-2xl font-bold text-green-900">{summary.available}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-sm text-red-600">Occupied</div>
            <div className="text-2xl font-bold text-red-900">{summary.occupied}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-sm text-yellow-600">Maintenance</div>
            <div className="text-2xl font-bold text-yellow-900">{summary.maintenance}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600">Reserved</div>
            <div className="text-2xl font-bold text-blue-900">{summary.reserved}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>

            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Room Types</option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_name} - ₹{type.base_charge_per_day}/day
                </option>
              ))}
            </select>

            <input
              type="text"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              placeholder="Filter by floor"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => setShowAddRoomModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add New Room
            </button>
          </div>
        </div>

        {/* Rooms Grid by Floor */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading rooms...</p>
          </div>
        ) : floors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new room.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {floors.map((floor) => (
              <div key={floor} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {floor === 'Ground' ? 'Ground Floor' : `Floor ${floor}`}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({roomsByFloor[floor].length} rooms)
                  </span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {roomsByFloor[floor].map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleViewRoom(room.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                        statusColors[room.status]
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">{room.room_number}</span>
                        <span className="text-xl">{statusIcons[room.status]}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">{room.room_type_name}</div>
                      <div className="text-xs font-semibold capitalize">{room.status}</div>
                      {room.bed_count > 1 && (
                        <div className="text-xs text-gray-500 mt-1">{room.bed_count} beds</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleAddRoom} className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Room</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomForm.room_number}
                    onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 101, A-23"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Type *
                  </label>
                  <select
                    required
                    value={roomForm.room_type_id}
                    onChange={(e) => setRoomForm({ ...roomForm, room_type_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select room type</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.type_name} - ₹{type.base_charge_per_day}/day
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <input
                    type="text"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1, 2, G"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                  <input
                    type="text"
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Block A, Main Building"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bed Count</label>
                  <input
                    type="number"
                    min="1"
                    value={roomForm.bed_count}
                    onChange={(e) => setRoomForm({ ...roomForm, bed_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {showRoomDetailsModal && selectedRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Room {selectedRoom.room_number}
                </h2>
                <button
                  onClick={() => setShowRoomDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Room Type</h3>
                  <p className="mt-1 text-gray-900">{selectedRoom.room_type_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Charge per Day</h3>
                  <p className="mt-1 text-gray-900 font-semibold">
                    ₹{selectedRoom.base_charge_per_day}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Floor</h3>
                  <p className="mt-1 text-gray-900">{selectedRoom.floor || 'Ground'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Building</h3>
                  <p className="mt-1 text-gray-900">{selectedRoom.building || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Bed Count</h3>
                  <p className="mt-1 text-gray-900">{selectedRoom.bed_count}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        statusColors[selectedRoom.status]
                      }`}
                    >
                      {selectedRoom.status}
                    </span>
                  </p>
                </div>
              </div>

              {selectedRoom.current_patient && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Current Patient</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">
                        {selectedRoom.current_patient.patient_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Patient ID:</span>
                      <span className="ml-2 font-medium">
                        {selectedRoom.current_patient.patient_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Admission:</span>
                      <span className="ml-2 font-medium">
                        {selectedRoom.current_patient.admission_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Doctor:</span>
                      <span className="ml-2 font-medium">
                        {selectedRoom.current_patient.doctor_name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Change Status</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChangeStatus(selectedRoom.id, 'available')}
                    disabled={selectedRoom.status === 'available'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Available
                  </button>
                  <button
                    onClick={() => handleChangeStatus(selectedRoom.id, 'maintenance')}
                    disabled={selectedRoom.status === 'maintenance'}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Maintenance
                  </button>
                  <button
                    onClick={() => handleChangeStatus(selectedRoom.id, 'reserved')}
                    disabled={selectedRoom.status === 'reserved'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reserved
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowRoomDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

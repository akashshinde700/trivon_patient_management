import { useEffect, useState, useCallback } from 'react';
import { useApiClient } from '../api/client';

export default function PatientsNewView() {
  const api = useApiClient();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/patients', { params: { search: query, page: 1, limit: 20 } });
      setPatients(res.data.patients || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to load patients');
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Search by name, UHID, phone, email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="px-3 py-2 text-sm border rounded" onClick={fetchPatients}>Search</button>
      </div>

      <div className="bg-white border rounded">
        {loading && <div className="p-4 text-sm text-slate-500">Loading...</div>}
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          patients.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No patients found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
              {patients.map((p, idx) => (
                <div key={p.id || idx} className="border rounded p-3 hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold truncate">{p.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{p.patient_id}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>{p.gender} {p.dob ? `• ${p.dob}` : ''}</div>
                    <div>{p.phone || '-'}</div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a href={`/patient-overview/${p.id}`} className="px-2 py-1 text-xs border rounded text-primary hover:bg-primary hover:text-white transition">Overview</a>
                    <a href={`/orders/${p.id}`} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Start Visit</a>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

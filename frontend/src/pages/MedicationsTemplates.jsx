import { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';

const MedicationsTemplates = () => {
  const api = useApiClient();
  const { addToast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    medications: [{
      name: '',
      brand: '',
      composition: '',
      dosage: '',
      frequency: '1-0-1',
      timing: 'After Meal',
      duration: '7 days',
      qty: 7
    }]
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/medications-templates');
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching medications templates:', error);
      addToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        category: template.category || '',
        description: template.description || '',
        medications: Array.isArray(template.medications) ? template.medications : []
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        medications: [{
          name: '',
          brand: '',
          composition: '',
          dosage: '',
          frequency: '1-0-1',
          timing: 'After Meal',
          duration: '7 days',
          qty: 7
        }]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleAddMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '',
        brand: '',
        composition: '',
        dosage: '',
        frequency: '1-0-1',
        timing: 'After Meal',
        duration: '7 days',
        qty: 7
      }]
    }));
  };

  const handleRemoveMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Template name is required', 'error');
      return;
    }

    const filteredMedications = formData.medications.filter(m => m.name.trim() !== '');
    if (filteredMedications.length === 0) {
      addToast('At least one medication is required', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        medications: filteredMedications
      };

      if (editingTemplate) {
        await api.put(`/api/medications-templates/${editingTemplate.id}`, payload);
        addToast('Template updated successfully', 'success');
      } else {
        await api.post('/api/medications-templates', payload);
        addToast('Template created successfully', 'success');
      }

      fetchTemplates();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving template:', error);
      addToast(error.response?.data?.error || 'Failed to save template', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/api/medications-templates/${id}`);
      addToast('Template deleted successfully', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast('Failed to delete template', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medications Templates</h2>
          <p className="text-gray-600 mt-1">Manage your medication templates for quick prescription</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          Add Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No templates created yet</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.category && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded">
                      {template.category}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(template)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Medications ({template.medications?.length || 0}):</p>
                <div className="space-y-1">
                  {(template.medications || []).slice(0, 2).map((med, idx) => (
                    <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">{med.name || med.medication_name}</div>
                      <div className="text-gray-500">
                        {med.frequency} • {med.duration}
                      </div>
                    </div>
                  ))}
                  {template.medications?.length > 2 && (
                    <div className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded text-center">
                      +{template.medications.length - 2} more medications
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Common Cold Treatment"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Respiratory"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows="2"
                    placeholder="Brief description of this template"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Medications *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                      + Add Medication
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.medications.map((med, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Medication #{index + 1}
                          </span>
                          {formData.medications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Medicine Name *
                            </label>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., Paracetamol 500mg"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Brand Name
                            </label>
                            <input
                              type="text"
                              value={med.brand}
                              onChange={(e) => handleMedicationChange(index, 'brand', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., Crocin"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Composition
                            </label>
                            <input
                              type="text"
                              value={med.composition}
                              onChange={(e) => handleMedicationChange(index, 'composition', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., Paracetamol"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Dosage
                            </label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., 500mg"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Frequency
                            </label>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., 1-0-1"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Timing
                            </label>
                            <select
                              value={med.timing}
                              onChange={(e) => handleMedicationChange(index, 'timing', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                            >
                              <option>After Meal</option>
                              <option>Before Meal</option>
                              <option>Before Breakfast</option>
                              <option>Empty Stomach</option>
                              <option>With Food</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Duration
                            </label>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., 7 days"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={med.qty}
                              onChange={(e) => handleMedicationChange(index, 'qty', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-pink-500"
                              placeholder="e.g., 7"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationsTemplates;

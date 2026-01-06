import { useState } from 'react';
import { useToast } from '../hooks/useToast';
// import { useApiClient } from '../api/client';

export default function RxTemplateConfig() {
  const { addToast } = useToast();
  // const api = useApiClient();
  const [activeTab, setActiveTab] = useState('print');
  const [selectedClinic, setSelectedClinic] = useState('Metropolis Vidhyavihar');
  const [autoFitHeight, setAutoFitHeight] = useState(false);
  const [spaceSaverLayout, setSpaceSaverLayout] = useState(false);
  const [letterheadFile, setLetterheadFile] = useState(null);
  const [headerFile, setHeaderFile] = useState(null);
  const [footerFile, setFooterFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const sections = [
    { name: 'Diagnosis', icon: '🔬', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Medical History', icon: '📚', color: 'text-red-600', bgColor: 'bg-red-50' },
    { name: 'Medications', icon: '💊', color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { name: 'Custom Section', icon: '✏️', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Prescribed Lab Tests', icon: '🧪', color: 'text-brown-600', bgColor: 'bg-amber-50' },
    { name: 'Referred To', icon: '➡️', color: 'text-blue-400', bgColor: 'bg-blue-50' },
    { name: 'Investigative Readings', icon: '🔥', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { name: 'Examination Findings', icon: '🩺', color: 'text-green-600', bgColor: 'bg-green-50' },
    { name: 'Advices', icon: '💬', color: 'text-gray-600', bgColor: 'bg-gray-50' },
    { name: 'Follow Up', icon: '🔄', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
  ];

  const handleFileUpload = (type, file) => {
    if (file) {
      switch (type) {
        case 'letterhead':
          setLetterheadFile(file);
          addToast('Letterhead uploaded successfully', 'success');
          break;
        case 'header':
          setHeaderFile(file);
          addToast('Header uploaded successfully', 'success');
          break;
        case 'footer':
          setFooterFile(file);
          addToast('Footer uploaded successfully', 'success');
          break;
      }
    }
  };

  const handleDownload = (type) => {
    // Mock download functionality
    addToast(`${type} download initiated`, 'info');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement backend API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      addToast('Template configuration saved successfully', 'success');
    } catch {
      addToast('Failed to save configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAutoFitHeight(false);
    setSpaceSaverLayout(false);
    setLetterheadFile(null);
    setHeaderFile(null);
    setFooterFile(null);
    addToast('Configuration reset to defaults', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rx Template Configuration</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="spaceSaver"
              checked={spaceSaverLayout}
              onChange={(e) => setSpaceSaverLayout(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="spaceSaver" className="text-sm font-medium">
              Introducing Space Saver Layout
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b pb-4">
          <button
            className={`px-4 py-2 text-sm font-medium rounded ${
              activeTab === 'print'
                ? 'bg-primary text-white'
                : 'border hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('print')}
          >
            Print Rx Template
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded ${
              activeTab === 'digital'
                ? 'bg-primary text-white'
                : 'border hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('digital')}
          >
            Digital Rx Template
          </button>
          <select
            className="px-3 py-2 border rounded ml-4"
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
          >
            <option>Select Clinic: Metropolis Vidhyavihar</option>
            <option>Apollo Hospitals</option>
            <option>Max Healthcare</option>
          </select>
        </div>

        {/* Patient Details Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-3">Patient Details Configuration</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                <span className="text-sm">Show Patient Name</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                <span className="text-sm">Show Age & Gender</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" />
                <span className="text-sm">Show Contact Number</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" />
                <span className="text-sm">Show Address</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                <span className="text-sm">Show UHID</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" />
                <span className="text-sm">Show Visit Date</span>
              </label>
            </div>
          </div>
        </div>

        {/* Template Sections */}
        <div>
          <h3 className="font-semibold mb-4">Template Sections</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {sections.map((section) => (
              <div key={section.name} className={`p-4 border rounded ${section.bgColor} hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{section.icon}</span>
                  <div>
                    <p className={`font-medium text-sm ${section.color}`}>{section.name}</p>
                    <p className="text-xs text-gray-500">Configure section settings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" defaultChecked className="h-3 w-3" />
                  <span className="text-xs">Enabled</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Letterhead & Layout Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Letterhead Upload */}
          <div className="space-y-3">
            <h3 className="font-semibold">Letterhead Configuration</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-sm text-gray-600 mb-2">
                  {letterheadFile ? letterheadFile.name : 'Upload Letterhead'}
                </p>
                <div className="flex gap-2 justify-center">
                  <label className="px-3 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-700">
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload('letterhead', e.target.files[0])}
                    />
                  </label>
                  <button
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    onClick={() => handleDownload('Letterhead')}
                  >
                    Download
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2 font-medium">Instant Setup Available</p>
              </div>
            </div>
          </div>

          {/* Header/Footer */}
          <div className="space-y-3">
            <h3 className="font-semibold">Header & Footer</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Header Image</span>
                <div className="flex gap-2 items-center">
                  <label className="px-2 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-700">
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('header', e.target.files[0])}
                    />
                  </label>
                  {headerFile && (
                    <span className="text-xs text-gray-600 truncate max-w-[140px]">{headerFile.name}</span>
                  )}
                  <button
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    onClick={() => handleDownload('Header')}
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">Footer Image</span>
                <div className="flex gap-2 items-center">
                  <label className="px-2 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-700">
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('footer', e.target.files[0])}
                    />
                  </label>
                  {footerFile && (
                    <span className="text-xs text-gray-600 truncate max-w-[140px]">{footerFile.name}</span>
                  )}
                  <button
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    onClick={() => handleDownload('Footer')}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Options */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Layout Options</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoFitHeight}
                onChange={(e) => setAutoFitHeight(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">AutoFit Height</span>
            </label>
            <span className="text-xs text-gray-500">
              Automatically adjust section heights to fit content
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            className="px-4 py-2 border rounded hover:bg-gray-50"
            onClick={handleReset}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}


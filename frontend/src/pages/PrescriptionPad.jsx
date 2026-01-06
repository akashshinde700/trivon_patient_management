import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiEdit3, FiVideo, FiLink2, FiCopy, FiSettings, FiX } from 'react-icons/fi';
import { useToast } from '../hooks/useToast';
import { useApiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';  // Make sure this exists
import Letterhead from '../components/Letterhead';

const symptomSuggestions = ['Fever', 'Cough', 'Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Pain', 'Weakness'];
const diagnosisSuggestions = ['Hypertension', 'Diabetes', 'URI', 'Migraine', 'Gastritis', 'Anemia', 'Asthma'];
const medSuggestions = [
  { name: 'Paracetamol 500mg', brand: 'Crocin', composition: 'Paracetamol', available: true },
  { name: 'Amoxicillin 500mg', brand: 'Amoxil', composition: 'Amoxicillin', available: true },
  { name: 'Cetirizine 10mg', brand: 'Zyrtec', composition: 'Cetirizine HCl', available: true },
  { name: 'Omeprazole 20mg', brand: 'Omez', composition: 'Omeprazole', available: true }
];

const frequentlyPrescribed = [
  { name: 'Paracetamol 500mg', brand: 'Crocin', composition: 'Paracetamol', available: true },
  { name: 'Amoxicillin 500mg', brand: 'Amoxil', composition: 'Amoxicillin', available: true }
];

const predefinedAdvice = {
  en: [
    'Plenty of liquids',
    'Steaming gargling',
    'Rest well',
    'Avoid spicy food',
    'Take medicines on time',
    'Follow up if symptoms persist'
  ],
  hi: [
    'खूब सारे तरल पदार्थ लें',
    'भाप और गरारे करें',
    'अच्छे से आराम करें',
    'मसालेदार भोजन से बचें',
    'समय पर दवाई लें',
    'लक्षण बने रहने पर फॉलो-अप करें'
  ],
  mr: [
    'भरपूर द्रव पदार्थ घ्या',
    'वाफ आणि गरारे करा',
    'चांगली विश्रांती घ्या',
    'मसालेदार अन्न टाळा',
    'वेळेवर औषध घ्या',
    'लक्षणे कायम राहिल्यास फॉलो-अप करा'
  ]
};

const instructionLanguages = [
  { code: 'hi', name: 'हिंदी - Hindi' },
  { code: 'en', name: 'English' },
  { code: 'mr', name: 'मराठी - Marathi' }
];

const timingOptions = {
  en: [
    'After Meal',
    'Before Breakfast',
    'Before Meal',
    'Empty Stomach',
    'With Food'
  ],
  hi: [
    'खाने के बाद',
    'नाश्ते से पहले',
    'खाने से पहले',
    'खाली पेट',
    'खाने के साथ'
  ],
  mr: [
    'जेवणानंतर',
    'नाश्त्यापूर्वी',
    'जेवणापूर्वी',
    'रिकाम्या पोटी',
    'जेवणासोबत'
  ]
};

export default function PrescriptionPad() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const api = useApiClient();
  const { user } = useAuth();  // Get logged in user
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; }`,
  });
  const adviceEditorRef = useRef(null);

  // State
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('prescription');
  const [showVitalsConfig, setShowVitalsConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Meta state with doctor_id, date and time
  const [meta, setMeta] = useState({
    patient_id: patientId || '',
    doctor_id: '',
    appointment_id: '',
    prescription_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    prescription_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  });
  
  const [vitals, setVitals] = useState({
    temp: '',
    height: '',
    bmi: '',
    weight: '',
    pulse: '',
    blood_pressure: '',
    spo2: ''
  });
  
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomDropdown, setSymptomDropdown] = useState(false);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnosisDropdown, setDiagnosisDropdown] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [symptomsTemplates, setSymptomsTemplates] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [diagnosisTemplates, setDiagnosisTemplates] = useState([]);
  const [showDiagnosisTemplateSelector, setShowDiagnosisTemplateSelector] = useState(false);
  const [medInput, setMedInput] = useState('');
  const [medDropdown, setMedDropdown] = useState(false);
  const [meds, setMeds] = useState([]);
  const [medicationsTemplates, setMedicationsTemplates] = useState([]);
  const [showMedicationsTemplateSelector, setShowMedicationsTemplateSelector] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [advice, setAdvice] = useState('');
  const [enableTranslations, setEnableTranslations] = useState(false);
  const [selectedAdvice, setSelectedAdvice] = useState([]);
  const [printOnPrescription, setPrintOnPrescription] = useState(true);
  const [followUp, setFollowUp] = useState({ days: '', date: '', autoFill: false });
  const [patientNotes, setPatientNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [monetizeRx, setMonetizeRx] = useState(false);
  const [language, setLanguage] = useState('en');

  // NEW: Additional sections
  const [examinationFindings, setExaminationFindings] = useState('');
  const [labResults, setLabResults] = useState([]);
  const [labTestInput, setLabTestInput] = useState('');
  const [injections, setInjections] = useState({ given: [], toBeGiven: [] });
  const [procedures, setProcedures] = useState([]);
  const [printProcedures, setPrintProcedures] = useState(true);
  const [referralDoctor, setReferralDoctor] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString());

  // Past data states
  const [pastVisitsTab, setPastVisitsTab] = useState('past');
  const [pastVisits, setPastVisits] = useState([]);
  const [pastPrescriptions, setPastPrescriptions] = useState([]);
  const [pastVitals, setPastVitals] = useState([]);
  const [pastRecords, setPastRecords] = useState([]);
  const [loadingPastData, setLoadingPastData] = useState(false);

  // Patient search states
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Lab results modal state
  const [showLabResultsModal, setShowLabResultsModal] = useState(false);
  const [previousLabResults, setPreviousLabResults] = useState([]);

  // Receipt template states
  const [receiptTemplates, setReceiptTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // ========================================
  // Fetch Doctor ID
  // ========================================
  const fetchDoctorId = useCallback(async () => {
    try {
      // Method 1: If user is logged in and is a doctor
      if (user && user.id) {
        try {
          const res = await api.get(`/api/doctors/by-user/${user.id}`);
          if (res.data && res.data.id) {
            setMeta(prev => ({ ...prev, doctor_id: res.data.id }));
            return;
          }
        } catch (err) {
          console.log('User is not a doctor, trying fallback...');
        }
      }

      // Method 2: Fallback - get first available doctor
      try {
        const res = await api.get('/api/doctors');
        if (res.data.doctors && res.data.doctors.length > 0) {
          setMeta(prev => ({ ...prev, doctor_id: res.data.doctors[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch doctors list:', err);
      }
    } catch (error) {
      console.error('Error fetching doctor ID:', error);
    }
  }, [api, user]);

  // ========================================
  // Fetch Patient
  // ========================================
  const fetchPatient = useCallback(async () => {
    try {
      if (!patientId) {
        addToast('No patient ID provided', 'error');
        return;
      }
      const res = await api.get(`/api/patients/${patientId}`);
      setPatient(res.data);
      setMeta(prev => ({ ...prev, patient_id: patientId }));
    } catch (error) {
      console.error('Error loading patient:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load patient';
      addToast(errorMsg, 'error');
    }
  }, [api, patientId, addToast]);

  // ========================================
  // Search Patients
  // ========================================
  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      const res = await api.get(`/api/patients?search=${query}`);
      setPatientResults(res.data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
    }
  };

  const handlePatientSelect = (selectedPatient) => {
    navigate(`/orders/${selectedPatient.id}`);
    setShowPatientSearch(false);
    setPatientSearch('');
    setPatientResults([]);
  };

  // ========================================
  // Fetch Past Data
  // ========================================
  const fetchPastData = useCallback(async () => {
    if (!patientId) return;
    setLoadingPastData(true);
    try {
      // Fetch past prescriptions
      try {
        const rxRes = await api.get(`/api/prescriptions/${patientId}`);
        setPastPrescriptions(rxRes.data.prescriptions || []);
      } catch (err) {
        console.error('Failed to fetch prescriptions:', err);
      }
      
      // Fetch past appointments (visits)
      try {
        const aptRes = await api.get(`/api/appointments`);
        const allAppointments = aptRes.data.appointments || [];
        const patientAppointments = allAppointments.filter(apt => 
          apt.patient_id == patientId || apt.patient_id?.toString() === patientId
        );
        setPastVisits(patientAppointments.slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
      }
      
      // Fetch past vitals
      try {
        const vitalsRes = await api.get(`/api/patient-data/vitals/${patientId}`);
        const vitalsData = vitalsRes.data.vitals || [];
        setPastVitals(vitalsData);

        // Auto-fill with latest vitals if available
        if (vitalsData.length > 0) {
          const latestVital = vitalsData[0]; // Assuming sorted by date DESC
          setVitals({
            temp: latestVital.temperature || '',
            height: latestVital.height_cm || '',
            bmi: '', // Will be calculated
            weight: latestVital.weight_kg || '',
            pulse: latestVital.pulse || '',
            blood_pressure: latestVital.blood_pressure || '',
            spo2: latestVital.spo2 || ''
          });
          console.log('Auto-filled vitals from latest record:', latestVital);
        }
      } catch (err) {
        console.error('Failed to fetch vitals:', err);
      }
      
      // Fetch medical records
      try {
        const recordsRes = await api.get(`/api/patient-data/records/${patientId}`);
        setPastRecords(recordsRes.data.records || []);
      } catch (err) {
        console.error('Failed to fetch records:', err);
      }
    } catch (err) {
      console.error('Failed to load past data:', err);
    } finally {
      setLoadingPastData(false);
    }
  }, [api, patientId]);

  // ========================================
  // useEffect Hooks
  // ========================================

  // Load appointment context from sessionStorage
  useEffect(() => {
    try {
      const appointmentData = sessionStorage.getItem('currentAppointment');
      if (appointmentData) {
        const { appointmentId } = JSON.parse(appointmentData);
        if (appointmentId) {
          console.log('Loading appointment ID from sessionStorage:', appointmentId);
          setMeta(prev => ({ ...prev, appointment_id: appointmentId }));
        }
      }
    } catch (error) {
      console.error('Error loading appointment context:', error);
    }
  }, []);

  useEffect(() => {
    fetchDoctorId();
  }, [fetchDoctorId]);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
      fetchPastData();
    }
  }, [patientId, fetchPatient, fetchPastData]);

  // Fetch symptoms templates
  useEffect(() => {
    const fetchSymptomsTemplates = async () => {
      try {
        const res = await api.get('/api/symptoms-templates');
        setSymptomsTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch symptoms templates:', error);
      }
    };
    fetchSymptomsTemplates();
  }, [api]);

  // Fetch diagnosis templates
  useEffect(() => {
    const fetchDiagnosisTemplates = async () => {
      try {
        const res = await api.get('/api/diagnosis-templates');
        setDiagnosisTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch diagnosis templates:', error);
      }
    };
    fetchDiagnosisTemplates();
  }, [api]);

  // Fetch medications templates
  useEffect(() => {
    const fetchMedicationsTemplates = async () => {
      try {
        const res = await api.get('/api/medications-templates');
        setMedicationsTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch medications templates:', error);
      }
    };
    fetchMedicationsTemplates();
  }, [api]);

  // Fetch receipt templates for prescription letterhead
  useEffect(() => {
    const fetchReceiptTemplates = async () => {
      try {
        const res = await api.get('/api/receipt-templates');
        const templates = res.data.templates || [];
        setReceiptTemplates(templates);

        // Auto-select default template if available
        const defaultTemplate = templates.find(t => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setSelectedTemplate(defaultTemplate);
        }
      } catch (error) {
        console.error('Failed to fetch receipt templates:', error);
      }
    };
    fetchReceiptTemplates();
  }, [api]);

  // Clear selected advice when language changes to avoid mismatch
  useEffect(() => {
    // Clear selected advice when language changes
    setSelectedAdvice([]);
  }, [language]);

  // ========================================
  // Utility Functions
  // ========================================

  // Helper function to translate timing from any language to target language
  const translateTiming = (timingValue, targetLang) => {
    if (!timingValue) return timingValue;

    // Create reverse lookup: find which index this timing value corresponds to
    let foundIndex = -1;
    let sourceLang = null;

    // Check each language to find where this timing value exists
    ['en', 'hi', 'mr'].forEach(lang => {
      const idx = timingOptions[lang]?.indexOf(timingValue);
      if (idx !== -1) {
        foundIndex = idx;
        sourceLang = lang;
      }
    });

    // If found, return the corresponding value in target language
    if (foundIndex !== -1 && timingOptions[targetLang]) {
      return timingOptions[targetLang][foundIndex] || timingValue;
    }

    return timingValue; // Return original if not found
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateFollowUpDate = (days) => {
    if (!days) return '';
    const date = new Date();
    date.setDate(date.getDate() + parseInt(days));
    return date.toISOString().split('T')[0];
  };

  // ========================================
  // Symptom Handlers
  // ========================================
  const addSymptom = async (s) => {
    if (!s) return;
    if (!symptoms.includes(s)) {
      setSymptoms((prev) => [...prev, s]);

      // Auto-suggest diagnosis and medications based on symptom
      try {
        const response = await api.get(`/api/symptom-medications/suggestions?symptoms=${encodeURIComponent(s)}`);

        // Auto-fill diagnosis if available
        if (response.data.diagnosis && response.data.diagnosis.length > 0) {
          const newDiagnoses = response.data.diagnosis.filter(d => !diagnoses.includes(d));
          if (newDiagnoses.length > 0) {
            setDiagnoses((prev) => [...prev, ...newDiagnoses]);
            addToast(`${newDiagnoses.length} diagnosis added for ${s}`, 'info');
          }
        }

        // Auto-fill medications if available
        if (response.data.flatList && response.data.flatList.length > 0) {
          // Show toast to notify doctor
          addToast(`${response.data.flatList.length} medication(s) suggested for ${s}`, 'info');

          // Auto-add suggested medications (only top priority ones)
          const topSuggestions = response.data.flatList.slice(0, 2); // Add top 2 suggestions
          topSuggestions.forEach(med => {
            // Check if medication not already added
            const alreadyExists = meds.some(m =>
              m.name === med.name || m.brand === med.brand
            );

            if (!alreadyExists) {
              const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
              const medObj = {
                name: med.name,
                brand: med.brand || med.name,
                composition: med.composition || '',
                frequency: med.frequency || '1-0-1',
                timing: med.timing || defaultTiming,
                duration: med.duration || '7 days',
                instructions: '',
                qty: 7
              };
              setMeds((prev) => [...prev, medObj]);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching medication suggestions:', error);
        // Silently fail - don't interrupt the doctor's workflow
      }
    }
    setSymptomInput('');
    setSymptomDropdown(false);
  };

  const removeSymptom = (idx) => {
    setSymptoms((prev) => prev.filter((_, i) => i !== idx));
  };

  const copySymptom = (s) => {
    navigator.clipboard.writeText(s);
    addToast('Copied to clipboard', 'success');
  };

  // Apply symptoms template
  const applySymptomTemplate = async (template) => {
    try {
      const templateSymptoms = Array.isArray(template.symptoms)
        ? template.symptoms
        : JSON.parse(template.symptoms || '[]');

      // Add template symptoms to existing symptoms (avoid duplicates)
      const newSymptoms = [...symptoms];
      const addedSymptoms = [];

      templateSymptoms.forEach(symptom => {
        if (!newSymptoms.includes(symptom)) {
          newSymptoms.push(symptom);
          addedSymptoms.push(symptom);
        }
      });

      setSymptoms(newSymptoms);
      setShowTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');

      // Auto-suggest diagnosis and medications for all newly added symptoms
      if (addedSymptoms.length > 0) {
        try {
          const symptomsQuery = addedSymptoms.join(',');
          const response = await api.get(`/api/symptom-medications/suggestions?symptoms=${encodeURIComponent(symptomsQuery)}`);

          // Auto-fill diagnosis if available
          if (response.data.diagnosis && response.data.diagnosis.length > 0) {
            const newDiagnoses = response.data.diagnosis.filter(d => !diagnoses.includes(d));
            if (newDiagnoses.length > 0) {
              setDiagnoses((prev) => [...prev, ...newDiagnoses]);
              addToast(`${newDiagnoses.length} diagnosis suggested`, 'info');
            }
          }

          // Auto-fill medications if available
          if (response.data.flatList && response.data.flatList.length > 0) {
            addToast(`${response.data.flatList.length} medication(s) suggested`, 'info');

            // Auto-add top 2 medications for each symptom
            const topSuggestions = response.data.flatList.slice(0, 4); // Max 4 total
            topSuggestions.forEach(med => {
              const alreadyExists = meds.some(m =>
                m.name === med.name || m.brand === med.brand
              );

              if (!alreadyExists) {
                const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
                const medObj = {
                  name: med.name,
                  brand: med.brand || med.name,
                  composition: med.composition || '',
                  frequency: med.frequency || '1-0-1',
                  timing: med.timing || defaultTiming,
                  duration: med.duration || '7 days',
                  instructions: '',
                  qty: 7
                };
                setMeds((prev) => [...prev, medObj]);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching medication suggestions:', error);
          // Silently fail
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // ========================================
  // Diagnosis Handlers
  // ========================================
  const addDiagnosis = (d) => {
    if (!d) return;
    if (!diagnoses.includes(d)) {
      setDiagnoses((prev) => [...prev, d]);
    }
    setDiagnosisInput('');
    setDiagnosisDropdown(false);
  };

  const removeDiagnosis = (idx) => {
    setDiagnoses((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyDiagnosis = (d) => {
    navigator.clipboard.writeText(d);
    addToast('Copied to clipboard', 'success');
  };

  // Apply diagnosis template
  const applyDiagnosisTemplate = (template) => {
    try {
      const templateDiagnoses = Array.isArray(template.diagnoses)
        ? template.diagnoses
        : JSON.parse(template.diagnoses || '[]');

      // Add template diagnoses to existing diagnoses (avoid duplicates)
      const newDiagnoses = [...diagnoses];
      templateDiagnoses.forEach(diagnosis => {
        if (!newDiagnoses.includes(diagnosis)) {
          newDiagnoses.push(diagnosis);
        }
      });

      setDiagnoses(newDiagnoses);
      setShowDiagnosisTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');
    } catch (error) {
      console.error('Error applying diagnosis template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // ========================================
  // Medication Handlers
  // ========================================
  const addMed = (med) => {
    if (!med) return;
    // Get default timing in current language (first option which is "After Meal")
    const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
    const medObj = typeof med === 'string'
      ? { name: med, brand: med, composition: '', frequency: '1-0-1', timing: defaultTiming, duration: '7 days', instructions: '', qty: 7 }
      : { ...med, frequency: '1-0-1', timing: defaultTiming, duration: '7 days', instructions: '', qty: 7 };
    setMeds((prev) => [...prev, medObj]);
    setMedInput('');
    setMedDropdown(false);
  };

  const removeMed = (idx) => {
    setMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  // Apply medications template
  const applyMedicationsTemplate = (template) => {
    try {
      const templateMeds = Array.isArray(template.medications)
        ? template.medications
        : JSON.parse(template.medications || '[]');

      // Add template medications to existing medications (avoid duplicates)
      templateMeds.forEach(med => {
        const alreadyExists = meds.some(m =>
          m.name === med.name || m.brand === med.brand
        );

        if (!alreadyExists) {
          const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
          const medObj = {
            name: med.name || med.medication_name || '',
            brand: med.brand || med.brand_name || med.name || '',
            composition: med.composition || '',
            frequency: med.frequency || '1-0-1',
            timing: med.timing || defaultTiming,
            duration: med.duration || '7 days',
            instructions: med.instructions || '',
            qty: med.qty || med.quantity || 7
          };
          setMeds((prev) => [...prev, medObj]);
        }
      });

      setShowMedicationsTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');
    } catch (error) {
      console.error('Error applying medications template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // ========================================
  // Advice Handlers
  // ========================================
  const toggleAdvice = (adv) => {
    setSelectedAdvice((prev) => 
      prev.includes(adv) ? prev.filter(a => a !== adv) : [...prev, adv]
    );
  };

  const formatAdvice = (command) => {
    const editor = adviceEditorRef.current;
    if (!editor) return;
    document.execCommand(command, false, null);
    editor.focus();
  };

  // ========================================
  // Follow-up Handler
  // ========================================
  const handleFollowUpDaysChange = (days) => {
    setFollowUp({
      ...followUp,
      days,
      date: days ? calculateFollowUpDate(days) : ''
    });
  };

  // ========================================
  // Save Prescription
  // ========================================
  const handleSave = async () => {
    // Validation
    if (!meta.patient_id) {
      addToast('Patient ID is required', 'error');
      return;
    }

    // Validate patient_id is a valid number
    const parsedPatientId = parseInt(meta.patient_id);
    if (isNaN(parsedPatientId)) {
      addToast('Invalid patient ID. Please select a patient from the queue or patients list.', 'error');
      return;
    }

    if (!meds.length) {
      addToast('At least one medicine is required', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Get doctor_id - with fallback
      let doctorId = meta.doctor_id;

      if (!doctorId) {
        try {
          const docRes = await api.get('/api/doctors');
          if (docRes.data.doctors && docRes.data.doctors.length > 0) {
            doctorId = docRes.data.doctors[0].id;
            setMeta(prev => ({ ...prev, doctor_id: doctorId }));
          }
        } catch (err) {
          console.error('Failed to get doctor:', err);
        }
      }

      // Prepare medications data
      const medicationsData = meds.map(m => ({
        medication_name: m.name || m.brand,
        brand_name: m.brand || m.name,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        instructions: m.instructions || '',
        timing: m.timing || '',
        quantity: m.qty || 0
      }));

      // Prepare request body
      const requestBody = {
        patient_id: parsedPatientId,
        doctor_id: doctorId || null,  // Backend will handle fallback
        appointment_id: meta.appointment_id ? parseInt(meta.appointment_id) : null,
        template_id: selectedTemplateId || null,  // Letterhead template
        medications: medicationsData,
        symptoms: symptoms,
        diagnosis: diagnoses,
        vitals: {
          temp: vitals.temp || null,
          height: vitals.height || null,
          weight: vitals.weight || null,
          pulse: vitals.pulse || null,
          bmi: vitals.bmi || null,
          blood_pressure: vitals.blood_pressure || null,
          spo2: vitals.spo2 || null
        },
        advice: advice + (selectedAdvice.length > 0 ? '\n' + selectedAdvice.join('\n') : ''),
        follow_up_days: followUp.days ? parseInt(followUp.days) : null,
        follow_up_date: followUp.date || null,
        patient_notes: patientNotes || '',
        private_notes: privateNotes || ''
      };

      console.log('Saving prescription:', requestBody);

      const response = await api.post('/api/prescriptions', requestBody);
      
      console.log('Prescription saved:', response.data);
      addToast('Prescription saved successfully', 'success');
      
      return response.data;
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to save prescription';
      addToast(errorMsg, 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // Finish Visit
  // ========================================
  const handleFinish = async () => {
    try {
      // Step 1: Save the prescription
      await handleSave();
      
      // Step 2: Mark appointment as completed if appointment_id exists
      if (meta.appointment_id) {
        try {
          await api.patch(`/api/appointments/${meta.appointment_id}/status`, {
            status: 'completed'
          });
          addToast('Appointment marked as completed', 'success');
        } catch (error) {
          console.error('Error marking appointment as completed:', error);
          addToast('Prescription saved but could not mark appointment as completed', 'warning');
        }
      }
      
      addToast('Prescription completed and visit ended', 'success');
      navigate('/queue');
    } catch (error) {
      console.error('Finish error:', error);
      // Error already shown in handleSave
    }
  };

  // ========================================
  // Clear Form
  // ========================================
  const handleClear = () => {
    setSymptoms([]);
    setDiagnoses([]);
    setMeds([]);
    setAdvice('');
    setPatientNotes('');
    setPrivateNotes('');
    setVitals({ temp: '', height: '', bmi: '', weight: '', pulse: '', blood_pressure: '', spo2: '' });
    setFollowUp({ days: '', date: '', autoFill: false });
    setSelectedAdvice([]);
    addToast('Prescription cleared', 'info');
  };

  // ========================================
  // Filtered Lists
  // ========================================
  const filteredSymptoms = symptomSuggestions.filter(s => 
    s.toLowerCase().includes(symptomInput.toLowerCase())
  );
  const filteredDiagnoses = diagnosisSuggestions.filter(d => 
    d.toLowerCase().includes(diagnosisInput.toLowerCase())
  );
  const filteredMeds = medSuggestions.filter(m => 
    m.name.toLowerCase().includes(medInput.toLowerCase()) ||
    m.brand.toLowerCase().includes(medInput.toLowerCase())
  );

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      {/* No Patient Selected - Show Search */}
      {!patient && !patientId && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a Patient</h3>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by name, UHID, or phone number..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                searchPatients(e.target.value);
                setShowPatientSearch(true);
              }}
              onFocus={() => setShowPatientSearch(true)}
            />

            {/* Search Results Dropdown */}
            {showPatientSearch && patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {patientResults.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handlePatientSelect(p)}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">
                      UHID: {p.patient_id} • {p.phone} • {p.gender}, {calculateAge(p.dob)} years
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center text-gray-600">
            <p className="mb-2">Or select from:</p>
            <div className="flex gap-3 justify-center">
              <Link to="/queue" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
                View Queue
              </Link>
              <Link to="/patients" className="px-4 py-2 border border-primary text-primary rounded hover:bg-primary/10">
                All Patients
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Patient Info Header */}
      {patient && (
        <div className="bg-white border rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{patient.name}</h2>
                  <select className="text-sm border rounded px-2 py-1">
                    <option>{patient.name}</option>
                  </select>
                </div>
                <p className="text-sm text-slate-600">
                  {calculateAge(patient.dob)} years, {patient.gender} • UHID: {patient.patient_id} • {patient.phone}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                  <span>📅 {new Date(meta.prescription_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>🕐 {meta.prescription_time}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border rounded hover:bg-slate-50" title="Edit">
                <FiEdit3 />
              </button>
              <button className="p-2 border rounded hover:bg-slate-50" title="Video Call">
                <FiVideo />
              </button>
              <button className="p-2 border rounded hover:bg-slate-50" title="Link">
                <FiLink2 />
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => navigate(`/patient-overview/${patientId}`)}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary"
            >
              Patient Overview
            </button>
            <button
              onClick={() => setActiveTab('prescription')}
              className={`px-4 py-2 text-sm border-b-2 ${
                activeTab === 'prescription' ? 'border-primary text-primary' : 'border-transparent'
              }`}
            >
              Prescription Pad
            </button>
            <button
              onClick={() => navigate('/rx-template')}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary"
            >
              Templates
            </button>
            <button
              onClick={() => navigate('/pad-configuration')}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary"
            >
              Configure your pad
            </button>
          </div>
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Vitals */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Vitals</h2>
              <button
                onClick={() => setShowVitalsConfig(!showVitalsConfig)}
                className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-slate-50"
              >
                <FiSettings className="w-4 h-4" />
                Configure
              </button>
            </div>
            {showVitalsConfig && (
              <div className="p-3 bg-slate-50 rounded text-sm">
                Configure vitals fields - Add/remove vitals to display
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Body Temperature (F)"
                value={vitals.temp}
                onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Body height (Cms)"
                value={vitals.height}
                onChange={(e) => {
                  const height = e.target.value;
                  setVitals((prev) => {
                    const newVitals = { ...prev, height };
                    // Auto-calculate BMI if both height and weight are present
                    if (height && prev.weight) {
                      const heightInMeters = parseFloat(height) / 100;
                      const weightInKg = parseFloat(prev.weight);
                      if (heightInMeters > 0 && weightInKg > 0) {
                        const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
                        newVitals.bmi = bmi;
                      }
                    }
                    return newVitals;
                  });
                }}
              />
              <input
                className="px-3 py-2 border rounded bg-slate-50"
                placeholder="Body mass index (kg/m2)"
                value={vitals.bmi}
                readOnly
                title="BMI is automatically calculated from height and weight"
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Body weight (Kgs)"
                value={vitals.weight}
                onChange={(e) => {
                  const weight = e.target.value;
                  setVitals((prev) => {
                    const newVitals = { ...prev, weight };
                    // Auto-calculate BMI if both height and weight are present
                    if (weight && prev.height) {
                      const heightInMeters = parseFloat(prev.height) / 100;
                      const weightInKg = parseFloat(weight);
                      if (heightInMeters > 0 && weightInKg > 0) {
                        const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
                        newVitals.bmi = bmi;
                      }
                    }
                    return newVitals;
                  });
                }}
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Pulse Rate (/min)"
                value={vitals.pulse}
                onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Blood Pressure (mmHg)"
                value={vitals.blood_pressure}
                onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="SpO2 (%)"
                value={vitals.spo2}
                onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
              />
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold">Hx</span>
              Medical History
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                <div className="px-3 py-2 bg-gray-50 border rounded text-sm min-h-[60px]">
                  {patient?.medical_conditions || <span className="text-gray-400">No medical conditions recorded</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <div className="px-3 py-2 bg-gray-50 border rounded text-sm min-h-[60px]">
                  {patient?.allergies || <span className="text-gray-400">No allergies recorded</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                <div className="px-3 py-2 bg-gray-50 border rounded text-sm min-h-[60px]">
                  {patient?.current_medications || <span className="text-gray-400">No current medications</span>}
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">
                * Medical history is managed in the Patient Profile. This information is read-only here.
              </p>
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">Sx</span>
                Symptoms
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition"
                title="Use Symptoms Template"
              >
                📋 Use Template
              </button>
            </div>
            <div className="relative">
              <input
                className="w-full px-3 py-2 border rounded"
                placeholder="Start typing Symptoms / Chief Complaints"
                value={symptomInput}
                onChange={(e) => {
                  setSymptomInput(e.target.value);
                  setSymptomDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && symptomInput) {
                    e.preventDefault();
                    addSymptom(symptomInput);
                  }
                }}
                onBlur={() => setTimeout(() => setSymptomDropdown(false), 200)}
              />
              {symptomDropdown && filteredSymptoms.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredSymptoms.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                      onClick={() => addSymptom(s)}
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">Sx</span>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap text-xs text-slate-600">
              {symptomSuggestions.slice(0, 4).map((s) => (
                <button
                  type="button"
                  key={s}
                  className="px-2 py-1 border rounded hover:bg-slate-50"
                  onClick={() => addSymptom(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap text-sm">
              {symptoms.map((s, idx) => (
                <span key={`symptom-${idx}-${s}`} className="px-2 py-1 bg-slate-100 rounded flex items-center gap-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => copySymptom(s)}
                    className="text-primary hover:text-primary/70"
                    title="Copy"
                  >
                    <FiCopy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSymptom(idx)}
                    className="text-red-600 hover:text-red-700"
                    title="Remove"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">Dx</span>
                Diagnosis
              </h3>
              <button
                type="button"
                onClick={() => setShowDiagnosisTemplateSelector(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition"
                title="Use Diagnosis Template"
              >
                📋 Use Template
              </button>
            </div>
            <div className="relative">
              <input
                className="w-full px-3 py-2 border rounded"
                placeholder="Start typing Diagnosis"
                value={diagnosisInput}
                onChange={(e) => {
                  setDiagnosisInput(e.target.value);
                  setDiagnosisDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && diagnosisInput) {
                    e.preventDefault();
                    addDiagnosis(diagnosisInput);
                  }
                }}
                onBlur={() => setTimeout(() => setDiagnosisDropdown(false), 200)}
              />
              {diagnosisDropdown && filteredDiagnoses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredDiagnoses.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                      onClick={() => addDiagnosis(d)}
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">Dx</span>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap text-xs text-slate-600">
              {diagnosisSuggestions.slice(0, 4).map((d) => (
                <button
                  type="button"
                  key={d}
                  className="px-2 py-1 border rounded hover:bg-slate-50"
                  onClick={() => addDiagnosis(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap text-sm">
              {diagnoses.map((d, idx) => (
                <span key={`diagnosis-${idx}-${d}`} className="px-2 py-1 bg-slate-100 rounded flex items-center gap-1">
                  {d}
                  <button
                    type="button"
                    onClick={() => copyDiagnosis(d)}
                    className="text-primary hover:text-primary/70"
                    title="Copy"
                  >
                    <FiCopy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDiagnosis(idx)}
                    className="text-red-600 hover:text-red-700"
                    title="Remove"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Medications</h3>
                <button
                  type="button"
                  onClick={() => setShowMedicationsTemplateSelector(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-pink-50 text-pink-700 border border-pink-200 rounded hover:bg-pink-100 transition"
                  title="Use Medications Template"
                >
                  📋 Use Template
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="px-3 py-2 border rounded text-sm w-32"
                  placeholder="Delivery Pincode"
                  value={deliveryPincode}
                  onChange={(e) => setDeliveryPincode(e.target.value)}
                />
                <button className="px-3 py-2 text-sm border rounded hover:bg-slate-50">Check</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Medication Language:</label>
              <select
                className="px-3 py-2 border rounded text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {instructionLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <input
                className="w-full px-3 py-2 border rounded"
                placeholder="Start typing Medicines"
                value={medInput}
                onChange={(e) => {
                  setMedInput(e.target.value);
                  setMedDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && medInput.trim()) {
                    e.preventDefault();
                    addMed(medInput.trim());
                  }
                }}
                onBlur={() => setTimeout(() => setMedDropdown(false), 200)}
              />
              {medDropdown && (medInput.length > 0 || frequentlyPrescribed.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
                  {frequentlyPrescribed.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-blue-50 text-xs font-semibold text-blue-900 border-b">
                        FREQUENTLY prescribed by you
                      </div>
                      {frequentlyPrescribed.filter(m => 
                        m.name.toLowerCase().includes(medInput.toLowerCase()) ||
                        m.brand.toLowerCase().includes(medInput.toLowerCase())
                      ).map((m, idx) => (
                        <button
                          key={`freq-${idx}-${m.name}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b"
                          onClick={() => addMed(m)}
                        >
                          <div className="font-medium">{m.brand}</div>
                          <div className="text-xs text-slate-600">{m.composition} • {m.available ? 'Available' : 'Not Available'}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredMeds.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-green-50 text-xs font-semibold text-green-900 border-b">
                        SUGGESTED for Symptoms/Diagnosis Entered
                      </div>
                      {filteredMeds.map((m, idx) => (
                        <button
                          key={`sugg-${idx}-${m.name}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50"
                          onClick={() => addMed(m)}
                        >
                          <div className="font-medium">{m.brand}</div>
                          <div className="text-xs text-slate-600">{m.composition} • {m.available ? 'Available' : 'Not Available'}</div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="border rounded overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[800px] bg-slate-50 text-xs font-semibold text-slate-600 px-3 py-2">
                <span className="col-span-2">MEDICINE (Generic)</span>
                <span>FREQUENCY</span>
                <span>TIMING</span>
                <span>DURATION</span>
                <span>INSTRUCTIONS</span>
                <span>QUANTITY</span>
              </div>
              {meds.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">
                  Add medications above
                </div>
              )}
              {meds.map((m, idx) => (
                <div key={`med-${idx}-${m.name}`} className="grid grid-cols-7 min-w-[800px] items-center px-3 py-2 text-sm border-t">
                  <div className="col-span-2">
                    <div className="font-medium">{m.brand || m.name}</div>
                    {m.composition && <div className="text-xs text-slate-500">{m.composition}</div>}
                  </div>
                  <input
                    className="px-2 py-1 border rounded text-xs"
                    placeholder="1-0-1"
                    value={m.frequency}
                    onChange={(e) =>
                      setMeds((prev) => prev.map((row, i) => (i === idx ? { ...row, frequency: e.target.value } : row)))
                    }
                  />
                  <select
                    className="px-2 py-1 border rounded text-xs"
                    value={m.timing}
                    onChange={(e) =>
                      setMeds((prev) => prev.map((row, i) => (i === idx ? { ...row, timing: e.target.value } : row)))
                    }
                  >
                    {(timingOptions[language] || timingOptions.en).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    className="px-2 py-1 border rounded text-xs"
                    placeholder="7 days"
                    value={m.duration}
                    onChange={(e) =>
                      setMeds((prev) => prev.map((row, i) => (i === idx ? { ...row, duration: e.target.value } : row)))
                    }
                  />
                  <input
                    className="px-2 py-1 border rounded text-xs"
                    placeholder="Instructions"
                    value={m.instructions}
                    onChange={(e) =>
                      setMeds((prev) => prev.map((row, i) => (i === idx ? { ...row, instructions: e.target.value } : row)))
                    }
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="px-2 py-1 border rounded text-xs w-16"
                      type="number"
                      value={m.qty}
                      onChange={(e) =>
                        setMeds((prev) => prev.map((row, i) => (i === idx ? { ...row, qty: parseInt(e.target.value) || 0 } : row)))
                      }
                    />
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeMed(idx)}
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Injections */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">Injections</h3>

            {/* Given Injections */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Given</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Enter injection name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setInjections(prev => ({
                        ...prev,
                        given: [...prev.given, e.target.value.trim()]
                      }));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {injections.given.map((inj, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <span>{inj}</span>
                    <button
                      onClick={() => setInjections(prev => ({
                        ...prev,
                        given: prev.given.filter((_, i) => i !== idx)
                      }))}
                      className="hover:text-green-900"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* To Be Given Injections */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">To Be Given</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Enter injection name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setInjections(prev => ({
                        ...prev,
                        toBeGiven: [...prev.toBeGiven, e.target.value.trim()]
                      }));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {injections.toBeGiven.map((inj, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span>{inj}</span>
                    <button
                      onClick={() => setInjections(prev => ({
                        ...prev,
                        toBeGiven: prev.toBeGiven.filter((_, i) => i !== idx)
                      }))}
                      className="hover:text-blue-900"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lab Investigations */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Lab Investigations</h3>
              <button
                onClick={async () => {
                  try {
                    const res = await api.get(`/api/lab-investigations?patient=${patientId}`);
                    const investigations = res.data.investigations || [];

                    if (investigations.length === 0) {
                      addToast('No previous lab results found', 'info');
                      return;
                    }

                    setPreviousLabResults(investigations);
                    setShowLabResultsModal(true);
                  } catch (error) {
                    console.error('Error fetching previous lab results:', error);
                    addToast('Failed to load previous lab results', 'error');
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                View Previous Results
              </button>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={labTestInput}
                onChange={(e) => setLabTestInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
                placeholder="Add lab test (e.g., CBC, Blood Sugar, etc.)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (labTestInput.trim()) {
                      setLabResults(prev => [...prev, {
                        test: labTestInput.trim(),
                        status: 'pending',
                        date: new Date().toISOString().split('T')[0]
                      }]);
                      setLabTestInput('');
                    }
                  }
                }}
              />
            </div>

            {labResults.length > 0 && (
              <div className="border rounded overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  <span>Test Name</span>
                  <span>Date</span>
                  <span>Action</span>
                </div>
                {labResults.map((lab, idx) => (
                  <div key={idx} className="grid grid-cols-3 px-3 py-2 border-t items-center text-sm">
                    <span>{lab.test}</span>
                    <span className="text-gray-600">{lab.date}</span>
                    <button
                      onClick={() => setLabResults(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advices */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Advices</h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={enableTranslations}
                    onChange={(e) => setEnableTranslations(e.target.checked)}
                  />
                  Enable Translations
                </label>
                {enableTranslations && (
                  <select
                    className="px-2 py-1 border rounded text-sm"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                  </select>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(predefinedAdvice[language] || predefinedAdvice.en).map((adv) => (
                <label key={adv} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAdvice.includes(adv)}
                    onChange={() => toggleAdvice(adv)}
                  />
                  {adv}
                </label>
              ))}
            </div>
            <div className="border rounded p-2">
              <div className="flex gap-2 mb-2 border-b pb-2">
                <button
                  type="button"
                  onClick={() => formatAdvice('bold')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50 font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => formatAdvice('italic')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50 italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => formatAdvice('insertUnorderedList')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50"
                  title="List"
                >
                  •
                </button>
              </div>
              <div
                ref={adviceEditorRef}
                contentEditable
                className="min-h-[100px] p-2 focus:outline-none"
                onInput={(e) => setAdvice(e.target.innerText)}
                suppressContentEditableWarning={true}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={printOnPrescription}
                onChange={(e) => setPrintOnPrescription(e.target.checked)}
              />
              Print on prescription
            </label>
          </div>

          {/* Follow Up */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">Follow Up</h3>
            <div className="flex gap-2 items-center">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Days"
                type="number"
                value={followUp.days}
                onChange={(e) => handleFollowUpDaysChange(e.target.value)}
              />
              <input
                className="px-3 py-2 border rounded"
                type="date"
                value={followUp.date}
                onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })}
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={followUp.autoFill}
                  onChange={(e) => setFollowUp({ ...followUp, autoFill: e.target.checked })}
                />
                Auto Fill from Rx
              </label>
            </div>
            <textarea
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Notes"
            />
          </div>

          {/* Notes */}
          <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">Notes</h3>
            <div>
              <label className="block text-sm font-medium mb-1">NOTES FOR PATIENT</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder="Notes visible to patient"
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                PRIVATE NOTES
                <span className="text-xs text-slate-500 ml-2">(These will not be printed)</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder="Private notes for doctor"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-white border rounded shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={handleClear}
              >
                Clear
              </button>
              <button 
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={() => addToast('Print settings dialog would open here', 'info')}
              >
                Print Settings
              </button>
              <select
                className="px-3 py-2 text-sm border rounded"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
              <select
                className="px-3 py-2 text-sm border rounded bg-blue-50"
                value={selectedTemplateId || ''}
                onChange={(e) => {
                  const templateId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedTemplateId(templateId);
                  const template = receiptTemplates.find(t => t.id === templateId);
                  setSelectedTemplate(template || null);
                }}
                title="Select Letterhead Template"
              >
                <option value="">Default Letterhead</option>
                {receiptTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.template_name} {template.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <button 
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={() => addToast('Updates pushed to patient', 'success')}
              >
                Push Updates
              </button>
              <button
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={handlePrint}
              >
                Preview
              </button>
              <label className="flex items-center gap-1 text-sm px-3 py-2 border rounded">
                <input
                  type="checkbox"
                  checked={monetizeRx}
                  onChange={(e) => setMonetizeRx(e.target.checked)}
                />
                Monetize Rx
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-4 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Prescription'}
              </button>
              <button 
                className="px-4 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={() => addToast('Order medicines feature coming soon', 'info')}
              >
                Order Medicines
              </button>
              <button 
                className="px-4 py-2 text-sm border rounded hover:bg-slate-50" 
                onClick={handlePrint}
              >
                Print
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                onClick={handleFinish}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Send Rx & End Visit'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Past Visits */}
        <aside className="space-y-4">
          <div className="bg-white border rounded shadow-sm p-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
              <button
                onClick={() => setPastVisitsTab('past')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'past' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Past Visits"
              >
                P
              </button>
              <button
                onClick={() => setPastVisitsTab('history')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'history' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="History"
              >
                H
              </button>
              <button
                onClick={() => setPastVisitsTab('vitals')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'vitals' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Vitals"
              >
                V
              </button>
              <button
                onClick={() => setPastVisitsTab('records')}
                className={`px-2 py-1 text-xs border rounded relative ${
                  pastVisitsTab === 'records' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Records"
              >
                R
                {pastRecords.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
                    {pastRecords.length > 9 ? '9+' : pastRecords.length}
                  </span>
                )}
              </button>
            </div>

            {/* See all link */}
            <div className="text-xs text-slate-600 mb-3">
              <Link to={`/patient-overview/${patientId}`} className="text-primary hover:underline">
                See all Past Visits {pastVisits.length > 0 && `[${pastVisits.length}]`}
              </Link>
            </div>

            {/* Tab Content */}
            {loadingPastData ? (
              <div className="text-xs text-slate-500 text-center py-4">Loading...</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {pastVisitsTab === 'past' && (
                  <>
                    {pastPrescriptions.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No past visits</div>
                    ) : (
                      pastPrescriptions.slice(0, 5).map((visit, idx) => (
                        <div key={`past-${idx}`} className="border rounded p-2 space-y-2">
                          <div className="text-xs font-semibold text-slate-700">
                            {new Date(visit.prescribed_date || visit.created_at).toLocaleDateString()}
                          </div>
                          {visit.medications && visit.medications.length > 0 && (
                            <div className="space-y-1">
                              {visit.medications.slice(0, 2).map((med, mIdx) => (
                                <div key={`med-${mIdx}`} className="flex items-center gap-1 text-xs">
                                  <span className="w-4 h-4 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-[10px]">Mx</span>
                                  <span className="truncate">{med.medication_name || med.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {visit.diagnosis && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">Dx</span>
                              <span className="truncate">{visit.diagnosis}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'history' && (
                  <>
                    {pastVisits.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No history available</div>
                    ) : (
                      pastVisits.slice(0, 5).map((visit, idx) => (
                        <div key={`history-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">
                            {new Date(visit.appointment_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-600">{visit.reason_for_visit || 'No reason specified'}</div>
                          {visit.notes && (
                            <div className="text-xs text-slate-500 italic">{visit.notes}</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'vitals' && (
                  <>
                    {pastVitals.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No vitals recorded</div>
                    ) : (
                      pastVitals.slice(0, 5).map((vital, idx) => (
                        <div key={`vital-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">
                            {vital.date ? new Date(vital.date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {vital.value || 'No vitals data'}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'records' && (
                  <>
                    {pastRecords.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No records available</div>
                    ) : (
                      pastRecords.slice(0, 5).map((record, idx) => (
                        <div key={`record-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">{record.record_title || record.record_type}</div>
                          <div className="text-xs text-slate-600">
                            {new Date(record.uploaded_date || record.created_at).toLocaleDateString()}
                          </div>
                          {record.description && (
                            <div className="text-xs text-slate-500 truncate">{record.description}</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Hidden printable region containing the Letterhead wrapper */}
      <div className="hidden print:block">
        <div ref={printRef}>
          <Letterhead template={selectedTemplate}>
            <div>
              {patient && (
                <div style={{ marginBottom: 16, fontSize: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{patient.name}</div>
                  <div style={{ color: '#444' }}>
                    {`${patient.gender || ''} • ${patient.dob ? `${new Date(patient.dob).toLocaleDateString()} (${calculateAge(patient.dob)} yrs)` : ''} • UHID: ${patient.patient_id || ''} • ${patient.phone || ''}`}
                  </div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    📅 {new Date(meta.prescription_date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })} • 🕐 {meta.prescription_time}
                  </div>
                </div>
              )}

              {(vitals.temp || vitals.height || vitals.bmi || vitals.weight || vitals.pulse) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Vitals</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                    {vitals.temp && <div>Temp: {vitals.temp}</div>}
                    {vitals.height && <div>Height: {vitals.height}</div>}
                    {vitals.bmi && <div>BMI: {vitals.bmi}</div>}
                    {vitals.weight && <div>Weight: {vitals.weight}</div>}
                    {vitals.pulse && <div>Pulse: {vitals.pulse}</div>}
                    {vitals.blood_pressure && <div>BP: {vitals.blood_pressure}</div>}
                    {vitals.spo2 && <div>SpO2: {vitals.spo2}%</div>}
                  </div>
                </div>
              )}

              {symptoms.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Symptoms</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {symptoms.map((s, i) => (<li key={`print-sx-${i}`}>{s}</li>))}
                  </ul>
                </div>
              )}

              {diagnoses.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Diagnosis</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {diagnoses.map((d, i) => (<li key={`print-dx-${i}`}>{d}</li>))}
                  </ul>
                </div>
              )}

              {meds.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Medications</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Medicine</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Frequency</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Timing</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Duration</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Instructions</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '6px 4px' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meds.map((m, idx) => (
                        <tr key={`print-med-${idx}`}>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>
                            <div style={{ fontWeight: 600 }}>{m.brand || m.name}</div>
                            {m.composition && <div style={{ color: '#666', fontSize: 11 }}>{m.composition}</div>}
                          </td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>{m.frequency}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>{translateTiming(m.timing, language)}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>{m.duration}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>{m.instructions}</td>
                          <td style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>{m.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(advice || selectedAdvice.length > 0) && printOnPrescription && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Advice</div>
                  {advice && (
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{advice}</div>
                  )}
                  {selectedAdvice.length > 0 && (
                    <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 16, fontSize: 13 }}>
                      {selectedAdvice.map((a, i) => (<li key={`print-adv-${i}`}>{a}</li>))}
                    </ul>
                  )}
                </div>
              )}

              {(followUp.days || followUp.date) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Follow Up</div>
                  <div style={{ fontSize: 13 }}>
                    {followUp.days && <>In {followUp.days} day(s){followUp.date ? ', ' : ''}</>}
                    {followUp.date && <>on {new Date(followUp.date).toLocaleDateString()}</>}
                  </div>
                </div>
              )}
            </div>
          </Letterhead>
        </div>
      </div>

      {/* Lab Results Modal */}
      {showLabResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Previous Lab Results</h2>
              <button
                onClick={() => setShowLabResultsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6">
              {previousLabResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No previous lab results found</p>
              ) : (
                <div className="space-y-4">
                  {previousLabResults.map((result, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{result.test_name || result.test}</h3>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(result.date || result.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status || 'Pending'}
                        </span>
                      </div>
                      {result.result && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium text-gray-700">Result:</p>
                          <p className="text-sm mt-1">{result.result}</p>
                        </div>
                      )}
                      {result.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">{result.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowLabResultsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symptoms Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Symptoms Template</h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {symptomsTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {symptomsTemplates.map((template) => {
                    const templateSymptoms = Array.isArray(template.symptoms)
                      ? template.symptoms
                      : JSON.parse(template.symptoms || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applySymptomTemplate(template)}
                        className="border rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {templateSymptoms.slice(0, 4).map((symptom, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {symptom}
                            </span>
                          ))}
                          {templateSymptoms.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                              +{templateSymptoms.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Template Selector Modal */}
      {showDiagnosisTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Diagnosis Template</h2>
              <button
                onClick={() => setShowDiagnosisTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {diagnosisTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagnosisTemplates.map((template) => {
                    const templateDiagnoses = Array.isArray(template.diagnoses)
                      ? template.diagnoses
                      : JSON.parse(template.diagnoses || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applyDiagnosisTemplate(template)}
                        className="border rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {templateDiagnoses.slice(0, 4).map((diagnosis, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {diagnosis}
                            </span>
                          ))}
                          {templateDiagnoses.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                              +{templateDiagnoses.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowDiagnosisTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medications Template Selector Modal */}
      {showMedicationsTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Medications Template</h2>
              <button
                onClick={() => setShowMedicationsTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {medicationsTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {medicationsTemplates.map((template) => {
                    const templateMeds = Array.isArray(template.medications)
                      ? template.medications
                      : JSON.parse(template.medications || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applyMedicationsTemplate(template)}
                        className="border rounded-lg p-3 hover:border-pink-500 hover:bg-pink-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-pink-100 text-pink-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="space-y-1">
                          {templateMeds.slice(0, 3).map((med, idx) => (
                            <div key={idx} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1">
                              <div className="font-medium">{med.brand || med.brand_name || med.name || med.medication_name}</div>
                              {(med.frequency || med.duration) && (
                                <div className="text-gray-600">
                                  {med.frequency} {med.duration && `• ${med.duration}`}
                                </div>
                              )}
                            </div>
                          ))}
                          {templateMeds.length > 3 && (
                            <div className="text-xs text-gray-600 text-center py-1">
                              +{templateMeds.length - 3} more medications
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowMedicationsTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
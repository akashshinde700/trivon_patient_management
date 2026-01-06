// Medication Timing Translations
// English, Hindi, Marathi

export const TIMING_TRANSLATIONS = {
  'After Meal': {
    en: 'After Meal',
    hi: 'खाने के बाद',
    mr: 'जेवणानंतर'
  },
  'Before Meal': {
    en: 'Before Meal',
    hi: 'खाने से पहले',
    mr: 'जेवणापूर्वी'
  },
  'After Breakfast': {
    en: 'After Breakfast',
    hi: 'नाश्ते के बाद',
    mr: 'नाश्त्यानंतर'
  },
  'Before Breakfast': {
    en: 'Before Breakfast',
    hi: 'नाश्ते से पहले',
    mr: 'नाश्त्यापूर्वी'
  },
  'After Lunch': {
    en: 'After Lunch',
    hi: 'दोपहर के खाने के बाद',
    mr: 'दुपारच्या जेवणानंतर'
  },
  'Before Lunch': {
    en: 'Before Lunch',
    hi: 'दोपहर के खाने से पहले',
    mr: 'दुपारच्या जेवणापूर्वी'
  },
  'After Dinner': {
    en: 'After Dinner',
    hi: 'रात के खाने के बाद',
    mr: 'रात्रीच्या जेवणानंतर'
  },
  'Before Dinner': {
    en: 'Before Dinner',
    hi: 'रात के खाने से पहले',
    mr: 'रात्रीच्या जेवणापूर्वी'
  },
  'At Bedtime': {
    en: 'At Bedtime',
    hi: 'सोते समय',
    mr: 'झोपताना'
  },
  'Empty Stomach': {
    en: 'Empty Stomach',
    hi: 'खाली पेट',
    mr: 'रिकाम्या पोटी'
  },
  'With Meal': {
    en: 'With Meal',
    hi: 'खाने के साथ',
    mr: 'जेवणासोबत'
  },
  'As Required': {
    en: 'As Required',
    hi: 'आवश्यकतानुसार',
    mr: 'गरजेप्रमाणे'
  },
  'Morning': {
    en: 'Morning',
    hi: 'सुबह',
    mr: 'सकाळी'
  },
  'Afternoon': {
    en: 'Afternoon',
    hi: 'दोपहर',
    mr: 'दुपारी'
  },
  'Evening': {
    en: 'Evening',
    hi: 'शाम',
    mr: 'संध्याकाळी'
  },
  'Night': {
    en: 'Night',
    hi: 'रात',
    mr: 'रात्री'
  }
};

// Frequency translations
export const FREQUENCY_TRANSLATIONS = {
  '1-0-0': {
    en: 'Once daily (Morning)',
    hi: 'दिन में एक बार (सुबह)',
    mr: 'दिवसातून एकदा (सकाळी)'
  },
  '0-1-0': {
    en: 'Once daily (Afternoon)',
    hi: 'दिन में एक बार (दोपहर)',
    mr: 'दिवसातून एकदा (दुपारी)'
  },
  '0-0-1': {
    en: 'Once daily (Night)',
    hi: 'दिन में एक बार (रात)',
    mr: 'दिवसातून एकदा (रात्री)'
  },
  '1-1-0': {
    en: 'Twice daily (Morning-Afternoon)',
    hi: 'दिन में दो बार (सुबह-दोपहर)',
    mr: 'दिवसातून दोनदा (सकाळ-दुपार)'
  },
  '1-0-1': {
    en: 'Twice daily (Morning-Night)',
    hi: 'दिन में दो बार (सुबह-रात)',
    mr: 'दिवसातून दोनदा (सकाळ-रात्र)'
  },
  '0-1-1': {
    en: 'Twice daily (Afternoon-Night)',
    hi: 'दिन में दो बार (दोपहर-रात)',
    mr: 'दिवसातून दोनदा (दुपार-रात्र)'
  },
  '1-1-1': {
    en: 'Three times daily',
    hi: 'दिन में तीन बार',
    mr: 'दिवसातून तीनदा'
  },
  '1-1-1-1': {
    en: 'Four times daily',
    hi: 'दिन में चार बार',
    mr: 'दिवसातून चारदा'
  }
};

// Duration translations
export const DURATION_TRANSLATIONS = {
  'days': {
    en: 'days',
    hi: 'दिन',
    mr: 'दिवस'
  },
  'weeks': {
    en: 'weeks',
    hi: 'सप्ताह',
    mr: 'आठवडे'
  },
  'months': {
    en: 'months',
    hi: 'महीने',
    mr: 'महिने'
  }
};

// Helper function to translate medication timing
export const translateTiming = (timing, language = 'en') => {
  if (!timing) return '';

  const translation = TIMING_TRANSLATIONS[timing];
  if (!translation) return timing;

  return translation[language] || timing;
};

// Helper function to translate frequency
export const translateFrequency = (frequency, language = 'en') => {
  if (!frequency) return '';

  const translation = FREQUENCY_TRANSLATIONS[frequency];
  if (!translation) return frequency;

  return translation[language] || frequency;
};

// Helper function to format medication for display
export const formatMedicationDisplay = (medication, language = 'en') => {
  const timing = translateTiming(medication.timing, language);
  const frequency = medication.frequency || '';
  const duration = medication.duration || '';

  return {
    ...medication,
    timingDisplay: timing,
    frequencyDisplay: frequency,
    durationDisplay: duration
  };
};

// Get all timing options
export const getTimingOptions = () => {
  return Object.keys(TIMING_TRANSLATIONS);
};

// Get all frequency options
export const getFrequencyOptions = () => {
  return Object.keys(FREQUENCY_TRANSLATIONS);
};

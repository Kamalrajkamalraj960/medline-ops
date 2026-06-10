/** Static option lists for the Lead Registration Wizard. */

export const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+974', label: '🇶🇦 +974' },
  { code: '+965', label: '🇰🇼 +965' },
  { code: '+968', label: '🇴🇲 +968' },
  { code: '+973', label: '🇧🇭 +973' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+353', label: '🇮🇪 +353' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+61', label: '🇦🇺 +61' },
];

export const GENDERS = ['Male', 'Female', 'Other'];

export const COUNTRIES = [
  'India', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
  'United Kingdom', 'Ireland', 'Germany', 'Australia', 'Canada', 'United States', 'Other',
];

export const NATIONALITIES = [
  'Indian', 'Emirati', 'Saudi', 'Qatari', 'Kuwaiti', 'Omani', 'Bahraini',
  'British', 'Irish', 'German', 'Australian', 'Canadian', 'American', 'Other',
];

export const PROFESSIONS = [
  'Nurse',
  'Pharmacist',
  'Medical Lab Technologist',
  'Dialysis Technician',
  'Radiographer',
  'Physiotherapist',
  'Doctor',
  'Other',
];

export const URGENCIES = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'WITHIN_3_MONTHS', label: 'Within 3 Months' },
  { value: 'WITHIN_6_MONTHS', label: 'Within 6 Months' },
  { value: 'JUST_EXPLORING', label: 'Just Exploring' },
];

export const LEAD_SOURCES = [
  'Website', 'Facebook', 'Instagram', 'WhatsApp', 'Referral', 'Campaign', 'Walk-in', 'Phone Call', 'Other',
];

export const WIZARD_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const STEPS = ['Basic Info', 'Professional', 'Service', 'Source & Assign'] as const;

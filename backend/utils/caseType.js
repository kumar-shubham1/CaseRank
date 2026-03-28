/**
 * Case type normalization and keyword-based fallback when AI is unavailable.
 */

const CANONICAL = [
  'Criminal',
  'Civil',
  'Cyber',
  'Family',
  'Property',
  'Other',
  'General',
  'Constitutional',
  'Commercial'
];

function normalizeAiCaseType(raw) {
  if (raw == null || !String(raw).trim()) return '';
  const s = String(raw).trim().toLowerCase();

  for (const c of CANONICAL) {
    if (s === c.toLowerCase()) return c;
  }
  if (/\bcriminal\b/.test(s)) return 'Criminal';
  if (/\bcivil\b/.test(s)) return 'Civil';
  if (/\bcyber\b|computer\s*crime|hacking/.test(s)) return 'Cyber';
  if (/\bfamily\b|matrimonial|domestic/.test(s)) return 'Family';
  if (/\bproperty\b|real\s*estate|land\s*dispute/.test(s)) return 'Property';
  if (/\bother\b|miscellaneous|misc\b/.test(s)) return 'Other';
  if (/constitution/.test(s)) return 'Constitutional';
  if (/commercial|business|corporate/.test(s)) return 'Commercial';
  if (/general/.test(s)) return 'General';

  return '';
}

function detectCaseTypeFromKeywords(text) {
  const t = String(text || '').toLowerCase();

  const criminal =
    /murder|theft|robbery|kidnap|kidnapping|assault|rape|homicide|burglary|arson|dacoity/;
  const family =
    /divorce|marriage|custody|alimony|maintenance|adoption|matrimonial|spousal/;
  const cyber =
    /fraud|online|cyber|hack|hacking|phishing|ransomware|malware|data\s*breach|dark\s*web/;
  const property =
    /land|property|ownership|easement|boundary|tenancy|lease|eviction|title\s*deed|plot/;

  if (criminal.test(t)) return 'Criminal';
  if (family.test(t)) return 'Family';
  if (cyber.test(t)) return 'Cyber';
  if (property.test(t)) return 'Property';
  return 'General';
}

module.exports = {
  normalizeAiCaseType,
  detectCaseTypeFromKeywords,
  CANONICAL
};

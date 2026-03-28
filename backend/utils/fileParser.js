/**
 * Parse structured case .txt (CaseRank upload format)
 *
 * Case ID: ...
 * Case Type: ...
 * Filing Date: ...
 * Description: ...
 */
function parseStructuredCaseFile(text) {
  const raw = String(text || '');
  const caseId = raw.match(/Case ID:\s*(.*)/i)?.[1]?.trim() || '';
  const caseType = raw.match(/Case Type:\s*(.*)/i)?.[1]?.trim() || '';
  const filingDateRaw = raw.match(/Filing Date:\s*(.*)/i)?.[1]?.trim() || '';
  const description = raw.match(/Description:\s*([\s\S]*)/i)?.[1]?.trim() || '';

  let filingDate = filingDateRaw;
  if (filingDateRaw) {
    filingDate = normalizeFilingDate(filingDateRaw);
  }

  return { caseId, caseType, filingDate, description };
}

function toYyyyMmDdLocal(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function normalizeFilingDate(s) {
  const m = String(s).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) {
      return toYyyyMmDdLocal(dt);
    }
  }
  const tryDate = new Date(s);
  if (!Number.isNaN(tryDate.getTime())) {
    return toYyyyMmDdLocal(tryDate);
  }
  return String(s).trim();
}

/**
 * Parse uploaded .txt file content to extract case details
 * Supports both structured and unstructured text
 */

function parseFileContent(text) {
  const result = {
    caseType: '',
    filingDate: '',
    offense: '',
    description: text.trim()
  };

  // Try to extract structured fields using common patterns
  const patterns = {
    caseType: /(?:case\s*type|type\s*of\s*case|category)\s*[:\-]\s*(.+)/i,
    filingDate: /(?:date|filing\s*date|filed\s*on|filed\s*date)\s*[:\-]\s*(.+)/i,
    offense: /(?:offense|offence|charge|crime|allegation)\s*[:\-]\s*(.+)/i,
    caseNumber: /(?:case\s*(?:no|number|#))\s*[:\-]\s*(.+)/i,
    court: /(?:court|tribunal|bench)\s*[:\-]\s*(.+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      result[key] = match[1].trim();
    }
  }

  // Try to extract a description section if present
  const descMatch = text.match(/(?:description|details|facts|brief)\s*[:\-]\s*([\s\S]+?)(?=\n\s*(?:case|type|date|offense|offence|charge|court|$))/i);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Validate and parse date
  if (result.filingDate) {
    const parsedDate = new Date(result.filingDate);
    if (!isNaN(parsedDate.getTime())) {
      result.filingDate = parsedDate.toISOString().split('T')[0];
    }
  }

  return result;
}

module.exports = { parseFileContent, parseStructuredCaseFile };

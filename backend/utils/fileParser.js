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

module.exports = { parseFileContent };

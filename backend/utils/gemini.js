const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  normalizeAiCaseType,
  detectCaseTypeFromKeywords
} = require('./caseType');

let genAI = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY || !String(process.env.GEMINI_API_KEY).trim()) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const PARSE_FALLBACK = {
  summary: 'This case involves a legal issue requiring attention.',
  priority: 'Medium',
  score: 5,
  reason: 'Fallback due to parsing error'
};

const API_FALLBACK = {
  ...PARSE_FALLBACK,
  reason: 'Analysis temporarily unavailable'
};

/**
 * Clean Gemini response to extract pure JSON
 */
function cleanGeminiResponse(rawText) {
  let text = String(rawText || '').trim();
  text = text.replace(/```json\s*/gi, '');
  text = text.replace(/```\s*/g, '');
  text = text.trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  return text.trim();
}

function normalizePriority(value) {
  const priorityMap = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };
  const s = String(value == null ? '' : value)
    .toLowerCase()
    .replace(/\s+/g, '');
  if (s.includes('high')) return 'High';
  if (s.includes('low')) return 'Low';
  if (s.includes('medium')) return 'Medium';
  const direct = priorityMap[s];
  if (direct) return direct;
  return 'Medium';
}

function clampScore(n, priority) {
  let score = parseFloat(n);
  if (Number.isNaN(score)) {
    score = priority === 'High' ? 8.5 : priority === 'Medium' ? 5.5 : 2.5;
  }
  return Math.max(0, Math.min(10, score));
}

function scoreToRange(score) {
  if (score >= 8) return 'Critical';
  if (score >= 5) return 'Moderate';
  return 'Low';
}

function buildResult(parsed) {
  const summary = String(parsed.summary || PARSE_FALLBACK.summary).trim();
  const priority = normalizePriority(parsed.priority);
  const score = clampScore(parsed.score, priority);
  const reason = String(parsed.reason || PARSE_FALLBACK.reason).trim();
  const range = scoreToRange(score);

  let caseType = normalizeAiCaseType(parsed.caseType);
  if (!caseType) caseType = 'General';

  return {
    summary,
    priority,
    score: parseFloat(score.toFixed(1)),
    range,
    reason,
    caseType,
    estimatedComplexity:
      parsed.estimatedComplexity && String(parsed.estimatedComplexity).trim()
        ? String(parsed.estimatedComplexity).trim()
        : 'Moderate'
  };
}

function applyKeywordCaseTypeIfGeneral(result, caseDescription) {
  if (!result || result.caseType !== 'General') return result;
  const kw = detectCaseTypeFromKeywords(caseDescription);
  if (kw !== 'General') {
    result.caseType = kw;
  }
  return result;
}

/**
 * Analyze a legal case using Google Gemini AI.
 * Always returns a valid result object (uses fallbacks on API/parse failure).
 */
const DEFAULT_MODEL = 'gemini-1.5-flash';
const ALT_MODEL = 'gemini-2.5-flash';

async function generateRawText(client, modelName, prompt) {
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  try {
    return response.text();
  } catch (textErr) {
    console.log('[Gemini] response.text() failed:', textErr.message);
    return '';
  }
}

async function analyzeCase(caseDescription) {
  const prompt = `Return ONLY valid JSON:

{
  "summary": "2-3 line summary",
  "priority": "High/Medium/Low",
  "score": number (0-10),
  "caseType": "Criminal/Civil/Cyber/Family/Property/Other",
  "reason": "clear explanation"
}

Choose caseType from the case facts. Use "Other" only if none fit well.

Case:
${caseDescription}`;

  let rawResponse = '';

  try {
    const client = getClient();
    if (!client) {
      console.error('[Gemini] GEMINI_API_KEY is not set — using fallback analysis');
      return applyKeywordCaseTypeIfGeneral(
        buildResult(API_FALLBACK),
        caseDescription
      );
    }

    const primary =
      (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim()) ||
      DEFAULT_MODEL;

    try {
      rawResponse = await generateRawText(client, primary, prompt);
    } catch (primaryErr) {
      const msg = primaryErr.message || '';
      const isNotFound =
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('Not Found');
      if (isNotFound && primary !== ALT_MODEL) {
        console.log(
          `[Gemini] Model "${primary}" unavailable, retrying with "${ALT_MODEL}"`
        );
        rawResponse = await generateRawText(client, ALT_MODEL, prompt);
      } else {
        throw primaryErr;
      }
    }
  } catch (error) {
    console.error('[Gemini] API Error:', error.message);
    return applyKeywordCaseTypeIfGeneral(
      buildResult(API_FALLBACK),
      caseDescription
    );
  }

  console.log('Gemini RAW:', rawResponse);

  if (!String(rawResponse).trim()) {
    return applyKeywordCaseTypeIfGeneral(
      buildResult(API_FALLBACK),
      caseDescription
    );
  }

  const cleanedText = cleanGeminiResponse(rawResponse);
  console.log('[Gemini] Cleaned:', cleanedText);

  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (e) {
    console.log('Parse failed:', cleanedText);
    parsed = { ...PARSE_FALLBACK };
  }

  if (!parsed.summary || parsed.score === undefined || !parsed.reason) {
    parsed = {
      summary: parsed.summary || PARSE_FALLBACK.summary,
      priority: parsed.priority || PARSE_FALLBACK.priority,
      score: parsed.score !== undefined ? parsed.score : PARSE_FALLBACK.score,
      caseType: parsed.caseType,
      reason: parsed.reason || PARSE_FALLBACK.reason
    };
  }

  const out = applyKeywordCaseTypeIfGeneral(buildResult(parsed), caseDescription);
  console.log('[Gemini] ✓ Analysis complete:', out);
  return out;
}

module.exports = { analyzeCase };

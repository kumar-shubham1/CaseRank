const { analyzeCase: geminiAnalyze } = require('../utils/gemini');
const { parseFileContent } = require('../utils/fileParser');
const { calculatePriorityScore, rankCases, getTopRecommendation } = require('../utils/priorityEngine');

const cases = [];
let nextId = 1;

function validationBody(summary, reason) {
  return {
    summary,
    priority: 'Medium',
    score: 0,
    reason
  };
}

/**
 * POST /api/cases/analyze
 */
async function analyzeCase(req, res) {
  try {
    const { description, caseType, filingDate, caseNumber } = req.body;

    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length < 10
    ) {
      return res.status(400).json(
        validationBody(
          'Case details are incomplete.',
          'Please enter a case description of at least 10 characters.'
        )
      );
    }

    console.log('\n[Controller] Analyzing case:', { caseType, filingDate });

    let fullDescription = description.trim();
    if (caseType) fullDescription = `Case Type: ${caseType}\n${fullDescription}`;
    if (filingDate) fullDescription = `Filing Date: ${filingDate}\n${fullDescription}`;

    const analysis = await geminiAnalyze(fullDescription);

    console.log('[Controller] ✓ AI analysis received');

    const newCase = {
      id: nextId++,
      caseNumber: caseNumber || `CR-${Date.now()}`,
      description: description.trim(),
      caseType: analysis.caseType || caseType || 'General',
      filingDate: filingDate || null,
      summary: analysis.summary,
      priority: analysis.priority,
      score: analysis.score,
      range: analysis.range,
      reason: analysis.reason,
      estimatedComplexity: analysis.estimatedComplexity,
      priorityScore: 0,
      analyzedAt: new Date().toISOString(),
      status: 'Pending'
    };

    newCase.priorityScore = calculatePriorityScore(newCase);
    cases.push(newCase);

    console.log('[Controller] ✓ Case saved with ID:', newCase.id);

    return res.status(201).json({
      message: 'Case analyzed successfully',
      summary: analysis.summary,
      priority: analysis.priority,
      score: analysis.score,
      reason: analysis.reason,
      case: newCase
    });
  } catch (error) {
    console.error('[Controller] ✗ Error analyzing case:', error.message);
    return res.status(500).json({
      summary: 'This case involves a legal issue requiring attention.',
      priority: 'Medium',
      score: 5,
      reason: 'Analysis temporarily unavailable'
    });
  }
}

/**
 * POST /api/cases/analyze-file
 */
async function analyzeFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json(
        validationBody(
          'No file was uploaded.',
          'Please upload a plain text (.txt) file with case details.'
        )
      );
    }

    const fileContent = req.file.buffer.toString('utf-8');

    if (fileContent.trim().length < 10) {
      return res.status(400).json(
        validationBody(
          'File content is too short.',
          'Please provide at least 10 characters of case text in the file.'
        )
      );
    }

    console.log('\n[Controller] Analyzing file:', req.file.originalname);

    const parsed = parseFileContent(fileContent);
    const analysis = await geminiAnalyze(fileContent);

    console.log('[Controller] ✓ AI analysis received for file');

    const newCase = {
      id: nextId++,
      caseNumber: parsed.caseNumber || `CR-${Date.now()}`,
      description: parsed.description,
      caseType: analysis.caseType || parsed.caseType || 'General',
      filingDate: parsed.filingDate || null,
      offense: parsed.offense || null,
      summary: analysis.summary,
      priority: analysis.priority,
      score: analysis.score,
      range: analysis.range,
      reason: analysis.reason,
      estimatedComplexity: analysis.estimatedComplexity,
      priorityScore: 0,
      analyzedAt: new Date().toISOString(),
      status: 'Pending',
      source: 'file',
      fileName: req.file.originalname
    };

    newCase.priorityScore = calculatePriorityScore(newCase);
    cases.push(newCase);

    console.log('[Controller] ✓ File case saved with ID:', newCase.id);

    return res.status(201).json({
      message: 'File analyzed successfully',
      summary: analysis.summary,
      priority: analysis.priority,
      score: analysis.score,
      reason: analysis.reason,
      case: newCase
    });
  } catch (error) {
    console.error('[Controller] ✗ Error analyzing file:', error.message);
    return res.status(500).json({
      summary: 'This case involves a legal issue requiring attention.',
      priority: 'Medium',
      score: 5,
      reason: 'Analysis temporarily unavailable'
    });
  }
}

function getAllCases(req, res) {
  const ranked = rankCases(cases);
  res.json({
    total: ranked.length,
    cases: ranked
  });
}

function getRecommendation(req, res) {
  const recommendation = getTopRecommendation(cases);

  if (!recommendation) {
    return res.json({
      message: 'No cases in the system yet.',
      recommendation: null
    });
  }

  res.json({
    message: 'Top priority case recommendation',
    recommendation,
    totalPending: cases.filter(c => c.status === 'Pending').length
  });
}

function deleteCase(req, res) {
  const id = parseInt(req.params.id);
  const index = cases.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const removed = cases.splice(index, 1)[0];
  res.json({ message: 'Case removed', case: removed });
}

function getSchedule(req, res) {
  const ranked = rankCases(cases);
  const schedule = ranked.slice(0, 3);
  res.json({
    message: 'Smart Schedule: Top 3 Cases for Today',
    schedule
  });
}

function compareCases(req, res) {
  const id1 = parseInt(req.params.id1);
  const id2 = parseInt(req.params.id2);

  const case1 = cases.find(c => c.id === id1);
  const case2 = cases.find(c => c.id === id2);

  if (!case1 || !case2) {
    return res.status(404).json({ error: 'One or both cases not found' });
  }

  let higherPriorityCase;
  let lowerPriorityCase;

  if (case1.priorityScore > case2.priorityScore) {
    higherPriorityCase = case1;
    lowerPriorityCase = case2;
  } else if (case2.priorityScore > case1.priorityScore) {
    higherPriorityCase = case2;
    lowerPriorityCase = case1;
  } else {
    return res.json({
      comparison: 'equal',
      message: `Both cases have the same priority score (${case1.priorityScore}). You can handle either first.`,
      case1,
      case2
    });
  }

  const diff = higherPriorityCase.priorityScore - lowerPriorityCase.priorityScore;

  res.json({
    comparison: 'different',
    message: `Case ${higherPriorityCase.caseNumber} has higher priority than ${lowerPriorityCase.caseNumber} (Score difference: ${diff} points).`,
    higherPriorityCase,
    lowerPriorityCase
  });
}

module.exports = {
  analyzeCase,
  analyzeFile,
  getAllCases,
  getRecommendation,
  deleteCase,
  getSchedule,
  compareCases
};

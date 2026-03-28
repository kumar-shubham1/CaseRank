/**
 * Priority scoring engine
 * Combines AI-assigned priority with date-based delay factor
 */

const PRIORITY_WEIGHTS = {
  High: 100,
  Medium: 60,
  Low: 30
};

const COMPLEXITY_WEIGHTS = {
  Simple: 10,
  Moderate: 0,
  Complex: -10
};

/**
 * Calculate a composite priority score for a case
 * Higher score = should be handled first
 */
function calculatePriorityScore(caseData) {
  let score = PRIORITY_WEIGHTS[caseData.priority] || 60;

  // Add delay bonus: older cases get higher scores
  if (caseData.filingDate) {
    const filed = new Date(caseData.filingDate);
    const now = new Date();
    const daysPending = Math.floor((now - filed) / (1000 * 60 * 60 * 24));

    // Add 1 point per 30 days pending, capped at 40 points
    const delayBonus = Math.min(Math.floor(daysPending / 30), 40);
    score += delayBonus;

    caseData.daysPending = daysPending;
    caseData.delayBonus = delayBonus;
  }

  // Adjust for complexity (simpler cases get slight boost for quick resolution)
  score += COMPLEXITY_WEIGHTS[caseData.estimatedComplexity] || 0;

  return score;
}

/**
 * Rank all cases and return sorted by priority score (descending)
 */
function rankCases(cases) {
  return cases
    .map(c => ({ ...c, priorityScore: calculatePriorityScore(c) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Get the top recommended case to handle next
 */
function getTopRecommendation(cases) {
  if (cases.length === 0) return null;
  const ranked = rankCases(cases);
  return ranked[0];
}

module.exports = { calculatePriorityScore, rankCases, getTopRecommendation };

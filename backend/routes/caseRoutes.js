const express = require('express');
const router = express.Router();
const multer = require('multer');
const caseController = require('../controllers/caseController');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  }
});

// POST /api/cases/analyze - Analyze a case from text input
router.post('/analyze', caseController.analyzeCase);

// POST /api/cases/upload - Structured .txt content as JSON { content }
router.post('/upload', caseController.uploadCaseText);

// POST /api/cases/analyze-file - Analyze a case from uploaded .txt file
router.post('/analyze-file', (req, res, next) => {
  upload.single('caseFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        summary: 'File upload could not be processed.',
        priority: 'Medium',
        score: 0,
        reason: 'Please upload a valid .txt file.'
      });
    }
    next();
  });
}, caseController.analyzeFile);

// GET /api/cases - Get all analyzed cases
router.get('/', caseController.getAllCases);

// GET /api/cases/recommend - Get the recommended next case to handle
router.get('/recommend', caseController.getRecommendation);

// GET /api/cases/schedule - Get the top 3 cases to handle today
router.get('/schedule', caseController.getSchedule);

// GET /api/cases/compare/:id1/:id2 - Compare two cases
router.get('/compare/:id1/:id2', caseController.compareCases);

// DELETE /api/cases/:id - Remove a resolved case
router.delete('/:id', caseController.deleteCase);

module.exports = router;

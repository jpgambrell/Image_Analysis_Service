import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';

const router = Router();

// Get all analysis results
router.get('/analysis', AnalysisController.getAllAnalysisResults);

// Get analysis result for specific image
router.get('/analysis/:imageId', AnalysisController.getAnalysisResult);

export default router;

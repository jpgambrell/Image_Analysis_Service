import { Request, Response } from 'express';
import { ImageAnalysisService } from '../services/image.analysis.service';
import { ApiResponse, ImageAnalysisResult } from '../types';

/**
 * @swagger
 * components:
 *   schemas:
 *     ImageAnalysisResult:
 *       type: object
 *       properties:
 *         imageId:
 *           type: string
 *           format: uuid
 *         filename:
 *           type: string
 *         analyzedAt:
 *           type: string
 *           format: date-time
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         error:
 *           type: string
 */

export class AnalysisController {
  /**
   * @swagger
   * /api/analysis/{imageId}:
   *   get:
   *     summary: Get analysis result for a specific image
   *     tags: [Analysis]
   *     parameters:
   *       - in: path
   *         name: imageId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The image ID
   *     responses:
   *       200:
   *         description: Analysis result retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ImageAnalysisResult'
   *       404:
   *         description: Analysis result not found
   */
  static async getAnalysisResult(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const result = await ImageAnalysisService.getAnalysisResult(imageId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Analysis result not found for this image'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      } as ApiResponse<ImageAnalysisResult>);
    } catch (error) {
      console.error('Error retrieving analysis result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis result'
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/analysis:
   *   get:
   *     summary: Get all analysis results
   *     tags: [Analysis]
   *     responses:
   *       200:
   *         description: List of all analysis results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ImageAnalysisResult'
   */
  static async getAllAnalysisResults(req: Request, res: Response): Promise<void> {
    try {
      const results = await ImageAnalysisService.getAllAnalysisResults();

      res.status(200).json({
        success: true,
        data: results
      } as ApiResponse<ImageAnalysisResult[]>);
    } catch (error) {
      console.error('Error retrieving analysis results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis results'
      } as ApiResponse);
    }
  }
}

import path from 'path';
import fs from 'fs/promises';
import { ImageAnalysisResult } from '../types';
import { OllamaService } from './ollama.service';
import { DatabaseService } from './database.service';

const IMAGES_DIR = process.env.IMAGES_DIR || './images';

export class ImageAnalysisService {
  /**
   * Analyzes an image using Ollama/LLaVA
   */
  static async analyzeImage(imageId: string, filename: string): Promise<ImageAnalysisResult> {
    console.log(`Starting analysis for image: ${imageId} (${filename})`);

    // Check if image file exists
    const imagePath = path.join(IMAGES_DIR, filename);
    try {
      await fs.access(imagePath);
    } catch (error) {
      throw new Error(`Image file not found: ${filename}`);
    }

    try {
      // Call Ollama service for analysis
      const ollamaResult = await OllamaService.analyzeImage(filename);

      // Create analysis result
      const result: ImageAnalysisResult = {
        imageId,
        filename,
        analyzedAt: new Date(),
        keywords: ollamaResult.keywords,
        description: ollamaResult.description,
        status: 'completed'
      };

      // Store result in database
      await DatabaseService.insertAnalysis(result);

      console.log(`Analysis completed for image: ${imageId}`);
      return result;
    } catch (error) {
      console.error(`Error analyzing image ${imageId}:`, error);
      throw error;
    }
  }

  static async getAnalysisResult(imageId: string): Promise<ImageAnalysisResult | null> {
    return await DatabaseService.getAnalysisByImageId(imageId);
  }

  static async getAllAnalysisResults(): Promise<ImageAnalysisResult[]> {
    return await DatabaseService.getAllAnalysis();
  }

  static async markAsProcessing(imageId: string, filename: string): Promise<void> {
    const result: ImageAnalysisResult = {
      imageId,
      filename,
      analyzedAt: new Date(),
      keywords: [],
      description: '',
      status: 'processing'
    };
    await DatabaseService.insertAnalysis(result);
  }

  static async markAsFailed(imageId: string, filename: string, error: string): Promise<void> {
    const result: ImageAnalysisResult = {
      imageId,
      filename,
      analyzedAt: new Date(),
      keywords: [],
      description: '',
      status: 'failed',
      error
    };
    await DatabaseService.insertAnalysis(result);
  }
}

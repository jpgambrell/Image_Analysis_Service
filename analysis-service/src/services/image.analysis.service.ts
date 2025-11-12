import path from 'path';
import fs from 'fs/promises';
import { ImageAnalysisResult } from '../types';
import { OllamaService } from './ollama.service';

const IMAGES_DIR = process.env.IMAGES_DIR || './images';

export class ImageAnalysisService {
  private static analysisResults: Map<string, ImageAnalysisResult> = new Map();

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
        detectedText: ollamaResult.detectedText,
        description: ollamaResult.description,
        status: 'completed'
      };

      // Store result
      this.analysisResults.set(imageId, result);

      console.log(`Analysis completed for image: ${imageId}`);
      return result;
    } catch (error) {
      console.error(`Error analyzing image ${imageId}:`, error);
      throw error;
    }
  }

  static async getAnalysisResult(imageId: string): Promise<ImageAnalysisResult | undefined> {
    return this.analysisResults.get(imageId);
  }

  static async getAllAnalysisResults(): Promise<ImageAnalysisResult[]> {
    return Array.from(this.analysisResults.values());
  }

  static markAsProcessing(imageId: string, filename: string): void {
    const result: ImageAnalysisResult = {
      imageId,
      filename,
      analyzedAt: new Date(),
      keywords: [],
      detectedText: [],
      description: '',
      status: 'processing'
    };
    this.analysisResults.set(imageId, result);
  }

  static markAsFailed(imageId: string, filename: string, error: string): void {
    const result: ImageAnalysisResult = {
      imageId,
      filename,
      analyzedAt: new Date(),
      keywords: [],
      detectedText: [],
      description: '',
      status: 'failed',
      error
    };
    this.analysisResults.set(imageId, result);
  }
}

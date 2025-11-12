import path from 'path';
import fs from 'fs/promises';
import { ImageAnalysisResult } from '../types';

const IMAGES_DIR = process.env.IMAGES_DIR || './images';

export class ImageAnalysisService {
  private static analysisResults: Map<string, ImageAnalysisResult> = new Map();

  /**
   * Placeholder analysis function
   * TODO: Integrate with ollama/llava for actual image analysis
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

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Placeholder analysis result
    // In the future, this will call ollama/llava API
    const result: ImageAnalysisResult = {
      imageId,
      filename,
      analyzedAt: new Date(),
      keywords: [
        'placeholder',
        'pending-integration',
        'awaiting-llava'
      ],
      detectedText: [
        'Text detection pending ollama/llava integration'
      ],
      description: 'This is a placeholder analysis result. Integration with ollama/llava is pending.',
      status: 'completed'
    };

    // Store result
    this.analysisResults.set(imageId, result);

    console.log(`Analysis completed for image: ${imageId}`);
    return result;
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

import fs from 'fs/promises';
import path from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llava';
const IMAGES_DIR = process.env.IMAGES_DIR || './images';

export interface OllamaAnalysisResult {
  description: string;
  keywords: string[];
}

export class OllamaService {
  /**
   * Analyzes an image using Ollama/LLaVA
   */
  static async analyzeImage(filename: string): Promise<OllamaAnalysisResult> {
    const imagePath = path.join(IMAGES_DIR, filename);

    // Read image and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // Construct the prompt with specific instructions
    const prompt = `Analyze this image in detail and provide the following information:

1. DESCRIPTION: Write a brief description (2-3 sentences) of what is shown in the image. Include any visible text, signs, or written content in your description.

2. KEYWORDS: List up to 5 keywords that describe the main elements, objects, or themes in the image.

Please format your response EXACTLY as follows:
DESCRIPTION: [your description here]
KEYWORDS: [keyword1, keyword2, keyword3, keyword4, keyword5]`;

    // Call Ollama API
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        images: [imageBase64],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    const responseText = data.response;

    // Log the raw response for debugging
    console.log(JSON.stringify({
      level: 'debug',
      message: 'Raw Ollama response received',
      filename,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 300)
    }));

    // Parse the structured response
    return this.parseResponse(responseText);
  }

  /**
   * Parses the LLaVA response into structured data
   */
  private static parseResponse(responseText: string): OllamaAnalysisResult {
    const result: OllamaAnalysisResult = {
      description: '',
      keywords: []
    };

    try {
      // Extract description
      const descMatch = responseText.match(/DESCRIPTION:\s*(.+?)(?=\nKEYWORDS:|$)/is);
      if (descMatch) {
        result.description = descMatch[1].trim();
      }

      // Extract keywords
      const keywordsMatch = responseText.match(/KEYWORDS:\s*(.+?)$/is);
      if (keywordsMatch) {
        const keywordsStr = keywordsMatch[1].trim();
        // Handle both comma-separated and array format
        const keywords = keywordsStr
          .replace(/[\[\]]/g, '')
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0)
          .slice(0, 5); // Ensure max 5 keywords
        result.keywords = keywords;
      }

      // Log the parsed response for debugging
      console.log(JSON.stringify({
        level: 'debug',
        message: 'Ollama response parsed',
        keywordCount: result.keywords.length
      }));

      // Fallback if parsing failed
      if (!result.description) {
        result.description = responseText.substring(0, 200);
      }
      if (result.keywords.length === 0) {
        result.keywords = ['image', 'analysis', 'content'];
      }
    } catch (error) {
      console.error('Error parsing Ollama response:', error);
      // Return fallback values
      result.description = 'Analysis completed but response parsing failed';
      result.keywords = ['image', 'content'];
    }

    return result;
  }

  /**
   * Checks if Ollama service is available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  /**
   * Ensures the required model is available
   */
  static async ensureModel(): Promise<void> {
    try {
      console.log(`Checking if ${OLLAMA_MODEL} model is available...`);

      const response = await fetch(`${OLLAMA_URL}/api/tags`);
      const data = await response.json() as { models?: Array<{ name: string }> };

      const modelExists = data.models?.some((m) => m.name.includes(OLLAMA_MODEL));

      if (!modelExists) {
        console.log(`${OLLAMA_MODEL} model not found. Pulling model (this may take a while)...`);

        const pullResponse = await fetch(`${OLLAMA_URL}/api/pull`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: OLLAMA_MODEL,
            stream: false
          })
        });

        if (!pullResponse.ok) {
          throw new Error(`Failed to pull ${OLLAMA_MODEL} model`);
        }

        console.log(`${OLLAMA_MODEL} model pulled successfully`);
      } else {
        console.log(`${OLLAMA_MODEL} model is available`);
      }
    } catch (error) {
      console.error('Error ensuring model availability:', error);
      throw error;
    }
  }
}

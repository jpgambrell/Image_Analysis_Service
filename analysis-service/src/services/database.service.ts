import { Pool, QueryResult } from 'pg';
import { ImageAnalysisResult } from '../types';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://imageservice:imageservice_password@localhost:5432/imageservice';

export class DatabaseService {
  private static pool: Pool;

  static async initialize(): Promise<void> {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    try {
      const client = await this.pool.connect();
      console.log('Database connected successfully');
      client.release();
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * Insert a new analysis result
   */
  static async insertAnalysis(analysis: ImageAnalysisResult): Promise<void> {
    const query = `
      INSERT INTO image_analysis (image_id, filename, description, keywords, status, error, analyzed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (image_id)
      DO UPDATE SET
        description = EXCLUDED.description,
        keywords = EXCLUDED.keywords,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        analyzed_at = EXCLUDED.analyzed_at
    `;
    const values = [
      analysis.imageId,
      analysis.filename,
      analysis.description || null,
      analysis.keywords,
      analysis.status,
      analysis.error || null,
      analysis.analyzedAt
    ];

    await this.pool.query(query, values);
  }

  /**
   * Get analysis result by image ID
   */
  static async getAnalysisByImageId(imageId: string): Promise<ImageAnalysisResult | null> {
    const query = 'SELECT * FROM image_analysis WHERE image_id = $1';
    const result: QueryResult = await this.pool.query(query, [imageId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      imageId: row.image_id,
      filename: row.filename,
      description: row.description,
      keywords: row.keywords || [],
      status: row.status,
      error: row.error,
      analyzedAt: row.analyzed_at
    };
  }

  /**
   * Get all analysis results
   */
  static async getAllAnalysis(): Promise<ImageAnalysisResult[]> {
    const query = 'SELECT * FROM image_analysis ORDER BY analyzed_at DESC';
    const result: QueryResult = await this.pool.query(query);

    return result.rows.map(row => ({
      imageId: row.image_id,
      filename: row.filename,
      description: row.description,
      keywords: row.keywords || [],
      status: row.status,
      error: row.error,
      analyzedAt: row.analyzed_at
    }));
  }

  /**
   * Update analysis status
   */
  static async updateAnalysisStatus(imageId: string, status: string, error?: string): Promise<void> {
    const query = `
      UPDATE image_analysis
      SET status = $2, error = $3
      WHERE image_id = $1
    `;
    await this.pool.query(query, [imageId, status, error || null]);
  }

  /**
   * Delete analysis by image ID
   */
  static async deleteAnalysis(imageId: string): Promise<boolean> {
    const query = 'DELETE FROM image_analysis WHERE image_id = $1';
    const result: QueryResult = await this.pool.query(query, [imageId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Close the database connection pool
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection pool closed');
    }
  }
}

import { Pool, QueryResult } from 'pg';
import { UploadedImage } from '../types';

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
   * Insert a new image record
   */
  static async insertImage(image: UploadedImage): Promise<void> {
    const query = `
      INSERT INTO images (id, filename, original_name, mimetype, size, uploaded_at, path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      image.id,
      image.filename,
      image.originalName,
      image.mimetype,
      image.size,
      image.uploadedAt,
      image.path
    ];

    await this.pool.query(query, values);
  }

  /**
   * Get an image by ID
   */
  static async getImageById(id: string): Promise<UploadedImage | null> {
    const query = 'SELECT * FROM images WHERE id = $1';
    const result: QueryResult = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimetype: row.mimetype,
      size: row.size,
      uploadedAt: row.uploaded_at,
      path: row.path
    };
  }

  /**
   * Get all images
   */
  static async getAllImages(): Promise<UploadedImage[]> {
    const query = 'SELECT * FROM images ORDER BY uploaded_at DESC';
    const result: QueryResult = await this.pool.query(query);

    return result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimetype: row.mimetype,
      size: row.size,
      uploadedAt: row.uploaded_at,
      path: row.path
    }));
  }

  /**
   * Delete an image by ID
   */
  static async deleteImage(id: string): Promise<boolean> {
    const query = 'DELETE FROM images WHERE id = $1';
    const result: QueryResult = await this.pool.query(query, [id]);
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

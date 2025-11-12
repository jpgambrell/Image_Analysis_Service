import fs from 'fs/promises';
import path from 'path';
import { UploadedImage } from '../types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export class StorageService {
  private static images: Map<string, UploadedImage> = new Map();

  static async initialize(): Promise<void> {
    try {
      await fs.access(UPLOAD_DIR);
      console.log(`Upload directory exists: ${UPLOAD_DIR}`);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      console.log(`Created upload directory: ${UPLOAD_DIR}`);
    }
  }

  static async saveImage(imageData: UploadedImage): Promise<void> {
    this.images.set(imageData.id, imageData);
  }

  static async getImage(id: string): Promise<UploadedImage | undefined> {
    return this.images.get(id);
  }

  static async getAllImages(): Promise<UploadedImage[]> {
    return Array.from(this.images.values());
  }

  static async getImagePath(id: string): Promise<string | null> {
    const image = this.images.get(id);
    if (!image) return null;

    const imagePath = path.join(UPLOAD_DIR, image.filename);

    try {
      await fs.access(imagePath);
      return imagePath;
    } catch {
      return null;
    }
  }

  static async deleteImage(id: string): Promise<boolean> {
    const image = this.images.get(id);
    if (!image) return false;

    try {
      const imagePath = path.join(UPLOAD_DIR, image.filename);
      await fs.unlink(imagePath);
      this.images.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting image ${id}:`, error);
      return false;
    }
  }
}

import fs from 'fs/promises';
import path from 'path';
import { UploadedImage } from '../types';
import { DatabaseService } from './database.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export class StorageService {
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
    await DatabaseService.insertImage(imageData);
  }

  static async getImage(id: string): Promise<UploadedImage | null> {
    return await DatabaseService.getImageById(id);
  }

  static async getAllImages(): Promise<UploadedImage[]> {
    return await DatabaseService.getAllImages();
  }

  static async getImagePath(id: string): Promise<string | null> {
    const image = await DatabaseService.getImageById(id);
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
    const image = await DatabaseService.getImageById(id);
    if (!image) return false;

    try {
      const imagePath = path.join(UPLOAD_DIR, image.filename);
      await fs.unlink(imagePath);
      await DatabaseService.deleteImage(id);
      return true;
    } catch (error) {
      console.error(`Error deleting image ${id}:`, error);
      return false;
    }
  }
}

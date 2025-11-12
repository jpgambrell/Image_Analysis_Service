import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { StorageService } from '../services/storage.service';
import { kafkaProducer } from '../services/kafka.producer';
import { UploadedImage, ImageUploadEvent, ApiResponse } from '../types';

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadedImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         filename:
 *           type: string
 *         originalName:
 *           type: string
 *         mimetype:
 *           type: string
 *         size:
 *           type: number
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         path:
 *           type: string
 */

export class UploadController {
  /**
   * @swagger
   * /api/upload:
   *   post:
   *     summary: Upload an image
   *     tags: [Images]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Image uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/UploadedImage'
   *       400:
   *         description: Bad request
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        } as ApiResponse);
        return;
      }

      // Use the filename that multer already generated
      const filename = req.file.filename;
      const imageId = path.parse(filename).name; // Get filename without extension

      const imageData: UploadedImage = {
        id: imageId,
        filename: filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
        path: `/api/images/${imageId}`
      };

      // Save to storage
      await StorageService.saveImage(imageData);

      // Publish to Kafka
      const event: ImageUploadEvent = {
        imageId: imageData.id,
        filename: imageData.filename,
        mimetype: imageData.mimetype,
        size: imageData.size,
        uploadedAt: imageData.uploadedAt.toISOString(),
        path: filename
      };

      await kafkaProducer.publishImageUpload(event);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: imageData
      } as ApiResponse<UploadedImage>);
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/images:
   *   get:
   *     summary: Get all uploaded images
   *     tags: [Images]
   *     responses:
   *       200:
   *         description: List of uploaded images
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
   *                     $ref: '#/components/schemas/UploadedImage'
   */
  static async listImages(req: Request, res: Response): Promise<void> {
    try {
      const images = await StorageService.getAllImages();

      res.status(200).json({
        success: true,
        data: images
      } as ApiResponse<UploadedImage[]>);
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve images'
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/images/{id}:
   *   get:
   *     summary: Get a specific image by ID
   *     tags: [Images]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Image file
   *         content:
   *           image/jpeg:
   *             schema:
   *               type: string
   *               format: binary
   *           image/png:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Image not found
   */
  static async getImage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const imagePath = await StorageService.getImagePath(id);

      if (!imagePath) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        } as ApiResponse);
        return;
      }

      res.sendFile(imagePath);
    } catch (error) {
      console.error('Error retrieving image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image'
      } as ApiResponse);
    }
  }

  /**
   * @swagger
   * /api/images/{id}/info:
   *   get:
   *     summary: Get image metadata by ID
   *     tags: [Images]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Image metadata
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UploadedImage'
   *       404:
   *         description: Image not found
   */
  static async getImageInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const image = await StorageService.getImage(id);

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: image
      } as ApiResponse<UploadedImage>);
    } catch (error) {
      console.error('Error retrieving image info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image information'
      } as ApiResponse);
    }
  }
}

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadController } from '../controllers/upload.controller';
import { validateImageUpload, validateImageId } from '../middleware/validation.middleware';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const imageId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, `${imageId}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10)
  }
});

const router = Router();

// Upload image
router.post('/upload', upload.single('image'), validateImageUpload, UploadController.uploadImage);

// List all images
router.get('/images', UploadController.listImages);

// Get specific image file
router.get('/images/:id', validateImageId, UploadController.getImage);

// Get image metadata
router.get('/images/:id/info', validateImageId, UploadController.getImageInfo);

export default router;

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const ALLOWED_FORMATS = (process.env.ALLOWED_FORMATS || 'image/jpeg,image/png,image/gif,image/webp').split(',');

export const validateImageUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
    return;
  }

  // Validate file size
  if (req.file.size > MAX_FILE_SIZE) {
    res.status(400).json({
      success: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
    });
    return;
  }

  // Validate file type
  if (!ALLOWED_FORMATS.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      error: `File type ${req.file.mimetype} is not allowed. Allowed types: ${ALLOWED_FORMATS.join(', ')}`
    });
    return;
  }

  next();
};

export const validateImageId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    id: Joi.string().uuid().required()
  });

  const { error } = schema.validate(req.params);

  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0].message
    });
    return;
  }

  next();
};

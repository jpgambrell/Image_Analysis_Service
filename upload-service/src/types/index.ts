export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  path: string;
}

export interface ImageUploadEvent {
  imageId: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  path: string;
  correlationId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

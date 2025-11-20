export interface ImageUploadEvent {
  imageId: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  path: string;
  correlationId: string;
}

export interface ImageAnalysisResult {
  imageId: string;
  filename: string;
  analyzedAt: Date;
  keywords: string[];
  detectedText: string[];
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

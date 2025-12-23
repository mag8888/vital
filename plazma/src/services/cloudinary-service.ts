import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // Use HTTPS
  });
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️  Cloudinary not configured - image uploads will fail');
  console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any[];
  format?: string;
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Upload image buffer to Cloudinary
 */
export async function uploadImage(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Please set environment variables.');
  }

  const {
    folder = 'vital',
    publicId,
    resourceType = 'image',
    transformation = [],
    format,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      transformation,
    };

    if (format && format !== 'auto') {
      uploadOptions.format = format;
    }

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Failed to upload image: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error('Upload failed: no result returned'));
          return;
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          url: result.url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && apiKey && apiSecret);
}











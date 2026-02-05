import { v2 as cloudinary } from 'cloudinary';
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
export declare function uploadImage(buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;
/**
 * Upload image from file path
 */
export declare function uploadImageFromPath(filePath: string, options?: UploadOptions): Promise<UploadResult>;
/**
 * Delete image from Cloudinary
 */
export declare function deleteImage(publicId: string): Promise<void>;
/**
 * Get image URL with transformations
 */
export declare function getImageUrl(publicId: string, transformations?: any[]): string;
/**
 * Check if Cloudinary is configured
 */
export declare function isCloudinaryConfigured(): boolean;
export { cloudinary };

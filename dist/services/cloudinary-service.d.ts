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
export type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto';
export interface CloudinaryResource {
    public_id: string;
    secure_url: string;
    resource_type: string;
    format?: string;
    created_at?: string;
    bytes?: number;
}
/**
 * List resources in Cloudinary by prefix (folder) and optional resource type
 */
export declare function listCloudinaryResources(prefix: string, resourceType?: CloudinaryResourceType, maxResults?: number): Promise<CloudinaryResource[]>;
/**
 * Search for resources (e.g. audio) in folder - supports raw and video
 */
export declare function searchCloudinaryByFolder(folder: string, options?: {
    resourceType?: CloudinaryResourceType;
    maxResults?: number;
}): Promise<CloudinaryResource[]>;
export { cloudinary };

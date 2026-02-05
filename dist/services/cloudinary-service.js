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
}
else {
    console.warn('⚠️  Cloudinary not configured - image uploads will fail');
    console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}
/**
 * Upload image buffer to Cloudinary
 */
export async function uploadImage(buffer, options = {}) {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Please set environment variables.');
    }
    const { folder = 'vital', publicId, resourceType = 'image', transformation = [], format, } = options;
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder,
            resource_type: resourceType,
            transformation,
        };
        // Добавляем format только если он указан и не 'auto'
        if (format && format !== 'auto') {
            uploadOptions.format = format;
        }
        if (publicId) {
            uploadOptions.public_id = publicId;
        }
        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
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
        });
        uploadStream.end(buffer);
    });
}
/**
 * Upload image from file path
 */
export async function uploadImageFromPath(filePath, options = {}) {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Please set environment variables.');
    }
    const { folder = 'vital', publicId, resourceType = 'image', transformation = [], format, } = options;
    const uploadOptions = {
        folder,
        resource_type: resourceType,
        transformation,
    };
    // Добавляем format только если он указан и не 'auto'
    if (format && format !== 'auto') {
        uploadOptions.format = format;
    }
    if (publicId) {
        uploadOptions.public_id = publicId;
    }
    try {
        const result = await cloudinary.uploader.upload(filePath, uploadOptions);
        return {
            publicId: result.public_id,
            secureUrl: result.secure_url,
            url: result.url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
        };
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}
/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId) {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Please set environment variables.');
    }
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Image deleted: ${publicId}`);
    }
    catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
    }
}
/**
 * Get image URL with transformations
 */
export function getImageUrl(publicId, transformations = []) {
    if (!publicId)
        return '';
    return cloudinary.url(publicId, {
        secure: true,
        transformation: transformations,
    });
}
/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured() {
    return !!(cloudName && apiKey && apiSecret);
}
/**
 * List resources in Cloudinary by prefix (folder) and optional resource type
 */
export async function listCloudinaryResources(prefix, resourceType = 'raw', maxResults = 100) {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured.');
    }
    const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        resource_type: resourceType,
        max_results: maxResults,
    });
    return (result.resources || []);
}
/**
 * Search for resources (e.g. audio) in folder - supports raw and video
 */
export async function searchCloudinaryByFolder(folder, options = {}) {
    const { resourceType = 'raw', maxResults = 200 } = options;
    return listCloudinaryResources(folder, resourceType, maxResults);
}
// Export configured cloudinary instance
export { cloudinary };

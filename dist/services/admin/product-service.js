/**
 * Product Service
 * Сервис для работы с товарами
 */
export class ProductServiceImpl {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async findById(id) {
        return await this.productRepository.findById(id);
    }
    async findAll(options) {
        return await this.productRepository.findAll(options);
    }
    async create(data) {
        const validation = this.validateProductData(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        return await this.productRepository.create(data);
    }
    async update(id, data) {
        const validation = this.validateProductData(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        return await this.productRepository.update(id, data);
    }
    async delete(id) {
        return await this.productRepository.delete(id);
    }
    async findByCategory(categoryId) {
        return await this.productRepository.findByCategory(categoryId);
    }
    async findByStatus(isActive) {
        return await this.productRepository.findByStatus(isActive);
    }
    async toggleActive(productId) {
        return await this.productRepository.toggleActive(productId);
    }
    async uploadImage(productId, imageFile) {
        // Здесь должна быть логика загрузки изображения в Cloudinary или другое хранилище
        // Пока возвращаем заглушку
        throw new Error('Image upload not implemented yet');
    }
    validateProductData(data) {
        const errors = [];
        if (data.title && typeof data.title !== 'string') {
            errors.push({
                field: 'title',
                message: 'Title must be a string',
                value: data.title
            });
        }
        if (data.title && data.title.length < 1) {
            errors.push({
                field: 'title',
                message: 'Title is required',
                value: data.title
            });
        }
        if (data.title && data.title.length > 255) {
            errors.push({
                field: 'title',
                message: 'Title must be less than 255 characters',
                value: data.title
            });
        }
        if (data.description && typeof data.description !== 'string') {
            errors.push({
                field: 'description',
                message: 'Description must be a string',
                value: data.description
            });
        }
        if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
            errors.push({
                field: 'price',
                message: 'Price must be a non-negative number',
                value: data.price
            });
        }
        if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
            errors.push({
                field: 'isActive',
                message: 'isActive must be a boolean',
                value: data.isActive
            });
        }
        if (data.imageUrl && typeof data.imageUrl !== 'string') {
            errors.push({
                field: 'imageUrl',
                message: 'Image URL must be a string',
                value: data.imageUrl
            });
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

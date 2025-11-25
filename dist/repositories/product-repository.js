/**
 * Product Repository
 * Репозиторий для работы с товарами
 */
import { BaseRepositoryImpl } from './base-repository.js';
export class ProductRepositoryImpl extends BaseRepositoryImpl {
    constructor(prisma) {
        super(prisma);
        this.model = prisma.product;
    }
    async findByCategory(categoryId) {
        try {
            return await this.model.findMany({
                where: { categoryId },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            this.handleError(error, 'findByCategory');
        }
    }
    async findByStatus(isActive) {
        try {
            return await this.model.findMany({
                where: { isActive },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            this.handleError(error, 'findByStatus');
        }
    }
    async findByPriceRange(min, max) {
        try {
            return await this.model.findMany({
                where: {
                    price: {
                        gte: min,
                        lte: max
                    }
                },
                orderBy: { price: 'asc' }
            });
        }
        catch (error) {
            this.handleError(error, 'findByPriceRange');
        }
    }
    async toggleActive(productId) {
        try {
            const product = await this.model.findUnique({
                where: { id: productId }
            });
            if (!product) {
                throw new Error('Product not found');
            }
            return await this.model.update({
                where: { id: productId },
                data: { isActive: !product.isActive }
            });
        }
        catch (error) {
            this.handleError(error, 'toggleActive');
        }
    }
    async updateImage(productId, imageUrl) {
        try {
            return await this.model.update({
                where: { id: productId },
                data: { imageUrl }
            });
        }
        catch (error) {
            this.handleError(error, 'updateImage');
        }
    }
    async getProductsCount() {
        try {
            return await this.model.count();
        }
        catch (error) {
            this.handleError(error, 'getProductsCount');
        }
    }
    async getActiveProductsCount() {
        try {
            return await this.model.count({
                where: { isActive: true }
            });
        }
        catch (error) {
            this.handleError(error, 'getActiveProductsCount');
        }
    }
    async searchProducts(query) {
        try {
            return await this.model.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 20,
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            this.handleError(error, 'searchProducts');
        }
    }
    async getProductsWithCategories(filters, sort, pagination) {
        try {
            const where = this.buildWhereClause(filters);
            const orderBy = this.buildOrderBy(sort);
            const { skip, take } = this.buildPagination(pagination);
            const [items, total] = await Promise.all([
                this.model.findMany({
                    where,
                    orderBy,
                    skip,
                    take,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                description: true,
                                isActive: true
                            }
                        }
                    }
                }),
                this.model.count({ where })
            ]);
            return { items, total };
        }
        catch (error) {
            this.handleError(error, 'getProductsWithCategories');
        }
    }
    buildWhereClause(filters) {
        const where = {};
        if (filters?.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        if (filters?.status) {
            where.isActive = filters.status === 'active';
        }
        if (filters?.dateFrom) {
            where.createdAt = { ...where.createdAt, gte: filters.dateFrom };
        }
        if (filters?.dateTo) {
            where.createdAt = { ...where.createdAt, lte: filters.dateTo };
        }
        return where;
    }
}

/**
 * Repository Interfaces
 * Интерфейсы для всех репозиториев (слой доступа к данным)
 */
// Базовый класс для всех репозиториев
export class BaseRepositoryClass {
    constructor(prisma) {
        this.prisma = prisma;
    }
    handleError(error, operation) {
        console.error(`Repository Error [${operation}]:`, error);
        throw new Error(`Database operation failed: ${operation}`);
    }
    async executeTransaction(operation) {
        try {
            return await this.prisma.$transaction(operation);
        }
        catch (error) {
            this.handleError(error, 'transaction');
        }
    }
    buildWhereClause(filters) {
        const where = {};
        if (filters?.search) {
            where.OR = [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { username: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        if (filters?.dateFrom) {
            where.createdAt = { ...where.createdAt, gte: filters.dateFrom };
        }
        if (filters?.dateTo) {
            where.createdAt = { ...where.createdAt, lte: filters.dateTo };
        }
        return where;
    }
    buildOrderBy(sort) {
        if (!sort)
            return { createdAt: 'desc' };
        return {
            [sort.field]: sort.direction
        };
    }
    buildPagination(pagination) {
        if (!pagination)
            return { skip: 0, take: 50 };
        const skip = (pagination.page - 1) * pagination.limit;
        const take = pagination.limit;
        return { skip, take };
    }
}

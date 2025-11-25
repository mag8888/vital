/**
 * Order Repository
 * Репозиторий для работы с заказами
 */
import { BaseRepositoryImpl } from './base-repository.js';
export class OrderRepositoryImpl extends BaseRepositoryImpl {
    constructor(prisma) {
        super(prisma);
        this.model = prisma.order;
    }
    async findByUserId(userId) {
        try {
            return await this.model.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            this.handleError(error, 'findByUserId');
        }
    }
    async findByStatus(status) {
        try {
            return await this.model.findMany({
                where: { status },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true,
                            telegramId: true
                        }
                    }
                }
            });
        }
        catch (error) {
            this.handleError(error, 'findByStatus');
        }
    }
    async findByDateRange(from, to) {
        try {
            return await this.model.findMany({
                where: {
                    createdAt: {
                        gte: from,
                        lte: to
                    }
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true,
                            telegramId: true
                        }
                    }
                }
            });
        }
        catch (error) {
            this.handleError(error, 'findByDateRange');
        }
    }
    async updateStatus(orderId, status) {
        try {
            return await this.model.update({
                where: { id: orderId },
                data: { status },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true,
                            telegramId: true
                        }
                    }
                }
            });
        }
        catch (error) {
            this.handleError(error, 'updateStatus');
        }
    }
    async calculateTotal(orderId) {
        try {
            const order = await this.model.findUnique({
                where: { id: orderId },
                select: { itemsJson: true }
            });
            if (!order || !Array.isArray(order.itemsJson)) {
                return 0;
            }
            return order.itemsJson.reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);
        }
        catch (error) {
            this.handleError(error, 'calculateTotal');
        }
    }
    async getOrdersCount() {
        try {
            return await this.model.count();
        }
        catch (error) {
            this.handleError(error, 'getOrdersCount');
        }
    }
    async getPendingOrdersCount() {
        try {
            return await this.model.count({
                where: { status: 'NEW' }
            });
        }
        catch (error) {
            this.handleError(error, 'getPendingOrdersCount');
        }
    }
    async getCompletedOrdersCount() {
        try {
            return await this.model.count({
                where: { status: 'COMPLETED' }
            });
        }
        catch (error) {
            this.handleError(error, 'getCompletedOrdersCount');
        }
    }
    async getTotalRevenue() {
        try {
            const result = await this.model.aggregate({
                _sum: {
                    totalAmount: true
                },
                where: {
                    status: 'COMPLETED'
                }
            });
            return result._sum.totalAmount || 0;
        }
        catch (error) {
            this.handleError(error, 'getTotalRevenue');
        }
    }
    async getOrdersWithUsers(filters, sort, pagination) {
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
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                username: true,
                                telegramId: true,
                                balance: true
                            }
                        }
                    }
                }),
                this.model.count({ where })
            ]);
            return { items, total };
        }
        catch (error) {
            this.handleError(error, 'getOrdersWithUsers');
        }
    }
    buildWhereClause(filters) {
        const where = {};
        if (filters?.search) {
            where.OR = [
                { contact: { contains: filters.search, mode: 'insensitive' } },
                { message: { contains: filters.search, mode: 'insensitive' } },
                {
                    user: {
                        OR: [
                            { firstName: { contains: filters.search, mode: 'insensitive' } },
                            { lastName: { contains: filters.search, mode: 'insensitive' } },
                            { username: { contains: filters.search, mode: 'insensitive' } }
                        ]
                    }
                }
            ];
        }
        if (filters?.status) {
            where.status = filters.status;
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

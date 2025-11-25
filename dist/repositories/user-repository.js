/**
 * User Repository
 * Репозиторий для работы с пользователями
 */
import { BaseRepositoryImpl } from './base-repository.js';
export class UserRepositoryImpl extends BaseRepositoryImpl {
    constructor(prisma) {
        super(prisma);
        this.model = prisma.user;
    }
    async findByTelegramId(telegramId) {
        try {
            return await this.model.findUnique({
                where: { telegramId }
            });
        }
        catch (error) {
            this.handleError(error, 'findByTelegramId');
        }
    }
    async findByUsername(username) {
        try {
            return await this.model.findUnique({
                where: { username }
            });
        }
        catch (error) {
            this.handleError(error, 'findByUsername');
        }
    }
    async findByEmail(email) {
        try {
            return await this.model.findUnique({
                where: { email }
            });
        }
        catch (error) {
            this.handleError(error, 'findByEmail');
        }
    }
    async findWithStats(filters, sort, pagination) {
        try {
            const where = this.buildWhereClause(filters);
            const orderBy = this.buildOrderBy(sort);
            const { skip, take } = this.buildPagination(pagination);
            const [users, total] = await Promise.all([
                this.model.findMany({
                    where,
                    orderBy,
                    skip,
                    take,
                    include: {
                        orders: {
                            select: {
                                id: true,
                                itemsJson: true
                            }
                        },
                        partnerProfile: {
                            select: {
                                id: true,
                                directPartners: true,
                                multiPartners: true
                            }
                        },
                        inviter: {
                            select: {
                                id: true,
                                firstName: true,
                                username: true
                            }
                        }
                    }
                }),
                this.model.count({ where })
            ]);
            const items = users.map((user) => this.mapToUserWithStats(user));
            return { items, total };
        }
        catch (error) {
            this.handleError(error, 'findWithStats');
        }
    }
    async updateBalance(userId, amount) {
        try {
            return await this.model.update({
                where: { id: userId },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            });
        }
        catch (error) {
            this.handleError(error, 'updateBalance');
        }
    }
    async findReferrals(userId, level) {
        try {
            const partnerProfile = await this.prisma.partnerProfile.findUnique({
                where: { userId },
                include: {
                    referrals: {
                        where: { level },
                        include: {
                            profile: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            });
            if (!partnerProfile)
                return [];
            return partnerProfile.referrals.map((ref) => ref.profile.user);
        }
        catch (error) {
            this.handleError(error, 'findReferrals');
        }
    }
    async findInviter(userId) {
        try {
            const user = await this.model.findUnique({
                where: { id: userId },
                include: {
                    inviter: true
                }
            });
            return user?.inviter || null;
        }
        catch (error) {
            this.handleError(error, 'findInviter');
        }
    }
    async searchUsers(query) {
        try {
            return await this.model.findMany({
                where: {
                    OR: [
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } },
                        { username: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 20
            });
        }
        catch (error) {
            this.handleError(error, 'searchUsers');
        }
    }
    async getUsersCount() {
        try {
            return await this.model.count();
        }
        catch (error) {
            this.handleError(error, 'getUsersCount');
        }
    }
    async getUsersWithBalance() {
        try {
            return await this.model.count({
                where: {
                    balance: {
                        gt: 0
                    }
                }
            });
        }
        catch (error) {
            this.handleError(error, 'getUsersWithBalance');
        }
    }
    async getTotalBalance() {
        try {
            const result = await this.model.aggregate({
                _sum: {
                    balance: true
                }
            });
            return result._sum.balance || 0;
        }
        catch (error) {
            this.handleError(error, 'getTotalBalance');
        }
    }
    async getTotalOrderSum() {
        try {
            const result = await this.prisma.order.aggregate({
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
            this.handleError(error, 'getTotalOrderSum');
        }
    }
    mapToUserWithStats(user) {
        const ordersCount = user.orders?.length || 0;
        const totalOrderSum = user.orders?.reduce((sum, order) => {
            const items = Array.isArray(order.itemsJson) ? order.itemsJson : [];
            return sum + items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        }, 0) || 0;
        const directPartners = user.partnerProfile?.directPartners || 0;
        const level2Partners = user.partnerProfile?.multiPartners || 0;
        const level3Partners = 0; // TODO: реализовать подсчет партнеров 3го уровня
        return {
            id: user.id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            balance: user.balance,
            bonus: user.bonus,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            ordersCount,
            totalOrderSum,
            directPartners,
            level2Partners,
            level3Partners,
            inviter: user.inviter
        };
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
        if (filters?.dateFrom) {
            where.createdAt = { ...where.createdAt, gte: filters.dateFrom };
        }
        if (filters?.dateTo) {
            where.createdAt = { ...where.createdAt, lte: filters.dateTo };
        }
        return where;
    }
}

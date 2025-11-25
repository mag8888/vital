/**
 * Repositories Index
 * Экспорт всех репозиториев
 */
export { BaseRepositoryImpl } from './base-repository.js';
export { UserRepositoryImpl } from './user-repository.js';
export { OrderRepositoryImpl } from './order-repository.js';
export { PartnerRepositoryImpl } from './partner-repository.js';
export { ProductRepositoryImpl } from './product-repository.js';
// Фабрика репозиториев
export class RepositoryFactory {
    static initialize(prisma) {
        RepositoryFactory.prisma = prisma;
    }
    static getUserRepository() {
        return new UserRepositoryImpl(RepositoryFactory.prisma);
    }
    static getOrderRepository() {
        return new OrderRepositoryImpl(RepositoryFactory.prisma);
    }
    static getPartnerRepository() {
        return new PartnerRepositoryImpl(RepositoryFactory.prisma);
    }
    static getProductRepository() {
        return new ProductRepositoryImpl(RepositoryFactory.prisma);
    }
}

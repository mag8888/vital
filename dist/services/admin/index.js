/**
 * Admin Services Index
 * Экспорт всех админских сервисов
 */
export { UserServiceImpl } from './user-service.js';
export { OrderServiceImpl } from './order-service.js';
export { PartnerServiceImpl } from './partner-service.js';
export { ProductServiceImpl } from './product-service.js';
// Фабрика сервисов
export class AdminServiceFactory {
    static getUserService(userRepository) {
        if (!AdminServiceFactory.userService) {
            AdminServiceFactory.userService = new UserServiceImpl(userRepository);
        }
        return AdminServiceFactory.userService;
    }
    static getOrderService(orderRepository) {
        if (!AdminServiceFactory.orderService) {
            AdminServiceFactory.orderService = new OrderServiceImpl(orderRepository);
        }
        return AdminServiceFactory.orderService;
    }
    static getPartnerService(partnerRepository) {
        if (!AdminServiceFactory.partnerService) {
            AdminServiceFactory.partnerService = new PartnerServiceImpl(partnerRepository);
        }
        return AdminServiceFactory.partnerService;
    }
    static getProductService(productRepository) {
        if (!AdminServiceFactory.productService) {
            AdminServiceFactory.productService = new ProductServiceImpl(productRepository);
        }
        return AdminServiceFactory.productService;
    }
}

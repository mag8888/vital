/**
 * User Service
 * Сервис для работы с пользователями
 */
export class UserServiceImpl {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async findById(id) {
        return await this.userRepository.findById(id);
    }
    async findAll(options) {
        return await this.userRepository.findAll(options);
    }
    async create(data) {
        const validation = this.validateUserData(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        return await this.userRepository.create(data);
    }
    async update(id, data) {
        const validation = this.validateUserData(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        return await this.userRepository.update(id, data);
    }
    async delete(id) {
        return await this.userRepository.delete(id);
    }
    async findByTelegramId(telegramId) {
        return await this.userRepository.findByTelegramId(telegramId);
    }
    async findByUsername(username) {
        return await this.userRepository.findByUsername(username);
    }
    async getUsersWithStats(filters, sort, pagination) {
        return await this.userRepository.findWithStats(filters, sort, pagination);
    }
    async updateBalance(userId, amount, operation) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const finalAmount = operation === 'add' ? amount : -amount;
        return await this.userRepository.updateBalance(userId, finalAmount);
    }
    async getReferralChain(userId, level) {
        return await this.userRepository.findReferrals(userId, level);
    }
    validateUserData(data) {
        const errors = [];
        if (data.telegramId && typeof data.telegramId !== 'string') {
            errors.push({
                field: 'telegramId',
                message: 'Telegram ID must be a string',
                value: data.telegramId
            });
        }
        if (data.firstName && typeof data.firstName !== 'string') {
            errors.push({
                field: 'firstName',
                message: 'First name must be a string',
                value: data.firstName
            });
        }
        if (data.lastName && typeof data.lastName !== 'string') {
            errors.push({
                field: 'lastName',
                message: 'Last name must be a string',
                value: data.lastName
            });
        }
        if (data.username && typeof data.username !== 'string') {
            errors.push({
                field: 'username',
                message: 'Username must be a string',
                value: data.username
            });
        }
        if (data.balance !== undefined && (typeof data.balance !== 'number' || data.balance < 0)) {
            errors.push({
                field: 'balance',
                message: 'Balance must be a non-negative number',
                value: data.balance
            });
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    // Дополнительные методы для контроллера
    async getUsersCount() {
        return await this.userRepository.getUsersCount();
    }
    async getUsersWithBalance() {
        return await this.userRepository.getUsersWithBalance();
    }
    async getTotalBalance() {
        return await this.userRepository.getTotalBalance();
    }
    async getTotalOrderSum() {
        return await this.userRepository.getTotalOrderSum();
    }
    async searchUsers(query) {
        return await this.userRepository.searchUsers(query);
    }
    async getUserOrders(userId) {
        // Заглушка - в реальном проекте нужно получить заказы пользователя
        return [];
    }
}

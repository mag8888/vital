/**
 * Base Repository
 * Базовый класс для всех репозиториев
 */
import { BaseRepositoryClass } from '../interfaces/repositories.js';
export class BaseRepositoryImpl extends BaseRepositoryClass {
    async findById(id) {
        try {
            return await this.model.findUnique({
                where: { id }
            });
        }
        catch (error) {
            this.handleError(error, 'findById');
        }
    }
    async findAll(filters, sort, pagination) {
        try {
            const where = this.buildWhereClause(filters);
            const orderBy = this.buildOrderBy(sort);
            const { skip, take } = this.buildPagination(pagination);
            const [items, total] = await Promise.all([
                this.model.findMany({
                    where,
                    orderBy,
                    skip,
                    take
                }),
                this.model.count({ where })
            ]);
            return { items, total };
        }
        catch (error) {
            this.handleError(error, 'findAll');
        }
    }
    async create(data) {
        try {
            return await this.model.create({
                data: this.sanitizeData(data)
            });
        }
        catch (error) {
            this.handleError(error, 'create');
        }
    }
    async update(id, data) {
        try {
            return await this.model.update({
                where: { id },
                data: this.sanitizeData(data)
            });
        }
        catch (error) {
            this.handleError(error, 'update');
        }
    }
    async delete(id) {
        try {
            await this.model.delete({
                where: { id }
            });
            return true;
        }
        catch (error) {
            this.handleError(error, 'delete');
            return false;
        }
    }
    async exists(id) {
        try {
            const count = await this.model.count({
                where: { id }
            });
            return count > 0;
        }
        catch (error) {
            this.handleError(error, 'exists');
        }
    }
    sanitizeData(data) {
        // Удаляем undefined значения
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined) {
                delete sanitized[key];
            }
        });
        return sanitized;
    }
    buildIncludeClause(relations) {
        if (!relations || relations.length === 0)
            return undefined;
        const include = {};
        relations.forEach(relation => {
            include[relation] = true;
        });
        return include;
    }
    buildSelectClause(fields) {
        if (!fields || fields.length === 0)
            return undefined;
        const select = {};
        fields.forEach(field => {
            select[field] = true;
        });
        return select;
    }
}

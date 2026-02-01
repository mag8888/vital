import { Category, Product } from '../models/index.js';
export async function getActiveCategories() {
    try {
        return await Category.find({ isActive: true })
            .sort({ name: 1 })
            .lean();
    }
    catch (error) {
        console.error('❌ Shop: Error fetching categories:', error.message?.substring(0, 100));
        throw error;
    }
}
export async function getCategoryById(id) {
    try {
        return await Category.findById(id).lean();
    }
    catch (error) {
        console.error('❌ Shop: Error fetching category:', error.message?.substring(0, 100));
        throw error;
    }
}
export async function getProductsByCategory(categoryId) {
    try {
        return await Product.find({
            categoryId: categoryId,
            isActive: true,
        })
            .sort({ title: 1 })
            .lean();
    }
    catch (error) {
        console.error('❌ Shop: Error fetching products:', error.message?.substring(0, 100));
        throw error;
    }
}
export async function getProductById(productId) {
    try {
        return await Product.findById(productId).lean();
    }
    catch (error) {
        console.error('❌ Shop: Error fetching product:', error.message?.substring(0, 100));
        throw error;
    }
}

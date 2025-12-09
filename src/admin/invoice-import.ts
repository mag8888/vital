/**
 * API endpoints для импорта инвойса и настроек
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseInvoiceFromDelimitedText, importInvoiceItems, getImportSettings, saveImportSettings, calculateSellingPrice } from '../services/invoice-import-service.js';

const router = Router();
const prisma = new PrismaClient();

// Middleware для проверки админа
function requireAdmin(req: any, res: any, next: any) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET: Получить настройки импорта
router.get('/api/import-settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getImportSettings();
    res.json({ success: true, ...settings });
  } catch (error: any) {
    console.error('Error getting import settings:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка получения настроек' });
  }
});

// POST: Сохранить настройки импорта
router.post('/api/import-settings', requireAdmin, async (req, res) => {
  try {
    const { exchangeRate, priceMultiplier } = req.body;
    
    if (!exchangeRate || !priceMultiplier || exchangeRate <= 0 || priceMultiplier <= 0) {
      return res.status(400).json({ success: false, error: 'Курс и мультипликатор должны быть положительными числами' });
    }
    
    await saveImportSettings(parseFloat(exchangeRate), parseFloat(priceMultiplier));
    res.json({ success: true, message: 'Настройки сохранены' });
  } catch (error: any) {
    console.error('Error saving import settings:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка сохранения настроек' });
  }
});

// POST: Импорт инвойса
router.post('/api/import-invoice', requireAdmin, async (req, res) => {
  try {
    const { invoiceText } = req.body;
    
    if (!invoiceText || !invoiceText.trim()) {
      return res.status(400).json({ success: false, error: 'Текст инвойса не предоставлен' });
    }
    
    // Парсим инвойс
    const items = parseInvoiceFromDelimitedText(invoiceText);
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'Не удалось распознать товары в инвойсе' });
    }
    
    // Запускаем импорт в фоне
    importInvoiceItems(items)
      .then(result => {
        console.log('✅ Invoice import completed:', result);
      })
      .catch(error => {
        console.error('❌ Invoice import error:', error);
      });
    
    res.json({
      success: true,
      message: `Импорт запущен. Обрабатывается ${items.length} товаров.`,
      itemsCount: items.length
    });
  } catch (error: any) {
    console.error('Error importing invoice:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка импорта инвойса' });
  }
});

// POST: Импорт инвойса (синхронный, для детального результата)
router.post('/api/import-invoice-sync', requireAdmin, async (req, res) => {
  try {
    const { invoiceText } = req.body;
    
    if (!invoiceText || !invoiceText.trim()) {
      return res.status(400).json({ success: false, error: 'Текст инвойса не предоставлен' });
    }
    
    // Парсим инвойс
    const items = parseInvoiceFromDelimitedText(invoiceText);
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'Не удалось распознать товары в инвойсе' });
    }
    
    // Выполняем импорт синхронно
    const result = await importInvoiceItems(items);
    
    res.json({
      success: true,
      message: 'Импорт завершен',
      result: {
        total: items.length,
        ...result
      }
    });
  } catch (error: any) {
    console.error('Error importing invoice:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка импорта инвойса' });
  }
});

// GET: Тест расчета цены
router.get('/api/test-price-calculation', requireAdmin, async (req, res) => {
  try {
    const { purchasePrice } = req.query;
    
    if (!purchasePrice) {
      return res.status(400).json({ success: false, error: 'Не указана закупочная цена' });
    }
    
    const settings = await getImportSettings();
    // Формула: цена_закупки * 8 * 2.45 = цена в рублях, затем / 100 для PZ
    const sellingPrice = calculateSellingPrice(parseFloat(purchasePrice as string), settings.exchangeRate, settings.priceMultiplier);
    
    res.json({
      success: true,
      calculation: {
        purchasePriceBAT: parseFloat(purchasePrice as string),
        exchangeRate: settings.exchangeRate,
        multiplier: settings.priceMultiplier,
        sellingPricePZ: sellingPrice,
        formula: `${parseFloat(purchasePrice as string)} × ${settings.priceMultiplier} × ${settings.exchangeRate} = ${(parseFloat(purchasePrice as string) * settings.priceMultiplier * settings.exchangeRate).toFixed(2)} руб. = ${sellingPrice.toFixed(2)} PZ`
      }
    });
  } catch (error: any) {
    console.error('Error testing price calculation:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка расчета цены' });
  }
});

export default router;




